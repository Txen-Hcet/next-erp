import { createMemo, createSignal, onMount } from "solid-js";
import logoNavel from "../../../../assets/img/navelLogo.png";
import {
  getCurrencies,
  getFabric,
  getGrades,
  getSatuanUnits,
  getSupplier,
  getUser,
} from "../../../../utils/auth";

export default function BGOrderPrint(props) {
  const data = props.data;
  const [supplier, setSupplier] = createSignal(null);
  const [kainList, setKainList] = createSignal({});
  const [gradeList, setGradeList] = createSignal({});
  const [satuanUnitList, setSatuanUnitList] = createSignal({});

  const tokUser = getUser(); // kalau token dibutuhkan

  async function handleGetSupplier() {
    try {
      const res = await getSupplier(data.supplier_id, tokUser?.token);

      if (res.status === 200) {
        setSupplier(res.suppliers || null);
      }
    } catch (err) {
      console.error("Error getSupplier:", err);
    }
  }

  async function handleGetKain(kainId) {
    try {
      const res = await getFabric(kainId, tokUser?.token);
      // if (res.status === 200) {
      setKainList((prev) => ({
        ...prev,
        [kainId]: res,
      }));
      // }
    } catch (err) {
      console.error("Error getFabric:", err);
    }
  }

  async function handleGetGrade(gradeId) {
    try {
      const res = await getGrades(gradeId, tokUser?.token);
      if (res.status === 200) {
        setGradeList((prev) => ({
          ...prev,
          [gradeId]: res.data,
        }));
      }
    } catch (err) {
      console.error("Error getGrade:", err);
    }
  }

  async function handleGetSatuanUnit(satuanUnitId) {
    try {
      const res = await getSatuanUnits(satuanUnitId, tokUser?.token);
      if (res.status === 200) {
        setSatuanUnitList((prev) => ({
          ...prev,
          [satuanUnitId]: res.data,
        }));
      }
    } catch (err) {
      console.error("Error getGrade:", err);
    }
  }

  onMount(() => {
    if (tokUser?.token) {
      handleGetSupplier();
      (data.items || []).forEach((item) => {
        if (item.fabric_id) {
          handleGetKain(item.fabric_id);
        }
        if (item.grade_id) {
          handleGetGrade(item.grade_id);
        }
      });
      if (data.satuan_unit_id) {
        handleGetSatuanUnit(data.satuan_unit_id);
      }
    }
  });

  function formatRupiahNumber(value) {
    if (typeof value !== "number") {
      value = parseFloat(value);
    }
    if (isNaN(value)) return "-";
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  const itemsPerPage = 14;
  const itemPages = paginateItems(data.items ?? [], itemsPerPage);

  function paginateItems(items, itemsPerPage) {
    const pages = [];
    for (let i = 0; i < items.length; i += itemsPerPage) {
      pages.push(items.slice(i, i + itemsPerPage));
    }
    return pages;
  }

  const totalMeter = data.items?.reduce(
    (sum, i) => sum + Number(i.meter || 0),
    0
  );
  const totalYard = data.items?.reduce(
    (sum, i) => sum + Number(i.yard || 0),
    0
  );

  function formatRibuan(value) {
    return Number(value).toLocaleString("id-ID");
  }

  function formatTanggal(tgl) {
    if (!tgl) return "-";
    const [year, month, day] = tgl.split("-");
    return `${day}-${month}-${year}`;
  }

  // Misalnya kamu sudah punya:
  const subTotal = createMemo(() => {
    const satuan = satuanUnitList()[data.satuan_unit_id]?.satuan;

    return data.items?.reduce((sum, i) => {
      let qty = 0;

      if (satuan === "Meter") qty = i.meter ?? 0;
      else if (satuan === "Yard") qty = i.yard ?? 0;

      return sum + (i.harga ?? 0) * qty;
    }, 0);
  });

  const [form, setForm] = createSignal({
    nilai_lain: 0,
  });

  // DPP = subTotal
  const dpp = createMemo(() => subTotal() / 1.11);

  // Nilai Lain dari form
  const nilaiLain = createMemo(() => parseFloat((dpp() * 11) / 12 || 0));

  // PPN = 11% dari (DPP + Nilai Lain)
  const ppn = createMemo(() => {
    const dasarPajak = nilaiLain() * 0.12;
    return dasarPajak;
  });

  // Jumlah Total = DPP + Nilai Lain + PPN
  const jumlahTotal = createMemo(() => dpp() + ppn());

  // Lalu kalau ingin dijadikan object seperti `data`
  const dataAkhir = createMemo(() => ({
    dpp: dpp(),
    nilai_lain: nilaiLain(),
    ppn: ppn(),
    total: jumlahTotal(),
  }));

  return (
    <>
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }
        html, body {
          margin: 0;
          padding: 0;
          height: 100%;
          width: 100%;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          font-family: sans-serif;
        }
        @media print {
          .page {
            page-break-after: always;
          }
        }
      `}</style>

      <div
        className="flex flex-col items-center gap-2"
        style={{
          position: "relative",
          width: "210mm",
          height: "297mm",
          overflow: "hidden",
          padding: "5mm",
        }}
      >
        <img
          className="w-40"
          hidden={!data.ppn || parseInt(data.ppn) === 0}
          src={logoNavel}
          alt=""
        />
        <h1 className="text-2xl uppercase font-bold mb-5">Order Beli Greige</h1>

        <div className="w-full flex gap-2 text-sm">
          {/* LEFT TABLE */}
          <table className="w-[55%] border-2 border-black text-[13px] table-fixed">
            <tbody>
              <tr>
                <td
                  className="px-2 pt-1 max-w-[300px] break-words whitespace-pre-wrap"
                  colSpan={2}
                >
                  Supplier
                </td>
              </tr>
              <tr>
                <td
                  className="px-2 max-w-[300px] break-words whitespace-pre-wrap"
                  colSpan={2}
                >
                  {supplier()?.nama}
                </td>
              </tr>
              <tr>
                <td
                  className="px-2 max-w-[300px] leading-relaxed break-words whitespace-pre-wrap"
                  colSpan={2}
                >
                  {supplier()?.alamat}
                </td>
              </tr>
              {/* <tr>
                <td
                  className="px-2 max-w-[300px] break-words whitespace-pre-wrap"
                  colSpan={2}
                >
                  KERTOHARJO PEKALONGAN SEL
                </td>
              </tr> */}
              <tr>
                <td className="px-2 py-1 whitespace-nowrap">
                  Telp: {supplier()?.no_telp}
                </td>
                <td className="px-2 py-1 whitespace-nowrap">Fax:</td>
              </tr>
            </tbody>
          </table>

          {/* MIDDLE TABLE */}
          {/* <div className="flex flex-col gap-2 w-[20%]">
            <table className="border-2 border-black table-fixed w-full h-full">
              <tbody>
                <tr className="border-b border-black">
                  <td className="px-2 py-1 w-[30%] whitespace-nowrap">Jenis</td>
                  <td className="w-[5%] text-center">:</td>
                  <td className="px-2 py-1 w-[65%] break-words">
                    {data.currency_id}
                  </td>
                </tr>
                <tr>
                  <td className="px-2 py-1 whitespace-nowrap">Kurs</td>
                  <td className="text-center">:</td>
                  <td className="px-2 py-1 break-words">
                    {formatRupiahNumber(data.kurs)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div> */}

          {/* RIGHT TABLE */}
          <table className="w-[55%] border-2 border-black table-fixed text-sm">
            <tbody>
              {[
                { label: "No. Kontrak", value: data.sequence_number },
                { label: "Tanggal", value: formatTanggal(data.tanggal) },
                {
                  label: "Validity",
                  value: formatTanggal(data.validity_contract),
                },
                { label: "Payment", value: data.termin + " Hari" },
              ].map((row, idx) => (
                <tr key={idx} className="border-b border-black">
                  <td className="font-bold px-2 w-[30%] whitespace-nowrap">
                    {row.label}
                  </td>
                  <td className="w-[5%] text-center">:</td>
                  <td className="px-2 break-words w-[65%]">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ITEM TABLE */}
        <table className="w-full table-fixed border border-black text-[12px] border-collapse mt-3">
          <thead className="bg-gray-200">
            <tr>
              <th className="border border-black p-1 w-[30px]" rowSpan={2}>
                No
              </th>
              <th className="border border-black p-1 w-[70px]" rowSpan={2}>
                Kode
              </th>
              <th className="border border-black p-1 w-[150px]" rowSpan={2}>
                Jenis Kain
              </th>
              <th className="border border-black p-1 w-[60px]" rowSpan={2}>
                Lebar
              </th>
              <th className="border border-black p-1 w-[100px]" rowSpan={2}>
                Quantity
              </th>
              <th
                className="border border-black p-1 w-[70px] text-center"
                rowSpan={2}
              >
                Satuan Unit
              </th>
              <th className="border border-black p-1 w-[100px]" rowSpan={2}>
                Harga
              </th>
              <th className="border border-black p-1 w-[130px]" rowSpan={2}>
                Jumlah
              </th>
            </tr>
          </thead>
          <tbody>
            {(data.items || []).map((item, i) => (
              <tr key={i}>
                <td className="p-1 text-center">{i + 1}</td>
                <td className="p-1 text-center break-words">
                  {kainList()[item.fabric_id]?.corak || "-"}
                </td>
                <td className="p-1 break-words">
                  {kainList()[item.fabric_id]?.konstruksi || "-"}
                </td>
                <td className="p-1 text-center break-words">
                  {item.lebar_greige}"
                </td>
                <td className="p-1 text-right break-words">
                  {satuanUnitList()[data.satuan_unit_id]?.satuan === "Meter"
                    ? formatRibuan(item.meter)
                    : satuanUnitList()[data.satuan_unit_id]?.satuan === "Yard"
                    ? formatRibuan(item.yard)
                    : ""}
                </td>
                <td className="p-1 text-center break-words">
                  {satuanUnitList()[data.satuan_unit_id]?.satuan || "-"}
                </td>
                <td className="p-1 text-right break-words">
                  {formatRupiahNumber(item.harga)}
                </td>
                <td className="p-1 text-right break-words">
                  {(() => {
                    const satuan =
                      satuanUnitList()[data.satuan_unit_id]?.satuan;
                    let qty = 0;

                    if (satuan === "Meter")
                      qty = item.meter_total ?? item.meter ?? 0;
                    else if (satuan === "Yard")
                      qty = item.yard_total ?? item.yard ?? 0;

                    return item.harga && qty
                      ? formatRupiahNumber(item.harga * qty)
                      : "-";
                  })()}
                </td>
              </tr>
            ))}

            {/* Tambahin row kosong */}
            {Array.from({ length: 14 - data.items.length }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="p-1 text-center h-5"></td>
                <td className="p-1 text-center"></td>
                <td className="p-1"></td>
                <td className="p-1 text-center"></td>
                <td className="p-1 text-center"></td>
                <td className="p-1 text-right"></td>
                <td className="p-1 text-right"></td>
                <td className="p-1 text-right"></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td
                colSpan={4}
                className="border border-black font-bold px-2 py-1"
              >
                Total
              </td>
              <td className="border border-black px-2 py-1 text-right font-bold">
                {(() => {
                  const satuan = satuanUnitList()[data.satuan_unit_id]?.satuan;

                  if (satuan === "Meter") return formatRupiahNumber(totalMeter);
                  if (satuan === "Yard") return formatRupiahNumber(totalYard);

                  return "-";
                })()}
              </td>
              <td className="border border-black px-2 py-1 text-right font-bold"></td>
              <td className="border border-black px-2 py-1 text-right font-bold">
                Sub Total
              </td>
              <td className="border border-black px-2 py-1 text-right">
                {formatRupiahNumber(subTotal())}
              </td>
            </tr>
            <tr>
              <td colSpan={6} className="px-2 py-1" />
              <td className="px-2 py-1 text-right font-bold">DPP</td>
              <td className="px-2 py-1 text-right">
                {formatRupiahNumber(dataAkhir().dpp)}
              </td>
            </tr>
            <tr>
              <td colSpan={6} className="px-2 py-1" />
              <td className="px-2 py-1 text-right font-bold">Nilai Lain</td>
              <td className="px-2 py-1 text-right">
                {formatRupiahNumber(dataAkhir().nilai_lain)}
              </td>
            </tr>
            <tr>
              <td colSpan={6} className="px-2 py-1" />
              <td className="px-2 py-1 text-right font-bold">PPN</td>
              <td className="px-2 py-1 text-right">
                {formatRupiahNumber(dataAkhir().ppn)}
              </td>
            </tr>
            <tr>
              <td colSpan={6} className="px-2 py-1" />
              <td className="px-2 py-1 text-right font-bold">Jumlah Total</td>
              <td className="px-2 py-1 text-right">
                {formatRupiahNumber(dataAkhir().total)}
              </td>
            </tr>
            <tr>
              <td colSpan={8} className="border border-black p-2 align-top">
                <div className="font-bold mb-1">NOTE:</div>
                <div className="whitespace-pre-wrap break-words italic">
                  {data.keterangan ?? "-"}
                </div>
              </td>
            </tr>
            <tr>
              <td colSpan={8} className="border border-black">
                <div className="w-full flex justify-between text-[12px] py-5 px-2">
                  <div className="text-center w-1/3 pb-3">
                    Supplier
                    <br />
                    <br />
                    <br />
                    <br />( ...................... )
                  </div>
                  <div className="text-center w-1/3">
                    Mengetahui
                    <br />
                    <br />
                    <br />
                    <br />( ...................... )
                  </div>
                  <div className="text-center w-1/3">
                    Dibuat Oleh
                    <br />
                    <br />
                    <br />
                    <br />( ...................... )
                  </div>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
