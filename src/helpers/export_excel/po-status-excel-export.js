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

export async function exportPOStatusToExcel({ block, status, filterLabel, token, poRows, isGreige, PO_DETAIL_FETCHER, customer_id = null }) {
  if (block.key !== "sales") {
      customer_id = null; // hanya sales yang pakai customer filter
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
      { header: 'Harga Greige', key: 'harga_greige', width: 18, style: { numFmt: '"Rp "#,##0.00' } },
      { header: 'Harga Maklun', key: 'harga_maklun', width: 18, style: { numFmt: '"Rp "#,##0.00' } }
    );
  } else {
    columns.push({ header: 'Harga', key: 'harga_satuan', width: 18, style: { numFmt: '"Rp "#,##0.00' } });
  }
  columns.push({ header: 'Total', key: 'subtotal', width: 20, style: { numFmt: '"Rp "#,##0.00' } });

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

  let grandTotal = 0;
  processedData.forEach((po, index) => {
    const { mainData, items } = po;
    if (!Array.isArray(items) || items.length === 0) return;

    const startRow = worksheet.rowCount + 1;

    items.forEach((item, itemIndex) => {
      grandTotal += Number(item.subtotal || 0);
      
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
  const totalRowNumber = worksheet.lastRow.number + 1;
  const totalRow = worksheet.addRow([]);
  worksheet.mergeCells(totalRowNumber, 1, totalRowNumber, columns.length - 1);

  const totalLabelCell = totalRow.getCell(1);
  totalLabelCell.value = 'TOTAL AKHIR';
  totalLabelCell.font = { bold: true };
  totalLabelCell.alignment = { horizontal: 'right' };

  for (let i = 1; i <= columns.length; i++) {
    totalRow.getCell(i).border = borderStyle;
  }

  const totalValueCell = totalRow.getCell(columns.length);
  totalValueCell.value = grandTotal;
  totalValueCell.font = { bold: true };
  totalValueCell.numFmt = '"Rp "#,##0.00';

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
