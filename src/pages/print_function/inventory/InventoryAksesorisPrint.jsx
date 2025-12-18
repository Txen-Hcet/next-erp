import { createMemo, createEffect, For, Show, createSignal, onMount } from "solid-js";
import logoNavel from "../../../assets/img/navelLogo.png";
import { splitIntoPagesWithOffsets, createStretch } from "../../../components/PrintUtils";

export default function InventoryAksesorisPrint(props) {
  const [items, setItems] = createSignal([]);

  // ===== LOGIKA PARSING DATA (FIX) =====
  onMount(() => {
    // Skenario 1: Data dikirim via Props
    if (props.data && Array.isArray(props.data)) {
      setItems(props.data);
      return;
    }

    // Skenario 2: Data dikirim via URL Hash
    const hash = window.location.hash;
    if (hash.length > 1) {
      try {
        const rawString = hash.substring(1);
        const jsonString = decodeURIComponent(rawString);
        const parsedObject = JSON.parse(jsonString);

        if (parsedObject.data && Array.isArray(parsedObject.data)) {
          setItems(parsedObject.data);
        } else if (Array.isArray(parsedObject)) {
          setItems(parsedObject);
        }
      } catch (error) {
        console.error("Gagal membaca data print:", error);
      }
    }
  });

  // ===== Helper Functions =====
  function formatAngka(v, decimals = 2) {
    if (typeof v !== "number") v = parseFloat(v) || 0;
    if (v === 0) return "0,00";
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(v);
  }

  // ===== Computed Values untuk Total =====
  const totalQuantity = createMemo(() => 
    items().reduce((sum, item) => sum + parseFloat(item.kuantitas_awal || 0), 0)
  );

  // ===== Pagination =====
  const ROWS_FIRST_PAGE = 20; 
  const ROWS_OTHER_PAGES = 25;

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
                totalQuantity={totalQuantity()}
                formatters={{ formatAngka }}
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
    totalQuantity, 
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
                <h1 className="text-2xl uppercase font-bold">Laporan Inventory Aksesoris</h1>
            </div>
            <div className="text-sm">
                Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}
            </div>
        </div>

        {/* ITEM TABLE */}
        <table ref={bind("tableRef")} className="w-full table-fixed border border-black text-[12px] border-collapse">
          <thead ref={bind("theadRef")} className="bg-gray-200 text-center font-bold">
            <tr>
              <th className="border border-black p-2 w-[5%]">NO</th>
              <th className="border border-black p-2 w-[35%]">NAMA AKSESORIS</th>
              <th className="border border-black p-2 w-[45%]">DESKRIPSI AKSESORIS</th>
              <th className="border border-black p-2 w-[15%]">QUANTITY</th>
            </tr>
          </thead>

          <tbody ref={bind("tbodyRef")}>
            <For each={items}>
              {(item, i) => (
                <tr>
                  <td className="border border-black p-1 text-center align-middle">
                    {startIndex + i() + 1}
                  </td>
                  <td className="border border-black p-1 text-center align-middle">
                    {item.nama_aksesoris || "-"}
                  </td>
                  <td className="border border-black p-1 text-center align-middle">
                    {item.deskripsi_aksesoris || "-"}
                  </td>
                  <td className="border border-black p-1 text-center align-middle">
                    {formatAngka(item.kuantitas_awal)}
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
                </tr>
              )}
            </For>
          </tbody>

          <tfoot ref={bind("tfootRef")}>
            <Show when={isLast}>
              <tr className="bg-gray-100 font-bold">
                <td colSpan={3} className="border border-black p-2 text-right">
                  TOTAL QUANTITY
                </td>
                <td className="border border-black p-2 text-center">
                  {formatAngka(totalQuantity)}
                </td>
              </tr>
            </Show>
            
            <tr>
              <td colSpan={4} className="px-2 py-1 text-right italic text-[10px] border-t border-black">
                Halaman {pageNo} dari {pageCount}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}