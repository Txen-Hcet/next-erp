import ExcelJS from 'exceljs';
import Swal from 'sweetalert2';
import { processPOStatusData } from '../../helpers/process/poStatusProcessor';

function excelColLetter(colNumber) {
  let letters = '';
  while (colNumber > 0) {
    const mod = (colNumber - 1) % 26;
    letters = String.fromCharCode(65 + mod) + letters;
    colNumber = Math.floor((colNumber - 1) / 26);
  }
  return letters;
}

// HELPER: Format Excel Dinamis
const getCurrencyFmt = (currencyCode) => {
  if (currencyCode === 'USD') return '"$ "#,##0.00';
  return '"Rp "#,##0.00';
};

export async function exportPOStatusToExcel({ block, status, filterLabel, token, poRows, isGreige, PO_DETAIL_FETCHER, customer_id = null }) {
  if (block.key !== "sales") {
      customer_id = null; 
  }
  
  const processedData = await processPOStatusData({
    poRows,
    status,
    block: { ...block },
    token,
    PO_DETAIL_FETCHER,
    customer_id,
  });

  const title = `Rekap ${block.label} - ${status === 'done' ? 'Selesai' : 'Belum Selesai'}`;
  const isKainJadi = block.key === 'kain_jadi';
  const relasiHeader = block.mode === 'penjualan' ? 'Customer' : 'Supplier';

  if (processedData.length === 0) {
    Swal.fire("Info", `Tidak ada data untuk diekspor dengan status "${status === 'done' ? 'Selesai' : 'Belum Selesai'}".`, "info");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Laporan PO Status');

  // Hapus numFmt statis dari definisi kolom harga/total agar bisa dinamis
  let columns = [
    { header: 'No', key: 'no', width: 5, style: { alignment: { horizontal: 'center' } } },
    { header: 'No. PO', key: 'ref', width: 27, style: { alignment: { horizontal: 'center' } } },
    { header: relasiHeader, key: 'relasi', width: 30, style: { alignment: { horizontal: 'center' } } },
    { header: 'Tanggal', key: 'tanggal', width: 15, style: { alignment: { horizontal: 'center' } } },
    { header: 'Corak', key: 'corak', width: 20, style: { alignment: { horizontal: 'center' } } },
  ];

  if (!isGreige) {
    columns.push(
      { header: 'Warna', key: 'warna', width: 18, style: { alignment: { horizontal: 'center' } } },
      { header: 'Ket. Warna', key: 'ketWarna', width: 20 }
    );
  }

  columns.push(
    { header: 'QTY PO', key: 'totalPO', width: 18 },
    { header: 'QTY Masuk', key: 'masukPO', width: 18 },
    { header: 'Sisa PO', key: 'sisaPO', width: 18 }
  );

  if (isKainJadi) {
    columns.push(
      { header: 'Harga Greige', key: 'harga_greige', width: 18 }, // tanpa numFmt
      { header: 'Harga Maklun', key: 'harga_maklun', width: 18 }  // tanpa numFmt
    );
  } else {
    columns.push({ header: 'Harga', key: 'harga_satuan', width: 18 }); // tanpa numFmt
  }
  columns.push({ header: 'Total', key: 'subtotal', width: 20 }); // tanpa numFmt

  worksheet.columns = columns;

  const lastColumnLetter = excelColLetter(columns.length);

  worksheet.mergeCells(`A1:${lastColumnLetter}1`);
  const titleCell = worksheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { name: 'Calibri', size: 14, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  const periodText = filterLabel === 's/d' ? 'Periode: Semua Data' : `Periode: ${filterLabel}`;
  worksheet.mergeCells(`A2:${lastColumnLetter}2`);
  const periodCell = worksheet.getCell('A2');
  periodCell.value = periodText;
  periodCell.alignment = { horizontal: 'center', vertical: 'middle' };

  const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  titleCell.border = borderStyle;
  periodCell.border = borderStyle;

  worksheet.addRow([]);

  const headerRow = worksheet.addRow(columns.map(col => col.header));
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = borderStyle;
  });

  // TOTALING
  let grandTotalIDR = 0;
  let grandTotalUSD = 0;

  processedData.forEach((po, index) => {
    const { mainData, items } = po;
    if (!Array.isArray(items) || items.length === 0) return;

    // Ambil Currency per PO dari mainData
    const currentCurrency = mainData.currency || 'IDR';
    const currentFmt = getCurrencyFmt(currentCurrency);

    const startRow = worksheet.rowCount + 1;

    items.forEach((item, itemIndex) => {
      const subTotal = Number(item.subtotal || 0);
      
      if (currentCurrency === 'USD') {
        grandTotalUSD += subTotal;
      } else {
        grandTotalIDR += subTotal;
      }
      
      const rowData = {
        ...item
      };

      if (itemIndex === 0) {
        rowData.no = index + 1;
        rowData.ref = mainData.ref;
        rowData.relasi = mainData.relasi;
        const dateStr = String(mainData.tanggal || '');
        const dateParts = dateStr.includes(' ') ? dateStr.split(' ')[0].split('-') : dateStr.split('-');
        rowData.tanggal = (dateParts.length === 3) ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : dateStr;
      }

      const addedRow = worksheet.addRow(rowData);
      addedRow.eachCell((cell) => {
        cell.border = borderStyle;
      });

      ['totalPO', 'masukPO', 'sisaPO'].forEach(key => {
        try {
          const cell = addedRow.getCell(key);
          cell.numFmt = `#,##0.00" ${mainData.unit || ''}"`;
        } catch (e) {}
      });

      // APPLY FORMAT CURRENCY DINAMIS PER SEL
      if (isKainJadi) {
        const c1 = addedRow.getCell('harga_greige');
        const c2 = addedRow.getCell('harga_maklun');
        c1.numFmt = currentFmt;
        c2.numFmt = currentFmt;
      } else {
        const c = addedRow.getCell('harga_satuan');
        c.numFmt = currentFmt;
      }
      const ct = addedRow.getCell('subtotal');
      ct.numFmt = currentFmt;
    });

    if (items.length > 1) {
      const endRow = worksheet.rowCount;
      ['no', 'ref', 'relasi', 'tanggal'].forEach(key => {
        const colNum = columns.findIndex(c => c.key === key) + 1;
        if (colNum > 0) {
          worksheet.mergeCells(startRow, colNum, endRow, colNum);
          const cell = worksheet.getCell(startRow, colNum);
          cell.alignment = { ...cell.alignment, vertical: 'middle', horizontal: 'center' };
          cell.border = borderStyle;
          if(key === 'ref' || key === 'relasi') {
            cell.alignment = { ...cell.alignment, horizontal: 'center' };
          }
        }
      });
    }
  });

  worksheet.addRow([]);

  // RENDER GRAND TOTAL ROWS
  const renderTotalRow = (label, value, fmt) => {
    const r = worksheet.addRow([]);
    const rowNum = r.number;
    
    worksheet.mergeCells(rowNum, 1, rowNum, columns.length - 1);
    const labelCell = r.getCell(1);
    labelCell.value = label;
    labelCell.font = { bold: true };
    labelCell.alignment = { horizontal: 'right' };

    for (let i = 1; i <= columns.length; i++) {
        r.getCell(i).border = borderStyle;
    }

    const valCell = r.getCell(columns.length);
    valCell.value = value;
    valCell.font = { bold: true };
    valCell.numFmt = fmt;
  };

  if (grandTotalIDR > 0 || grandTotalUSD === 0) {
    renderTotalRow('TOTAL AKHIR (IDR)', grandTotalIDR, '"Rp "#,##0.00');
  }

  if (grandTotalUSD > 0) {
    renderTotalRow('TOTAL AKHIR (USD)', grandTotalUSD, '"$ "#,##0.00');
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title} - ${filterLabel}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}