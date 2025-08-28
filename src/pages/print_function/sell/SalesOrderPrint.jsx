import { createMemo, createSignal, onMount } from "solid-js";
import logoNavel from "../../../assets/img/navelLogo.png";
import {
  getColor,
  getCurrencies,
  getCustomer,
  getFabric,
  getGrades,
  getUser,
} from "../../../utils/auth";

export default function SalesOrderPrint(props) {
  const data = props.data;
  const [customer, setCustomer] = createSignal(null);
  const [kainList, setKainList] = createSignal({});
  const [gradeList, setGradeList] = createSignal({});
  const [warnaList, setWarnaList] = createSignal({});

  const tokUser = getUser(); // kalau token dibutuhkan

  async function handleGetCustomer() {
    try {
      const res = await getCustomer(data.customer_id, tokUser?.token);
      if (res.status === 200) {
        setCustomer(res.customers || null);
      }
    } catch (err) {
      console.error("Error getCustomers:", err);
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

  async function handleGetWarna(warnaId) {
    try {
      const res = await getColor(warnaId, tokUser?.token);
      if (res.status === 200) {
        setWarnaList((prev) => ({
          ...prev,
          [warnaId]: res.warna,
        }));
      }
    } catch (err) {
      console.error("Error getGrade:", err);
    }
  }

  onMount(() => {
    if (tokUser?.token) {
      handleGetCustomer();
      (data.items || []).forEach((item) => {
        if (item.fabric_id) {
          handleGetKain(item.fabric_id);
        }
        if (item.grade_id) {
          handleGetGrade(item.grade_id);
        }
        if (item.warna_id) {
          handleGetWarna(item.warna_id);
        }
      });
    }
  });

  function formatRibuan(value) {
    return value ? Number(value).toLocaleString("id-ID") : "-";
  }

  function formatTanggal(tgl) {
    if (!tgl) return "-";
    const [year, month, day] = tgl.split("-");
    return `${day}-${month}-${year}`;
  }

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

  // Misalnya kamu sudah punya:
  const subTotal = createMemo(() => {
    return data.items?.reduce(
      (sum, i) => sum + (i.harga ?? 0) * (i.meter ?? 0),
      0
    );
  });

  const [form, setForm] = createSignal({
    nilai_lain: 0,
  });

  // DPP = subTotal

  const dpp = createMemo(() => {
    return subTotal() / 1.11;
  });

  const nilaiLain = createMemo(() => {
    return dpp() * (11 / 12);
  });

  const ppn = createMemo(() => {
    return isPPN() ? nilaiLain() * 0.12 : 0;
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
          hidden={!data.ppn || parseInt(data.ppn) === 0}
          src={logoNavel}
          alt=""
        />
        <h1 className="text-2xl uppercase font-bold mb-5">Sales Order</h1>

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
                  {customer()?.nama}
                </td>
              </tr>
              <tr>
                <td
                  className="px-2 max-w-[300px] leading-relaxed break-words whitespace-pre-wrap"
                  colSpan={2}
                >
                  {customer()?.alamat}
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
                  Telp: {customer()?.no_telp}
                </td>
                <td className="px-2 py-1 whitespace-nowrap">Fax:</td>
              </tr>
            </tbody>
          </table>

          {/* MIDDLE TABLE */}
          <div className="flex flex-col gap-2 w-[20%]">
            <table className="h-full border-2 border-black table-fixed w-full">
              <tbody>
                <tr>
                  <td className="px-2 pt-1 text-center align-top break-words max-w-[180px]">
                    No Sales Contract
                  </td>
                </tr>
                <tr>
                  <td className="px-2 pb-1 text-xs text-center break-words max-w-[180px]">
                    {data.no_sc}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* RIGHT TABLE */}
          <table className="w-[35%] border-2 border-black table-fixed text-sm">
            <tbody>
              {[
                { label: "No. SO", value: data.no_sc },
                { label: "Tanggal", value: formatTanggal(data.tanggal) },
                {
                  label: "Tgl Kirim",
                  value: formatTanggal(data.delivery_date) ?? "-",
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
              <th className="border border-black p-1 w-[150px]" rowSpan={2}>
                Deskripsi Kain
              </th>
              <th className="border border-black p-1 w-[50px]" rowSpan={2}>
                Grade
              </th>
              <th className="border border-black p-1 w-[150px]" rowSpan={2}>
                Warna Kain
              </th>
              <th className="border border-black p-1 w-[60px]" rowSpan={2}>
                Jumlah Meter
              </th>
              <th className="border border-black p-1 w-[60px]" rowSpan={2}>
                Jumlah Yard
              </th>
              <th className="border border-black p-1 w-[100px]" rowSpan={2}>
                Harga
              </th>
              <th className="border border-black p-1 w-[130px]" rowSpan={2}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {(data.items || []).map((item, i) => (
              <tr key={i}>
                <td className="p-1 text-center">{i + 1}</td>
                <td className="p-1">
                  {kainList()[item.fabric_id]?.konstruksi || "-"}
                </td>
                <td className="p-1 text-center">
                  {gradeList()[item.grade_id]?.grade || "-"}
                </td>
                <td className="p-1 text-center">
                  {warnaList()[item.warna_id]?.kode +
                    " | " +
                    warnaList()[item.warna_id]?.deskripsi || "-"}
                </td>
                <td className="p-1 text-right">{item.meter}</td>
                <td className="p-1 text-right">{item.yard}</td>
                <td className="p-1 text-right">
                  {formatRupiahNumber(item.harga)}
                </td>
                <td className="p-1 text-right">
                  {item.harga && item.meter
                    ? formatRupiahNumber(item.harga * item.meter)
                    : "-"}
                </td>
              </tr>
            ))}

            {/* Tambahin row kosong */}
            {Array.from({ length: 10 - data.items.length }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="p-1 text-center h-5"></td>
                <td className="p-1 text-center"></td>
                <td className="p-1"></td>
                <td className="p-1 text-center"></td>
                <td className="p-1 text-center"></td>
                <td className="p-1 text-right"></td>
                <td className="p-1 text-right"></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="border border-black px-2 py-1" />
              <td className="border border-black px-2 py-1 text-right font-bold">
                {formatRupiahNumber(totalMeter)}
              </td>
              <td className="border border-black px-2 py-1 text-right font-bold">
                {formatRupiahNumber(totalYard)}
              </td>
              <td className="border border-black px-2 py-1 text-right font-bold">
                Sub Total
              </td>
              <td className="border border-black px-2 py-1 text-right">
                {formatRupiahNumber(subTotal())}
              </td>
            </tr>
            <tr>
              <td
                className="border border-black p-2 align-top"
                rowSpan={3}
                colSpan={6}
              >
                <div className="font-bold mb-1">NOTE:</div>
                <div className="whitespace-pre-wrap break-words italic">
                  {data.keterangan ?? "-"}
                </div>
              </td>
              <td className="px-2 py-1 text-right font-bold">DPP</td>
              <td className="px-2 py-1 text-right">
                {formatRupiahNumber(dataAkhir.dpp)}
              </td>
            </tr>
            <tr>
              <td className="px-2 py-1 text-right font-bold">PPN</td>
              <td className="px-2 py-1 text-right">
                {formatRupiahNumber(dataAkhir.ppn)}
              </td>
            </tr>
            <tr>
              <td className="px-2 py-1 text-right font-bold">Jumlah Total</td>
              <td className="px-2 py-1 text-right">
                {formatRupiahNumber(dataAkhir.total)}
              </td>
            </tr>
            <tr>
              <td colSpan={8} className="border border-black">
                <div className="w-full flex justify-end text-[12px] py-5 px-2">
                  <div className="text-center w-1/3">
                    Customer
                    <br />
                    <br />
                    <br />
                    <br />( ...................... )
                  </div>
                  <div className="text-center w-1/3">
                    Marketing
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
