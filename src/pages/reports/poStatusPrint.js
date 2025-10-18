import { processPOStatusData } from '../../helpers/process/poStatusProcessor';

// Helper formatting tidak berubah
const formatNum = (n) => new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(+n || 0);
const formatDatePrint = (d) => {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "-";
  return `${String(x.getDate()).padStart(2, "0")}-${String(x.getMonth() + 1).padStart(2, "0")}-${x.getFullYear()}`;
};
const formatCurrency = (n) => {
  if (n === null || n === undefined) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 2 }).format(+n);
};

const openPrintWindow = (title, processedData, block, filterLabel) => {
    const isSales = block.mode === "penjualan";
    const isGreige = block.key === "greige";
    const isKainJadi = block.key === "kain_jadi";
    const relasiHeader = isSales ? "Customer" : "Supplier";
    const refHeader = isSales ? "No. SO" : (block.key === 'jual_beli' ? 'No. JB' : "No. PO");
    
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
    tfoot { 
        display: table-row-group; 
    }
    .grand-total-row { 
        page-break-inside: avoid; 
        font-weight: bold; 
    }
    </style>`;
    
    const headerHtml = `<h1>${title}</h1>
        <div>Periode: ${filterLabel}</div>
        <div>Tanggal cetak: ${new Date().toLocaleString('id-ID')}</div><br/>`;
    
    let headers = ['No', refHeader, `Nama ${relasiHeader}`, 'Tanggal', 'Corak Kain'];
    if (!isGreige) headers.push('Warna', 'Ket. Warna');
    headers.push('QTY PO', 'QTY Masuk', 'Sisa PO');
    if (isKainJadi) {
        headers.push('Harga Greige', 'Harga Maklun');
    } else {
        headers.push('Harga');
    }
    headers.push('Total');
    const thead = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;

    let grandTotal = 0;
    const tbody = processedData.map((po, index) => {
        const { mainData, items } = po;
        if (items.length === 0) return '';
        
        grandTotal += items.reduce((sum, item) => sum + item.subtotal, 0);
        
        const rowCount = items.length;
        const unitLabel = mainData.unit || 'Meter';

        const mainInfoCells = `
        <td rowspan="${rowCount}" style="text-align:center; vertical-align: middle;">${index + 1}</td>
        <td rowspan="${rowCount}" style="vertical-align: middle;">${mainData.ref}</td>
        <td rowspan="${rowCount}" style="vertical-align: middle;">${mainData.relasi}</td>
        <td rowspan="${rowCount}" style="text-align:center; vertical-align: middle;">${formatDatePrint(mainData.tanggal)}</td>
        `;

        const firstItem = items[0];
        let firstItemRow = `<tr>${mainInfoCells}<td>${firstItem.corak}</td>`;
        if (!isGreige) {
        firstItemRow += `<td>${firstItem.warna}</td><td>${firstItem.ketWarna}</td>`;
        }

        // tampilkan qty per ITEM (jangan rowspan) — gunakan field per-item jika ada, fallback ke mainData
        const qtyPO_item = Number(firstItem.totalPO ?? firstItem.totalPO ?? firstItem.totalPO ?? mainData.totalPO ?? 0);
        const masukPO_item = Number(firstItem.masukPO ?? firstItem.masukPO ?? firstItem.masukPO ?? mainData.masukPO ?? 0);
        const sisaPO_item = Number(firstItem.sisaPO ?? Math.max(0, (qtyPO_item - masukPO_item)));

        firstItemRow += `
        <td style="text-align:right;">${formatNum(qtyPO_item)} ${unitLabel}</td>
        <td style="text-align:right;">${formatNum(masukPO_item)} ${unitLabel}</td>
        <td style="text-align:right;">${formatNum(sisaPO_item)} ${unitLabel}</td>
        `;

        if (isKainJadi) {
        firstItemRow += `<td style="text-align:right;">${formatCurrency(firstItem.harga_greige)}</td>
                        <td style="text-align:right;">${formatCurrency(firstItem.harga_maklun)}</td>`;
        } else {
        firstItemRow += `<td style="text-align:right;">${formatCurrency(firstItem.harga_satuan)}</td>`;
        }
        firstItemRow += `<td style="text-align:right;">${formatCurrency(firstItem.subtotal)}</td></tr>`;

        const subsequentItemRows = items.slice(1).map(item => {
        const qtyPO = Number(item.totalPO ?? item.total ?? mainData.totalPO ?? 0);
        const masukPO = Number(item.masukPO ?? item.masukPO ?? mainData.masukPO ?? 0);
        const sisaPO = Number(item.sisaPO ?? Math.max(0, (qtyPO - masukPO)));

        let rowHtml = `<tr><td>${item.corak}</td>`;
        if (!isGreige) {
            rowHtml += `<td>${item.warna}</td><td>${item.ketWarna}</td>`;
        }

        rowHtml += `
            <td style="text-align:right;">${formatNum(qtyPO)} ${unitLabel}</td>
            <td style="text-align:right;">${formatNum(masukPO)} ${unitLabel}</td>
            <td style="text-align:right;">${formatNum(sisaPO)} ${unitLabel}</td>
        `;

        if (isKainJadi) {
            rowHtml += `<td style="text-align:right;">${formatCurrency(item.harga_greige)}</td>
                        <td style="text-align:right;">${formatCurrency(item.harga_maklun)}</td>`;
        } else {
            rowHtml += `<td style="text-align:right;">${formatCurrency(item.harga_satuan)}</td>`;
        }
        rowHtml += `<td style="text-align:right;">${formatCurrency(item.subtotal)}</td></tr>`;
        return rowHtml;
        }).join('');

        return firstItemRow + subsequentItemRows;

    }).join('');

    const colspanForLabel = headers.length - 1;
    const tfoot = `<tfoot><tr class="grand-total-row">
        <td colspan="${colspanForLabel}" style="text-align:right;">TOTAL AKHIR</td>
        <td style="text-align:right;">${formatCurrency(grandTotal)}</td>
    </tr></tfoot>`;

    const w = window.open("", "", "height=700,width=980");
    w.document.write(`<html><head><title>${title}</title>${style}</head><body>
        <div class="paper">${headerHtml}<table><thead>${thead}</thead><tbody>${tbody}</tbody>${tfoot}</table></div>
    </body></html>`);
    w.document.close(); w.focus(); w.print();
};

export async function printPOStatus({ block, status, poRows, startDate, endDate, token, PO_DETAIL_FETCHER, customer_id = null }) {
    if (block.key !== "sales") {
        customer_id = null; // hanya sales yang pakai customer filter
    }
    const title = `Rekap ${block.label} - ${status === "done" ? "Selesai" : "Belum Selesai"}`;
    const filterLabel = (!startDate && !endDate) ? "Semua Data" : `${startDate} s/d ${endDate}`;

    const processedData = await processPOStatusData({ poRows, status, block, token, PO_DETAIL_FETCHER, customer_id });

    if (processedData.length === 0) {
        return alert(`Tidak ada data untuk dicetak dengan status "${status === 'done' ? 'Selesai' : 'Belum Selesai'}".`);
    }

    openPrintWindow(title, processedData, block, filterLabel);
    }