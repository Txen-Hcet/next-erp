import { processDeliveryNotesData } from "../../helpers/process/deliveryNotesProcessor";

// Pastikan Anda memiliki formatter ini di file yang sama atau mengimpornya
const formatTanggalIndo = (tanggalString) => {
  if (!tanggalString) return "-";
  const tanggal = new Date(tanggalString);
  const bulanIndo = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  return `${tanggal.getDate()} ${bulanIndo[tanggal.getMonth()]} ${tanggal.getFullYear()}`;
};

const fmtRp = (val) => {
  if (val === undefined || val === null || val === "") return "-";
  const n = Number(String(val).replace(/,/g, ""));
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
};

const fmt2 = (val) => {
  if (val === undefined || val === null || val === "") return "-";
  const n = Number(String(val).replace(/,/g, ""));
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
};

const openPrintWindow = (title, processedData, block, filterLabel) => {
  const normalizeProcessedData = (pd) => {
    if (!pd || pd.length === 0) return [];

    // Jika sudah berbentuk grouped { mainData, items }
    const first = pd[0];
    if (first && first.mainData && Array.isArray(first.items)) {
      return pd; // sudah siap
    }

    // Jika flat rows: kumpulkan berdasarkan row_id atau no_sj
    const groups = {};
    pd.forEach((r, idx) => {
      // tentukan key group (prioritaskan row_id, lalu no_sj, lalu kombinasi relasi+tanggal)
      const groupKey = r.row_id ?? r.rowId ?? r.row_id?.toString() ?? r.no_sj ?? `${r.no_sj}_${r.relasi}_${r.tanggal}` ?? `g_${idx}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          mainData: {
            id: r.row_id ?? null,
            tanggal: r.tanggal ?? r.created_at ?? null,
            no_sj: r.no_sj ?? '-',
            relasi: r.relasi ?? (r.supplier_name ?? r.customer_name) ?? '-',
            no_ref: r.no_ref ?? '-',
            unit: r.unit ?? (r.satuan_unit_name ?? 'Meter'),
          },
          items: []
        };
      }

      // push item normalized
      groups[groupKey].items.push({
        item_id: r.item_id ?? r.so_item_id ?? r.sj_item_id ?? `${groups[groupKey].mainData.no_sj}_${groups[groupKey].items.length}`,
        kain: r.kain ?? r.corak_kain ?? '-',
        warna: r.warna ?? r.kode_warna ?? r.warna_kode ?? '-',
        grade: r.grade ?? r.grade_name ?? '-',
        meter: Number.isFinite(Number(r.meter)) ? Number(r.meter) : (Number.isFinite(Number(r.meter_total)) ? Number(r.meter_total) : 0),
        yard: Number.isFinite(Number(r.yard)) ? Number(r.yard) : (Number.isFinite(Number(r.yard_total)) ? Number(r.yard_total) : 0),
        harga1: Number.isFinite(Number(r.harga1)) ? Number(r.harga1) : (Number.isFinite(Number(r.harga)) ? Number(r.harga) : 0),
        harga2: Number.isFinite(Number(r.harga2)) ? Number(r.harga2) : (Number.isFinite(Number(r.harga_maklun)) ? Number(r.harga_maklun) : null),
        total: Number.isFinite(Number(r.total)) ? Number(r.total) : 0,
        raw_item: r.raw_item ?? null,
      });
    });

    return Object.values(groups);
  };

  // normalize dulu
  const normalized = normalizeProcessedData(processedData);

  // sort aman: kalau mainData.tanggal tidak ada, biarkan urutan asli
  normalized.sort((a, b) => {
    const ta = a?.mainData?.tanggal ? new Date(a.mainData.tanggal).getTime() : null;
    const tb = b?.mainData?.tanggal ? new Date(b.mainData.tanggal).getTime() : null;
    if (ta === null && tb === null) return 0;
    if (ta === null) return 1;
    if (tb === null) return -1;
    return ta - tb;
  });

  const w = window.open("", "", "height=700,width=980");

  const isGreige = block.key === 'greige';
  const isKainJadi = block.key === 'kain_jadi';
  const isSales = block.mode === 'penjualan';

  const style = `<style>
    @page { size: A4; margin: 11mm; }
    body{ font-family: Arial, sans-serif; margin:0; }
    .paper{ width:100%; }
    h1{ margin:0 0 8mm 0 }
    table{ border-collapse:collapse; width:100%; }
    th,td{ border:1px solid #000; padding:4px 6px; font-size:9px; word-wrap:break-word; }
    th{ background:#DADBDD; text-align:center; }
    thead { display: table-header-group; }
    tfoot { display: table-row-group; }
    .grand-total-row { page-break-inside: avoid; font-weight: bold; }
  </style>`;

  const header = `<h1>${title}</h1>
    <div>Periode: ${filterLabel}</div>
    <div>Tanggal cetak: ${new Date().toLocaleString('id-ID')}</div><br/>`;

  const headers = ['No', 'Tgl', 'No. SJ', 'No. Ref', isSales ? 'Customer' : 'Supplier'];
  if (!isGreige) headers.push('Warna');
  if (isSales) headers.push('Grade');
  headers.push('Kain', 'Total Meter', 'Total Yard');
  if (isKainJadi) {
    headers.push('Harga Greige', 'Harga Maklun');
  } else {
    headers.push('Harga');
  }
  headers.push('Total');
  const thead = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;

  let grandTotal = 0;
  const tbody = normalized.map((sj, index) => {
    if (!sj.items || sj.items.length === 0) return '';

    const items = sj.items;
    grandTotal += items.reduce((s, it) => s + (Number(it.total) || 0), 0);

    const rowCount = items.length;
    const mainInfoCells = `
      <td rowspan="${rowCount}" style="text-align:center;">${index + 1}</td>
      <td rowspan="${rowCount}">${formatTanggalIndo(sj.mainData.tanggal)}</td>
      <td rowspan="${rowCount}">${sj.mainData.no_sj}</td>
      <td rowspan="${rowCount}">${sj.mainData.no_ref ?? '-'}</td>
      <td rowspan="${rowCount}">${sj.mainData.relasi}</td>
    `;

    const first = items[0];
    let firstRow = `<tr>${mainInfoCells}`;
    if (!isGreige) firstRow += `<td>${first.warna}</td>`;
    if (isSales) firstRow += `<td>${first.grade}</td>`;
    firstRow += `
      <td>${first.kain}</td>
      <td style="text-align:right;">${fmt2(first.meter)}</td>
      <td style="text-align:right;">${fmt2(first.yard)}</td>
      ${isKainJadi
        ? `<td style="text-align:right;">${fmtRp(first.harga1)}</td><td style="text-align:right;">${fmtRp(first.harga2)}</td>`
        : `<td style="text-align:right;">${fmtRp(first.harga1)}</td>`
      }
      <td style="text-align:right;">${fmtRp(first.total)}</td>
    </tr>`;

    const restRows = items.slice(1).map(it => {
      let r = `<tr>`;
      if (!isGreige) r += `<td>${it.warna}</td>`;
      if (isSales) r += `<td>${it.grade}</td>`;
      r += `
        <td>${it.kain}</td>
        <td style="text-align:right;">${fmt2(it.meter)}</td>
        <td style="text-align:right;">${fmt2(it.yard)}</td>
        ${isKainJadi
          ? `<td style="text-align:right;">${fmtRp(it.harga1)}</td><td style="text-align:right;">${fmtRp(it.harga2)}</td>`
          : `<td style="text-align:right;">${fmtRp(it.harga1)}</td>`
        }
        <td style="text-align:right;">${fmtRp(it.total)}</td>
      </tr>`;
      return r;
    }).join('');

    return firstRow + restRows;
  }).join('');

  const colspanForLabel = headers.length - 1;
  const tfoot = `
    <tfoot>
      <tr class="grand-total-row">
        <td colspan="${colspanForLabel}" style="text-align:right;">TOTAL AKHIR</td>
        <td style="text-align:right;">${fmtRp(grandTotal)}</td>
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

export async function printDeliveryNotes(block, { token, startDate = "", endDate = "", customer_id = null } = {}) {
  if (block.key !== "sales") {
    customer_id = null; // hanya sales yang pakai customer filter
  }

  const normalizeDate = (d) => {
      if (!d) return null; const x = new Date(d); if (Number.isNaN(x.getTime())) return null;
      return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  };
  const filterByDate = (rows) => {
      const s = normalizeDate(startDate); const e = normalizeDate(endDate); if (!s && !e) return rows;
      return rows.filter((r) => { const d = normalizeDate(r.created_at); if (d === null) return false; if (s && d < s) return false; if (e && d > e) return false; return true; });
  };
  const rowsFromResponse = (res) => res?.suratJalans ?? res?.surat_jalan_list ?? res?.data ?? [];
  
  const res = await block.rawFetcher(token);
  const baseRows = filterByDate(rowsFromResponse(res));

  if (baseRows.length === 0) {
      return alert("Tidak ada data untuk dicetak pada rentang tanggal ini.");
  }
  
  const processedData = await processDeliveryNotesData({ baseRows, block, token, customer_id });

  //console.log('processedData sample:', JSON.stringify(processedData.slice(0,3), null, 2));
  
  if (processedData.length === 0) {
      return alert("Gagal memproses detail data untuk dicetak.");
  }

  const filterLabel = (!startDate && !endDate) ? "Semua Data" : `${startDate} s/d ${endDate}`;
    openPrintWindow(`Laporan - ${block.label}`, processedData, block, filterLabel);
};
