import { createMemo, createEffect, For, Show } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import logoNavel from "../../../assets/img/navelLogo.png";
import { splitIntoPagesWithOffsets, createStretch } from "../../../components/PrintUtils";

export default function OCXPrint(props) {
  const [searchParams] = useSearchParams();
  const printType = createMemo(() => searchParams.type || "default");

  const data = createMemo(() => props.data ?? { items: [], summary: {} });

  // ===== Helper Functions =====
  function getSatuanUnitName(id) {
    switch(parseInt(id)) {
      case 1: return "Meter";
      case 2: return "Yard";
      case 3: return "Kilogram";
      default: return "Meter";
    }
  }

  // Fungsi untuk mengambil tanggal dari item pertama
  function getCreatedAtFromItems(items) {
    if (items && items.length > 0 && items[0].created_at) {
      return items[0].created_at;
    }
    return null;
  }

  function formatTanggal(s) {
    if (!s) return "-";
    const d = new Date(s);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}-${mm}-${yy}`;
  }

  function formatRupiah(v, decimals = 2) {
    if (typeof v !== "number") v = parseFloat(v) || 0;
    if (v === 0) return "Rp 0,00";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(v);
  }

  function formatAngka(v, decimals = 2) {
    if (typeof v !== "number") v = parseFloat(v) || 0;
    if (v === 0) return "0,00";
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(v);
  }

  function formatAngkaNonDecimal(v) {
    if (typeof v !== "number") v = parseFloat(v) || 0;
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v);
  }

  // ===== Computed Values =====
  const satuanUnitName = createMemo(() => 
    getSatuanUnitName(data().satuan_unit_id)
  );

  const isPPN = createMemo(() => parseFloat(data().ppn_percent) > 0);
  
  // Ambil tanggal dari item pertama
  const createdAtDate = createMemo(() => 
    getCreatedAtFromItems(data().items || [])
  );
  
  // Hitung total meter dan yard dari items
  const totalMeter = createMemo(() => 
    (data().items || []).reduce((sum, item) => sum + parseFloat(item.meter_total || 0), 0)
  );
  
  const totalYard = createMemo(() => 
    (data().items || []).reduce((sum, item) => sum + parseFloat(item.yard_total || 0), 0)
  );

  const totalKilogram = createMemo(() => 
    (data().items || []).reduce((sum, item) => sum + parseFloat(item.kilogram_total || 0), 0)
  );

  // Hitung subtotal dari items (qty * harga)
  const subTotal = createMemo(() => {
    const items = data().items || [];
    return items.reduce((sum, item) => {
      const qty = satuanUnitName() === 'Meter' 
        ? parseFloat(item.meter_total || 0)
        : satuanUnitName() === 'Yard' 
          ? parseFloat(item.yard_total || 0)
          : parseFloat(item.kilogram_total || 0);
      const harga = parseFloat(item.harga || 0);
      return sum + (qty * harga);
    }, 0);
  });

  // Hitung nilai PPN
  const ppnPercent = createMemo(() => parseFloat(data().ppn_percent || 0));
  const dpp = createMemo(() => subTotal() / (1 + ppnPercent()/100));
  const ppn = createMemo(() => dpp() * (ppnPercent()/100));
  const jumlahTotal = createMemo(() => dpp() + ppn());

  const totals = createMemo(() => ({
    subTotal: subTotal(),
    dpp: dpp(),
    ppn: ppn(),
    grand: jumlahTotal(),
    totalMeter: totalMeter(),
    totalYard: totalYard(),
    totalKilogram: totalKilogram(),
  }));

  // ===== Pagination =====
  const ROWS_FIRST_PAGE = 18;
  const ROWS_OTHER_PAGES = 18;

  const pagesWithOffsets = createMemo(() =>
    splitIntoPagesWithOffsets(data().items || [], ROWS_FIRST_PAGE, ROWS_OTHER_PAGES)
  );

  return (
    <>
      <style>{`
        :root { --safe: 10mm; }                    /* zona aman dari tepi printer */

        @page { size: A4 portrait; margin: 0; }
        html, body {
          margin: 0; /* <-- Ubah ke 0 */
          padding: 0;
          height: 100%;
          width: 100%;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          font-family: sans-serif;
          display: flex;
          justify-content: center;
        }
        .page {
          width: 210mm;
          height: 285mm;                           /* sedikit < 297mm agar tidak mepet */
          padding: 0;
          box-sizing: border-box;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .safe {
          width: 100%;
          height: 100%;
          padding: var(--safe);                    /* semua konten di dalam zona aman */
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: center;
        }

        table { page-break-inside: auto; border-collapse: collapse; }
        tr     { page-break-inside: avoid; }
        @media print {
          .page { page-break-after: always; }
          .page:last-child { page-break-after: auto; }
        }
      `}</style>

      <Show
        when={printType() === "default"}
        fallback={
          <For each={pagesWithOffsets()}>
            {(p, idx) => {
              const pageIndex = idx();
              const count = pagesWithOffsets().length;
              const isLast = pageIndex === count - 1;
              return (
                <PrintPage
                  data={data()}
                  items={p.items}
                  startIndex={p.offset}
                  pageNo={pageIndex + 1}
                  pageCount={count}
                  isPPN={isPPN()}
                  isLast={isLast}
                  totals={totals()}
                  satuanUnitName={satuanUnitName()}
                  createdAtDate={createdAtDate()}
                  formatters={{ 
                    formatTanggal, 
                    formatRupiah, 
                    formatAngka, 
                    formatAngkaNonDecimal,
                    getSatuanUnitName 
                  }}
                  logoNavel={logoNavel}
                  printType={printType()}
                />
              );
            }}
          </For>
        }
      >

        {/* 1. Render semua halaman "gudang" */}
        <For each={pagesWithOffsets()}>
          {(p, idx) => {
            const pageIndex = idx();
            const count = pagesWithOffsets().length;
            const isLast = pageIndex === count - 1;
            return (
              <PrintPage
                data={data()}
                items={p.items}
                startIndex={p.offset}
                pageNo={pageIndex + 1}
                pageCount={count}
                isPPN={isPPN()}
                isLast={isLast}
                totals={totals()}
                satuanUnitName={satuanUnitName()}
                createdAtDate={createdAtDate()}
                formatters={{ 
                  formatTanggal, 
                  formatRupiah, 
                  formatAngka, 
                  formatAngkaNonDecimal,
                  getSatuanUnitName 
                }}
                logoNavel={logoNavel}
                printType={"gudang"}
              />
            );
          }}
        </For>

        {/* 2. Render semua halaman "pabrik" */}
        <For each={pagesWithOffsets()}>
          {(p, idx) => {
            const pageIndex = idx();
            const count = pagesWithOffsets().length;
            const isLast = pageIndex === count - 1;
            return (
              <PrintPage
                data={data()}
                items={p.items}
                startIndex={p.offset}
                pageNo={pageIndex + 1}
                pageCount={count}
                isPPN={isPPN()}
                isLast={isLast}
                totals={totals()}
                satuanUnitName={satuanUnitName()}
                createdAtDate={createdAtDate()}
                formatters={{ 
                  formatTanggal, 
                  formatRupiah, 
                  formatAngka, 
                  formatAngkaNonDecimal,
                  getSatuanUnitName 
                }}
                logoNavel={logoNavel}
                printType={"pabrik"}
              />
            );
          }}
        </For>
      </Show>
    </>
  );
}

function PrintPage(props) {
  const { 
    data, 
    items, 
    startIndex, 
    pageNo, 
    pageCount, 
    isPPN, 
    isLast, 
    totals, 
    satuanUnitName,
    createdAtDate,
    formatters, 
    logoNavel, 
    printType 
  } = props;
  
  const { formatTanggal, formatRupiah, formatAngka, formatAngkaNonDecimal } = formatters;

  const showNote = createMemo(() => printType === "gudang");
  const showInstruksi = createMemo(() => printType === "pabrik");

  // Inisialisasi stretch
  const { extraRows, bind, recalc } = createStretch({ fudge: 40 });

  createEffect(() => {
    (items?.length ?? 0);
    isLast;
    requestAnimationFrame(recalc);
  });

  // Fungsi untuk mendapatkan quantity berdasarkan satuan
  const getQuantity = (item) => {
    switch(satuanUnitName) {
      case 'Meter': return parseFloat(item.meter_total || 0);
      case 'Yard': return parseFloat(item.yard_total || 0);
      case 'Kilogram': return parseFloat(item.kilogram_total || 0);
      default: return parseFloat(item.meter_total || 0);
    }
  };

  // Fungsi untuk mendapatkan total quantity
  const getTotalQuantity = () => {
    switch(satuanUnitName) {
      case 'Meter': return totals.totalMeter;
      case 'Yard': return totals.totalYard;
      case 'Kilogram': return totals.totalKilogram;
      default: return totals.totalMeter;
    }
  };

  return (
    <div ref={bind("pageRef")} className="page">
      <div className="safe">
        {/* row measurer */}
        <table style="position:absolute; top:-10000px; left:-10000px; visibility:hidden;">
          <tbody>
            <tr ref={bind("measureRowRef")}>
              <td className="p-1 text-center h-5"></td>
              <td className="p-1 text-center"></td>
              <td className="p-1"></td>
              <td className="p-1 text-center"></td>
              <td className="p-1 text-center"></td>
              <td className="p-1 text-right"></td>
              <td className="p-1 text-right"></td>
              <td className="p-1 text-right"></td>
              <td className="p-1 text-right"></td>
            </tr>
          </tbody>
        </table>

        {/* HEADER */}
        <img
          className="w-24"
          src={logoNavel}
          alt=""
          onLoad={recalc}
          hidden={!isPPN}
        />

        <h1 className="text-xl uppercase font-bold">Order Celup EX</h1>

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
                  {data.nama_supplier}
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
              <tr>
                <td className="px-2 py-1 whitespace-nowrap">
                  Telp: {data.no_telp}
                </td>
                <td className="px-2 py-1 whitespace-nowrap">Fax:</td>
              </tr>
            </tbody>
          </table>

          {/* RIGHT TABLE */}
          <table className="w-[55%] border-2 border-black table-fixed text-sm">
            <tbody>
              {[
                { label: "No. OCX", value: data.no_po_ex },
                { label: "Tanggal", value: formatTanggal(createdAtDate) },
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
        <table ref={bind("tableRef")} className="w-full table-fixed border border-black text-[12px] border-collapse mt-3">
          <thead ref={bind("theadRef")} className="bg-gray-200">
            <tr>
              <th className="border border-black p-1 w-[4%]" rowSpan={2}>No</th>
              <th className="border border-black p-1 w-[15%]" rowSpan={2}>Jenis Kain</th>
              <th className="border border-black p-1 w-[12%]" rowSpan={2}>Warna Ex</th>
              <th className="border border-black p-1 w-[12%]" rowSpan={2}>Warna Baru</th>
              <th className="border border-black p-1 w-[10%]" rowSpan={2}>Lebar Finish</th>
              <th className="border border-black p-1 w-[10%] text-center" colSpan={2}>Quantity</th>
            </tr>
            <tr>
              <th className="border border-black p-1 w-[24%]" colSpan={2}>
                {satuanUnitName}
              </th>
            </tr>
          </thead>

          <tbody ref={bind("tbodyRef")}>
            <For each={items}>
              {(item, i) => (
                <tr>
                  <td className="p-1 text-center break-words">{startIndex + i() + 1}</td>
                  <td className="p-1 text-center break-words">{item.corak_kain || "-"}</td>
                  <td className="p-1 break-words text-center">{item.kode_warna_ex || "-"}</td>
                  <td className="p-1 break-words text-center">{item.kode_warna_new || "-"}</td>
                  <td className="p-1 text-center break-words">
                    {formatAngkaNonDecimal(item.lebar_finish)}"
                  </td>
                  <td colSpan={2} className="p-1 text-center break-words">
                    {formatAngka(getQuantity(item))}
                  </td>
                </tr>
              )}
            </For>

            {/* Tambahin row kosong */}
            <For each={Array.from({ length: extraRows() })}>
              {() => (
                <tr>
                  <td className="p-1 text-center h-5"></td>
                  <td className="p-1 text-center"></td>
                  <td className="p-1"></td>
                  <td className="p-1 text-center"></td>
                  <td className="p-1 text-center"></td>
                  <td colSpan={2} className="p-1 text-center"></td>
                </tr>
              )}
            </For>
          </tbody>

          <tfoot ref={bind("tfootRef")}>
            {/* Total lengkap hanya di halaman terakhir */}
            <Show when={isLast}>
              <tr>
                <td colSpan={5} className="border border-black font-bold px-2 py-1">
                  Total:
                </td>
                <td colSpan={2} className="border border-black px-2 py-1 text-center font-bold">
                  {formatAngka(getTotalQuantity())}
                </td>
              </tr>
              <tr hidden>
                <td colSpan={7} className="px-2 py-1"/>
                <td className="px-2 py-1 text-right font-bold">Sub Total</td>
                <td className="px-2 py-1 text-right">
                  {formatRupiah(totals.subTotal)}
                </td>
              </tr>
              <tr hidden>
                <td colSpan={7} className="px-2 py-1"/>
                <td className="px-2 py-1 text-right font-bold">DPP</td>
                <td className="px-2 py-1 text-right">
                  {formatRupiah(totals.dpp)}
                </td>
              </tr>
              <tr hidden>
                <td colSpan={7} className="px-2 py-1"/>
                <td className="px-2 py-1 text-right font-bold">PPN</td>
                <td className="px-2 py-1 text-right">
                  {formatRupiah(totals.ppn)}
                </td>
              </tr>
              <tr hidden>
                <td colSpan={7} className="px-2 py-1"/>
                <td className="px-2 py-1 text-right font-bold">Jumlah Total</td>
                <td className="px-2 py-1 text-right">
                  {formatRupiah(totals.grand)}
                </td>
              </tr>
              <tr>
                {/* Case 1: Tampilkan NOTE (gudang) */}
                <Show when={showNote() && !showInstruksi()}>
                  <td colSpan={7} className="border border-black p-2 align-top">
                    <div className="font-bold mb-1">NOTE:</div>
                    <div className="whitespace-pre-wrap break-words italic">
                      {data.keterangan ?? "-"}
                    </div>
                  </td>
                </Show>

                {/* Case 2: Tampilkan INSTRUKSI (pabrik) */}
                <Show when={!showNote() && showInstruksi()}>
                  <td colSpan={7} className="border border-black p-2 align-top">
                    <div className="font-bold mb-1">INSTRUKSI SPESIAL:</div>
                    <div className="whitespace-pre-wrap break-words italic">
                      {data.instruksi_spesial ?? "-"}
                    </div>
                  </td>
                </Show>
              </tr>
              <tr>
                <td colSpan={7} className="border border-black">
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
            </Show>
            <tr>
              <td colSpan={7} className="border border-black px-2 py-1 text-right italic">
                Halaman {pageNo} dari {pageCount}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}