import { createMemo, createEffect, For, Show } from "solid-js";
import logoNavel from "../../../assets/img/navelLogo.png";
import { splitIntoPagesWithOffsets, createStretch } from "../../../components/PrintUtils";

export default function PackingOrderPrint(props) {
  const root = createMemo(() => props.data?.order ?? props.data ?? { items: [], summary: {} });
  const unit = createMemo(() => root().satuan_unit || root().satuan_unit_name || "Meter");
  const isPPN = createMemo(() => Number(root().ppn ?? root().ppn_percent) > 0);

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
  const hasQty = (m, y) => parseFloat(String(m ?? "0")) > 0 || parseFloat(String(y ?? "0")) > 0;

  /* ========= Build rows ========= */
  const displayRows = createMemo(() => {
    const getLot = (r) => r?.lot ?? r?.Lot ?? r?.lot_no ?? r?.LotNo ?? r?.lotNo ?? null;
    const getBal = (r) => r?.no_bal ?? r?.bal ?? r?.Bal ?? r?.noBal ?? r?.noBAL ?? null;

    const pickLotsFromRolls = (rolls) => {
      const set = new Set((rolls || []).map(getLot).filter((v) => v !== undefined && v !== null && String(v).trim() !== ""));
      return set.size ? Array.from(set).join(", ") : "-";
    };
    const pickBalsFromRolls = (rolls) => {
      const set = new Set((rolls || []).map(getBal).filter((v) => v !== undefined && v !== null && String(v).trim() !== ""));
      return set.size ? Array.from(set).sort((a, b) => Number(a) - Number(b)).join(", ") : "-";
    };

    if (Array.isArray(root().packing_lists)) {
      return root().packing_lists.flatMap((pl) =>
        (pl.items || []).map((it) => {
          const validRolls = (it.rolls || []).filter((r) => hasQty(r.meter, r.yard));
          const lotDisplay = (it.lot && String(it.lot).trim()) ? String(it.lot) : pickLotsFromRolls(validRolls);
          const balDisplay = (it.no_bal && String(it.no_bal).trim()) ? String(it.no_bal) : pickBalsFromRolls(validRolls)

          return {
            kode: it.corak_kain ?? "-",
            warna: it.deskripsi_warna ?? "-",
            lebar: it.lebar ?? "-",
            grade: it.grade_name ?? "-",
            lot: lotDisplay || "-",
            no_bal: balDisplay || "-",
            rolls_count: validRolls.length,
            meter_total: parseFloat(it.meter_total || 0),
            yard_total: parseFloat(it.yard_total || 0),
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
          if (!hasQty(r.meter, r.yard)) continue;

          const key = r.packing_list_item_id ?? `${r.konstruksi_kain}|${r.lot || "-"}`;
          let acc = by.get(key);
          if (!acc) {
            acc = {
              kode: r.corak_kain ?? "-",
              warna: r.deskripsi_warna ?? "-",
              lebar: r.lebar ?? "-",
              grade: r.grade_name ?? "-",
              lot_set: new Set(),
              no_bal_set: new Set(),
              meter_total: 0,
              yard_total: 0,
              rolls_count: 0,
            };
            by.set(key, acc);
          }
          if (r.lot) acc.lot_set.add(r.lot);
          if (r.no_bal !== undefined && r.no_bal !== null && r.no_bal !== "") acc.no_bal_set.add(r.no_bal);

          acc.meter_total += parseFloat(String(r.meter ?? "0"));
          acc.yard_total += parseFloat(String(r.yard ?? "0"));
          acc.rolls_count += 1;
        }
        for (const v of by.values()) {
          v.lot = v.lot_set.size ? Array.from(v.lot_set).join(", ") : "-";
          v.no_bal = v.no_bal_set.size ? Array.from(v.no_bal_set).sort((a, b) => Number(a) - Number(b)).join(", ") : "-";
          delete v.lot_set;
          delete v.no_bal_set;
          out.push(v);
        }
      }
      return out;
    }
    return [];
  });

  const totalPCS = createMemo(() => displayRows().reduce((s, it) => s + (parseFloat(String(it.rolls_count ?? "0")) || 0), 0));
  const totalMeter = createMemo(() => displayRows().reduce((s, it) => s + (parseFloat(String(it.meter_total ?? "0")) || 0), 0));
  const totalYard = createMemo(() => displayRows().reduce((s, it) => s + (parseFloat(String(it.yard_total ?? "0")) || 0), 0));

  /* ========= Pagination ========= */
  // Lebih pendek (landscape), baris per halaman lebih sedikit
  const ROWS_FIRST_PAGE = 9;
  const ROWS_OTHER_PAGES = 9;
  const pagesWithOffsets = createMemo(() => splitIntoPagesWithOffsets(displayRows(), ROWS_FIRST_PAGE, ROWS_OTHER_PAGES));

  return (
    <>
      <style>{`
        :root { --safe: 8mm; }

        /* Landscape Statement: 8.5in x 5.5in */
        // @page { 
        //   size: 8.5in 5.5in; 
        //   margin: 0; 
        // }

        /* Portrait Letter */
        @page {
          size: 8.5in 11in;
          margin: 0;
        }

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

        .page {
          // Landscape
          // width: 8.5in;
          // height: 5.40in;           

          // Portrait Letter
          width: 8.5in;
          height: 5.4in; 

          position: relative;
          box-sizing: border-box;
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
          gap: 6px;
          align-items: stretch;
        }

        .grid-header {
          display: grid;
          grid-template-columns: 1.2fr 2.2fr; /* kiri: box judul, kanan: panel info */
          gap: 8px;
          align-items: stretch;
        }

        .title-box {
          border: 1px solid #000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px 8px;
          min-height: 54px;
        }

        .info-stack { display: grid; grid-template-rows: auto auto; gap: 6px; }

        .thin { border: 1px solid #000; }

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

/* ========= Single Page (Landscape) ========= */
function PrintPage(props) {
  const { data, items, startIndex, pageNo, pageCount, isPPN, isLast, totals, formatters, unit, logoNavel } = props;
  const { formatTanggal, formatAngka } = formatters;

  // Landscape -> header lebih padat, table lebih pendek; tambah fudge sedikit
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
        {/* Measurer (9 kolom: termasuk Bal hidden) */}
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

        {/* HEADER TENGAH */}
        <div className="w-full flex flex-col items-center justify-center gap-1 text-center">
          <img
            className="w-20 block"
            src={logoNavel}
            alt=""
            onLoad={recalc}
            style={{ display: isPPN ? "block" : "none" }} // tetap support hidden saat non-PPN
          />
          <h1 className="text-lg uppercase font-bold">Surat Jalan</h1>
        </div>

        {/* Header dua kolom */}
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

          {/* Kanan: Info – dibikin lebih lebar + kolom fix */}
          <table className="border-2 border-black table-fixed w-full text-[10px] leading-tight">
            <colgroup>
              <col style="width:15%" />
              <col style="width:6%" />
              <col style="width:60%" />
            </colgroup>
            <tbody>
              <tr>
                <td className="font-bold px-2 py-1 whitespace-nowrap">No. SJ</td>
                <td className="text-center whitespace-nowrap">:</td>
                <td className="px-2 py-1 break-words">{data.no_sj || data.sequence_number}</td>
              </tr>
              <tr>
                <td className="font-bold px-2 py-1 whitespace-nowrap">Tanggal</td>
                <td className="text-center whitespace-nowrap">:</td>
                <td className="px-2 py-1 break-words">
                  {formatTanggal(data.tanggal_surat_jalan || data.created_at)}
                </td>
              </tr>
              <tr>
                <td className="font-bold px-2 py-1 whitespace-nowrap">No. SO</td>
                <td className="text-center whitespace-nowrap">:</td>
                <td className="px-2 py-1 break-words">{data.no_so}</td>
              </tr>
              <tr>
                <td className="font-bold px-2 py-1 whitespace-nowrap">No. Mobil</td>
                <td className="text-center whitespace-nowrap">:</td>
                <td className="px-2 py-1 break-words">{data.no_mobil}</td>
              </tr>
              <tr>
                <td className="font-bold px-2 py-1 whitespace-nowrap">Sopir</td>
                <td className="text-center whitespace-nowrap">:</td>
                <td className="px-2 py-1 break-words">{data.sopir}</td>
              </tr>
            </tbody>
          </table>
        </div>

      {/* OLD HEADER LANDSCAPE*
      <div className="safe">
        <div className="grid-header text-[11px]">
          {/* Kiri: box judul + logo (logo hanya tampil saat PPN) 
          <div
            className="title-box"
            style={{ "min-height": isPPN ? "88px" : "60px" }} // lebih tinggi saat logo tampil
          >
            <div className="flex flex-col items-center justify-center">
              <img
                src={logoNavel}
                alt=""
                className="h-10 mb-1"
                onLoad={recalc}
                style={{ display: isPPN ? "block" : "none" }}
              />
              <div className="text-base uppercase font-bold tracking-wide">
                Surat Jalan
              </div>
            </div>
          </div>

          {/* Kanan: panel info + Kepada 
          <div className="info-stack">
            {/* Panel info (tetap baris-baris seperti sebelumnya agar aman) 
            <table className="thin table-fixed">
              <tbody>
                <tr>
                  <td className="font-bold px-2 w-[20%] whitespace-nowrap">Nomor</td>
                  <td className="w-[4%] text-center">:</td>
                  <td className="px-2 break-words w-[30%]">{data.no_sj || data.sequence_number}</td>

                  <td className="font-bold px-2 w-[18%] whitespace-nowrap">Tanggal</td>
                  <td className="w-[4%] text-center">:</td>
                  <td className="px-2 break-words">{formatTanggal(data.tanggal_surat_jalan || data.created_at)}</td>
                </tr>
                <tr>
                  <td className="font-bold px-2 whitespace-nowrap">No. SO</td>
                  <td className="text-center">:</td>
                  <td className="px-2 break-words">{data.no_so}</td>

                  <td className="font-bold px-2 whitespace-nowrap">No. Mobil</td>
                  <td className="text-center">:</td>
                  <td className="px-2 break-words">{data.no_mobil}</td>
                </tr>
                <tr>
                  <td className="font-bold px-2 whitespace-nowrap">Sopir</td>
                  <td className="text-center">:</td>
                  <td className="px-2 break-words" colSpan={3}>{data.sopir}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>

            {/* Kepada Yth *
            <table className="thin table-fixed">
              <tbody>
                <tr>
                  <td className="px-2 py-1 w-[24%] whitespace-nowrap">Kepada Yth</td>
                  <td className="px-2 py-1 break-words">{data.customer_name}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

         OLD HEADER LANDSCAPE */}

        {/* Measurer: cocokkan jumlah kolom body (9 kolom; Bal tetap hidden) */}
        <table style="position:absolute;top:-10000px;left:-10000px;visibility:hidden;">
          <tbody>
            <tr ref={bind("measureRowRef")} className="text-[11px]">
              <td className="p-1 text-center h-5"></td>
              <td className="p-1 text-center"></td>
              <td className="p-1 text-center"></td>
              <td className="p-1 text-center"></td>
              <td className="p-1 text-center"></td>
              <td className="p-1 text-center"></td>
              <td className="p-1 text-center"></td>
              <td className="p-1 text-center"></td>
              <td className="p-1 text-right"></td>
            </tr>
          </tbody>
        </table>

        {/* TABEL ITEM (tetap sama) */}
        <table ref={bind("tableRef")} className="w-full table-fixed border border-black text-[11px] border-collapse mt-1">
          <thead ref={bind("theadRef")} className="bg-gray-200">
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

            {/* Baris kosong untuk stretch */}
            <For each={Array.from({ length: extraRows() })}>
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
            </For>
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
                  <div className="whitespace-pre-wrap break-words italic">{data.keterangan ?? "-"}</div>
                </td>
              </tr>
              <tr>
                <td colSpan={10} className="border border-black">
                  <div className="w-full flex justify-between text-[11px] py-4 px-2">
                    <div className="text-center w-1/4">Yang Menerima<br/><br/><br/>( ...................... )</div>
                    <div className="text-center w-1/4">Menyetujui<br/><br/><br/>( ...................... )</div>
                    <div className="text-center w-1/4">Yang Membuat<br/><br/><br/>( ...................... )</div>
                    <div className="text-center w-1/4">Sopir<br/><br/><br/>( ...................... )</div>
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
