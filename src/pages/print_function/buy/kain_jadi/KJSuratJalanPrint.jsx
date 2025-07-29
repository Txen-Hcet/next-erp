import { createMemo, createSignal } from "solid-js";
import logoNavel from "../../../../assets/img/navelLogo.png";

export default function KJSuratJalanPrint(props) {
  const data = props.data;

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
    (sum, i) => sum + Number(i.meter_total || 0),
    0
  );
  const totalYard = data.items?.reduce(
    (sum, i) => sum + Number(i.yard_total || 0),
    0
  );

  function formatRibuan(value) {
    return Number(value).toLocaleString("id-ID");
  }

  // Misalnya kamu sudah punya:
  const subTotal = createMemo(() => {
    return data.items?.reduce(
      (sum, i) => sum + (i.harga ?? 0) * (i.meter_total ?? 0),
      0
    );
  });

  const [form, setForm] = createSignal({
    nilai_lain: 0,
  });

  // DPP = subTotal
  const dpp = createMemo(() => subTotal());

  // Nilai Lain dari form
  const nilaiLain = createMemo(() => parseFloat(form().nilai_lain || 0));

  // PPN = 11% dari (DPP + Nilai Lain)
  const ppn = createMemo(() => {
    const dasarPajak = dpp() + nilaiLain();
    return dasarPajak * 0.11;
  });

  // Jumlah Total = DPP + Nilai Lain + PPN
  const jumlahTotal = createMemo(() => dpp() + nilaiLain() + ppn());

  // Lalu kalau ingin dijadikan object seperti `data`
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
        <img className="w-40" src={logoNavel} alt="" />
        <h1 className="text-2xl uppercase font-bold mb-5">
          Kain Jadi Surat Jalan
        </h1>

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
                  {data.customer}
                </td>
              </tr>
              <tr>
                <td
                  className="px-2 max-w-[300px] leading-relaxed break-words whitespace-pre-wrap"
                  colSpan={2}
                >
                  {data.alamat}
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
                <td className="px-2 py-1 whitespace-nowrap">Telp:</td>
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
                    No. PC
                  </td>
                </tr>
                <tr>
                  <td className="px-2 pb-1 text-center break-words max-w-[180px]">
                    {data.po_cust}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* RIGHT TABLE */}
          <table className="w-[35%] border-2 border-black table-fixed text-sm">
            <tbody>
              {[
                { label: "No. PO", value: data.no_so },
                { label: "Tanggal", value: data.tanggal },
                { label: "Tgl Kirim", value: data.kirim },
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
            </tr>
          </thead>
          <tbody>
            {(data.items || []).map((item, i) => (
              <tr key={i}>
                <td className="border border-black p-1 text-center">{i + 1}</td>
                <td className="border border-black p-1 text-center">
                  {item.kode_kain}
                </td>
                <td className="border border-black p-1">{item.jenis_kain}</td>
                <td className="border border-black p-1 text-center">
                  {item.lebar}"
                </td>
                <td className="border border-black p-1 text-right">
                  {formatRibuan(item.meter_total)}
                </td>
                <td className="border border-black p-1 text-center">
                  {item.satuan_unit}
                </td>
              </tr>
            ))}

            {/* Tambahin row kosong */}
            {Array.from({ length: 14 - data.items.length }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="border border-black p-1 text-center h-5">
                  {data.items.length + i + 1}
                </td>
                <td className="border border-black p-1 text-center"></td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1 text-center"></td>
                <td className="border border-black p-1 text-center"></td>
                <td className="border border-black p-1 text-right"></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td
                colSpan={4}
                className="border border-black font-bold px-2 py-1"
              >
                Total:
              </td>
              <td className="border border-black px-2 py-1 text-right font-bold">
                {formatRibuan(totalMeter)}
              </td>
              <td className="border border-black px-2 py-1 text-right font-bold">
                {data.satuan}
              </td>
            </tr>
            <tr>
              <td colSpan={6} className="border border-black p-2 align-top">
                <div className="font-bold mb-1">NOTE:</div>
                <div className="whitespace-pre-wrap break-words italic">
                  {data.catatan ?? "-"}
                </div>
              </td>
            </tr>
            <tr>
              <td colSpan={6} className="border border-black">
                <div className="w-full flex justify-between text-[12px] py-5 px-2">
                  <div className="text-center w-1/3 pb-3">
                    Yang Menerima
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
