// src/pages/print/ReturSalesPrint.jsx
import { createMemo, createEffect, For, Show } from "solid-js";
import logoNavel from "../../../assets/img/navelLogo.png";
import { splitIntoPagesWithOffsets, createStretch } from "../../../components/PrintUtils";

export default function ReturSalesPrint(props) {
  // props.data harus berupa objek retur dari GET /sales-retur/:id
  // (masih support jika caller mengirim { order: ... })
  const root = createMemo(() => props.data?.retur ?? props.data?.order ?? props.data ?? {});

  const unit  = createMemo(() => root().satuan_unit || root().satuan_unit_name || "Meter");
  const isPPN = createMemo(() => Number(root().ppn ?? root().ppn_percent) > 0);

  /* ========= Helpers ========= */
  function formatTanggal(s) {
    if (!s) return "-";
    const d  = new Date(s);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}-${mm}-${yy}`;
  }
  function formatAngka(v, decimals = 2) {
    const n = typeof v === "number" ? v : parseFloat(String(v ?? "0"));
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n || 0);
  }
  const num = (v) => (v == null ? 0 : Number.parseFloat(String(v)) || 0);
  const nonEmptyUniq = (arr) =>
    Array.from(new Set(arr.map((x) => String(x ?? "").trim()).filter(Boolean)));

  /* ========= DISPLAY ROWS (prioritas dari retur.items) ========= */
  const displayRows = createMemo(() => {
    const r = root();
    const items = Array.isArray(r.items) ? r.items : [];
    if (!items.length) return [];

    return items.map((it) => {
      const rolls = Array.isArray(it.rolls) ? it.rolls : [];

      // Kolom identitas – ambil dari item retur, fallback ke "-" bila null
      const kode  = it.corak_kain ?? it.konstruksi_kain ?? "-";            // "Jenis Kain"
      const warna = it.so_deskripsi_warna ?? it.pl_deskripsi_warna
                 ?? it.keterangan_warna ?? "-";
      const lebar = it.lebar ?? "-";
      const grade = it.grade_name ?? "-";

      // Lot & Bal dari detail roll; sertakan hint lot dari item jika ada
      const lotList = nonEmptyUniq(
          rolls.map((r) => r.lot ?? r.Lot ?? r.lot_no ?? "")
      );
      const balList = nonEmptyUniq(rolls.map((r) => r.no_bal ?? r.noBal ?? r.Bal ?? ""))
        .sort((a, b) => Number(a) - Number(b));

      // Totals & TTL/PCS — PRIORITASKAN dari rolls
      const rolls_count = it.gulung != null ? num(it.gulung) : rolls.length;

      const meter_total = rolls.length > 0
        ? rolls.reduce((s, r) => s + num(r.meter_roll ?? r.meter), 0)
        : num(it.meter_total);

      const yard_total = rolls.length > 0
        ? rolls.reduce((s, r) => s + num(r.yard_roll ?? r.yard), 0)
        : num(it.yard_total);


      return {
        kode,
        warna,
        lebar,
        grade,
        lot:   lotList.length ? lotList.join(", ") : "-",
        no_bal: balList.length ? balList.join(", ") : "-",
        meter_total,
        yard_total,
        rolls_count,
      };
    });
  });

  /* ========= Totals & Pagination ========= */
  const totalPCS   = createMemo(() => displayRows().reduce((s, it) => s + num(it.rolls_count), 0));
  const totalMeter = createMemo(() => displayRows().reduce((s, it) => s + num(it.meter_total), 0));
  const totalYard  = createMemo(() => displayRows().reduce((s, it) => s + num(it.yard_total), 0));

  // jumlah baris per halaman (portrait letter, body 5.4in)
  const ROWS_FIRST_PAGE  = 9;
  const ROWS_OTHER_PAGES = 9;
  const pagesWithOffsets = createMemo(() =>
    splitIntoPagesWithOffsets(displayRows(), ROWS_FIRST_PAGE, ROWS_OTHER_PAGES)
  );

  return (
    <>
      <style>{`
        :root { --safe: 8mm; }
        @page { size: 8.5in 11in; margin: 0; }
        html, body {
          margin: 0; padding: 0; height: 100%; width: 100%;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue";
          display: flex; justify-content: center;
        }
        .page {
          width: 8.5in; height: 5.4in;
          position: relative; box-sizing: border-box;
          display: flex; flex-direction: column; align-items: center;
        }
        .safe { width: 100%; height: 100%; padding: var(--safe); box-sizing: border-box;
          display: flex; flex-direction: column; gap: 6px; align-items: stretch; }
        table { border-collapse: collapse; page-break-inside: auto; width: 100%; }
        tr { page-break-inside: avoid; }
        td, th { line-height: 1.25; }
        tbody td { min-height: 1.25rem; }
        @media print {
          .page { page-break-after: always; }
          .page:last-child { page-break-after: auto; }
        }
      `}</style>

      <For each={pagesWithOffsets()}>
        {(p, idx) => {
          const pageIndex = idx();
          const count = pagesWithOffsets().length;
          const isLast = pageIndex === count - 1;
          return (
            <PrintPage
              data={root()}
              items={p.items}
              startIndex={p.offset}
              pageNo={pageIndex + 1}
              pageCount={count}
              isPPN={isPPN()}
              isLast={isLast}
              totals={{ totalPCS: totalPCS(), totalMeter: totalMeter(), totalYard: totalYard() }}
              formatters={{ formatTanggal, formatAngka }}
              unit={unit()}
              logoNavel={logoNavel}
            />
          );
        }}
      </For>
    </>
  );
}

/* ========= Single Page ========= */
function PrintPage(props) {
  const { data, items, startIndex, pageNo, pageCount, isPPN, isLast, totals, formatters, unit, logoNavel } = props;
  const { formatTanggal, formatAngka } = formatters;

  const { extraRows, bind, recalc } = createStretch({ fudge: 24 });

  createEffect(() => {
    (items?.length ?? 0);
    isLast;
    isPPN;
    const go = () => requestAnimationFrame(recalc);
    if (document.fonts?.ready) document.fonts.ready.then(go); else go();
  });

  return (
    <div ref={bind("pageRef")} className="page">
      <div className="safe">
        {/* Measurer */}
        <table style="position:absolute; top:-10000px; left:-10000px; visibility:hidden;">
          <tbody>
            <tr ref={bind("measureRowRef")}>
              <td class="p-1 text-center h-5"></td>
              <td class="p-1 text-center"></td>
              <td class="p-1"></td>
              <td class="p-1 text-center"></td>
              <td class="p-1 text-center"></td>
              <td class="p-1 text-center"></td>
              <td class="p-1 text-center"></td>
              <td class="p-1 text-center"></td>
              <td class="p-1 text-right"></td>
            </tr>
          </tbody>
        </table>

        {/* HEADER */}
        <div className="w-full flex flex-col items-center justify-center gap-1 text-center">
          <img
            className="w-20 block"
            src={logoNavel}
            alt=""
            onLoad={recalc}
            style={{ display: isPPN ? "block" : "none" }}
          />
          <h1 className="text-lg uppercase font-bold">Retur Penjualan</h1>
        </div>

        {/* Info header (2 kolom) */}
        <div className="w-full grid gap-2 text-[11px] grid-cols-[50%_50%]">
          {/* Kiri: Kepada Yth */}
          <table className="border-2 border-black table-fixed">
            <tbody>
              <tr>
                <td className="px-2 pt-1 max-w-[280px] break-words whitespace-pre-wrap" colSpan={2}>
                  Kepada Yth:
                </td>
              </tr>
              <tr>
                <td className="px-2 max-w-[280px] break-words whitespace-pre-wrap" colSpan={2}>
                  {data.customer_name}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Kanan: Info */}
          <table className="border-2 border-black table-fixed w-full text-[10px] leading-tight">
            <colgroup>
              <col style="width:15%" />
              <col style="width:6%" />
              <col style="width:60%" />
            </colgroup>
            <tbody>
              <tr>
                <td className="font-bold px-2 py-1 whitespace-nowrap">No. Retur</td>
                <td className="text-center whitespace-nowrap">:</td>
                <td className="px-2 py-1 break-words">{data.no_retur}</td>
              </tr>
              <tr>
                <td className="font-bold px-2 py-1 whitespace-nowrap">Tanggal</td>
                <td className="text-center whitespace-nowrap">:</td>
                <td className="px-2 py-1 break-words">
                  {formatTanggal(data.created_at)}
                </td>
              </tr>
              <tr>
                <td className="font-bold px-2 py-1 whitespace-nowrap">No. SJ</td>
                <td className="text-center whitespace-nowrap">:</td>
                <td className="px-2 py-1 break-words">{data.no_sj}</td>
              </tr>
              {/* <tr>
                <td className="font-bold px-2 py-1 whitespace-nowrap">No. Mobil</td>
                <td className="text-center whitespace-nowrap">:</td>
                <td className="px-2 py-1 break-words">{data.no_mobil}</td>
              </tr>
              <tr>
                <td className="font-bold px-2 py-1 whitespace-nowrap">Sopir</td>
                <td className="text-center whitespace-nowrap">:</td>
                <td className="px-2 py-1 break-words">{data.sopir}</td>
              </tr> */}
            </tbody>
          </table>
        </div>

        {/* TABEL ITEM */}
        <table ref={bind("tableRef")} className="w-full table-fixed border border-black text-[11px] border-collapse mt-1">
          <thead ref={bind("theadRef")}>
            <tr>
              <th className="border border-black p-1 w-[6%]" rowSpan={2}>No</th>
              <th className="border border-black p-1 w-[9%]" rowSpan={2}>Bal</th>
              <th className="border border-black p-1 w-[18%]" rowSpan={2}>Jenis Kain</th>
              <th className="border border-black p-1 w-[12%]" rowSpan={2}>Lot</th>
              <th className="border border-black p-1 w-[15%]" rowSpan={2}>Warna</th>
              <th className="border border-black p-1 w-[8%]"  rowSpan={2}>Lebar</th>
              <th className="border border-black p-1 w-[8%]"  rowSpan={2}>Grade</th>
              <th className="border border-black p-1 w-[12%]" rowSpan={2}>TTL/PCS</th>
              <th className="border border-black p-1 w-[12%] text-center" colSpan={2}>Quantity</th>
            </tr>
            <tr>
              <th className="border border-black p-1 text-center" colSpan={2}><span>({unit})</span></th>
            </tr>
          </thead>

        <tbody ref={bind("tbodyRef")}>
          <For each={items}>
            {(it, i) => (
              <tr>
                <td className="p-1 text-center break-words">{startIndex + i() + 1}</td>
                <td className="p-1 text-center break-words">{it.no_bal}</td>
                <td className="p-1 break-words text-center">{it.kode}</td>
                <td className="p-1 text-center break-words">{it.lot}</td>
                <td className="p-1 break-words text-center">{it.warna}</td>
                <td className="p-1 text-center break-words"><span>{it.lebar}"</span></td>
                <td className="p-1 text-center break-words">{it.grade}</td>
                <td className="p-1 text-center break-words">{it.rolls_count}</td>
                <td colSpan={2} className="p-1 text-center break-words">
                  {unit === "Yard" ? formatAngka(it.yard_total) : formatAngka(it.meter_total)}
                </td>
              </tr>
            )}
          </For>

          {/* stretch rows */}
          {/* <For each={Array.from({ length: extraRows() })}>
            {() => (
              <tr>
                <td className="p-1 text-center h-5"></td>
                <td className="p-1 text-center"></td>
                <td className="p-1"></td>
                <td className="p-1 text-center"></td>
                <td className="p-1"></td>
                <td className="p-1 text-center"></td>
                <td className="p-1 text-center"></td>
                <td className="p-1 text-center"></td>
                <td className="p-1 text-right" colSpan={2}></td>
              </tr>
            )}
          </For> */}
        </tbody>

          <tfoot ref={bind("tfootRef")} className="text-[11px]">
            <Show when={isLast}>
              <tr>
                <td colSpan={7} className="border border-black text-right font-bold px-2 py-1">TOTAL</td>
                <td className="border border-black px-2 py-1 text-center font-bold">{formatAngka(totals.totalPCS, 0)}</td>
                <td className="border border-black px-2 py-1 text-center font-bold" colSpan={2}>
                  {unit === "Yard" ? formatAngka(totals.totalYard) : formatAngka(totals.totalMeter)}
                </td>
              </tr>
              <tr>
                <td colSpan={10} className="border border-black p-2 align-top">
                  <div className="font-bold mb-1">Keterangan:</div>
                  <div className="whitespace-pre-wrap break-words italic">{data.keterangan_retur ?? "-"}</div>
                </td>
              </tr>
              <tr>
                <td colSpan={10} className="border border-black">
                  <div className="w-full flex justify-between text-[11px] py-4 px-2">
                    <div className="text-center w-1/3">Yang Menerima<br/><br/><br/>( ...................... )</div>
                    <div className="text-center w-1/3">Menyetujui<br/><br/><br/>( ...................... )</div>
                    <div className="text-center w-1/3">Yang Membuat<br/><br/><br/>( ...................... )</div>
                    {/* <div className="text-center w-1/4">Sopir<br/><br/><br/>( ...................... )</div> */}
                  </div>
                </td>
              </tr>
            </Show>
            <tr>
              <td colSpan={10} className="border border-black px-2 py-1 text-right italic">
                Halaman {pageNo} dari {pageCount}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
