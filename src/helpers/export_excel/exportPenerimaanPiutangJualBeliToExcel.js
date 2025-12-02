import ExcelJS from 'exceljs';
import Swal from 'sweetalert2';
import PenerimaanPiutangJualBeliService from '../../services/PenerimaanPiutangJualBeliService';
import { PenerimaanPiutangJualBeliProcessor } from '../process/PenerimaanPiutangJualBeliProcessor';

function excelColLetter(colNumber) {
  let letters = '';
  while (colNumber > 0) {
    const mod = (colNumber - 1) % 26;
    letters = String.fromCharCode(65 + mod) + letters;
    colNumber = Math.floor((colNumber - 1) / 26);
  }
  return letters;
}

export async function exportPenerimaanPiutangJualBeliToExcel({ startDate = "", endDate = "" }) {
  try {
    const title = "Laporan Penerimaan Piutang Jual Beli";
    const filterLabel = (!startDate && !endDate) ? "Semua Data" : `${startDate} s/d ${endDate}`;

    const loadingAlert = Swal.fire({
      title: 'Mempersiapkan Excel',
      text: 'Sedang menghitung saldo piutang...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Ambil data dengan saldo customer
    const customerSaldo = await PenerimaanPiutangJualBeliService.calculateCustomerSaldo(startDate, endDate);
    
    await loadingAlert.close();

    if (!customerSaldo || Object.keys(customerSaldo).length === 0) {
      Swal.fire("Info", "Tidak ada data untuk diekspor pada rentang tanggal ini.", "info");
      return;
    }

    // Filter hanya customer yang memiliki penerimaan > 0
    const filteredCustomerSaldo = {};
    Object.keys(customerSaldo).forEach(customerName => {
      const customer = customerSaldo[customerName];
      const totalPenerimaan = customer.items.reduce((sum, item) => sum + parseFloat(item.pembayaran || 0), 0);
      
      if (totalPenerimaan > 0) {
        filteredCustomerSaldo[customerName] = customer;
      }
    });

    if (Object.keys(filteredCustomerSaldo).length === 0) {
      Swal.fire("Info", "Tidak ada data customer dengan penerimaan untuk diekspor pada rentang tanggal ini.", "info");
      return;
    }

    // Konfigurasi kolom
    const columnConfig = [
      { header: 'No', key: 'no', width: 5 },
      { header: 'Customer', key: 'customer', width: 20 },
      { header: 'No. Penerimaan', key: 'no_penerimaan', width: 18 },
      { header: 'No. Surat Jalan', key: 'no_sj', width: 15 },
      { header: 'Tanggal Penerimaan', key: 'tanggal_penerimaan', width: 15 },
      { header: 'Tanggal Jatuh Tempo', key: 'tanggal_jatuh_tempo', width: 15 },
      { header: 'Nominal Invoice', key: 'nominal_invoice', width: 15, style: { numFmt: '"Rp"#,##0.00' } },
      { header: 'Saldo Utang', key: 'saldo_utang', width: 15, style: { numFmt: '"Rp"#,##0.00' } },
      { header: 'Penerimaan', key: 'penerimaan', width: 15, style: { numFmt: '"Rp"#,##0.00' } },
      { header: 'Potongan', key: 'potongan', width: 15, style: { numFmt: '"Rp"#,##0.00' } },
      { header: 'Saldo Akhir', key: 'saldo_akhir', width: 15, style: { numFmt: '"Rp"#,##0.00' } },
      { header: 'Metode Pembayaran', key: 'metode_pembayaran', width: 15 },
      { header: 'Bank', key: 'bank', width: 15 }
    ];

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Penerimaan Piutang');

    worksheet.columns = columnConfig;

    const lastColLetter = excelColLetter(columnConfig.length);

    // Header
    worksheet.mergeCells(`A1:${lastColLetter}1`);
    worksheet.getCell('A1').value = title;
    worksheet.getCell('A1').font = { size: 14, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.mergeCells(`A2:${lastColLetter}2`);
    worksheet.getCell('A2').value = `Periode: ${filterLabel}`;
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    worksheet.mergeCells(`A3:${lastColLetter}3`);
    worksheet.getCell('A3').value = `Tanggal cetak: ${new Date().toLocaleString('id-ID')}`;
    worksheet.getCell('A3').alignment = { horizontal: 'center' };

    // Spasi
    worksheet.addRow([]);

    // Header tabel
    const headerRow = worksheet.addRow(columnConfig.map(c => c.header));
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDADBDD' } };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' }, 
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    });

    // Process data dengan grouping customer
    let rowNumber = 1;
    let totalNominalInvoice = 0;
    let totalSaldoUtang = 0;
    let totalPenerimaan = 0;
    let totalPotongan = 0;
    let totalSaldoAkhir = 0;

    Object.keys(filteredCustomerSaldo).forEach(customerName => {
      const customer = filteredCustomerSaldo[customerName];
      
      // Customer header row (simplified)
      const customerRow = worksheet.addRow([]);
      worksheet.mergeCells(customerRow.number, 1, customerRow.number, columnConfig.length);
      const customerCell = customerRow.getCell(1);
      customerCell.value = customerName;
      customerCell.font = { bold: true };
      customerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F4FD' } };
      customerCell.border = {
        top: { style: 'thin' }, left: { style: 'thin' }, 
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };

      let customerNominalInvoice = 0;
      let customerPenerimaanTotal = 0;
      let customerPotongan = 0;

      // Item rows
      customer.items.forEach((item, itemIndex) => {
        const nominalInvoice = parseFloat(item.nominal_invoice || 0);
        const penerimaan = parseFloat(item.pembayaran || 0);
        const potongan = parseFloat(item.potongan || 0);
        
        customerNominalInvoice += nominalInvoice;
        customerPenerimaanTotal += penerimaan;
        customerPotongan += potongan;
        
        const rowData = {
          no: rowNumber++,
          customer: customerName,
          no_penerimaan: item.no_penerimaan || '-',
          no_sj: item.no_sj || '-',
          tanggal_penerimaan: PenerimaanPiutangJualBeliProcessor.formatTanggalExcel(item.tanggal_pembayaran),
          tanggal_jatuh_tempo: PenerimaanPiutangJualBeliProcessor.formatTanggalExcel(item.tanggal_jatuh_tempo),
          nominal_invoice: nominalInvoice,
          saldo_utang: itemIndex === 0 ? customer.totalUtang : null,
          penerimaan: penerimaan,
          potongan: potongan,
          saldo_akhir: itemIndex === customer.items.length - 1 ? customer.saldoAkhir : null,
          metode_pembayaran: item.payment_method_name || '-',
          bank: item.bank_name || '-'
        };

        const row = worksheet.addRow(Object.values(rowData));
        
        // Apply number formatting
        [7, 8, 9, 10, 11].forEach(col => {
          const cell = row.getCell(col);
          if (cell.value !== null) {
            cell.numFmt = '"Rp"#,##0.00';
          }
        });

        // Apply borders
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' }, 
            bottom: { style: 'thin' }, right: { style: 'thin' }
          };
        });
      });

      // Customer total row
      const customerTotalRow = worksheet.addRow([]);
      worksheet.mergeCells(customerTotalRow.number, 1, customerTotalRow.number, 6);
      customerTotalRow.getCell(1).value = `Total ${customerName}`;
      customerTotalRow.getCell(1).font = { bold: true };
      customerTotalRow.getCell(1).alignment = { horizontal: 'right' };
      
      customerTotalRow.getCell(7).value = customerNominalInvoice;
      customerTotalRow.getCell(7).font = { bold: true };
      customerTotalRow.getCell(7).numFmt = '"Rp"#,##0.00';
      
      customerTotalRow.getCell(8).value = customer.totalUtang;
      customerTotalRow.getCell(8).font = { bold: true };
      customerTotalRow.getCell(8).numFmt = '"Rp"#,##0.00';
      
      customerTotalRow.getCell(9).value = customerPenerimaanTotal;
      customerTotalRow.getCell(9).font = { bold: true };
      customerTotalRow.getCell(9).numFmt = '"Rp"#,##0.00';
      
      customerTotalRow.getCell(10).value = customerPotongan;
      customerTotalRow.getCell(10).font = { bold: true };
      customerTotalRow.getCell(10).numFmt = '"Rp"#,##0.00';
      
      customerTotalRow.getCell(11).value = customer.saldoAkhir;
      customerTotalRow.getCell(11).font = { bold: true };
      customerTotalRow.getCell(11).numFmt = '"Rp"#,##0.00';

      // Style customer total row
      for (let i = 1; i <= columnConfig.length; i++) {
        const cell = customerTotalRow.getCell(i);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE8F4FD' }
        };
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' }, 
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      }

      // Add spacer row
      worksheet.addRow([]);

      // Accumulate grand totals
      totalNominalInvoice += customerNominalInvoice;
      totalSaldoUtang += customer.totalUtang;
      totalPenerimaan += customerPenerimaanTotal;
      totalPotongan += customerPotongan;
      totalSaldoAkhir += customer.saldoAkhir;
    });

    // Grand total row
    const grandTotalRow = worksheet.addRow([]);
    worksheet.mergeCells(grandTotalRow.number, 1, grandTotalRow.number, 6);
    grandTotalRow.getCell(1).value = 'GRAND TOTAL';
    grandTotalRow.getCell(1).font = { bold: true };
    grandTotalRow.getCell(1).alignment = { horizontal: 'right' };
    
    grandTotalRow.getCell(7).value = totalNominalInvoice;
    grandTotalRow.getCell(7).font = { bold: true };
    grandTotalRow.getCell(7).numFmt = '"Rp"#,##0.00';
    
    grandTotalRow.getCell(8).value = totalSaldoUtang;
    grandTotalRow.getCell(8).font = { bold: true };
    grandTotalRow.getCell(8).numFmt = '"Rp"#,##0.00';
    
    grandTotalRow.getCell(9).value = totalPenerimaan;
    grandTotalRow.getCell(9).font = { bold: true };
    grandTotalRow.getCell(9).numFmt = '"Rp"#,##0.00';
    
    grandTotalRow.getCell(10).value = totalPotongan;
    grandTotalRow.getCell(10).font = { bold: true };
    grandTotalRow.getCell(10).numFmt = '"Rp"#,##0.00';
    
    grandTotalRow.getCell(11).value = totalSaldoAkhir;
    grandTotalRow.getCell(11).font = { bold: true };
    grandTotalRow.getCell(11).numFmt = '"Rp"#,##0.00';

    // Style grand total row
    for (let i = 1; i <= columnConfig.length; i++) {
      const cell = grandTotalRow.getCell(i);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD0D0D0' }
      };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' }, 
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    }

    // Generate file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan Penerimaan Piutang Jual Beli - ${filterLabel}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    Swal.fire("Sukses", "File Excel berhasil diunduh!", "success");

  } catch (error) {
    console.error('Error exporting to Excel:', error);
    Swal.fire("Error", "Terjadi kesalahan saat mengekspor data ke Excel.", "error");
  }
}