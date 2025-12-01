import { createMemo, createEffect, For, Show, onMount } from "solid-js";
import logoNavel from "../../../assets/img/navelLogo.png";
import { splitIntoPagesWithOffsets, createStretch } from "../../../components/PrintUtils";

export default function SalesInvoicePrint(props) {
  // Normalisasi: data bisa di {order} ATAU di root
  const data = createMemo(() => props.data?.order ?? props.data ?? { items: [], summary: {} });

  // ===== Items: dari packing_lists[*].items ATAU itemsWithRolls =====
  const invoiceItems = createMemo(() => {
    const root = data();
    const fromPL = (root?.packing_lists ?? []).flatMap((pl) => pl?.items ?? []);
    if (fromPL.length > 0) return fromPL;

    // Fallback: itemsWithRolls pada root payload
    const fromItemsWithRolls = (props.data?.itemsWithRolls ?? []).map((x) => ({
      ...x,
      // Samakan key agar renderer tidak error
      deskripsi_warna: x?.so_deskripsi_warna ?? x?.pl_deskripsi_warna,
      keterangan_warna: x?.keterangan_warna,
    }));

    return fromItemsWithRolls;
  });

  // ===== Currency =====
  const currency = createMemo(() => data()?.currency || 'IDR');
  
  // ===== Formatter =====
  function formatTanggal(s) {
    if (!s) return "-";
    const d = new Date(s);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}-${mm}-${yy}`;
  }

  function formatCurrency(v, decimals = 2) {
    const n = typeof v === "number" ? v : parseFloat(v) || 0;
    const curr = currency();
    
    if (curr === 'IDR') {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(n);
    } else if (curr === 'USD') {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(n);
    }
    
    // Fallback untuk currency lain
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n);
  }

  function formatAngka(v, decimals = 2) {
    const n = typeof v === "number" ? v : parseFloat(v) || 0;
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n);
  }

  function formatAngkaNonDecimal(v) {
    const n = typeof v === "number" ? v : parseFloat(v) || 0;
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  }

  // ===== Summary/totals =====
  const summary = createMemo(() => data()?.summary ?? props.data?.summary ?? {});

  const isPPN = createMemo(
    () => Number(data()?.ppn_percent ?? props.data?.order?.ppn_percent ?? 0) > 0
  );

  const subTotal = createMemo(() => Number(summary()?.subtotal ?? 0));

  const dpp = createMemo(() => {
    const s = summary();
    if (s?.dpp != null) return Number(s.dpp);
    return subTotal() / 1.11;
  });

  const nilaiLain = createMemo(() => {
    const s = summary();
    if (s?.nilai_lain != null) return Number(s.nilai_lain);
    return dpp() * (11 / 12);
  });

  const ppn = createMemo(() => {
    const s = summary();
    if (s?.ppn != null) return Number(s.ppn);
    return isPPN() ? nilaiLain() * 0.12 : 0;
  });

  const grand = createMemo(() => {
    const s = summary();
    if (s?.total_akhir != null) return Number(s.total_akhir);
    return dpp() + ppn();
  });

  const totalMeter = createMemo(() => Number(summary()?.total_meter ?? 0));
  const totalYard  = createMemo(() => Number(summary()?.total_yard ?? 0));
  const totalKilogram  = createMemo(() => Number(summary()?.total_kilogram ?? 0));
  const totalRolls = createMemo(() => {
    // const sum = Number(summary()?.jumlah_kain);
    // if (!Number.isNaN(sum) && sum > 0) return sum;
    
    // Jumlahkan seluruh rolls dari semua item
    return (invoiceItems() ?? []).reduce((acc, item) => {
      const rolls = item?.rolls ?? [];
      // Jika rolls adalah array, tambahkan jumlah roll-nya
      if (Array.isArray(rolls)) {
        return acc + rolls.length;
      }
      return acc;
    }, 0);
  });

  const totals = createMemo(() => ({
    subTotal: subTotal(),
    dpp: dpp(),
    nilaiLain: nilaiLain(),
    ppn: ppn(),
    grand: grand(),
    totalMeter: totalMeter(),
    totalYard: totalYard(),
    totalKilogram: totalKilogram(),
    totalRolls: totalRolls(),
  }));

  // ===== Pagination =====
  const ROWS_FIRST_PAGE  = 18;
  const ROWS_OTHER_PAGES = 18;
  const pagesWithOffsets = createMemo(() =>
    splitIntoPagesWithOffsets(invoiceItems() || [], ROWS_FIRST_PAGE, ROWS_OTHER_PAGES)
  );

  return (
    <>
    <div id="printable-area">
      <style>{`
        :root { --safe: 10mm; }
        @page { size: A4 portrait; margin: 0; }
        html, body {
          margin: 0;
          padding: 0;
          height: 100%;
          width: 100%;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue";
          font-weight: 400;
          display: flex;
          justify-content: center;
        }
        .page {
          width: 210mm;
          height: 285mm;
          padding: 0;
          box-sizing: border-box;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          break-after: page;
          page-break-after: always;
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
        tr { page-break-inside: avoid; }

        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            text-rendering: optimizeLegibility !important;
          }
          
          html, body, * {
            font-family: sans-serif !important;
            font-weight: 500 !important;
            font-size: 10pt !important;
            letter-spacing: normal !important;
            line-height: 1.5 !important;
          }
          
          .items-table td, .items-table th {
            padding: 4px 6px !important;
            line-height: 1.5 !important;
          }
          
          .font-bold, h1, th {
            font-weight: 700 !important;
          }
          
          .font-semibold {
            font-weight: 600 !important;
          }
        }
      `}</style>

        <For each={pagesWithOffsets()}>
          {(p, idx) => {
            const pageIndex = idx();
            const count     = pagesWithOffsets().length;
            const isLast    = pageIndex === count - 1;
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
                currency={currency()}
                formatters={{ formatTanggal, formatCurrency, formatAngka, formatAngkaNonDecimal }}
                logoNavel={logoNavel}
              />
            );
          }}
        </For>
      </div>
    </>
  );
}

function PrintPage(props) {
  const { data, items, startIndex, pageNo, pageCount, isPPN, isLast, totals, currency, formatters, logoNavel } = props;
  const { formatTanggal, formatCurrency, formatAngka, formatAngkaNonDecimal } = formatters;

  const { extraRows, bind, recalc } = createStretch({ fudge: 40 });

  // Tentukan satuan yang aktif - TAMBAHKAN DUKUNGAN KILOGRAM
  const activeUnit = createMemo(() => data?.satuan_unit || "Meter");
  
  // Fungsi untuk mendapatkan quantity berdasarkan satuan - TAMBAHKAN KILOGRAM
  const getItemQuantity = (item) => {
    switch(activeUnit()) {
      case "Meter": return parseFloat(item?.meter_total || 0);
      case "Yard": return parseFloat(item?.yard_total || 0);
      case "Kilogram": return parseFloat(item?.kilogram_total || 0);
      default: return parseFloat(item?.meter_total || 0);
    }
  };

  // Fungsi untuk mendapatkan total quantity berdasarkan satuan - TAMBAHKAN KILOGRAM
  const getTotalQuantity = () => {
    switch(activeUnit()) {
      case "Meter": return totals.totalMeter;
      case "Yard": return totals.totalYard;
      case "Kilogram": return totals.totalKilogram;
      default: return totals.totalMeter;
    }
  };

  // Nama satuan untuk display - TAMBAHKAN KILOGRAM
  const quantityUnitName = createMemo(() => {
    switch(activeUnit()) {
      case "Meter": return "Meter";
      case "Yard": return "Yard";
      case "Kilogram": return "Kilogram";
      default: return "Meter";
    }
  });

  // Recalc saat item/page berubah (double rAF biar layout settle)
  createEffect(() => {
    void (items?.length ?? 0);
    void isLast;
    requestAnimationFrame(() => requestAnimationFrame(recalc));
  });

  onMount(() => {
    // 1) setelah mount
    setTimeout(recalc, 0);

    // 2) ketika masuk/keluar print preview
    const onBefore = () => setTimeout(recalc, 0);
    const onAfter  = () => setTimeout(recalc, 0);
    window.addEventListener("beforeprint", onBefore);
    window.addEventListener("afterprint", onAfter);

    // 3) jika font/asset selesai load
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => setTimeout(recalc, 0));
    }
    window.addEventListener("load", onAfter);
    window.addEventListener("resize", onAfter);

    // cleanup
    return () => {
      window.removeEventListener("beforeprint", onBefore);
      window.removeEventListener("afterprint", onAfter);
      window.removeEventListener("load", onAfter);
      window.removeEventListener("resize", onAfter);
    };
  });

  // tetap pertahankan effect yang sudah ada
  createEffect(() => {
    void (items?.length ?? 0);
    void isLast;
    requestAnimationFrame(() => requestAnimationFrame(recalc));
  });

  // Header data
  const customerName = data?.customer_name ?? "-";
  const customerAddr = data?.alamat ?? data?.customer_alamat ?? "-";
  const customerTelp = data?.telepon ?? data?.no_telp ?? data?.no_hp ?? "-";
  // PAYMENT / VALIDITY (flexible)
  // paymentDays bisa berupa number atau string -> parseInt untuk aman
  const rawPaymentDays = data?.termin ?? data?.payment_terms ?? data?.customer_termin;
  const paymentDays = (rawPaymentDays == null || rawPaymentDays === "") 
    ? null 
    : Number.isFinite(+rawPaymentDays) 
      ? parseInt(+rawPaymentDays, 10) 
      : (() => { const p = parseInt(rawPaymentDays, 10); return Number.isNaN(p) ? null : p; })();

  const paymentText = paymentDays === 0 ? "Cash" : (paymentDays == null ? "-" : `${paymentDays} Hari`);

  // Compute validity/jatuh tempo:
  // Rule: always compute jatuh tempo = baseDate + paymentDays (unless paymentDays === 0 -> null)
  // baseDate priority: created_at || now
  function computeValidityDate() {
    // cash -> no jatuh tempo
    if (paymentDays === 0) return null;

    // invalid / missing paymentDays -> no jatuh tempo
    if (!Number.isFinite(paymentDays) || paymentDays == null) return null;

    const baseRaw = data?.created_at ?? null;
    const base = baseRaw ? new Date(baseRaw) : new Date();
    if (Number.isNaN(base.getTime())) return null;

    const result = new Date(base);
    result.setDate(result.getDate() + paymentDays);
    return result;
  }

  const validityDate = computeValidityDate();
  const validityDisplay = validityDate ? formatTanggal(validityDate) : "";

  return (
    <div ref={bind("pageRef")} className="page">
      <div className="safe">
        {/* Row measurer (11 kolom) */}
        <table aria-hidden="true" style="position:absolute; top:-10000px; left:-10000px; visibility:hidden;">
          <tbody>
            <tr ref={bind("measureRowRef")}>
              <td class="p-1 text-center h-5"></td>
              <td class="p-1 text-center"></td>
              <td class="p-1 hidden"></td>
              <td class="p-1 text-center"></td>
              <td class="p-1 text-center"></td>
              <td class="p-1 text-center"></td>
              <td class="p-1 text-center"></td>
              <td class="p-1 text-center"></td>
              <td class="p-1 text-center"></td>
              <td class="p-1 text-right"></td>
              <td class="p-1 text-right"></td>
            </tr>
          </tbody>
        </table>

        {/* HEADER */}
        <img className="w-24" src={logoNavel} alt="" onLoad={recalc} hidden={!isPPN} />
        <h1 className="text-xl uppercase font-bold">Invoice Penjualan</h1>

        <div className="w-full flex gap-2 text-sm">
          {/* LEFT */}
          <table className="w-[55%] border-2 border-black text-[15px] table-fixed">
            <tbody>
              <tr><td className="px-2 pt-1 max-w-[300px] break-words whitespace-pre-wrap" colSpan={2}>Kepada Yth:</td></tr>
              <tr><td className="px-2 max-w-[300px] break-words whitespace-pre-wrap" colSpan={2}>{customerName}</td></tr>
              <tr><td className="px-2 max-w-[300px] leading-relaxed break-words whitespace-pre-wrap" colSpan={2}>{customerAddr}</td></tr>
              <tr><td className="px-2 whitespace-nowrap">Telp: {customerTelp}</td></tr>
            </tbody>
          </table>

          {/* RIGHT */}
          <table className="w-[55%] border-2 border-black table-fixed text-sm">
            <tbody>
              <tr>
                <td className="font-semibold px-2 w-[30%] whitespace-nowrap">No. SJ</td>
                <td className="w-[5%] text-center">:
                </td><td className="px-2 break-words w-[65%]">{data?.no_sj ?? "-"}</td>
              </tr>
              <tr>
                <td className="font-semibold px-2  w-[30%] whitespace-nowrap">Tanggal</td>
                <td className="w-[5%]  text-center">:</td>
                <td className="px-2  break-words w-[65%]">{formatTanggal(data?.created_at)}</td>
              </tr>
              <tr>
                <td className="font-semibold px-2  w-[30%] whitespace-nowrap">No. SO</td>
                <td className="w-[5%]  text-center">:</td>
                <td className="px-2  break-words w-[65%]">{data?.no_so ?? "-"}</td>
              </tr>
              <tr>
                <td className="font-semibold px-2  w-[30%] whitespace-nowrap">Payment</td>
                <td className="w-[5%]  text-center">:</td>
                <td className="px-2  break-words w-[65%]">{paymentText}</td>
              </tr>
              <tr>
                <td className="font-semibold px-2  w-[30%] whitespace-nowrap">Jatuh Tempo</td>
                <td className="w-[5%]  text-center">:</td>
                <td className="px-2  break-words w-[65%]">{validityDisplay}</td>
              </tr>
              {/* Tampilkan currency info */}
              {/* <tr>
                <td className="font-semibold px-2  w-[30%] whitespace-nowrap">Mata Uang</td>
                <td className="w-[5%]  text-center">:</td>
                <td className="px-2  break-words w-[65%]">{currency}</td>
              </tr> */}
            </tbody>
          </table>
        </div>

        {/* ITEM TABLE (11 kolom) */}
        <table ref={bind("tableRef")} className="w-full table-fixed border border-black text-[12px] border-collapse mt-3 items-table">
          <thead ref={bind("theadRef")}>
            {/* thead pakai className="bg-gray-200" kalau mau berwarna */}
            <tr>
              <th className="border border-black p-1 w-[4%]"  rowSpan={2}>No</th>
              <th className="border border-black p-1 w-[10%]" rowSpan={2}>Jenis Kain</th>
              <th hidden className="border border-black p-1 w-[10%]" rowSpan={2}>Jenis Kain</th>
              <th className="border border-black p-1 w-[10%]" rowSpan={2}>Warna</th>
              <th className="border border-black p-1 w-[9%]" rowSpan={2}>Lebar</th>
              <th className="border border-black p-1 w-[8%]" rowSpan={2}>Grade</th>
              <th className="border border-black p-1 w-[20%] text-center" colSpan={2}>Quantity</th>
              <th className="border border-black p-1 w-[15%]" rowSpan={2}>Harga</th>
              <th className="border border-black p-1 w-[20%]" rowSpan={2}>Jumlah</th>
            </tr>
            <tr>
              <th className="border border-black p-1 w-[5%]">Roll</th>
              {/* UBAH: quantityUnitName() sekarang support Kilogram */}
              <th className="border border-black p-1 w-[14%]">{quantityUnitName()}</th>
            </tr>
          </thead>

          <tbody ref={bind("tbodyRef")}>
            <For each={items}>
              {(item, i) => (
                <tr>
                  <td className="p-1 text-center break-words">{startIndex + i() + 1}</td>
                  <td className="p-1 text-center break-words">{item?.corak_kain || "-"}</td>
                  <td hidden className="p-1 break-words">{item?.konstruksi_kain}</td>
                  <td className="p-1 text-center break-words">
                    {item?.deskripsi_warna || item?.so_deskripsi_warna || item?.pl_deskripsi_warna || "-"}
                  </td>
                  <td className="p-1 text-center break-words">{formatAngkaNonDecimal(item?.lebar)}"</td>
                  <td className="p-1 text-center break-words">{item?.grade_name}</td>

                  <td className="p-1 text-center break-words">{(item?.rolls || []).length}</td>
                  {/* UBAH: Gunakan getItemQuantity() yang support Kilogram */}
                  <td className="p-1 text-center break-words">
                    {formatAngka(getItemQuantity(item))}
                  </td>

                  <td className="p-1 text-center break-words">{formatCurrency(item?.harga)}</td>
                  <td className="p-1 text-right break-words">
                    {/* UBAH: Gunakan getItemQuantity() yang support Kilogram */}
                    {(() => {
                      const qty   = getItemQuantity(item);
                      const harga = parseFloat(item?.harga || 0);
                      return harga && qty ? formatCurrency(harga * qty) : "-";
                    })()}
                  </td>
                </tr>
              )}
            </For>

            {/* Row kosong untuk stretch (11 kolom) */}
            {/* <For each={Array.from({ length: extraRows() })}>
              {() => (
                <tr>
                  <td className="p-1 text-center h-5"></td>
                  <td className="p-1 text-center"></td>
                  <td className="p-1 hidden"></td>
                  <td className="p-1 text-center"></td>
                  <td className="p-1 text-center"></td>
                  <td className="p-1 text-center"></td>
                  <td className="p-1 text-center"></td>
                  <td className="p-1 text-center"></td>
                  <td className="p-1 text-center"></td>
                  <td className="p-1 text-right"></td>
                  <td className="p-1 text-right"></td>
                </tr>
              )}
            </For> */}
          </tbody>

          <tfoot ref={bind("tfootRef")}>
            {/* Total lengkap hanya di halaman terakhir */}
            <Show when={isLast}>
              <tr>
                {/* 6 kolom kiri (No, Jenis, Hidden, Warna, Lebar, Grade) */}
                <td colSpan={5} className="border border-black font-bold text-right px-2 py-1">Total:</td>
                {/* 3 kolom quantity */}
                <td className="border border-black px-2 py-1 text-center font-semibold">{totals.totalRolls}</td>
                {/* UBAH: Gunakan getTotalQuantity() yang support Kilogram */}
                <td className="border border-black px-2 py-1 text-center font-semibold">
                  {formatAngka(getTotalQuantity())}
                </td>
                {/* 2 kolom nominal */}
                <td className="border border-black px-2 py-1 text-right font-bold">
                  {isPPN ? 'Sub Total' : 'Grand Total'}
                </td>
                <td className="border border-black px-2 py-1 text-right">{formatCurrency(totals.subTotal)}</td>
              </tr>

              {/* Baris label+nilai: kosongkan 9 kolom di kiri (11 - 2) */}
              <Show when={isPPN}>
                <tr>
                  <td colSpan={7} className="px-2 py-1" />
                  <td className="px-2 py-1 text-right font-semibold">DPP</td>
                  <td className="px-2 py-1 text-right">{formatCurrency(totals.dpp)}</td>
                </tr>
                <tr>
                  <td colSpan={7} className="px-2 py-1" />
                  <td className="px-2 py-1 text-right font-semibold">Nilai Lain</td>
                  <td className="px-2 py-1 text-right">{formatCurrency(totals.nilaiLain)}</td>
                </tr>
                <tr>
                  <td colSpan={7} className="px-2 py-1" />
                  <td className="px-2 py-1 text-right font-semibold">PPN</td>
                  <td className="px-2 py-1 text-right">{formatCurrency(totals.ppn)}</td>
                </tr>
                <tr>
                  <td colSpan={7} className="px-2 py-1" />
                  <td className="px-2 py-1 text-right font-semibold">Jumlah Total</td>
                  <td className="px-2 py-1 text-right">{formatCurrency(totals.grand)}</td>
                </tr>
              </Show>
              {/* <tr>
                <td colSpan={9} className="border border-black p-2 align-top">
                  <div className="font-bold mb-1">NOTE:</div>
                  <div className="whitespace-pre-wrap break-words italic">{data?.keterangan ?? "-"}</div>
                </td>
              </tr> */}
              <tr>
                <td colSpan={9} className="border border-black">
                  <div className="w-full flex justify-between text-[13px] py-5 px-2">
                    <div className="text-center w-1/3 pb-3">
                      Yang Menerima
                      <br /><br /><br /><br />( ...................... )
                    </div>
                    <div className="text-center w-1/3">
                      Mengetahui
                      <br /><br /><br /><br />( ...................... )
                    </div>
                    <div className="text-center w-1/3">
                      Dibuat Oleh
                      <br /><br /><br /><br />( ...................... )
                    </div>
                  </div>
                </td>
              </tr>
            </Show>

            {/* <tr>
              <td colSpan={9} className="border border-black px-2 py-1 text-right italic">
                Halaman {pageNo} dari {pageCount}
              </td>
            </tr> */}
          </tfoot>
        </table>
      </div>
    </div>
  );
}