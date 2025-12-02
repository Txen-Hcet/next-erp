import ExcelJS from 'exceljs';
import Swal from 'sweetalert2';
import PaymentHutangPurchaseFinishService from '../../services/PaymentHutangPurchaseFinishService';

function excelColLetter(colNumber) {
  let letters = '';
  while (colNumber > 0) {
    const mod = (colNumber - 1) % 26;
    letters = String.fromCharCode(65 + mod) + letters;
    colNumber = Math.floor((colNumber - 1) / 26);
  }
  return letters;
}

export async function exportPaymenntHutangPurchaseFinishToExcel({ startDate = "", endDate = "" }) {
  try {
    const title = "Laporan Pembayaran Hutang Purchase Finish";
    const filterLabel = (!startDate && !endDate) ? "Semua Data" : `${startDate} s/d ${endDate}`;

    // Tampilkan loading
    const loadingAlert = Swal.fire({
      title: 'Mempersiapkan Excel',
      text: 'Sedang menyiapkan data untuk diekspor...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const dataWithDetails = await PaymentHutangPurchaseFinishService.getAllWithDetails(startDate, endDate);
    
    await loadingAlert.close();

    if (!Array.isArray(dataWithDetails) || dataWithDetails.length === 0) {
      Swal.fire("Info", "Tidak ada data untuk diekspor pada rentang tanggal ini.", "info");
      return;
    }

    // Konfigurasi kolom untuk payment hutang
    const columnConfig = [
      { header: 'No', key: 'no', width: 5, style: { alignment: { horizontal: 'center' } } },
      { header: 'No. Pembayaran', key: 'no_pembayaran', width: 20, style: { alignment: { horizontal: 'center' } } },
      { header: 'No. Pembelian', key: 'no_pembelian', width: 18, style: { alignment: { horizontal: 'center' } } },
      { header: 'Tanggal Jatuh Tempo', key: 'tanggal_jatuh_tempo', width: 18, style: { alignment: { horizontal: 'center' } } },
      { header: 'No. Giro', key: 'no_giro', width: 15, style: { alignment: { horizontal: 'center' } } },
      { header: 'Tanggal Pengambilan Giro', key: 'tanggal_pengambilan_giro', width: 20, style: { alignment: { horizontal: 'center' } } },
      { header: 'Pembayaran', key: 'pembayaran', width: 15, style: { numFmt: '"Rp"#,##0.00', alignment: { horizontal: 'right' } } },
      { header: 'Jenis Potongan', key: 'jenis_potongan', width: 18, style: { alignment: { horizontal: 'center' } } },
      { header: 'Potongan', key: 'potongan', width: 15, style: { numFmt: '"Rp"#,##0.00', alignment: { horizontal: 'right' } } },
      //{ header: 'Subtotal', key: 'subtotal', width: 15, style: { numFmt: '"Rp"#,##0.00', alignment: { horizontal: 'right' } } },
      { header: 'Metode Pembayaran', key: 'metode_pembayaran', width: 18, style: { alignment: { horizontal: 'center' } } }
    ];

    // Buat workbook dan worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Pembayaran Hutang');

    // Set kolom
    worksheet.columns = columnConfig;

    // Hitung last column letter untuk merge cells
    const lastColLetter = excelColLetter(columnConfig.length);

    // Header judul
    worksheet.mergeCells(`A1:${lastColLetter}1`);
    worksheet.getCell('A1').value = title;
    worksheet.getCell('A1').font = { name: 'Calibri', size: 14, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

    // Header periode
    worksheet.mergeCells(`A2:${lastColLetter}2`);
    worksheet.getCell('A2').value = `Periode: ${filterLabel}`;
    worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

    // Header tanggal cetak
    worksheet.mergeCells(`A3:${lastColLetter}3`);
    worksheet.getCell('A3').value = `Tanggal cetak: ${new Date().toLocaleString('id-ID')}`;
    worksheet.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };

    // Style border untuk header
    const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    worksheet.getCell('A1').border = borderStyle;
    worksheet.getCell('A2').border = borderStyle;
    worksheet.getCell('A3').border = borderStyle;

    // Spasi
    worksheet.addRow([]);

    // Header tabel
    const headerRowValues = columnConfig.map(c => c.header);
    const headerRow = worksheet.addRow(headerRowValues);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = borderStyle;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDADBDD' } // Abu-abu muda
      };
    });

    let totalPembayaran = 0;
    let totalPotongan = 0;
    let grandTotal = 0;

    // Format tanggal untuk Excel
    const formatDateForExcel = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
    };

    // Process data payment hutang
    dataWithDetails.forEach((payment, index) => {
      const pembayaranNum = parseFloat(payment.pembayaran || 0);
      const potonganNum = parseFloat(payment.potongan || 0);
      const subtotal = pembayaranNum + potonganNum;

      totalPembayaran += pembayaranNum;
      totalPotongan += potonganNum;
      grandTotal += subtotal;

      const rowData = {
        no: index + 1,
        no_pembayaran: payment.no_pembayaran || '-',
        no_pembelian: payment.no_pembelian || '-',
        tanggal_jatuh_tempo: formatDateForExcel(payment.tanggal_jatuh_tempo),
        no_giro: payment.no_giro || '-',
        tanggal_pengambilan_giro: formatDateForExcel(payment.tanggal_pengambilan_giro),
        pembayaran: pembayaranNum,
        jenis_potongan: payment.jenis_potongan_name || '-',
        potongan: potonganNum,
        //subtotal: subtotal,
        metode_pembayaran: payment.payment_method_name || '-'
      };

      const row = worksheet.addRow(Object.values(rowData));
      
      // Apply styling untuk kolom angka
      row.getCell(7).numFmt = '"Rp"#,##0.00'; // Pembayaran
      row.getCell(9).numFmt = '"Rp"#,##0.00'; // Potongan
      row.getCell(10).numFmt = '"Rp"#,##0.00'; // Subtotal

      // Apply border ke semua cell
      row.eachCell((cell) => {
        cell.border = borderStyle;
      });
    });

    // Tambahkan baris kosong
    worksheet.addRow([]);

    // PERBAIKAN: Baris total dengan merge cells yang benar

    // Baris total pembayaran
    const totalPembayaranRowNum = worksheet.lastRow.number + 1;
    const totalPembayaranRow = worksheet.addRow([]);
    
    // Merge cells untuk label TOTAL PEMBAYARAN - kolom A sampai F
    worksheet.mergeCells(totalPembayaranRowNum, 1, totalPembayaranRowNum, 6);
    const totalPembayaranLabelCell = totalPembayaranRow.getCell(1);
    totalPembayaranLabelCell.value = 'TOTAL PEMBAYARAN';
    totalPembayaranLabelCell.font = { bold: true };
    totalPembayaranLabelCell.alignment = { horizontal: 'right' };

    // Cell untuk nilai total pembayaran di kolom G
    const totalPembayaranValueCell = totalPembayaranRow.getCell(7);
    totalPembayaranValueCell.value = totalPembayaran;
    totalPembayaranValueCell.font = { bold: true };
    totalPembayaranValueCell.numFmt = '"Rp"#,##0.00';

    // Merge cells kosong untuk kolom H sampai K
    worksheet.mergeCells(totalPembayaranRowNum, 8, totalPembayaranRowNum, 10);

    // Baris total potongan
    const totalPotonganRowNum = worksheet.lastRow.number + 1;
    const totalPotonganRow = worksheet.addRow([]);
    
    // Merge cells untuk label TOTAL POTONGAN - kolom A sampai H
    worksheet.mergeCells(totalPotonganRowNum, 1, totalPotonganRowNum, 8);
    const totalPotonganLabelCell = totalPotonganRow.getCell(1);
    totalPotonganLabelCell.value = 'TOTAL POTONGAN';
    totalPotonganLabelCell.font = { bold: true };
    totalPotonganLabelCell.alignment = { horizontal: 'right' };

    // Cell untuk nilai total potongan di kolom I
    const totalPotonganValueCell = totalPotonganRow.getCell(9);
    totalPotonganValueCell.value = totalPotongan;
    totalPotonganValueCell.font = { bold: true };
    totalPotonganValueCell.numFmt = '"Rp"#,##0.00';

    // Merge cells kosong untuk kolom J sampai K
    worksheet.mergeCells(totalPotonganRowNum, 10, totalPotonganRowNum, 10);

    // Cell kosong untuk kolom K
    totalPembayaranRow.getCell(11).value = '';

    // Apply border dan background untuk semua baris total
    [totalPembayaranRow, totalPotonganRow].forEach((row, index) => {
      for (let i = 1; i <= columnConfig.length; i++) {
        const cell = row.getCell(i);
        cell.border = borderStyle;
        const fillColor = index === 2 ? 'FFD0D0D0' : 'FFF0F0F0'; // Grand Total lebih gelap
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor }
        };
      }
    });

    // Auto filter untuk header
    worksheet.autoFilter = {
      from: { row: 5, column: 1 },
      to: { row: 5, column: columnConfig.length }
    };

    // Freeze panes (header tetap terlihat saat scroll)
    worksheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 5, activeCell: 'A6' }
    ];

    // Generate file dan download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan Pembayaran Hutang Purchase Finish - ${filterLabel}.xlsx`;
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