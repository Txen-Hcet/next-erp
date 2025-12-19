import ExcelJS from 'exceljs';
import Swal from 'sweetalert2';
import { processSummaryData } from '../process/summaryProcessor';

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
  return '"Rp "#,##0.00'; // Default IDR
};

export async function exportSummaryToExcel({ kind, data, filterLabel, token }) {
  const isSales = kind === 'sales';
  const title = `Summary ${isSales ? 'Penjualan' : 'Jual Beli'}`;

  if (!data || data.length === 0) {
    return Swal.fire("Info", "Tidak ada data untuk diekspor.", "info");
  }

  const processedData = await processSummaryData({ kind, data, token });

  if ((processedData.invoiced?.length || 0) === 0 && (processedData.pending?.length || 0) === 0) {
    return Swal.fire("Info", "Tidak ada data detail yang dapat diolah untuk ekspor.", "info");
  }

  // Hapus numFmt statis dari Harga & Total agar bisa dinamis
  const columnConfig = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'Nama Customer', key: 'customer_name', width: 25, style: { alignment: { horizontal: 'center' } } },
  ];
  if (!isSales) columnConfig.push({ header: 'Supplier', key: 'supplier_name', width: 33 });
  columnConfig.push(
    { header: 'Corak Kain', key: 'corak', width: 20, style: { alignment: { horizontal: 'center' } } },
    { header: 'Meter', key: 'meter', width: 15, style: { numFmt: '#,##0.00' } },
    { header: 'Yard', key: 'yard', width: 15, style: { numFmt: '#,##0.00' } },
    { header: 'Kilogram', key: 'kg', width: 15, style: { numFmt: '#,##0.00' } },
    { header: 'Harga', key: 'harga', width: 18 }, // Hapus numFmt statis
    { header: 'Total', key: 'total', width: 20 }  // Hapus numFmt statis
  );

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Laporan Summary');

  worksheet.columns = columnConfig;

  const lastColLetter = excelColLetter(columnConfig.length);

  worksheet.mergeCells(`A1:${lastColLetter}1`);
  worksheet.getCell('A1').value = title;
  worksheet.getCell('A1').font = { name: 'Calibri', size: 14, bold: true };
  worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells(`A2:${lastColLetter}2`);
  worksheet.getCell('A2').value = `Periode: ${filterLabel}`;
  worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

  const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  worksheet.getCell('A1').border = borderStyle;
  worksheet.getCell('A2').border = borderStyle;

  worksheet.addRow([]);

  const renderGroup = (groupTitle, groupData, startNo) => {
    if (!groupData || groupData.length === 0) return startNo;

    const titleRow = worksheet.addRow([groupTitle]);
    worksheet.mergeCells(titleRow.number, 1, titleRow.number, columnConfig.length);
    const titleCell = titleRow.getCell(1);
    titleCell.font = { bold: true };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    titleCell.border = borderStyle;

    const headerRow = worksheet.addRow(columnConfig.map(c => c.header));
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = borderStyle;
    });

    let no = startNo;
    // PISAHKAN TOTAL IDR DAN USD
    let groupTotal = { meter: 0, yard: 0, kg: 0, amountIDR: 0, amountUSD: 0 };

    groupData.forEach((sj) => {
      const { mainData, items } = sj;
      if (!Array.isArray(items) || items.length === 0) return;

      // Ambil currency dari mainData (pastikan processor menyediakannya)
      // Jika tidak ada di mainData, coba ambil dari item pertama atau default IDR
      const currentCurrency = mainData.currency || items[0]?.currency || 'IDR';
      const currentFmt = getCurrencyFmt(currentCurrency);

      no += 1;
      const startRowNumber = worksheet.rowCount + 1;
      
      items.forEach((item) => {
        groupTotal.meter += Number(item.meter || 0);
        groupTotal.yard += Number(item.yard || 0);
        groupTotal.kg += Number(item.kg || 0);
        
        const subTotal = Number(item.subtotal || 0);
        if (currentCurrency === 'USD') {
            groupTotal.amountUSD += subTotal;
        } else {
            groupTotal.amountIDR += subTotal;
        }

        const rowValues = [];
        rowValues.push('', '');
        if (!isSales) rowValues.push('');
        rowValues.push(item.corak ?? '');
        rowValues.push(Number(item.meter ?? 0));
        rowValues.push(Number(item.yard ?? 0));
        rowValues.push(Number(item.kg ?? 0));
        rowValues.push(Number(item.harga_satuan ?? 0));
        rowValues.push(subTotal);

        const added = worksheet.addRow(rowValues);

        // Apply number formats
        const meterIdx = columnConfig.findIndex(c => c.key === 'meter') + 1;
        const yardIdx = columnConfig.findIndex(c => c.key === 'yard') + 1;
        const kgIdx = columnConfig.findIndex(c => c.key === 'kg') + 1;
        const hargaIdx = columnConfig.findIndex(c => c.key === 'harga') + 1;
        const totalIdx = columnConfig.findIndex(c => c.key === 'total') + 1;

        if (meterIdx) added.getCell(meterIdx).numFmt = '#,##0.00';
        if (yardIdx) added.getCell(yardIdx).numFmt = '#,##0.00';
        if (kgIdx) added.getCell(kgIdx).numFmt = '#,##0.00';
        
        // APPLY FORMAT DINAMIS
        if (hargaIdx) added.getCell(hargaIdx).numFmt = currentFmt;
        if (totalIdx) added.getCell(totalIdx).numFmt = currentFmt;

        // Apply border
        added.eachCell((cell) => {
          cell.border = borderStyle;
        });
      });

      const endRowNumber = worksheet.rowCount;
      if (items.length > 0) {
        const firstRow = startRowNumber;
        const lastRow = endRowNumber;

        const noCol = columnConfig.findIndex(c => c.key === 'no') + 1;
        const customerCol = columnConfig.findIndex(c => c.key === 'customer_name') + 1;
        const supplierCol = !isSales ? (columnConfig.findIndex(c => c.key === 'supplier_name') + 1) : -1;

        if (noCol > 0) {
          worksheet.mergeCells(firstRow, noCol, lastRow, noCol);
          const cell = worksheet.getCell(firstRow, noCol);
          cell.value = no;
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = borderStyle;
        }
        if (customerCol > 0) {
          worksheet.mergeCells(firstRow, customerCol, lastRow, customerCol);
          const cell = worksheet.getCell(firstRow, customerCol);
          cell.value = mainData.customer_name ?? '';
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = borderStyle;
        }
        if (!isSales && supplierCol > 0) {
          worksheet.mergeCells(firstRow, supplierCol, lastRow, supplierCol);
          const cell = worksheet.getCell(firstRow, supplierCol);
          cell.value = mainData.supplier_name ?? '';
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = borderStyle;
        }
      }
    });

    // --- RENDER TOTAL ---
    const renderTotalRow = (labelSuffix, amount, fmt) => {
        const totalRowVals = new Array(columnConfig.length).fill('');
        const labelIndex = columnConfig.findIndex(c => c.key === 'corak');
        if (labelIndex >= 0) totalRowVals[labelIndex] = `Grand Total ${labelSuffix}`;
        
        const meterIdx = columnConfig.findIndex(c => c.key === 'meter');
        const yardIdx = columnConfig.findIndex(c => c.key === 'yard');
        const kgIdx = columnConfig.findIndex(c => c.key === 'kg');
        const totalIdx = columnConfig.findIndex(c => c.key === 'total');
        
        if (meterIdx >= 0) totalRowVals[meterIdx] = groupTotal.meter;
        if (yardIdx >= 0) totalRowVals[yardIdx] = groupTotal.yard;
        if (kgIdx >= 0) totalRowVals[kgIdx] = groupTotal.kg;
        if (totalIdx >= 0) totalRowVals[totalIdx] = amount;

        const totalRow = worksheet.addRow(totalRowVals);
        totalRow.eachCell((cell, colNumber) => {
          cell.font = { bold: true };
          cell.border = borderStyle;
          // Apply format mata uang khusus ke kolom Total
          if (colNumber === totalIdx + 1) {
             cell.numFmt = fmt;
          }
          // Apply format quantity
          if ([meterIdx+1, yardIdx+1, kgIdx+1].includes(colNumber)) {
             cell.numFmt = '#,##0.00';
          }
        });
    };

    // Render Total IDR (Selalu muncul atau jika ada)
    if (groupTotal.amountIDR > 0 || groupTotal.amountUSD === 0) {
        renderTotalRow('(IDR)', groupTotal.amountIDR, '"Rp "#,##0.00');
    }

    // Render Total USD (Jika ada)
    if (groupTotal.amountUSD > 0) {
        // Reset qty di baris kedua agar tidak double counting (opsional, tergantung preferensi)
        // Disini saya biarkan quantity tetap muncul di baris USD juga sebagai total kumulatif yang sama
        // Atau set 0 jika ingin quantity hanya muncul sekali
        groupTotal.meter = 0; 
        groupTotal.yard = 0; 
        groupTotal.kg = 0;
        renderTotalRow('(USD)', groupTotal.amountUSD, '"$ "#,##0.00');
    }

    worksheet.addRow([]);
    return no;
  };

  let startNo = 0;
  startNo = renderGroup('Sudah Terbit Invoice', processedData.invoiced || [], startNo);
  startNo = renderGroup('Belum Terbit Invoice', processedData.pending || [], startNo);

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