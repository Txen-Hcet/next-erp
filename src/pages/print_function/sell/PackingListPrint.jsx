import { createMemo, createSignal, For, Show, onMount, createEffect } from "solid-js";
import logoNavel from "../../../assets/img/navelLogo.png";
import { splitIntoPagesWithOffsets, createStretch } from "../../../components/PrintUtils";

export default function PackingListPrint(props) {
  const [plData, setPlData] = createSignal(props.data ?? null);

  // fallback ke localStorage bila props tidak ada
  onMount(() => {
    document.body.dataset.paper = isContinuous() ? "CONTINUOUS95" : "A4";
    if (!plData()) {
      try {
        const raw = localStorage.getItem("printData");
        if (raw) setPlData(JSON.parse(raw));
      } catch (e) {
        console.error("Gagal parse localStorage printData:", e);
      }
    }
  });

  const data = createMemo(() => plData() ?? { itemGroups: [], sales_order_items: {} });

  // A4 (default) / continuous 9.5" (rangkap 3)
  const paperType = createMemo(() => {
    const q = new URLSearchParams(window.location.search);
    return (q.get("paper") || "").toUpperCase() === "CONTINUOUS95"
      ? "CONTINUOUS95"
      : "A4";
  });
  const isContinuous = createMemo(() => paperType() === "CONTINUOUS95");

  // mm untuk halaman & lebar konten aman (antara lubang traktor)
  const PAGE_MM = createMemo(() =>
    paperType() === "CONTINUOUS95"
      ? { w: 241, h: 279, safeL: 12, safeR: 12, safeT: 8, safeB: 10, contentW: 217 }
      : { w: 210, h: 297, safeL: 10, safeR: 10, safeT: 10, safeB: 10, contentW: 190 }
  );

  /* ===== Helpers ===== */
  const isEkspor = createMemo(() => {
    const t = data()?.type;
    const s = (t == null ? "" : String(t)).trim().toUpperCase();
    if (s === "2" || s === "E" || s === "EKSPOR") return true;
    if (s === "1" || s === "D" || s === "DOMESTIK") return false;
    const noSO = data()?.sales_order_items?.no_so || "";
    const kode = (noSO.split("/")[1] || "").toUpperCase();
    return kode === "E";
  });

  const MAX_COL = createMemo(() => (isEkspor() ? 10 : 5));

  const unit = createMemo(() =>
    (data()?.satuan_unit || data()?.sales_order_items?.satuan_unit || "")
      .toString()
      .toLowerCase()
  );
  const ROLL_KEY = createMemo(() => {
    const map = {
      yard: "yard",
      meter: "meter",
      kilogram: "kilogram",
    };
    return map[unit()] || "meter"; // default ke meter kalau tidak ditemukan
  });

  const todayStr = createMemo(() =>
    new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })
  );
  const createdShort = createMemo(() => {
    const src =
      data()?.sales_order_items?.created_at ||
      data()?.created_at ||
      new Date().toISOString();
    const d = new Date(src.replace(" ", "T"));
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }); // 15 Sep 2025
  });

  function fmt2(v) {
    if (v === null || v === undefined || v === "" || Number.isNaN(Number(v))) return "0,00";
    return new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v));
  }

  // peta item id -> nama corak
  const itemsMap = createMemo(() =>
    Object.fromEntries((data()?.sales_order_items?.items || []).map((it) => [it.id, it.corak_kain]))
  );

  // peta colorId -> deskripsi warna
  const colorDescMap = createMemo(() =>
    Object.fromEntries(
      (data()?.sales_order_items?.items || []).map((it) => [
        it.warna_id ?? it.color_id ?? it.warna?.id ?? it.col ?? "",
        it.deskripsi_warna ?? it.warna_deskripsi ?? it.warna?.deskripsi ?? it.color_desc ?? "",
      ])
    )
  );

  /* ===== Flatten rows (per MAX_COL) + subtotal per group ===== */
  const flattenedRows = createMemo(() => {
    const rows = [];
    (data()?.itemGroups || []).forEach((g, gi) => {
      const itemName =
        itemsMap()[g.so_item_id] || itemsMap()[g.item] || g.item || "-";
      const colorDesc =
        colorDescMap()[g.col] ||
        colorDescMap()[(g.rolls?.[0]?.col)] ||
        g.col ||
        "";

      const rolls = g.rolls || [];
      const rowCount = Math.ceil(rolls.length / MAX_COL());

      // group totals
      const gPcs = rolls.filter((r) => Number(r?.[ROLL_KEY()]) > 0).length;
      const gMtr = rolls.reduce((s, r) => s + (parseFloat(r.meter) || 0), 0);
      const gYrd = rolls.reduce((s, r) => s + (parseFloat(r.yard) || 0), 0);
      const gKg = rolls.reduce((s, r) => s + (parseFloat(r.kilogram) || 0), 0);

      for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
        const start = rowIdx * MAX_COL();
        const rowRolls = rolls.slice(start, start + MAX_COL());

        const first = rowRolls[0] || {};
        const bal = first?.no_bal ?? "";
        const lot = first?.lot ?? "";

        const pcsRow = rowRolls.filter((r) => Number(r?.[ROLL_KEY()]) > 0).length;
        const mRow = rowRolls.reduce((s, r) => s + (parseFloat(r.meter) || 0), 0);
        const yRow = rowRolls.reduce((s, r) => s + (parseFloat(r.yard) || 0), 0);
        const kgRow = rowRolls.reduce((s, r) => s + (parseFloat(r.kilogram) || 0), 0);

        rows.push({
          type: "row",
          gi,
          rowIdx,
          isFirst: rowIdx === 0,
          colorDesc,           // Col (deskripsi warna)
          itemName,            // Item (corak)
          lot,
          bal,
          rowRolls,
          pcsRow,
          mRow,
          yRow,
          kgRow,
        });
      }

      rows.push({
        type: "subtotal",
        gi,
        gPcs,
        gMtr,
        gYrd,
        gKg,
      });
    });
    return rows;
  });

  /* ===== Grand totals ===== */
  const grandTotals = createMemo(() => {
    let pcs = 0, m = 0, y = 0, kg = 0;
    (data()?.itemGroups || []).forEach((g) => {
      (g.rolls || []).forEach((r) => {
        if (Number(r?.[ROLL_KEY()]) > 0) pcs += 1;
        m += parseFloat(r.meter || 0);
        y += parseFloat(r.yard || 0);
        kg += parseFloat(r.kilogram || 0);
      });
    });
    return { pcs, m, y, kg };
  });

  /* ===== Pagination ===== */
  const ROWS_FIRST_PAGE = 33;
  const ROWS_OTHER_PAGES = 33;
  const pagesWithOffsets = createMemo(() =>
    splitIntoPagesWithOffsets(flattenedRows(), ROWS_FIRST_PAGE, ROWS_OTHER_PAGES)
  );

  return (
    <>
      <style>{`
        :root {
          --page-w: ${PAGE_MM().w}mm;
          --page-h: ${PAGE_MM().h}mm;
          --safe-l: ${PAGE_MM().safeL}mm;
          --safe-r: ${PAGE_MM().safeR}mm;
          --safe-t: ${PAGE_MM().safeT}mm;
          --safe-b: ${PAGE_MM().safeB}mm;
          --content-w: ${PAGE_MM().contentW}mm;
          --logo-size: 16mm;
          --gap-after-info: ${paperType() === 'CONTINUOUS95' ? '5mm' : '6mm'};
          --content-max-h: calc(var(--page-h) - var(--safe-t) - var(--safe-b) - 10mm);
        }

        @page { size: ${PAGE_MM().w}mm ${PAGE_MM().h}mm; margin: 0; }

        html, body {
          margin: 0; padding: 0; height: 100%; width: 100%;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          font-family: ${paperType() === 'CONTINUOUS95' ? "'Arial', monospace" : "Arial, sans-serif"};
        }

        .page { 
          width: var(--page-w); 
          height: var(--page-h); 
          display:flex; 
          position: relative;
          overflow: hidden;
          page-break-inside: avoid;
          box-sizing: border-box;
        }

        .safe  { 
          width:100%; 
          height:100%;
          padding: var(--safe-t) var(--safe-r) var(--safe-b) var(--safe-l); 
          position: relative;
          overflow: hidden;
        }

        /* kunci lebar tabel agar tidak shrink */
        table { 
          width: var(--content-w); 
          margin: 0 auto; 
          border-collapse: collapse; 
          page-break-inside:auto;
          table-layout: fixed;
        }

        th, td {
          border: 1.2pt solid #000; padding: 1px 2px;
          font-size: ${paperType() === 'CONTINUOUS95' ? '14px' : '13px'};
          font-weight: ${paperType() === 'CONTINUOUS95' ? 600 : 500};
        }
        th { text-align:center; }

        .no-border { border: none !important; }
        .table-fixed { table-layout: fixed; }
        .stretch-row td { border:0 !important; height:20px; padding:1px 2px; }

        .content{
          width: var(--content-w);
          max-height: var(--content-max-h); /* BATASI TINGGI MAKSIMAL */
          margin: 0 auto;
          box-sizing: border-box;
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
        }

        /* HEADER selalu center */
        .header-center{
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 4px;
          margin: 0 0 4px 0;
        }
        .header-center .title{
          margin: 4px 0 10px 0;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 23px;
          line-height: 1.1;
        }

        .info-table{
          width: 100%;
          border: none;
          table-layout: fixed;
          margin-bottom: var(--gap-after-info);
        }
        .info-table td{
          border: none !important;
          padding: 0 2px;
          font-size: 15px;
        }

        /* ======= Styling angka: dipisah A4 vs Continuous ======= */
        .num, .roll-cell { text-align: right; }

        /* CONTINUOUS: lebih pekat & rapat */
        body[data-paper="CONTINUOUS95"] .num,
        body[data-paper="CONTINUOUS95"] .roll-cell {
          font-family: 'Arial', monospace;
          font-weight: 500;
          -webkit-text-stroke: 0.18px;   /* pekat di print */
          letter-spacing: 0;
          padding: 0 1px;
          color: #000;
        }

        /* A4: pakai font dokumen biasa, tidak abu, tidak terlalu rapat */
        body[data-paper="A4"] .num,
        body[data-paper="A4"] .roll-cell {
          font-family: inherit;
          font-weight: 600;
          -webkit-text-stroke: 0;
          letter-spacing: 0;
          padding: 1px 2px;
          color: #000;                   /* pastikan hitam */
        }

        .roll-number {
          font-size: 15px !important;
          font-weight: 500 !important;
        }

        /* Untuk Continuous */
        body[data-paper="CONTINUOUS95"] .roll-number {
          font-size: 12px !important;
          font-weight: 500 !important;
          -webkit-text-stroke: 0.15px;
        }

        /* Untuk A4 */
        body[data-paper="A4"] .roll-number {
          font-size: 15px !important;
          font-weight: 500 !important;
        }

        .total-number {
          font-size: 15px !important;
          font-weight: 500 !important;
        }

        .format-number{
          font-size: 15px !important;
          font-weight: 500 !important;
        }

        .subtotal-total-number{
          font-size: 13px !important;
          font-weight: 600 !important;
        }

        /* Table compact: HANYA untuk continuous 10 kolom (dipasang via className) */
        .table-compact td, .table-compact th { padding: 0 2px; }

        @media print {
          .page { page-break-after: always; }
          .page:last-child { page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
      `}</style>


      <For each={pagesWithOffsets()}>
        {(p, idx) => {
          const pageIndex = idx();
          const count = pagesWithOffsets().length;
          const isLast = pageIndex === count - 1;
          return (
            <PrintPage
              pageNo={pageIndex + 1}
              pageCount={count}
              isLast={isLast}
              data={data()}
              items={p.items}
              todayStr={todayStr()}
              createdShort={createdShort()}
              unitKey={ROLL_KEY()}
              maxCol={MAX_COL()}
              totals={grandTotals()}
              isPPN={Number(data()?.sales_order_items?.ppn_percent) > 0}
              isContinuous={isContinuous()}
            />
          );
        }}
      </For>
    </>
  );
}

