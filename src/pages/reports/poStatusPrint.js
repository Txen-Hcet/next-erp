export async function printPOStatus({
  blockKey, 
  mode, 
  status, 
  poRows, 
  startDate, 
  endDate, 
  userToken,
  SJ_LIST_FETCHER, 
  SJ_DETAIL_FETCHER, 
  PO_DETAIL_FETCHER,
}) {
  const isGreige = blockKey === "greige";
  const isSales  = mode === "penjualan" || blockKey === "sales";
  const relasiHeader = (isSales || blockKey === "jual_beli") ? "Customer" : "Supplier";

  // ==== CONFIG: ubah lebar kolom di sini ====
  const COL_WIDTHS = {
    no: "4%",
    relasi: "16%",
    ref: "12%",
    tanggal: "8%",
    corak: "9%",
    warna: "10%",
    ketWarna: "12%",
    qtyPO: "8%",
    qtyIn: "8%",
    qtySisa: "8%",
    pengiriman: "7%",
    harga: "12%",
    subtotal: "16%",
  };
  // =========================================

  // ==== helpers qty dari PO
  const unitName = (po) => po?.satuan_unit_name || "Meter";
  const totalsByUnit = (po) => {
    const u = unitName(po);
    const s = po?.summary || {};
    if (u === "Meter")    return { unit: "Meter",    total: +(+s.total_meter || 0),    masuk: +(+s.total_meter_dalam_proses || 0) };
    if (u === "Yard")     return { unit: "Yard",     total: +(+s.total_yard || 0),     masuk: +(+s.total_yard_dalam_proses || 0) };
    if (u === "Kilogram") return { unit: "Kilogram", total: +(+s.total_kilogram || 0), masuk: +(+s.total_kilogram_dalam_proses || 0) };
    return { unit: "Meter", total: 0, masuk: 0 };
  };
  const isDone = (po) => {
    const { total, masuk } = totalsByUnit(po);
    const sisa = total - masuk;
    if (total <= 0) return false;
    return isGreige ? (sisa <= total * 0.1 + 1e-9) : (sisa <= 0 + 1e-9);
  };

  const filteredPOs = poRows.filter(po => (status === "done" ? isDone(po) : !isDone(po)));

  // ==== mapping nomor referensi
  const refKey     = (bk, md) => (bk === "jual_beli" ? "no_jb" : (md === "penjualan" || bk === "sales" ? "no_so" : "no_po"));
  const refHeader  = (bk, md) => (bk === "jual_beli" ? "No JB" : (md === "penjualan" || bk === "sales" ? "No SO" : "No PO"));
  const getRefValue = (row, bk, md) => row[refKey(bk, md)] ?? "-";

  // ==== index Tgl Pengiriman / Tgl SJ terbaru
  const sjListFetcher   = SJ_LIST_FETCHER[blockKey];
  const sjDetailFetcher = SJ_DETAIL_FETCHER[blockKey] || null;
  const normDT = (d) => { if (!d) return null; const x = new Date(d); return Number.isNaN(x.getTime()) ? null : x; };

  // SALES: tanggal SJ = created_at; Non-sales: tanggal pengiriman = tanggal_kirim
  const pickFromList = (row) => isSales ? normDT(row?.created_at ?? null)
                                        : normDT(row?.tanggal_kirim ?? null);
  const pickFromDetail = (sj) => isSales ? normDT(sj?.created_at ?? null)
                                         : normDT(sj?.tanggal_kirim ?? null);

  const sjDateIndex = {}; // refNo => Date
  try {
    if (sjListFetcher) {
      const sjListRes = await sjListFetcher(userToken);
      const baseRows = (sjListRes?.suratJalans ?? sjListRes?.surat_jalan_list ?? sjListRes?.data ?? []);

      // Prefill dari LIST (berfungsi walau tidak ada detail fetcher)
      for (const row of baseRows) {
        const ref = row?.no_jb ?? row?.no_po ?? row?.no_so ?? null;
        const tgl = pickFromList(row);
        if (ref && tgl && (!sjDateIndex[ref] || tgl > sjDateIndex[ref])) sjDateIndex[ref] = tgl;
      }

      // Jika ada detail fetcher, refine pakai detail
      if (sjDetailFetcher) {
        const queue = [...baseRows];
        const MAX = 5;
        const worker = async () => {
          const row = queue.shift(); if (!row) return;
          try {
            const det = await safeDetailCall(sjDetailFetcher, row.id, userToken);
            const sj  = det?.suratJalan || det?.surat_jalan || det?.data || {};
            const ref = sj?.no_jb ?? sj?.no_po ?? sj?.no_so ?? row?.no_jb ?? row?.no_po ?? row?.no_so ?? null;
            const tgl = pickFromDetail(sj);
            if (ref && tgl && (!sjDateIndex[ref] || tgl > sjDateIndex[ref])) sjDateIndex[ref] = tgl;
          } catch {}
          return worker();
        };
        await Promise.all(Array.from({ length: Math.min(MAX, queue.length) }, worker));
      }
    }
  } catch {}

  // ==== detail PO → Corak / Warna / Ket Warna + harga/subtotal
  const poDetailFetcher = PO_DETAIL_FETCHER[blockKey];
  const collectKetWarna = (items) => {
    const vals = items.map(it => (it?.keterangan_warna ?? ""));
    const nonEmpty = Array.from(new Set(vals.filter(v => String(v).trim() !== "")));
    return nonEmpty.length ? nonEmpty.join(", ") : "";
  };

  // utility: cari nilai harga/subtotal dari berbagai kemungkinan struktur
  function extractMoneyFromOrder(order) {
    // 1) cek field ringkasan di order
    const s = order?.summary || order || {};
    const possibleSubtotal = s?.subtotal ?? s?.total_harga ?? s?.total_price ?? s?.grand_total ?? s?.total;
    if (isFiniteNumber(possibleSubtotal)) return +possibleSubtotal;

    // 2) jika ada items, coba hitung dari item.harga/harga_satuan * qty (dengan banyak fallback)
    const items = order?.items || [];
    if (items.length) {
      let sum = 0;
      for (const it of items) {
        const q = +(it?.qty ?? it?.quantity ?? it?.jumlah ?? 0) || 0;
        // harga kandidat
        const h = it?.harga_total ?? it?.subtotal ?? it?.harga ?? it?.harga_satuan ?? it?.unit_price ?? it?.price;
        if (isFiniteNumber(h)) {
          // jika harga total (sudah * qty) atau harga satuan: kita ambil asumsi:
          // - kalau ada field harga_total atau subtotal di item, anggap itu sudah total
          if (it?.harga_total || it?.subtotal) {
            sum += +h;
          } else {
            sum += (+h) * q;
          }
        }
      }
      if (sum > 0) return +sum;
    }

    // 3) fallback ke order.total_harga atau po-level summary terkadang berada di luar order
    if (isFiniteNumber(order?.total_harga)) return +order.total_harga;
    if (isFiniteNumber(order?.total_price)) return +order.total_price;

    return null;
  }
  function isFiniteNumber(v) { return v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v)); }

  const rowsEnriched = [];
  if (poDetailFetcher) {
    const queue = [...filteredPOs];
    const MAX = 5;
    const worker = async () => {
      const po = queue.shift(); if (!po) return;

      let corak = "-", warna = "-", ketWarna = "";
      let hargaRow = null; // subtotal / harga per unit
      try {
        const dres  = await safeDetailCall(poDetailFetcher, po.id, userToken);
        const order = dres?.order || dres?.data || {};
        const items = order?.items || [];
        const coraks = uniq(items.map(it => it?.corak_kain ?? null));
        const warnas = uniq(items.map(it => it?.kode_warna ?? it?.warna_kode ?? it?.warna ?? null));
        if (coraks.length) corak = coraks.join(", ");
        if (!isGreige && warnas.length) warna = warnas.join(", ");
        ketWarna = collectKetWarna(items); // bisa "" kalau semua kosong

        // extract money
        const subtotalExtracted = extractMoneyFromOrder(order);
        if (isFiniteNumber(subtotalExtracted)) {
          hargaRow = { subtotal: +subtotalExtracted };
          // jika order menyediakan harga per unit, coba ambil rata-rata harga per unit
          const { unit, total } = totalsByUnit(po);
          if (total > 0) {
            hargaRow.harga_satuan = +(subtotalExtracted / total);
          }
        }
      } catch {}

      const { unit, total, masuk } = totalsByUnit(po);
      const sisa = Math.max(0, +(total - masuk).toFixed(4));
      const ref  = getRefValue(po, blockKey, mode);
      const pengiriman = sjDateIndex[ref] ? formatDatePrint(sjDateIndex[ref]) : "-";

      rowsEnriched.push({
        po, unit, total, masuk, sisa, pengiriman,
        relasi: (isSales || blockKey === "jual_beli") ? (po?.customer_name ?? po?.customer ?? "-")
                                                      : (po?.supplier_name ?? po?.supplier ?? "-"),
        corak, warna, ketWarna, ref,
        hargaRow, // bisa null
      });
      return worker();
    };
    await Promise.all(Array.from({ length: Math.min(MAX, queue.length) }, worker));
  }

  const finalRows = rowsEnriched.length
    ? rowsEnriched
    : filteredPOs.map(po => {
        const { unit, total, masuk } = totalsByUnit(po);
        const sisa = Math.max(0, +(total - masuk).toFixed(4));
        const ref  = getRefValue(po, blockKey, mode);
        const pengiriman = sjDateIndex[ref] ? formatDatePrint(sjDateIndex[ref]) : "-";

        // coba ambil harga subtotal di PO-level kalau ada
        let hargaRow = null;
        const poSubtotal = po?.summary?.total_harga ?? po?.total_harga ?? po?.total_price ?? po?.subtotal;
        if (isFiniteNumber(poSubtotal)) {
          hargaRow = { subtotal: +poSubtotal };
          if (total > 0) hargaRow.harga_satuan = +(poSubtotal / total);
        }

        return {
          po, unit, total, masuk, sisa, pengiriman,
          relasi: (isSales || blockKey === "jual_beli") ? (po?.customer_name ?? po?.customer ?? "-")
                                                        : (po?.supplier_name ?? po?.supplier ?? "-"),
          corak: po?.corak_kain ?? "-",
          warna: isGreige ? "-" : (po?.kode_warna ?? "-"),
          ketWarna: "",
          ref,
          hargaRow,
        };
      });

  // hitung grand total dari semua subtotal yang tersedia (jika tidak ada subtotal untuk baris tertentu, diabaikan)
  const grandTotal = finalRows.reduce((acc, r) => {
    const s = r.hargaRow?.subtotal;
    return acc + (isFiniteNumber(s) ? +s : 0);
  }, 0);

  // ==== PRINT ====
  const kindLabel = isSales ? "Penjualan" : "Pembelian";
  const blockLabel = mapBlockLabel(blockKey); // bisa "-" atau "Penjualan", "Greige", dsb.
  const title = `Rekap ${kindLabel}${blockLabel && blockLabel !== kindLabel ? " " + blockLabel : ""} - ${status === "done" ? "Selesai" : "Belum Selesai"}`;

  const showWarna    = !isGreige;
  const showKet      = !isGreige;
  const showTanggal  = !isSales; // ⬅️ Sales: Tanggal disembunyikan
  const pengirimanTh = isSales ? "Tgl Surat Jalan" : "Tgl Kirim";

  const style = `
    <style>
      @page { 
        size: A4; 
        margin: 8mm; 
      }
      @media print { 
        html, body { 
            width: 210mm; 
        }
      }
      body{ 
        font-family:ui-sans-serif,system-ui,Segoe UI,Helvetica,Arial; 
        margin:0; 
        display:flex; 
        justify-content:center; 
      }
      .paper{ 
        width:100%; 
        max-width:calc(210mm - 8mm); 
      }
      h1{ 
        margin:0 0 6mm 0 
      }
      table{ 
        border-collapse:collapse; 
        width:100%; 
        table-layout:fixed; 
        margin:0 auto; 
      }
      col { /* allow widths from colgroup to apply */ }
      th,td{ 
        border:1px solid #000; 
        padding:3px 4px; 
        font-size:10px; 
        word-wrap:break-word; 
        vertical-align:middle;
      }
      th{ 
        background:#DADBDD; 
        text-align:left;
      }
      td.num, th.num { 
        text-align:center; 
      }
      td.cur, th.cur {
        text-align:center;
        padding-right:6px;
      }

      /* IMPORTANT: keep header repeated but prevent footer repeating across pages */
      thead { display: table-header-group; }   /* header still repeats on each page */
      tfoot { display: table-row-group; }      /* footer treated as normal rows (NOT repeated) */

      /* ensure the grand total row is not split across pages */
      .grand-total-row { page-break-inside: avoid; -webkit-column-break-inside: avoid; break-inside: avoid; }
      .grand-total-cell { font-weight:700; background:#EFEFEF; padding:6px 8px; text-align:right; }

      tfoot td { /* fallback style for footer cells */
        font-weight:700;
        background:#EFEFEF;
      }
    </style>
  `;

  const headerHtml = `
    <h1>${title}</h1>
    <div>Periode: ${(!startDate && !endDate) ? "Semua Data" : `${startDate} s/d ${endDate}`}</div>
    <div>Tanggal cetak: ${new Date().toLocaleString()}</div><br/>
  `;

  // thead dinamis (tambahkan kolom Harga & Subtotal)
  const headCells = [
    { key: "no", label: "No", num: true },
    { key: "relasi", label: `Nama ${relasiHeader}` },
    { key: "ref", label: refHeader(blockKey, mode) },
    ...(showTanggal ? [{ key: "tanggal", label: "Tanggal", num: true }] : []),
    { key: "corak", label: "Corak Kain" },
    ...(showWarna ? [{ key: "warna", label: "Warna", num: true }] : []),
    ...(showKet ? [{ key: "ketWarna", label: "Keterangan Warna" }] : []),
    { key: "qtyPO", label: "QTY PO", num: true },
    { key: "qtyIn", label: "QTY Masuk", num: true },
    { key: "qtySisa", label: "Sisa PO", num: true },
    { key: "pengiriman", label: pengirimanTh, num: true },
    // harga & subtotal di akhir
    { key: "harga", label: "Harga", num: true },
    { key: "subtotal", label: "Total", num: true },
  ];
  const thead = `<tr>${headCells.map(h => `<th class="${h.num?'num':''}">${h.label}</th>`).join("")}</tr>`;

  // buat colgroup sesuai headCells & COL_WIDTHS
  const colgroup = `<colgroup>${
    headCells.map(h => `<col style="width:${(COL_WIDTHS[h.key] || 'auto')}" />`).join("")
  }</colgroup>`;

  // tbody dinamis
  const tbodyRowsHtml = finalRows
    .sort((a,b) => (new Date(a.po.created_at)) - (new Date(b.po.created_at)))
    .map((r, i) => {
      const qtyPO   = `${formatNum(r.total)} ${r.unit}`;
      const qtyIn   = `${formatNum(r.masuk)} ${r.unit}`;
      const qtySisa = `${formatNum(r.sisa)} ${r.unit}`;
      const tglPO   = formatDatePrint(r.po.created_at);

      // tampilkan harga satuan & subtotal jika tersedia
      const hargaSatuan = r.hargaRow?.harga_satuan;
      const subtotalVal = r.hargaRow?.subtotal;

      const hargaDisplay = isFiniteNumber(hargaSatuan) ? formatCurrency(hargaSatuan) : "-";
      const subtotalDisplay = isFiniteNumber(subtotalVal) ? formatCurrency(subtotalVal) : "-";

      const cells = [
        { v: i+1, num: true },
        { v: safe(r.relasi) },
        { v: safe(r.ref) },
        ...(showTanggal ? [{ v: tglPO, num: true }] : []),
        { v: safe(r.corak) },
        ...(showWarna ? [{ v: safe(r.warna), num: true }] : []),
        ...(showKet ? [{ v: safe(r.ketWarna) }] : []),
        { v: qtyPO,   num: true },
        { v: qtyIn,   num: true },
        { v: qtySisa, num: true },
        { v: r.pengiriman, num: true },
        { v: hargaDisplay, num: false, cur: true },
        { v: subtotalDisplay, num: false, cur: true },
      ];

      return `<tr>${cells.map(c => `<td class="${c.num?'num':''} ${c.cur?'cur':''}">${c.v}</td>`).join("")}</tr>`;
    }).join("");

  // tfoot dengan total akhir (grandTotal). Kalau grandTotal = 0 => tampilkan "-"
  const totalCellsCount = headCells.length;
  const grandTotalDisplay = grandTotal > 0 ? formatCurrency(grandTotal) : "-";
  // buat footer: gabungkan beberapa kolom pertama jadi label "Total Akhir" lalu total di kolom terakhir (subtotal)
  const footerColsBefore = totalCellsCount - 1; // taruh total di kolom terakhir (subtotal)
  const tfoot = `
    <tfoot>
      <tr class="grand-total-row">
        <td colspan="${footerColsBefore}" style="text-align:right" class="grand-total-cell">TOTAL AKHIR</td>
        <td class="cur grand-total-cell">${grandTotalDisplay}</td>
      </tr>
    </tfoot>
  `;

  const html = `
    <html>
      <head><title>${title}</title>${style}</head>
      <body><div class="paper">
        ${headerHtml}
        <table>
          ${colgroup}
          <thead>${thead}</thead>
          <tbody>${tbodyRowsHtml}</tbody>
          ${tfoot}
        </table>
      </div></body>
    </html>
  `;

  const w = window.open("", "", "height=700,width=980");
  w.document.write(html);
  w.document.close(); w.focus(); w.print();
}

/* utils */
const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
function safe(s) { return (s == null ? "-" : String(s)); }
function formatNum(n) {
  return new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(+n || 0);
}
function formatDatePrint(d) {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "-";
  const dd = String(x.getDate()).padStart(2, "0");
  const mm = String(x.getMonth()+1).padStart(2, "0");
  const yy = x.getFullYear();
  return `${dd}-${mm}-${yy}`;
}
async function safeDetailCall(fn, id, token) {
  try { return await fn(id, token); } catch { try { return await fn(token, id); } catch { return null; } }
}
function mapBlockLabel(key) {
  if (key === "greige") return "Greige";
  if (key === "oc") return "Order Celup";
  if (key === "kain_jadi") return "Kain Jadi";
  if (key === "jual_beli") return "Jual Beli";
  if (key === "sales") return "Penjualan";
  return "-";
}
function formatCurrency(n){
  if (!isFiniteNumber(n)) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(+n);
}
function isFiniteNumber(v) { return v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v)); }
