import {
  getBGDeliveryNotes,
  getOCDeliveryNotes,
  getKJDeliveryNotes,
  getJBDeliveryNotes,
  getSalesOrders,
} from "../../utils/auth";

export async function printDeliveryNotes(block, { token, startDate = "", endDate = "" } = {}) {
  const formatTanggalIndo = (tanggalString) => {
    if (!tanggalString) return "-";
    const tanggal = new Date(tanggalString);
    const bulanIndo = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    const tanggalNum = tanggal.getDate();
    const bulan = bulanIndo[tanggal.getMonth()];
    const tahun = tanggal.getFullYear();
    return `${tanggalNum} ${bulan} ${tahun}`;
  };

  const normalizeDate = (d) => {
    if (!d) return null;
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return null;
    return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  };

  const refLabelFor = (mode, blockKey) => {
    if (mode === "penjualan") return "No SO";
    if (blockKey === "jual_beli") return "No PC";
    return "No PO";
  };
  const refValueFor = (row, mode, blockKey) => {
    if (mode === "penjualan") return row.no_so ?? "-";
    if (blockKey === "jual_beli") return row.no_jb ?? row.no_pc ?? "-";
    return row.no_po ?? row.no_pc ?? "-";
  };
  const uniqueJoin = (arr, sep = ", ") => {
    const s = Array.from(new Set(arr.filter(Boolean)));
    return s.length ? s.join(sep) : "";
  };
  const fmt2 = (val) => {
    if (val === undefined || val === null || val === "") return "-";
    const n = Number(String(val).replace(/,/g, ""));
    if (!Number.isFinite(n)) return "-";
    return new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  };

  // Tambahkan formatter untuk Rupiah
  const fmtRp = (val) => {
    if (val === undefined || val === null || val === "") return "-";
    const n = Number(String(val).replace(/,/g, ""));
    if (!Number.isFinite(n)) return "-";
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  };

  const pick = (...vals) => vals.find(v => v !== undefined && v !== null && v !== "");

  const rowsFromResponse = (res) =>
    res?.suratJalans ?? res?.surat_jalan_list ?? res?.data ?? [];

  const currentFilterLabel = () => {
    if (!startDate && !endDate) return "Semua Data";
    return `${startDate} s/d ${endDate}`;
  };

  const filterByDate = (rows) => {
    const s = normalizeDate(startDate);
    const e = normalizeDate(endDate);
    if (!s && !e) return rows;
    return rows.filter((r) => {
      const d = normalizeDate(r.created_at);
      if (d === null) return false;
      if (s && d < s) return false;
      if (e && d > e) return false;
      return true;
    });
  };

  const getDetailFetcher = (blockKey) => {
    switch (blockKey) {
      case "greige": return getBGDeliveryNotes;
      case "oc": return getOCDeliveryNotes;
      case "kain_jadi": return getKJDeliveryNotes;
      case "jual_beli": return getJBDeliveryNotes;
      default: return null;
    }
  };

  const safeDetailCall = async (fn, id, token) => {
    try { return await fn(id, token); } catch { try { return await fn(token, id); } catch { return null; } }
  };

  const openPrintWindow = (title, rows, mode, showGrade, blockKey) => {
    const sorted = [...rows].sort((a,b) => (normalizeDate(a.created_at) ?? 0) - (normalizeDate(b.created_at) ?? 0));
    const w = window.open("", "", "height=700,width=980");

    const isGreige = blockKey === 'greige';
    const isKainJadi = blockKey === 'kain_jadi';

    const style = `
      <style>
        @page { size: A4; margin: 8mm; }
        @media print { html, body { width: 210mm; } }
        body{ font-family:ui-sans-serif,system-ui,Segoe UI,Helvetica,Arial; margin:0; display:flex; justify-content:center; }
        .paper{ width:100%; max-width:calc(210mm - 8mm); }
        h1{ margin:0 0 8mm 0 }
        table{ border-collapse:collapse; width:100%; table-layout:fixed; margin:0 auto; }
        th,td{ border:1px solid #000; padding:3px 4px; font-size:10px; word-wrap:break-word; vertical-align:middle }
        th{ background:#DADBDD; text-align:left }

        /* class-based widths */
        .col-no { width:3%; }
        .col-tgl { width:9%; }
        .col-no-sj { width:12%; }
        .col-ref { width:12%; }
        .col-relasi { width:11%; }
        .col-warna { width:7%; text-align:center; }
        .col-grade { width:6%; text-align:center; }
        .col-kain { width:8%; text-align:center; }
        .col-meter { width:8%; text-align:center; }
        .col-yard { width:8%; text-align:center; }
        .col-harga { width:10%; text-align:right; }
        .col-harga-greige { width:12%; text-align:right; }
        .col-harga-maklun { width:12%; text-align:right; }
        .col-total { width:20%; text-align:right; }

        /* pastikan header tetap diulang, tapi footer tidak diulang tiap halaman */
        thead { display: table-header-group; }
        tfoot { display: table-row-group; } 

        /* hindari total terpecah; styling rapi untuk row total */
        .grand-total-row { page-break-inside: avoid; }
        .grand-total-cell { font-weight:700; padding:6px 8px; }
      </style>
    `;

    const header = `<h1>${title}</h1>
      <div>Periode: ${currentFilterLabel()}</div>
      <div>Tanggal cetak: ${new Date().toLocaleString()}</div><br/>`;
    const relasiHeader = mode === "penjualan" ? "Customer" : "Supplier";
    const refLabel = refLabelFor(mode, blockKey);

    // thead dinamis
    const theadPieces = [
      `<th class="col-no">No</th>`,
      `<th class="col-tgl">Tgl</th>`,
      `<th class="col-no-sj">No SJ</th>`,
      `<th class="col-ref">${refLabel}</th>`,
      `<th class="col-relasi">${relasiHeader}</th>`,
    ];
    if (!isGreige) theadPieces.push(`<th class="col-warna">Warna</th>`);
    if (showGrade) theadPieces.push(`<th class="col-grade">Grade</th>`);
    theadPieces.push(`<th class="col-kain">Kain</th>`);
    theadPieces.push(`<th class="col-meter">Total Meter</th>`);
    theadPieces.push(`<th class="col-yard">Total Yard</th>`);

    if (isKainJadi) {
      theadPieces.push(`<th class="col-harga-greige">Harga Greige</th>`);
      theadPieces.push(`<th class="col-harga-maklun">Harga Maklun</th>`);
    } else {
      theadPieces.push(`<th class="col-harga">Harga</th>`);
    }
    theadPieces.push(`<th class="col-total">Total</th>`);

    const thead = `<tr>${theadPieces.join("")}</tr>`;

    // helper numeric parsing (aman untuk string berformat)
    const parseNumeric = (v) => {
      if (v === undefined || v === null || v === "") return 0;
      if (typeof v === "number" && Number.isFinite(v)) return v;
      // hapus semua kecuali digit, minus, dan titik desimal
      const s = String(v).replace(/[^\d\.\-]/g, "");
      const n = Number(s);
      return Number.isFinite(n) ? n : 0;
    };

    // build tbody dan kumpulkan numeric totals
    const totals = [];
    const tbody = sorted.map((r,i) => {
      const meterVal = fmt2(pick(r.meter_total, r.summary?.total_meter));
      const yardVal  = fmt2(pick(r.yard_total,  r.summary?.total_yard));

      const hargaNormal = (() => {
        const fromRow = r.harga ?? r.summary?.harga ?? null;
        if (fromRow) return fromRow;
        if (Array.isArray(r.items) && r.items.length > 0) return r.items[0].harga ?? null;
        return null;
      })();

      const hargaGreige = pick(
        r.harga_greige,
        r.summary?.harga_greige,
        Array.isArray(r.items) && r.items.length ? r.items[0].harga_greige : undefined
      );
      const hargaMaklun = pick(
        r.harga_maklun,
        r.summary?.harga_maklun,
        Array.isArray(r.items) && r.items.length ? r.items[0].harga_maklun : undefined
      );

      const numericTotal = parseNumeric(pick(r.summary?.subtotal, r.summary?.total_akhir));
      totals.push(numericTotal);

      const totalVal = fmtRp(pick(r.summary?.subtotal, r.summary?.total_akhir));

      return `
        <tr>
          <td class="col-no">${i+1}</td>
          <td class="col-tgl">${formatTanggalIndo(r.created_at ?? "-")}</td>
          <td class="col-no-sj">${r.no_sj ?? "-"}</td>
          <td class="col-ref">${refValueFor(r, mode, blockKey)}</td>
          <td class="col-relasi">${r.supplier_name ?? r.customer_name ?? "-"}</td>
          ${!isGreige ? `<td class="col-warna">${r.kode_warna ?? r.warna_kode ?? r.warna ?? "-"}</td>` : ''}
          ${showGrade ? `<td class="col-grade">${r.grade_name ?? "-"}</td>` : ''}
          <td class="col-kain">${r.corak_kain ?? "-"}</td>
          <td class="col-meter">${meterVal}</td>
          <td class="col-yard">${yardVal}</td>
          ${isKainJadi
            ? `<td class="col-harga-greige">${fmtRp(hargaGreige)}</td><td class="col-harga-maklun">${fmtRp(hargaMaklun)}</td>`
            : `<td class="col-harga">${fmtRp(hargaNormal)}</td>`
          }
          <td class="col-total">${totalVal}</td>
        </tr>
      `;
    }).join("");

    // hitung grand total
    const grandTotalNumeric = totals.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
    const grandTotalFormatted = fmtRp(grandTotalNumeric);

    // buat tfoot (footer di dalam tabel) — namun CSS memastikan tidak diulang tiap halaman
    const colspanForLabel = Math.max(1, theadPieces.length - 1);
    const tfoot = `
      <tfoot>
        <tr class="grand-total-row">
          <td colspan="${colspanForLabel}" style="text-align:right;" class="grand-total-cell">TOTAL AKHIR</td>
          <td class="col-total grand-total-cell" style="text-align:right;">${grandTotalFormatted}</td>
        </tr>
      </tfoot>
    `;

    const table = `<table><thead>${thead}</thead><tbody>${tbody}</tbody>${tfoot}</table>`;
    const bodyHtml = `<div class="paper">${header}${table}</div>`;

    w.document.write(`<html><head><title>${title}</title>${style}</head><body>${bodyHtml}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  // ========= LOGIKA UTAMA (SAMA DENGAN DASHBOARD AWAL) =========
  const res = await block.rawFetcher(token);
  const baseRows = filterByDate(rowsFromResponse(res));
  const detailFn = getDetailFetcher(block.key);

  if (detailFn) {
    const MAX_CONC = 5;
    const queue = [...baseRows];
    const enriched = [];
    const worker = async () => {
      const row = queue.shift();
      if (!row) return;
      try {
        const det = await safeDetailCall(detailFn, row.id, token);
        const sj = det?.suratJalan;
        const items = sj?.items ?? [];
        const warna = uniqueJoin(items.map(it => it.kode_warna ?? it.warna_kode ?? it.warna ?? null));
        const kain  = uniqueJoin(items.map(it => it.corak_kain ?? null));
        // harga umum (dipakai untuk non-kain_jadi)
        const harga = items.length > 0 ? items[0].harga : undefined;
        // untuk kain_jadi, mungkin ada harga_greige/harga_maklun pada item/summary
        const harga_greige = items.length > 0 ? (items[0].harga_greige ?? undefined) : undefined;
        const harga_maklun = items.length > 0 ? (items[0].harga_maklun ?? undefined) : undefined;

        enriched.push({
          ...row,
          summary: sj?.summary ?? row.summary,
          supplier_name: sj?.supplier_name ?? row.supplier_name,
          customer_name: sj?.customer_name ?? row.customer_name,
          no_po: sj?.no_po ?? row.no_po,
          no_pc: sj?.no_pc ?? row.no_pc,
          no_jb: sj?.no_jb ?? row.no_jb,
          kode_warna: warna || row.kode_warna || row.warna_kode || row.warna || "-",
          corak_kain: kain  || row.corak_kain || "-",
          harga: harga, // harga normal
          harga_greige: harga_greige ?? row.harga_greige ?? sj?.summary?.harga_greige,
          harga_maklun: harga_maklun ?? row.harga_maklun ?? sj?.summary?.harga_maklun,
          items: items,
        });
      } catch {
        enriched.push(row);
      }
      return worker();
    };
    await Promise.all(Array.from({ length: Math.min(MAX_CONC, queue.length) }, worker));
    openPrintWindow(`Laporan - ${block.label}`, enriched, block.mode, false, block.key);
    return;
  }

  if (block.mode === "penjualan") {
    const MAX_CONC = 5;
    const queue = [...baseRows];
    const enriched = [];
    const worker = async () => {
      const row = queue.shift();
      if (!row) return;
      const soId = row.so_id ?? row.soId ?? null;
      if (!soId) { enriched.push(row); return worker(); }
      try {
        const soRes = await safeDetailCall(getSalesOrders, soId, token);
        const so = soRes?.order;
        const items = so?.items ?? [];
        const warna = uniqueJoin(items.map((it) => it.kode_warna ?? null));
        const grade = uniqueJoin(items.map((it) => it.grade_name ?? null));
        const kain  = uniqueJoin(items.map((it) => it.corak_kain ?? null));
        const harga = items.length > 0 ? items[0].harga : undefined;
        enriched.push({
          ...row,
          summary: so?.summary ?? row.summary,
          no_so: so?.no_so ?? row.no_so,
          customer_name: so?.customer_name ?? row.customer_name,
          kode_warna: warna || row.kode_warna || "-",
          grade_name: grade || row.grade_name || "-",
          corak_kain: kain || row.corak_kain || "-",
          harga: harga,
          items: items,
        });
      } catch {
        enriched.push(row);
      }
      return worker();
    };
    await Promise.all(Array.from({ length: Math.min(MAX_CONC, queue.length) }, worker));
    openPrintWindow(`Laporan - ${block.label}`, enriched, block.mode, true, block.key);
    return;
  }

  openPrintWindow(`Laporan - ${block.label}`, baseRows, block.mode, true, block.key);
}