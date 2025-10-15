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
    processedData.sort((a, b) => new Date(a.mainData.tanggal) - new Date(b.mainData.tanggal));
    
    const w = window.open("", "", "height=700,width=980");

    const isGreige = block.key === 'greige';
    const isKainJadi = block.key === 'kain_jadi';
    const isSales = block.mode === 'penjualan';
    
    const style = `<style>
        @page { 
            size: A4; 
            margin: 11mm; 
        }
        body{ 
            font-family: Arial, sans-serif; 
            margin:0; 
        }
        .paper{ 
            width:100%; 
        } 
        h1{ 
            margin:0 0 8mm 0 
        }
        table{ 
            border-collapse:collapse; 
            width:100%; 
        }
        th,td{ 
            border:1px solid #000; 
            padding:4px 6px; 
            font-size:9px; 
            word-wrap:break-word; 
        }
        th{ 
            background:#DADBDD; 
            text-align:center; 
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
    const tbody = processedData.map((sj, index) => {
        if (!sj.items.length) return '';

        grandTotal += sj.items.reduce((sum, item) => sum + item.total, 0);
        
        const rowCount = sj.items.length;
        const mainInfoCells = `
            <td rowspan="${rowCount}" style="text-align:center;">${index + 1}</td>
            <td rowspan="${rowCount}">${formatTanggalIndo(sj.mainData.tanggal)}</td>
            <td rowspan="${rowCount}">${sj.mainData.no_sj}</td>
            <td rowspan="${rowCount}">${sj.mainData.no_ref}</td>
            <td rowspan="${rowCount}">${sj.mainData.relasi}</td>
        `;

        const firstItem = sj.items[0];
        let firstItemRow = `<tr>${mainInfoCells}`;
        if (!isGreige) firstItemRow += `<td>${firstItem.warna}</td>`;
        if (isSales) firstItemRow += `<td>${firstItem.grade}</td>`;
        firstItemRow += `
            <td>${firstItem.kain}</td>
            <td style="text-align:right;">${fmt2(firstItem.meter)}</td>
            <td style="text-align:right;">${fmt2(firstItem.yard)}</td>
            ${isKainJadi
                ? `<td style="text-align:right;">${fmtRp(firstItem.harga1)}</td><td style="text-align:right;">${fmtRp(firstItem.harga2)}</td>`
                : `<td style="text-align:right;">${fmtRp(firstItem.harga1)}</td>`
            }
            <td style="text-align:right;">${fmtRp(firstItem.total)}</td>
        </tr>`;

        const subsequentItemRows = sj.items.slice(1).map(item => {
            let rowHtml = `<tr>`;
            if (!isGreige) rowHtml += `<td>${item.warna}</td>`;
            if (isSales) rowHtml += `<td>${item.grade}</td>`;
            rowHtml += `
                <td>${item.kain}</td>
                <td style="text-align:right;">${fmt2(item.meter)}</td>
                <td style="text-align:right;">${fmt2(item.yard)}</td>
                ${isKainJadi
                    ? `<td style="text-align:right;">${fmtRp(item.harga1)}</td><td style="text-align:right;">${fmtRp(item.harga2)}</td>`
                    : `<td style="text-align:right;">${fmtRp(item.harga1)}</td>`
                }
                <td style="text-align:right;">${fmtRp(item.total)}</td>
            </tr>`;
            return rowHtml;
        }).join('');

        return firstItemRow + subsequentItemRows;
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

export async function printDeliveryNotes(block, { token, startDate = "", endDate = "" } = {}) {
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
    
    const processedData = await processDeliveryNotesData({ baseRows, block, token });
    
    if (processedData.length === 0) {
        return alert("Gagal memproses detail data untuk dicetak.");
    }

    const filterLabel = (!startDate && !endDate) ? "Semua Data" : `${startDate} s/d ${endDate}`;
    openPrintWindow(`Laporan - ${block.label}`, processedData, block, filterLabel);
}