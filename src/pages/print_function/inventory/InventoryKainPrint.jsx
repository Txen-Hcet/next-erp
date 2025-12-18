import { createMemo, createEffect, For, Show, createSignal, onMount } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import logoNavel from "../../../assets/img/navelLogo.png";
import { splitIntoPagesWithOffsets, createStretch } from "../../../components/PrintUtils";

export default function InventoryKainPrint(props) {
  const [items, setItems] = createSignal([]);

  // ===== LOGIKA PARSING DATA (FIX) =====
  onMount(() => {
    // Skenario 1: Data dikirim via Props (jika dirender sebagai komponen anak)
    if (props.data && Array.isArray(props.data)) {
      setItems(props.data);
      return;
    }

    // Skenario 2: Data dikirim via URL Hash (window.open dari InventoryKainList)
    const hash = window.location.hash;
    if (hash.length > 1) {
      try {
        // Ambil string setelah tanda '#'
        const rawString = hash.substring(1);
        const jsonString = decodeURIComponent(rawString);
        const parsedObject = JSON.parse(jsonString);

        // InventoryKainList mengirim format: { title, printed_at, data: [...] }
        if (parsedObject.data && Array.isArray(parsedObject.data)) {
          setItems(parsedObject.data);
        } else if (Array.isArray(parsedObject)) {
          // Fallback jika yang dikirim langsung array
          setItems(parsedObject);
        }
      } catch (error) {
        console.error("Gagal membaca data print:", error);
      }
    }
  });

  // ===== Helper Functions =====
  function formatTanggal(s) {
    if (!s) return "-";
    const d = new Date(s);
    if (isNaN(d.getTime())) return "-";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}-${mm}-${yy}`;
  }

  function formatAngka(v, decimals = 2) {
    if (typeof v !== "number") v = parseFloat(v) || 0;
    if (v === 0) return "0,00";
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(v);
  }

  // ===== Computed Values untuk Total =====
  const totalMeter = createMemo(() => 
    items().reduce((sum, item) => sum + parseFloat(item.meter_awal || 0), 0)
  );
  
  const totalYard = createMemo(() => 
    items().reduce((sum, item) => sum + parseFloat(item.yard_awal || 0), 0)
  );

  const totalKilogram = createMemo(() => 
    items().reduce((sum, item) => sum + parseFloat(item.kilogram_awal || 0), 0)
  );

  const totals = createMemo(() => ({
    totalMeter: totalMeter(),
    totalYard: totalYard(),
    totalKilogram: totalKilogram(),
  }));

  // ===== Pagination =====
  const ROWS_FIRST_PAGE = 18; 
  const ROWS_OTHER_PAGES = 18;

  const pagesWithOffsets = createMemo(() =>
    splitIntoPagesWithOffsets(items(), ROWS_FIRST_PAGE, ROWS_OTHER_PAGES)
  );

  return (
    <>
      <style>{`
        :root { --safe: 10mm; }

        @page { size: A4 landscape; margin: 0; }
        html, body {
          margin: 0;
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
          width: 297mm;
          height: 209mm;
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
          padding: var(--safe);
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

      {/* Tampilkan Loading jika items masih kosong */}
      <Show when={items().length > 0} fallback={<div class="p-10">Memuat data print... (Jika tidak muncul, pastikan data tidak kosong)</div>}>
        <For each={pagesWithOffsets()}>
          {(p, idx) => {
            const pageIndex = idx();
            const count = pagesWithOffsets().length;
            const isLast = pageIndex === count - 1;
            return (
              <PrintPage
                items={p.items}
                startIndex={p.offset}
                pageNo={pageIndex + 1}
                pageCount={count}
                isLast={isLast}
                totals={totals()}
                formatters={{ 
                  formatTanggal, 
                  formatAngka, 
                }}
                logoNavel={logoNavel}
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
    items, 
    startIndex, 
    pageNo, 
    pageCount, 
    isLast, 
    totals, 
    formatters, 
    logoNavel, 
  } = props;
  
  const { formatAngka } = formatters;
  const { extraRows, bind, recalc } = createStretch({ fudge: 40 });

  createEffect(() => {
    (items?.length ?? 0);
    isLast;
    requestAnimationFrame(recalc);
  });

  return (
    <div ref={bind("pageRef")} className="page">
      <div className="safe">
        <table style="position:absolute; top:-10000px; left:-10000px; visibility:hidden;">
          <tbody>
            <tr ref={bind("measureRowRef")}>
               <td className="p-1 h-8"></td>
            </tr>
          </tbody>
        </table>

        {/* HEADER */}
        <div className="w-full flex justify-between items-center border-b-2 border-black pb-2 mb-2">
            <div className="flex items-center gap-4">
                <img className="w-20" src={logoNavel} alt="Logo" onLoad={recalc} />
                <h1 className="text-2xl uppercase font-bold">Laporan Inventory Kain</h1>
            </div>
            <div className="text-sm">
                Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}
            </div>
        </div>

        {/* ITEM TABLE */}
        <table ref={bind("tableRef")} className="w-full table-fixed border border-black text-[12px] border-collapse">
          <thead ref={bind("theadRef")} className="bg-gray-200 text-center font-bold">
            <tr>
              <th className="border border-black p-2 w-[4%]" rowSpan={2}>NO</th>
              <th className="border border-black p-2 w-[30%]" rowSpan={2}>JENIS KAIN</th>
              <th className="border border-black p-2 w-[24%]" rowSpan={2}>WARNA KAIN</th>
              <th className="border border-black p-1" colSpan={3}>QUANTITY</th>
            </tr>
            <tr>
              <th className="border border-black p-1 w-[14%]">METER</th>
              <th className="border border-black p-1 w-[14%]">YARD</th>
              <th className="border border-black p-1 w-[14%]">KILOGRAM</th>
            </tr>
          </thead>

          <tbody ref={bind("tbodyRef")}>
            <For each={items}>
              {(item, i) => (
                <tr>
                  <td className="border border-black p-1 text-center align-middle">
                    {startIndex + i() + 1}
                  </td>
                  <td className="border border-black p-1 align-middle whitespace-pre-wrap text-center">
                    {item.corak_kain || "-"} | {item.konstruksi_kain || "-"}
                  </td>
                  <td className="border border-black p-1 align-middle whitespace-pre-wrap text-center">
                    {item.kode_warna || "-"} | {item.deskripsi_warna || "-"}
                  </td>
                  <td className="border border-black p-1 text-center align-middle">
                    {formatAngka(item.meter_awal)}
                  </td>
                  <td className="border border-black p-1 text-center align-middle">
                    {formatAngka(item.yard_awal)}
                  </td>
                  <td className="border border-black p-1 text-center align-middle">
                    {formatAngka(item.kilogram_awal)}
                  </td>
                </tr>
              )}
            </For>

            <For each={Array.from({ length: extraRows() })}>
              {() => (
                <tr>
                  <td className="border border-black p-1 h-6"></td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1"></td>
                </tr>
              )}
            </For>
          </tbody>

          <tfoot ref={bind("tfootRef")}>
            <Show when={isLast}>
              <tr className="bg-gray-100 font-bold">
                <td colSpan={3} className="border border-black p-2 text-right">
                  TOTAL
                </td>
                <td className="border border-black p-2 text-center">
                  {formatAngka(totals.totalMeter)}
                </td>
                <td className="border border-black p-2 text-center">
                  {formatAngka(totals.totalYard)}
                </td>
                <td className="border border-black p-2 text-center">
                  {formatAngka(totals.totalKilogram)}
                </td>
              </tr>
            </Show>
            
            <tr>
              <td colSpan={6} className="px-2 py-1 text-right italic text-[10px] border-t border-black">
                Halaman {pageNo} dari {pageCount}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}