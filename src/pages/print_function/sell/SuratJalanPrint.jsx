import { createMemo, createEffect, For, Show, createSignal } from "solid-js";
import logoNavel from "../../../assets/img/navelLogo.png";
import {
  splitIntoPagesWithOffsets,
  createStretch,
} from "../../../components/PrintUtils";

import { get } from "idb-keyval";

export default function PackingOrderPrint(props) {
  const [loadedData, setLoadedData] = createSignal(null);

  const data = createMemo(() => props.data?.order ?? props.data ?? { items: [], summary: {} });

  createEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get("key");
    if (!key) return;

    get(key).then((data) => {
      if (data) setLoadedData(data);
    });
  });

  // const root = createMemo(
  //   () => props.data?.order ?? props.data ?? { items: [], summary: {} }
  // );
  const root = createMemo(() => {
    const d = loadedData() ?? props.data ?? {};
    return d.order ?? d.packing_order ?? d ?? {};
  });

  const unit = createMemo(
    () => root().satuan_unit || root().satuan_unit_name || "Meter"
  );
  const isPPN = createMemo(() => Number(root().ppn ?? root().ppn_percent) > 0);

  // ==== DETEKSI DOT-MATRIX/CONTINUOUS ====
  const isContinuous = createMemo(() => {
    const q = new URLSearchParams(window.location.search);
    const paper = (q.get("paper") || "").toUpperCase();
    const dm = (q.get("dm") || "").toLowerCase();
    return paper === "CONTINUOUS95" || dm === "1" || dm === "true";
  });

  // Tinggi form continuous: ?formh=5.5 (inch)
  const formHeightIn = createMemo(() => {
    const q = new URLSearchParams(window.location.search);
    const h = parseFloat(q.get("formh") || "5.5");
    return Number.isFinite(h) && h > 0 ? h : 5.5;
  });

  /* ========= Helpers ========= */
  function formatTanggal(s) {
    if (!s) return "-";
    const d = new Date(s);
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
  const hasQty = (m, y, kg) =>
    parseFloat(String(m ?? "0")) > 0 ||
    parseFloat(String(y ?? "0")) > 0 ||
    parseFloat(String(kg ?? "0")) > 0;

  /* ========= Build rows ========= */
  const displayRows = createMemo(() => {
    const getLot = (r) =>
      r?.lot ?? r?.Lot ?? r?.lot_no ?? r?.LotNo ?? r?.lotNo ?? null;
    const getBal = (r) =>
      r?.no_bal ?? r?.bal ?? r?.Bal ?? r?.noBal ?? r?.noBAL ?? null;

    const pickLotsFromRolls = (rolls) => {
      const set = new Set(
        (rolls || [])
          .map(getLot)
          .filter(
            (v) => v !== undefined && v !== null && String(v).trim() !== ""
          )
      );
      return set.size ? Array.from(set).join(", ") : "-";
    };
    const pickBalsFromRolls = (rolls) => {
      const set = new Set(
        (rolls || [])
          .map(getBal)
          .filter(
            (v) => v !== undefined && v !== null && String(v).trim() !== ""
          )
      );
      return set.size
        ? Array.from(set)
            .sort((a, b) => Number(a) - Number(b))
            .join(", ")
        : "-";
    };

    if (Array.isArray(root().packing_lists)) {
      return root().packing_lists.flatMap((pl) =>
        (pl.items || []).map((it) => {
          const validRolls = (it.rolls || []).filter((r) =>
            hasQty(r.meter, r.yard, r.kilogram)
          );
          const lotDisplay =
            it.lot && String(it.lot).trim()
              ? String(it.lot)
              : pickLotsFromRolls(validRolls);
          const balDisplay =
            it.no_bal && String(it.no_bal).trim()
              ? String(it.no_bal)
              : pickBalsFromRolls(validRolls);

          return {
            kode: it.corak_kain ?? "-",
            warna: it.so_deskripsi_warna ?? "-",
            lebar: it.lebar ?? "-",
            grade: it.grade_name ?? "-",
            lot: lotDisplay || "-",
            no_bal: balDisplay || "-",
            rolls_count: validRolls.length,
            meter_total: parseFloat(it.all_meter || 0),
            yard_total: parseFloat(it.all_yard || 0),
            kilogram_total: parseFloat(it.all_kilogram || 0),
          };
        })
      );
    }

    if (Array.isArray(root().itemGroups)) {
      const out = [];
      for (const g of root().itemGroups) {
        const by = new Map();
        for (const r of g.items || []) {
          if (r.checked === false) continue;
          if (!hasQty(r.meter, r.yard, r.kilogram)) continue;

          const key =
            r.packing_list_item_id ?? `${r.konstruksi_kain}|${r.lot || "-"}`;
          let acc = by.get(key);
          if (!acc) {
            acc = {
              kode: r.corak_kain ?? "-",
              warna: r.so_deskripsi_warna ?? "-",
              lebar: r.lebar ?? "-",
              grade: r.grade_name ?? "-",
              lot_set: new Set(),
              no_bal_set: new Set(),
              meter_total: 0,
              yard_total: 0,
              kilogram_total: 0,
              rolls_count: 0,
            };
            by.set(key, acc);
          }
          if (r.lot) acc.lot_set.add(r.lot);
          if (r.no_bal !== undefined && r.no_bal !== null && r.no_bal !== "")
            acc.no_bal_set.add(r.no_bal);

          acc.meter_total += parseFloat(String(r.meter ?? "0"));
          acc.yard_total += parseFloat(String(r.yard ?? "0"));
          acc.kilogram_total += parseFloat(String(r.kilogram ?? "0"));
          acc.rolls_count += 1;
        }
        for (const v of by.values()) {
          v.lot = v.lot_set.size ? Array.from(v.lot_set).join(", ") : "-";
          v.no_bal = v.no_bal_set.size
            ? Array.from(v.no_bal_set)
                .sort((a, b) => Number(a) - Number(b))
                .join(", ")
            : "-";
          delete v.lot_set;
          delete v.no_bal_set;
          out.push(v);
        }
      }
      return out;
    }
    return [];
  });

  const summary = createMemo(() => data()?.summary ?? props.data?.summary ?? {});

  const totalPCS = createMemo(() =>
    displayRows().reduce(
      (s, it) => s + (parseFloat(String(it.rolls_count ?? "0")) || 0),
      0
    )
  );
  const totalMeter = createMemo(() => Number(summary()?.total_meter_all ?? 0));
  const totalYard  = createMemo(() => Number(summary()?.total_yard_all ?? 0));
  const totalKilogram  = createMemo(() => Number(summary()?.total_kilogram_all ?? 0));

  /* ========= Pagination ========= */
  const ROWS_FIRST_PAGE = 15;
  const ROWS_OTHER_PAGES = 15;
  const pagesWithOffsets = createMemo(() =>
    splitIntoPagesWithOffsets(displayRows(), ROWS_FIRST_PAGE, ROWS_OTHER_PAGES)
  );

  // ==== CSS DINAMIS UNTUK KERTAS ====
  const dynamicPageCss = createMemo(() => {
    if (isContinuous()) {
      const formWidthIn = 9.5;
      // 1. Definisikan tinggi KERTAS FISIK agar selalu portrait
      //    Gunakan tinggi standar seperti 11 inch. (11 > 9.5, jadi pasti portrait)
      const physicalPageHeightIn = 11;

      // 2. Definisikan tinggi AREA KONTEN LOGIS Anda (setengah dari tinggi form)
      const logicalContentHeightIn = formHeightIn() / 2;

      return `
        /*
         Mendefinisikan ukuran KERTAS FISIK untuk printer.
         Karena Tinggi (11in) > Lebar (9.5in), orientasi akan menjadi PORTRAIT.
        */
        @page { 
          size: ${formWidthIn}in ${physicalPageHeightIn}in; 
          margin: 0; 
        }

        /*
         Mendefinisikan ukuran BLOK KONTEN di dalam kertas tersebut.
         Ini adalah area surat jalan Anda yang sebenarnya (setengah halaman).
        */
        .page { 
          width: ${formWidthIn}in; 
          height: ${logicalContentHeightIn}in; 
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
      `;
    }

    // Untuk A4, gunakan setengah dari tinggi A4 (297mm / 2 = 148.5mm)
    return `
      @page { size: A4; margin: 0; }
      .page { 
        width: 210mm; 
        height: 148.5mm;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
      }
    `;
  });

  return (
    <>
      <style>{`
        :root { --safe: 8mm; }

        html, body {
          margin: 0;
          padding: 0;
          height: 100%;
          width: 100%;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue";
          display: flex;
          justify-content: center;
        }

        .safe {
          width: 100%;
          height: 100%;
          padding: var(--safe);
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: stretch;
        }

        table { border-collapse: collapse; page-break-inside: auto; width: 100%; }
        tr { page-break-inside: avoid; }
        td, th { line-height: 1.25; }
        tbody td { min-height: 1.25rem; }

        /* ==== A4 (non-continuous) ==== */
        .a4 td, .a4 th { font-size: 12px; line-height: 1.2; }
        .a4 .a4-info td { font-size: 12px; }
        .a4 .a4-customer td { font-size: 12px; }
        .a4 .a4-label { font-weight: 700; }
        .a4 .sign-block {
          font-size: 12px;
          padding-top: 28px;
          padding-bottom: 28px;
        }

        /* ====== DOT-MATRIX / CONTINUOUS ====== */
        @media print {
          .dm, .dm * {
            font-family: "Arial", monospace !important;
            color: #000 !important;
            font-weight: 400;
            letter-spacing: 0;
          }
          .dm td, .dm th{
            /* pakai satuan INCH agar konsisten ke printer */
            font-size: 12px;
            line-height: 0.18in;      /* baris fix (≈4.6mm) */
            padding: 0.06in 0.04in;   /* padding fix */
            border-color:#000 !important;
            background:transparent !important;
          }
          .dm .items-table thead th,
          .dm .items-table tfoot td { font-weight: 600; }
        }

        .border, .border-black { border-color: #000; }
        
        /* ==== FRAME LUAR + HEADER BERGARIS, BODY POLOS ==== */
        .items-table{
          border: 0.01in solid #000;
          border-collapse: collapse;
        }

        /* HEADER: grid penuh */
        .items-table thead th{
          border: 0.01in solid #000 !important;
        }

        /* BODY: tanpa garis per-sel */
        .items-table tbody th,
        .items-table tbody td{
          border: 0 !important;
        }

        /* TOTAL: grid penuh seperti header */
        .items-table tfoot tr.total-row td{
          border: 0.01in solid #000 !important;
        }

        /* Baris setelah TOTAL (Keterangan): hanya garis atas */
        .items-table tfoot tr.total-row + tr td{
          border: 0 !important;
          border-top: 0.01in solid #000 !important;
        }

        @media print {
          .page { page-break-after: always; }
          .page:last-child { page-break-after: auto; }
        }
      `}</style>

      {/* CSS ukuran halaman dinamis */}
      <style>{dynamicPageCss()}</style>

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
              totals={{
                totalPCS: totalPCS(),
                totalMeter: totalMeter(),
                totalYard: totalYard(),
                totalKilogram: totalKilogram(),
              }}
              formatters={{ formatTanggal, formatAngka }}
              unit={unit()}
              logoNavel={logoNavel}
              isContinuous={isContinuous()}
            />
          );
        }}
      </For>
    </>
  );
}

