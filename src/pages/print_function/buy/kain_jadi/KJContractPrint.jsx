import { createMemo, createSignal, onMount } from "solid-js";
import logoNavel from "../../../../assets/img/navelLogo.png";
import {
  getFabric,
  getGrades,
  getSupplier,
  getUser,
} from "../../../../utils/auth";

export default function KJContractPrint(props) {
  const data = props.data;
  const [supplier, setSupplier] = createSignal(null);
  const [kainList, setKainList] = createSignal({});
  const [gradeList, setGradeList] = createSignal({});

  const tokUser = getUser(); // kalau token dibutuhkan

  function formatAngka(value, decimals = 2) {
    if (typeof value !== "number") {
      value = parseFloat(value) || 0;
    }
    if (value === 0) {
        return "0,00";
    }
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  function formatRupiah(value, decimals = 2) {
    if (typeof value !== "number") {
      value = parseFloat(value) || 0;
    }
     if (value === 0) {
        return "Rp 0,00";
    }
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  function formatTanggal(tgl) {
    if (!tgl) return "-";
    const [year, month, day] = tgl.split("-");
    return `${day}-${month}-${year}`;
  }

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
    }
  });

  const itemsPerPage = 14;
  const itemPages = paginateItems(data.items ?? [], itemsPerPage);

  function paginateItems(items, itemsPerPage) {
    const pages = [];
    for (let i = 0; i < items.length; i += itemsPerPage) {
      pages.push(items.slice(i, i + itemsPerPage));
    }
    return pages;
  }

  const totalMeter = createMemo(() => 
    data.items?.reduce((sum, i) => sum + (i.meterValue || 0), 0)
  );

  const totalYard = createMemo(() =>
    data.items?.reduce((sum, i) => sum + (i.yardValue || 0), 0)
  );

  const isPPN = createMemo(() => parseFloat(data.ppn_percent) > 0);

  const subTotal = createMemo(() => {
    return (data.items || []).reduce(
      (sum, item) => sum + (item.subtotal || 0),
      0
    );
  });

  const dpp = createMemo(() => {
    return subTotal() * 1.11;
  });

  const nilaiLain = createMemo(() => {
    return dpp() * (11 / 12);
  });

  const ppn = createMemo(() => {
    return isPPN() ? dpp() * 0.11 : 0;
  });

  const jumlahTotal = createMemo(() => dpp() + ppn());

  const dataAkhir = {
    dpp: dpp(),
    nilai_lain: nilaiLain(),
    ppn: ppn(),
    total: jumlahTotal(),
  };

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
          hidden={!isPPN()}
          src={logoNavel}
          alt=""
        />
        <h1 className="text-2xl uppercase font-bold mb-5">Kontrak Kain Jadi</h1>

        <div className="w-full flex gap-2 text-sm">
          {/* LEFT TABLE */}
          <table className="w-[55%] border-2 border-black text-[13px] table-fixed">
            <tbody>
              <tr>
                <td
                  className="px-2 pt-1 max-w-[300px] break-words whitespace-pre-wrap"
                  colSpan={2}
                >
                  Kepada Yth:
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
                    {currency()?.name}
                  </td>
                </tr>
                <tr>
                  <td className="px-2 py-1 whitespace-nowrap">Kurs</td>
                  <td className="text-center">:</td>
                  <td className="px-2 py-1 break-words">{data.kurs}</td>
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
              <th className="border border-black p-1 w-[4%]" rowSpan={2}>
                No
              </th>
              <th className="border border-black p-1 w-[8%]" rowSpan={2}>
                Kode
              </th>
              <th className="border border-black p-1 w-[15%]" rowSpan={2}>
                Jenis Kain
              </th>
              <th className="border border-black p-1 w-[10%]" rowSpan={2}>
                Lebar Greige
              </th>
              <th className="border border-black p-1 w-[10%]" rowSpan={2}>
                Lebar Finish
              </th>
              <th
                className="border border-black p-1 w-[18%] text-center"
                colSpan={2}
              >
                Quantity
              </th>
              <th className="border border-black p-1 w-[18%]" rowSpan={2}>
                Harga
              </th>
              <th className="border border-black p-1 w-[18%]" rowSpan={2}>
                Jumlah
              </th>
            </tr>
            <tr>
              <th
                colSpan={2} className="border border-black p-1 w-full"
                hidden={data.satuan_unit_id == 2 ? true : false}
              >
                (Meter)
              </th>
              <th
                colSpan={2} className="border border-black p-1 w-[14%]"
                hidden={data.satuan_unit_id == 1 ? true : false}
              >
                (Yard)
              </th>
            </tr>
          </thead>
          <tbody>
            {(data.items || []).map((item, i) => (
              <tr key={i}>
                <td className="p-1 text-center">{i + 1}</td>
                <td className="p-1 text-center">
                  {kainList()[item.fabric_id]?.corak || "-"}
                </td>
                <td className="p-1">
                  {kainList()[item.fabric_id]?.konstruksi || "-"}
                </td>
                <td className="p-1 text-center break-words">
                  {item.lebar_greige}
                </td>
                <td className="p-1 text-center break-words">
                  {item.lebar_finish}
                </td>
                <td
                  className="p-1 text-right break-words"
                  colSpan={2}
                >
                  {data.satuan_unit_id == 1
                    ? formatAngka(item.meterValue)
                    : formatAngka(item.yardValue)}
                </td>
                <td className="p-1 text-right break-words">
                  {formatRupiah(item.hargaValue)}
                </td>
                <td className="p-1 text-right break-words">
                  {item.hargaValue && item.meterValue
                    ? formatRupiah(item.hargaValue * item.meterValue)
                    : "-"}
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
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="border border-black font-bold px-2 py-1" >Total</td>
              <td
                colSpan={2} className="border border-black px-2 py-1 text-right font-bold"
                hidden={data.satuan_unit_id == 2 ? true : false}
              >
                {formatAngka(totalMeter())}
              </td>
              <td
                colSpan={2} className="border border-black px-2 py-1 text-right font-bold"
                hidden={data.satuan_unit_id == 1 ? true : false}
              >
                {formatAngka(totalYard())}
              </td>
              <td className="border border-black px-2 py-1 text-right font-bold">
                Sub Total
              </td>
              <td className="border border-black px-2 py-1 text-right">
                {formatRupiah(subTotal())}
              </td>
            </tr>
            <tr>
              <td colSpan={7} className="px-2 py-1" />
              <td className="px-2 py-1 text-right font-bold">DPP</td>
              <td className="px-2 py-1 text-right">
                {formatRupiah(dataAkhir.dpp)}
              </td>
            </tr>
            <tr>
              <td colSpan={7} className="px-2 py-1" />
              <td className="px-2 py-1 text-right font-bold">Nilai Lain</td>
              <td className="px-2 py-1 text-right">
                {formatRupiah(dataAkhir.nilai_lain)}
              </td>
            </tr>
            <tr>
              <td colSpan={7} className="px-2 py-1" />
              <td className="px-2 py-1 text-right font-bold">PPN</td>
              <td className="px-2 py-1 text-right">
                {formatRupiah(dataAkhir.ppn)}
              </td>
            </tr>
            <tr>
              <td colSpan={7} className="px-2 py-1" />
              <td className="px-2 py-1 text-right font-bold">Jumlah Total</td>
              <td className="px-2 py-1 text-right">
                {formatRupiah(dataAkhir.total)}
              </td>
            </tr>
            <tr>
              <td colSpan={9} className="border border-black p-2 align-top">
                <div className="font-bold mb-1">NOTE:</div>
                <div className="whitespace-pre-wrap break-words italic">
                  {data.keterangan ?? "-"}
                </div>
              </td>
            </tr>
            <tr>
              <td colSpan={9} className="border border-black">
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
