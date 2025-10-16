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
    { header: 'Harga', key: 'harga', width: 18, style: { numFmt: '"Rp "#,##0.00' } },
    { header: 'Total', key: 'total', width: 20, style: { numFmt: '"Rp "#,##0.00' } }
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

  worksheet.addRow([]);

  const renderGroup = (groupTitle, groupData, startNo) => {
    if (!groupData || groupData.length === 0) return startNo;

    const titleRow = worksheet.addRow([groupTitle]);
    worksheet.mergeCells(titleRow.number, 1, titleRow.number, columnConfig.length);
    titleRow.getCell(1).font = { bold: true };
    titleRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

    const headerRow = worksheet.addRow(columnConfig.map(c => c.header));
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    let no = startNo;
    let groupTotal = { meter: 0, yard: 0, kg: 0, amount: 0 };

    groupData.forEach((sj) => {
      const { mainData, items } = sj;
      if (!Array.isArray(items) || items.length === 0) return;

      no += 1;
      const startRowNumber = worksheet.rowCount + 1;
      items.forEach((item) => {
        groupTotal.meter += Number(item.meter || 0);
        groupTotal.yard += Number(item.yard || 0);
        groupTotal.kg += Number(item.kg || 0);
        groupTotal.amount += Number(item.subtotal || 0);

        const rowValues = [];
        rowValues.push('', '');
        if (!isSales) rowValues.push('');
        rowValues.push(item.corak ?? '');
        rowValues.push(Number(item.meter ?? 0));
        rowValues.push(Number(item.yard ?? 0));
        rowValues.push(Number(item.kg ?? 0));
        rowValues.push(Number(item.harga_satuan ?? 0));
        rowValues.push(Number(item.subtotal ?? 0));

        const added = worksheet.addRow(rowValues);

        const meterIdx = columnConfig.findIndex(c => c.key === 'meter') + 1;
        const yardIdx = columnConfig.findIndex(c => c.key === 'yard') + 1;
        const kgIdx = columnConfig.findIndex(c => c.key === 'kg') + 1;
        const hargaIdx = columnConfig.findIndex(c => c.key === 'harga') + 1;
        const totalIdx = columnConfig.findIndex(c => c.key === 'total') + 1;

        if (meterIdx) {
          const c = added.getCell(meterIdx);
          c.numFmt = '#,##0.00';
        }
        if (yardIdx) {
          const c = added.getCell(yardIdx);
          c.numFmt = '#,##0.00';
        }
        if (kgIdx) {
          const c = added.getCell(kgIdx);
          c.numFmt = '#,##0.00';
        }
        if (hargaIdx) {
          const c = added.getCell(hargaIdx);
          c.numFmt = '"Rp "#,##0.00';
        }
        if (totalIdx) {
          const c = added.getCell(totalIdx);
          c.numFmt = '"Rp "#,##0.00';
        }
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
        }
        if (customerCol > 0) {
          worksheet.mergeCells(firstRow, customerCol, lastRow, customerCol);
          const cell = worksheet.getCell(firstRow, customerCol);
          cell.value = mainData.customer_name ?? '';
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        if (!isSales && supplierCol > 0) {
          worksheet.mergeCells(firstRow, supplierCol, lastRow, supplierCol);
          const cell = worksheet.getCell(firstRow, supplierCol);
          cell.value = mainData.supplier_name ?? '';
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      }
    });

    const totalRowVals = new Array(columnConfig.length).fill('');
    const labelIndex = columnConfig.findIndex(c => c.key === 'corak');
    if (labelIndex >= 0) totalRowVals[labelIndex] = 'Grand Total';
    const meterIdx = columnConfig.findIndex(c => c.key === 'meter');
    const yardIdx = columnConfig.findIndex(c => c.key === 'yard');
    const kgIdx = columnConfig.findIndex(c => c.key === 'kg');
    const totalIdx = columnConfig.findIndex(c => c.key === 'total');
    if (meterIdx >= 0) totalRowVals[meterIdx] = groupTotal.meter;
    if (yardIdx >= 0) totalRowVals[yardIdx] = groupTotal.yard;
    if (kgIdx >= 0) totalRowVals[kgIdx] = groupTotal.kg;
    if (totalIdx >= 0) totalRowVals[totalIdx] = groupTotal.amount;

    const totalRow = worksheet.addRow(totalRowVals);
    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
    });

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
