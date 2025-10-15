import { processSummaryData } from "../../helpers/process/summaryProcessor";
import { getAllDeliveryNotes, getAllJBDeliveryNotes } from "../../utils/auth";

// Helper Formatting
const fmt2 = (n) => new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(+n || 0);
const fmtRp = (n) => {
  if (n === null || n === undefined) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 2 }).format(+n);
};

// Fungsi untuk membangun satu buah tabel HTML (misal: "Sudah Invoice")
const buildTableHtml = (label, data, isSales) => {
  const emptyCols = isSales ? 8 : 9;
  if (data.length === 0) {
    return `<h3>${label}</h3><table border="1"><thead><tr><th colspan="${emptyCols}">Tidak ada data</th></tr></thead></table>`;
  }

  const headers = `
    <tr>
      <th rowspan="2">No</th>
      <th rowspan="2">Nama Customer</th>
      ${isSales ? "" : `<th rowspan="2">Supplier</th>`}
      <th rowspan="2">Corak Kain</th>
      <th colspan="3">Quantity</th>
      <th rowspan="2">Harga</th>
      <th rowspan="2">Total</th>
    </tr>
    <tr><th>Meter</th><th>Yard</th><th>Kg</th></tr>`;

  let groupTotal = { meter: 0, yard: 0, kg: 0, amount: 0 };
  let currentNo = 0;

  const tbody = data.map(sj => {
    const { mainData, items } = sj;
    if (items.length === 0) return '';
    currentNo++;

    items.forEach(item => {
      groupTotal.meter += item.meter;
      groupTotal.yard += item.yard;
      groupTotal.kg += item.kg;
      groupTotal.amount += item.subtotal;
    });
    
    const rowCount = items.length;
    const mainCells = `
      <td rowspan="${rowCount}">${currentNo}</td>
      <td rowspan="${rowCount}">${mainData.customer_name}</td>
      ${isSales ? "" : `<td rowspan="${rowCount}">${mainData.supplier_name}</td>`}`;

    const firstItem = items[0];
    const firstItemRow = `
      <tr>
        ${mainCells}
        <td>${firstItem.corak}</td>
        <td style="text-align:right;">${fmt2(firstItem.meter)}</td>
        <td style="text-align:right;">${fmt2(firstItem.yard)}</td>
        <td style="text-align:right;">${fmt2(firstItem.kg)}</td>
        <td style="text-align:right;">${fmtRp(firstItem.harga_satuan)}</td>
        <td style="text-align:right;">${fmtRp(firstItem.subtotal)}</td>
      </tr>`;
      
    const subsequentItemRows = items.slice(1).map(item => `
      <tr>
        <td>${item.corak}</td>
        <td style="text-align:right;">${fmt2(item.meter)}</td>
        <td style="text-align:right;">${fmt2(item.yard)}</td>
        <td style="text-align:right;">${fmt2(item.kg)}</td>
        <td style="text-align:right;">${fmtRp(item.harga_satuan)}</td>
        <td style="text-align:right;">${fmtRp(item.subtotal)}</td>
      </tr>`).join('');

    return firstItemRow + subsequentItemRows;
  }).join('');

  const colspan = isSales ? 3 : 4;
  const tfoot = `
    <tfoot>
      <tr style="font-weight:bold;">
        <td colspan="${colspan}" style="text-align:right;">Grand Total</td>
        <td style="text-align:right;">${fmt2(groupTotal.meter)}</td>
        <td style="text-align:right;">${fmt2(groupTotal.yard)}</td>
        <td style="text-align:right;">${fmt2(groupTotal.kg)}</td>
        <td></td>
        <td style="text-align:right;">${fmtRp(groupTotal.amount)}</td>
      </tr>
    </tfoot>`;

  return `
    <h3>${label}</h3>
    <table><thead>${headers}</thead><tbody>${tbody}</tbody>${tfoot}</table>`;
};

// Fungsi utama yang dipanggil dari Dashboard
export async function printSummaryReport({ kind, token, startDate = "", endDate = "" }) {
  const isSales = kind === "sales";
  const title = `Summary ${isSales ? "Penjualan" : "Jual Beli"}`;
  const filterLabel = (!startDate && !endDate) ? "Semua Data" : `${startDate} s/d ${endDate}`;
  
  const listFetcher = isSales ? getAllDeliveryNotes : getAllJBDeliveryNotes;
  const normalizeDate = (d) => { if (!d) return null; const x = new Date(d); if (Number.isNaN(x.getTime())) return null; return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime(); };
  const filterByDate = (rows) => { const s = normalizeDate(startDate); const e = normalizeDate(endDate); if (!s && !e) return rows; return rows.filter((r) => { const d = normalizeDate(r.created_at); if (d === null) return false; if (s && d < s) return false; if (e && d > e) return false; return true; }); };
  const rowsFromResponse = (res) => res?.suratJalans ?? res?.surat_jalan_list ?? res?.data ?? [];
  
  const listRes = await listFetcher(token);
  const baseRows = filterByDate(rowsFromResponse(listRes));

  if (baseRows.length === 0) {
    return alert("Tidak ada data untuk dicetak pada periode ini.");
  }
  
  const processedData = await processSummaryData({ kind, data: baseRows, token });

  if (processedData.invoiced.length === 0 && processedData.pending.length === 0) {
    return alert("Gagal mengambil data detail untuk laporan.");
  }

  const invoicedHtml = buildTableHtml("Sudah Terbit Invoice", processedData.invoiced, isSales);
  const pendingHtml = buildTableHtml("Belum Terbit Invoice", processedData.pending, isSales);
  
  const style = `<style>
    @page { 
        size: A4; 
        margin: 11mm; 
    }

    body { 
        font-family: Arial, sans-serif; 
        margin: 0; 
    }

    .paper { 
        width: 100%; 
    }

    h1 { 
        font-size: 16px; 
        margin: 0 0 8mm 0; 
    }

    h3 { 
        font-size: 14px; 
        margin: 12px 0 6px 0; 
    }

    table { 
        border-collapse: collapse; 
        width: 100%; 
    }

    th, td { 
        border: 1px solid #000; 
        padding: 3px 4px; 
        font-size: 9px; 
        word-wrap: break-word; 
    }

    th { 
        background: #DADBDD; 
        text-align: center; 
    }

    thead { 
        display: table-header-group; 
    }

    tfoot tr { 
        page-break-inside: avoid; 
    }
  </style>`;
  
  const headerHtml = `<h1>${title}</h1>
    <div>Periode: ${filterLabel}</div>
    <div>Tanggal Cetak: ${new Date().toLocaleString('id-ID')}</div>`;

  const w = window.open("", "", "height=700,width=980");
  w.document.write(`
    <html><head><title>${title}</title>${style}</head><body>
      <div class="paper">
        ${headerHtml}
        ${invoicedHtml}
        <br/>
        ${pendingHtml}
      </div>
    </body></html>`);
  w.document.close();
  w.focus();
  w.print();
}