/* ===== Halaman ===== */
function PrintPage(props) {
  const { data, items, pageNo, pageCount, isLast, todayStr, createdShort, unitKey, maxCol, totals, isPPN, isContinuous } = props;

  const isUnitKg = () => unitKey === "kilogram";
  const isUnitLinear = () => unitKey !== "kilogram";

  // Auto-stretch row kosong agar footer/halaman rapi
  const { extraRows, bind, recalc } = createStretch({ fudge: 56 });

  // Pastikan recalc terpanggil untuk semua kasus (dengan/ tanpa logo, 5/10 kolom)
  onMount(() => {
    requestAnimationFrame(recalc);
    setTimeout(recalc, 60);
  });
  createEffect(() => { (items?.length ?? 0); isLast; requestAnimationFrame(recalc); });
  createEffect(() => { maxCol; requestAnimationFrame(recalc); });
  createEffect(() => { isPPN ? 1 : 0; requestAnimationFrame(recalc); });

  const ColGroup = () => {
    // default 5 kolom
    let W_NO  = 3,  W_BAL = 5,  W_COL = 9,  W_ITEM = 8,  W_LOT = 5;
    let W_TTL = isContinuous ? 11.5 : 10.5;

    if (maxCol === 10) {
      if (isContinuous) {
        // Continuous 10 kolom (rangkap 3) — ini yang tadi sudah OK
        W_NO = 2.8; W_BAL = 4.0; W_COL = 6.8; W_ITEM = 8; W_LOT = 4;
        W_TTL = 10.5;              // TTL cukup
      } else {
        // A4 10 kolom — TTL dibikin lebar, non-roll dikompres moderat
        W_NO = 3; W_BAL = 4.5; W_COL = 7; W_ITEM = 8; W_LOT = 4;
        W_TTL = 10; 
      }
    }

    const numTotalCols = isUnitLinear() ? 3 : 2;
    const fixedPct = W_NO + W_BAL + W_COL + W_ITEM + W_LOT + (W_TTL * numTotalCols);
    const rollPct  = Math.max(0, 100 - fixedPct);
    const eachRoll = rollPct / maxCol;

    return (
      <colgroup>
        <col style={`width:${W_NO}%`} />
        <col style={`width:${W_BAL}%`} />
        <col style={`width:${W_COL}%`} />
        <col style={`width:${W_ITEM}%`} />
        <col style={`width:${W_LOT}%`} />
        <For each={Array.from({ length: maxCol })}>
          {() => <col style={`width:${eachRoll}%`} />}
        </For>
        <col style={`width:${W_TTL}%`} />
        <Show when={isUnitLinear()}>
          <col style={`width:${W_TTL}%`} />
          <col style={`width:${W_TTL}%`} />
        </Show>
        <Show when={isUnitKg()}>
          <col style={`width:${W_TTL}%`} />
        </Show>
      </colgroup>
    );
  };
  // ========================================================

  return (
    <div ref={bind("pageRef")} className="page">
      <div className="safe">
        {/* Row measurer untuk hitung tinggi baris sesuai jumlah kolom */}
        <table style="position:absolute; top:-10000px; left:-10000px; visibility:hidden;">
          <tbody>
            <tr ref={bind("measureRowRef")}>
              <td class="p-1 text-center h-5"></td>
              <td class="p-1 text-center"></td>
              <td class="p-1"></td>
              <td class="p-1"></td>
              <td class="p-1"></td>
              <For each={Array.from({ length: maxCol })}>
                {() => <td class="p-1 text-right"></td>}
              </For>
              <td class="p-1 text-right"></td>
              <Show when={isUnitLinear()}>
                <td class="p-1 text-right"></td> {/* TTL/MTR */}
                <td class="p-1 text-right"></td> {/* TTL/YARD */}
              </Show>
              <Show when={isUnitKg()}>
                <td class="p-1 text-right"></td> {/* TTL/KG */}
              </Show>
            </tr>
          </tbody>
        </table>

        {/* ====== REL KONTEN YANG DIPUSATKAN ====== */}
        <div className="content">

          {/* HEADER — logo + judul di TENGAH */}
          <div className="header-center">
            <div
              style={{
                height: isPPN ? "var(--logo-size)" : "0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <img
                src={logoNavel}
                alt="Logo"
                style={{
                  height: "var(--logo-size)",
                  display: isPPN ? "block" : "none"
                }}
                onLoad={recalc}
              />
            </div>
            <div className="title">PACKING LIST</div>
          </div>

          {/* Info blok atas */}
          <table className="info-table">
            <tbody>
              <tr>
                <td><b>No PL:</b> {data?.no_pl || "-"}</td>
                <td style={{ textAlign: "right" }}>
                  <b>No SO:</b> {data?.sales_order_items?.no_so || "-"}
                </td>
              </tr>
              <tr>
                <td><b>Customer:</b> {data?.sales_order_items?.customer_name || "-"}</td>
                <td style={{ textAlign: "right" }}>
                  <b>Tanggal Pembuatan:</b> {createdShort}
                </td>
              </tr>
              <tr>
                <td colSpan={2}>
                  <b>Keterangan:</b>{" "}
                  <span style={{ whiteSpace: "pre-line" }}>
                    {data?.keterangan || "-"}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* TABEL UTAMA */}
          <table
            ref={bind("tableRef")}
            className={`border border-black table-fixed ${isContinuous && maxCol === 10 ? "table-compact" : ""}`}
          >
            <ColGroup />
            <thead ref={bind("theadRef")}>
              <tr>
                <th rowSpan={2}>No</th>
                <th rowSpan={2}>Bal</th>
                <th rowSpan={2}>Col</th>
                <th rowSpan={2}>Item</th>
                <th rowSpan={2}>Lot</th>
                <For each={Array.from({ length: maxCol })}>
                  {(_, i) => <th>{i() + 1}</th>}
                </For>
                <th rowSpan={2}>TTL/PCS</th>
                <Show when={isUnitLinear()}>
                  <th rowSpan={2}>TTL/MTR</th>
                  <th rowSpan={2}>TTL/YD</th>
                </Show>
                <Show when={isUnitKg()}>
                  <th rowSpan={2}>TTL/KG</th>
                </Show>
              </tr>
              <tr></tr>
            </thead>

            <tbody ref={bind("tbodyRef")}>
              <For each={items}>
                {(row) => (
                  <Show
                    when={row.type === "row"}
                    fallback={
                      // SUBTOTAL
                      <tr>
                        <td colSpan={5} className="text-center"><b>SUB TOTAL</b></td>
                        <For each={Array.from({ length: maxCol })}>{() => <td></td>}</For>
                        <td className="text-right subtotal-total-number"><b>{fmt2Blank(row.gPcs)}</b></td>
                        <Show when={isUnitLinear()}>
                          <td className="text-right subtotal-total-number"><b>{fmt2Blank(row.gMtr)}</b></td>
                          <td className="text-right subtotal-total-number"><b>{fmt2Blank(row.gYrd)}</b></td>
                        </Show>
                        <Show when={isUnitKg()}>
                          <td className="text-right subtotal-total-number"><b>{fmt2Blank(row.gKg)}</b></td>
                        </Show>
                      </tr>
                    }
                  >
                    <tr>
                      <td className="text-center format-number">{row.isFirst ? (row.gi + 1) : ""}</td>
                      <td className="text-center format-number">{row.bal ?? ""}</td>
                      <td className="text-center">{row.isFirst ? (row.colorDesc ?? "") : ""}</td>
                      <td className="text-center">{row.isFirst ? (row.itemName ?? "-") : ""}</td>
                      <td className="text-center format-number">{row.lot ?? ""}</td>

                      {/* kolom roll dinamis */}
                      <For each={Array.from({ length: maxCol })}>
                        {(_, ci) => (
                          <td className="num roll-cell roll-number">
                            {fmt2Blank(row.rowRolls[ci()]?.[unitKey])}
                          </td>
                        )}
                      </For>

                      <td className="text-right total-number">{fmt2Blank(row.pcsRow)}</td>
                      <Show when={isUnitLinear()}>
                        <td className="text-right total-number">{fmt2Blank(row.mRow)}</td>
                        <td className="text-right total-number">{fmt2Blank(row.yRow)}</td>
                      </Show>
                      <Show when={isUnitKg()}>
                        <td className="text-right total-number">{fmt2Blank(row.kgRow)}</td>
                      </Show>
                    </tr>
                  </Show>
                )}
              </For>

              {/* ROW KOSONG DINAMIS */}
              {/* <For each={Array.from({ length: extraRows() })}>
                {() => (
                  <tr className="stretch-row">
                    <td className="p-1 text-center h-5"></td>
                    <td className="p-1 text-center"></td>
                    <td className="p-1 text-center"></td>
                    <td className="p-1"></td>
                    <td className="p-1 text-center"></td>
                    <For each={Array.from({ length: maxCol })}>
                      {() => <td className="p-1 text-right"></td>}
                    </For>
                    <td className="p-1 text-right"></td>
                    <td className="p-1 text-right"></td>
                    <td className="p-1 text-right"></td>
                  </tr>
                )}
              </For> */}
            </tbody>

            <tfoot ref={bind("tfootRef")}>
              <Show when={isLast}>
                <tr>
                  <td colSpan={5} className="text-center"><b>TOTAL</b></td>
                  <For each={Array.from({ length: maxCol })}>{() => <td></td>}</For>
                  <td className="text-right subtotal-total-number"><b>{fmt2Blank(totals.pcs)}</b></td>
                  <Show when={isUnitLinear()}>
                    <td className="text-right subtotal-total-number"><b>{fmt2Blank(totals.m)}</b></td>
                    <td className="text-right subtotal-total-number"><b>{fmt2Blank(totals.y)}</b></td>
                  </Show>
                  <Show when={isUnitKg()}>
                    <td className="text-right subtotal-total-number"><b>{fmt2Blank(totals.kg)}</b></td>
                  </Show>
                </tr>
              </Show>
              <tr>
                <td colSpan={5 + maxCol + (isUnitLinear() ? 3 : 2)} className="no-border text-right" style={{ borderTop: "1px solid #000" }}>
                  <i>Halaman {pageNo} dari {pageCount}</i>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        {/* ====== AKHIR REL KONTEN ====== */}
      </div>
    </div>
  );
}

// Utils
function fmt2Blank(v) {
  const n = Number(v);
  if (!isFinite(n) || n === 0) return "";    // 0 → kosong
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n);
}