/* ========= Single Page ========= */
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
    formatters,
    logoNavel,
    isContinuous,
  } = props;
  const { formatTanggal, formatAngka } = formatters;

  const isUnitKg = () => props.unit === "Kilogram";
  const isUnitLinear = () => props.unit !== "Kilogram";

  const { extraRows, bind, recalc } = createStretch({ fudge: 24 });

  createEffect(() => {
    items?.length ?? 0;
    isLast;
    isPPN;
    const go = () => requestAnimationFrame(recalc);
    if (document.fonts?.ready) document.fonts.ready.then(go);
    else go();
  });

  const a4Class = !isContinuous ? "a4" : "";
  const dmClass = isContinuous ? "dm" : "";

  return (
    <div ref={bind("pageRef")} className={`page ${a4Class}`}>
      <div
        className="safe"
        style={{ "flex-grow": 1, display: "flex", "flex-direction": "column" }}
      >
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
              <Show when={isUnitLinear()}>
                <td class="p-1 text-right"></td>
                <td class="p-1 text-right"></td>
              </Show>
              <Show when={isUnitKg}>
                <td class="p-1 text-right"></td>
              </Show>
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
          <h1 className={`${dmClass} text-lg uppercase font-bold`}>
            Surat Jalan
          </h1>
        </div>

        {/* Header dua kolom */}
        <div className="w-full grid gap-2 grid-cols-[50%_50%]">
          {/* Kiri */}
          <table
            className={`border-2 border-black table-fixed ${
              isContinuous ? "dm info-box" : "a4-customer"
            }`}
          >
            <tbody>
              <tr>
                <td
                  className={`px-2 pt-1 max-w-[280px] break-words whitespace-pre-wrap ${
                    isContinuous ? "" : "a4-label"
                  }`}
                  colSpan={2}
                >
                  Kepada Yth:
                </td>
              </tr>
              <tr>
                <td
                  className="px-2 max-w-[280px] break-words whitespace-pre-wrap"
                  colSpan={2}
                >
                  <span className={isContinuous ? "" : "font-semibold"}>
                    {data.customer_name}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Kanan */}
          <table
            className={`border-2 border-black table-fixed w-full leading-tight ${
              isContinuous ? "dm info-box" : "a4-info"
            }`}
          >
            <colgroup>
              <col style="width:18%" />
              <col style="width:5%" />
              <col style="width:60%" />
            </colgroup>
            <tbody>
              <tr>
                <td
                  className={`px-2 py-1 whitespace-nowrap ${
                    isContinuous ? "" : "a4-label"
                  }`}
                >
                  No. SJ
                </td>
                <td className="text-center whitespace-nowrap">:</td>
                <td className="px-2 py-1 break-words">
                  <span className={isContinuous ? "" : "font-semibold"}>
                    {data.no_sj || data.sequence_number}
                  </span>
                </td>
              </tr>
              <tr>
                <td
                  className={`px-2 py-1 whitespace-nowrap ${
                    isContinuous ? "" : "a4-label"
                  }`}
                >
                  Tanggal
                </td>
                <td className="text-center whitespace-nowrap">:</td>
                <td className="px-2 py-1 break-words">
                  <span className={isContinuous ? "" : "font-semibold"}>
                    {formatTanggal(data.tanggal_surat_jalan || data.created_at)}
                  </span>
                </td>
              </tr>
              <tr>
                <td
                  className={`px-2 py-1 whitespace-nowrap ${
                    isContinuous ? "" : "a4-label"
                  }`}
                >
                  No. SO
                </td>
                <td className="text-center whitespace-nowrap">:</td>
                <td className="px-2 py-1 break-words">{data.no_so}</td>
              </tr>
              <tr>
                <td
                  className={`px-2 py-1 whitespace-nowrap ${
                    isContinuous ? "" : "a4-label"
                  }`}
                >
                  No. Mobil
                </td>
                <td className="text-center whitespace-nowrap">:</td>
                <td className="px-2 py-1 break-words">{data.no_mobil}</td>
              </tr>
              <tr>
                <td
                  className={`px-2 py-1 whitespace-nowrap ${
                    isContinuous ? "" : "a4-label"
                  }`}
                >
                  Sopir
                </td>
                <td className="text-center whitespace-nowrap">:</td>
                <td className="px-2 py-1 break-words">{data.sopir}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* TABEL ITEM */}
        <table
          ref={bind("tableRef")}
          className={`w-full table-fixed border border-black border-collapse mt-1 items-table ${dmClass}`}
          style={{ "flex-grow": 1 }}
        >
          {isContinuous && (
            <colgroup>
              <col style="width:5ch" />
              <col style="width:6ch" />
              <col style="width:12ch" />
              <col style="width:7ch" />
              <col style="width:14ch" />
              <col style="width:6ch" />
              <col style="width:6ch" />
              <col style="width:7ch" />
              <Show when={isUnitLinear()}>
                <col style="width:10ch" />
                <col style="width:10ch" />
              </Show>
              <Show when={isUnitKg()}>
                <col style="width:20ch" />
              </Show>
            </colgroup>
          )}

          <thead ref={bind("theadRef")}>
            <tr>
              <th className="border border-black p-1" rowSpan={2}>
                No
              </th>
              <th className="border border-black p-1" rowSpan={2}>
                Bal
              </th>
              <th className="border border-black p-1" rowSpan={2}>
                Jenis Kain
              </th>
              <th className="border border-black p-1" rowSpan={2}>
                Lot
              </th>
              <th className="border border-black p-1" rowSpan={2}>
                Warna
              </th>
              <th className="border border-black p-1" rowSpan={2}>
                Lebar
              </th>
              <th className="border border-black p-1" rowSpan={2}>
                Grade
              </th>
              <th className="border border-black p-1" rowSpan={2}>
                TTL/PCS
              </th>
              <th className="border border-black p-1 text-center" colSpan={2}>
                Quantity
              </th>
            </tr>
            <tr>
              <Show when={isUnitLinear()}>
                <th className="border border-black p-1">Meter</th>
                <th className="border border-black p-1">Yard</th>
              </Show>
              <Show when={isUnitKg()}>
                <th className="border border-black p-1" colSpan={2}>
                  Kilogram
                </th>
              </Show>
            </tr>
          </thead>

          <tbody ref={bind("tbodyRef")}>
            <For each={items}>
              {(it, i) => (
                <tr>
                  <td className="p-1 text-center">{startIndex + i() + 1}</td>
                  <td className="p-1 text-center">{it.no_bal}</td>
                  <td className="p-1 text-center">{it.kode}</td>
                  <td className="p-1 text-center">{it.lot}</td>
                  <td className="p-1 text-center">{it.warna}</td>
                  <td className="p-1 text-center">
                    <span>{it.lebar}"</span>
                  </td>
                  <td className="p-1 text-center">{it.grade}</td>
                  <td className="p-1 text-center">{it.rolls_count}</td>
                  <Show when={isUnitLinear()}>
                    <td className="p-1 text-center">
                      {formatAngka(it.meter_total)}
                    </td>
                    <td className="p-1 text-center">
                      {formatAngka(it.yard_total)}
                    </td>
                  </Show>
                  <Show when={isUnitKg()}>
                    <td className="p-1 text-center" colSpan={2}>
                      {formatAngka(it.kilogram_total)}
                    </td>
                  </Show>
                </tr>
              )}
            </For>

            {/* Stretcher */}
            {/* <For each={Array.from({ length: extraRows() })}>
              {() => (
                <tr>
                  <td className="p-1 text-center h-5"></td>
                  <td hidden className="p-1 text-center"></td>
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

          <tfoot ref={bind("tfootRef")}>
            <Show when={isLast}>
              <tr>
                <td
                  colSpan={7}
                  className="border border-black text-right font-bold px-2 py-1"
                >
                  TOTAL
                </td>
                <td className="border border-black px-2 py-1 text-center">
                  {formatAngka(totals.totalPCS, 0)}
                </td>
                <Show when={isUnitLinear()}>
                  <td className="border border-black px-2 py-1 text-center">
                    {formatAngka(totals.totalMeter)}
                  </td>
                  <td className="border border-black px-2 py-1 text-center">
                    {formatAngka(totals.totalYard)}
                  </td>
                </Show>
                <Show when={isUnitKg()}>
                  <td
                    className="border border-black px-2 py-1 text-center"
                    colSpan={2}
                  >
                    {formatAngka(totals.totalKilogram)}
                  </td>
                </Show>
              </tr>
              <tr>
                <td colSpan={10} className="border border-black p-2 align-top">
                  <div className="font-bold mb-1">Keterangan:</div>
                  <div className="whitespace-pre-wrap break-words italic">
                    {data.keterangan ?? "-"}
                  </div>
                </td>
              </tr>
              <tr>
                <td colSpan={10} className="border border-black">
                  <div
                    className={
                      isContinuous
                        ? "w-full flex justify-between text-[11px] py-4 px-2"
                        : "w-full flex justify-between sign-block px-3"
                    }
                  >
                    <div className="text-center w-1/4">
                      Yang Menerima
                      <br />
                      <br />
                      <br />( ...................... )
                    </div>
                    <div className="text-center w-1/4">
                      Menyetujui
                      <br />
                      <br />
                      <br />( ...................... )
                    </div>
                    <div className="text-center w-1/4">
                      Yang Membuat
                      <br />
                      <br />
                      <br />( ...................... )
                    </div>
                    <div className="text-center w-1/4">
                      Sopir
                      <br />
                      <br />
                      <br />( ...................... )
                    </div>
                  </div>
                </td>
              </tr>
            </Show>
            <tr>
              <td
                colSpan={10}
                className="border border-black px-2 py-1 text-right italic"
              >
                Halaman {pageNo} dari {pageCount}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
