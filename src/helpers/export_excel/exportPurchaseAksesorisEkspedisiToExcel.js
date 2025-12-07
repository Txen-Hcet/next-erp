import ExcelJS from 'exceljs';
import Swal from 'sweetalert2';
import PurchaseAksesorisEkspedisiService from '../../services/PurchaseAksesorisEkspedisiService';
import { PurchaseAksesorisEkspedisiProcessor } from '../process/PurchaseAksesorisEkspedisiProcessor';

function excelColLetter(colNumber) {
  let letters = '';
  while (colNumber > 0) {
    const mod = (colNumber - 1) % 26;
    letters = String.fromCharCode(65 + mod) + letters;
    colNumber = Math.floor((colNumber - 1) / 26);
  }
  return letters;
}

export async function exportPurchaseAksesorisEkspedisiToExcel({ 
  startDate = "", 
  endDate = "", 
  filter = null 
}) {
  try {
    const title = "Laporan Purchase Aksesoris Ekspedisi";
    
    // Buat filter params yang akan dikirim ke service
    const filterParams = {};
    
    // Tambahkan filter tanggal utama
    if (startDate || endDate) {
      filterParams.startDate = startDate;
      filterParams.endDate = endDate;
    }
    
    // Tambahkan filter tambahan jika ada
    if (filter) {
      if (filter.supplier) {
        if (typeof filter.supplier === 'object' && filter.supplier.value !== undefined) {
          filterParams.supplier = filter.supplier.value;
        } else {
          filterParams.supplier = filter.supplier;
        }
      }
      
      if (filter.tanggal_sj_start && filter.tanggal_sj_end) {
        filterParams.tanggal_sj_start = filter.tanggal_sj_start;
        filterParams.tanggal_sj_end = filter.tanggal_sj_end;
      }
      
      // Tambahkan filter lainnya sesuai kebutuhan
      Object.keys(filter).forEach(key => {
        if (!['supplier', 'tanggal_sj_start', 'tanggal_sj_end'].includes(key)) {
          filterParams[key] = filter[key];
        }
      });
    }
    
    // Buat label filter untuk tampilan
    let filterLabel = "Semua Data";
    const filterParts = [];
    
    if (startDate || endDate) {
      filterParts.push(`${startDate || ''} s/d ${endDate || ''}`);
    }
    
    if (filter) {
      if (filter.supplier) {
        const supplierName = typeof filter.supplier === 'object' 
          ? filter.supplier.label || filter.supplier.value 
          : filter.supplier;
        filterParts.push(`Supplier: ${supplierName}`);
      }
      
      if (filter.tanggal_sj_start && filter.tanggal_sj_end) {
        filterParts.push(`Tanggal SJ: ${filter.tanggal_sj_start} s/d ${filter.tanggal_sj_end}`);
      }
    }
    
    if (filterParts.length > 0) {
      filterLabel = filterParts.join(' | ');
    }

    // Tampilkan loading
    const loadingAlert = Swal.fire({
      title: 'Mempersiapkan Excel',
      text: 'Sedang menyiapkan data untuk diekspor...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Ambil data lengkap dengan items
    const dataWithDetails = await PurchaseAksesorisEkspedisiService.getAllWithDetails(filterParams);
    
    await loadingAlert.close();

    if (!Array.isArray(dataWithDetails) || dataWithDetails.length === 0) {
      Swal.fire("Info", "Tidak ada data untuk diekspor pada rentang tanggal ini.", "info");
      return;
    }

    // Konfigurasi kolom
    const columnConfig = [
      { header: 'No', key: 'no', width: 5, style: { alignment: { horizontal: 'center' } } },
      { header: 'No. Pembelian', key: 'no_pembelian', width: 20, style: { alignment: { horizontal: 'center' } } },
      { header: 'Tanggal SJ', key: 'tanggal_sj', width: 15, style: { alignment: { horizontal: 'center' } } },
      { header: 'No. SJ Supplier', key: 'no_sj_supplier', width: 18, style: { alignment: { horizontal: 'center' } } },
      { header: 'Supplier', key: 'supplier_name', width: 25, style: { alignment: { horizontal: 'center' } } },
      { header: 'Tanggal Jatuh Tempo', key: 'tanggal_jatuh_tempo', width: 18, style: { alignment: { horizontal: 'center' } } },
      { header: 'Nama Barang', key: 'nama_barang', width: 30, style: { alignment: { horizontal: 'left' } } },
      { header: 'Kuantitas', key: 'kuantitas', width: 12, style: { numFmt: '#,##0', alignment: { horizontal: 'right' } } },
      { header: 'Harga', key: 'harga', width: 15, style: { numFmt: '"Rp"#,##0.00', alignment: { horizontal: 'right' } } },
      { header: 'Total Harga', key: 'total_harga', width: 18, style: { numFmt: '"Rp"#,##0.00', alignment: { horizontal: 'right' } } }
    ];

    // Buat workbook dan worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Purchase');

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

    let grandTotal = 0;
    const mergeRanges = []; // Untuk mencatat range yang perlu di-merge

    // Process data
    dataWithDetails.forEach((purchase, purchaseIndex) => {
      const items = Array.isArray(purchase.items) ? purchase.items : [];
      const startRow = worksheet.lastRow.number + 1;
      let endRow = startRow;

      // Format tanggal
      const formatDateForExcel = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
      };

      if (items.length > 0) {
        // Jika ada items, tambahkan setiap item
        items.forEach((item, itemIndex) => {
          const rowData = {
            no: itemIndex === 0 ? purchaseIndex + 1 : '',
            no_pembelian: itemIndex === 0 ? purchase.no_pembelian : '',
            tanggal_sj: itemIndex === 0 ? formatDateForExcel(purchase.tanggal_sj) : '',
            no_sj_supplier: itemIndex === 0 ? purchase.no_sj_supplier : '',
            supplier_name: itemIndex === 0 ? purchase.supplier_name : '',
            tanggal_jatuh_tempo: itemIndex === 0 ? formatDateForExcel(purchase.tanggal_jatuh_tempo) : '',
            nama_barang: item.nama || '-',
            kuantitas: item.kuantitas || 0,
            harga: parseFloat(item.harga || 0),
            total_harga: parseFloat(item.total_harga || 0)
          };

          const row = worksheet.addRow(Object.values(rowData));
          
          // Apply styling untuk angka
          row.getCell('kuantitas').numFmt = '#,##0';
          row.getCell('harga').numFmt = '"Rp"#,##0.00';
          row.getCell('total_harga').numFmt = '"Rp"#,##0.00';

          // Apply border ke semua cell
          row.eachCell((cell) => {
            cell.border = borderStyle;
          });

          grandTotal += parseFloat(item.total_harga || 0);
          endRow = row.number;
        });
      } else {
        // Jika tidak ada items, tambahkan satu baris dengan data summary
        const rowData = {
          no: purchaseIndex + 1,
          no_pembelian: purchase.no_pembelian,
          tanggal_sj: formatDateForExcel(purchase.tanggal_sj),
          no_sj_supplier: purchase.no_sj_supplier,
          supplier_name: purchase.supplier_name,
          tanggal_jatuh_tempo: formatDateForExcel(purchase.tanggal_jatuh_tempo),
          nama_barang: '-',
          kuantitas: '-',
          harga: '-',
          total_harga: parseFloat(purchase.summary?.total_harga || 0)
        };

        const row = worksheet.addRow(Object.values(rowData));
        
        // Apply styling
        row.getCell('total_harga').numFmt = '"Rp"#,##0.00';
        
        // Apply border ke semua cell
        row.eachCell((cell) => {
          cell.border = borderStyle;
        });

        grandTotal += parseFloat(purchase.summary?.total_harga || 0);
        endRow = row.number;
      }

      // Jika ada multiple items, catat range untuk merge
      if (items.length > 1) {
        const mergeCols = [1, 2, 3, 4, 5, 6]; // Kolom: No, No. Pembelian, Tanggal SJ, No. SJ Supplier, Supplier, Tanggal Jatuh Tempo
        mergeCols.forEach(colIndex => {
          mergeRanges.push({
            start: { row: startRow, col: colIndex },
            end: { row: endRow, col: colIndex }
          });
        });
      }
    });

    // Apply merge cells
    mergeRanges.forEach(range => {
      worksheet.mergeCells(range.start.row, range.start.col, range.end.row, range.end.col);
      // Center align untuk cell yang di-merge
      const cell = worksheet.getCell(range.start.row, range.start.col);
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Tambahkan baris kosong
    worksheet.addRow([]);

    // Baris grand total
    const totalRowNum = worksheet.lastRow.number + 1;
    const totalRow = worksheet.addRow([]);
    
    // Merge cells untuk label TOTAL AKHIR
    worksheet.mergeCells(totalRowNum, 1, totalRowNum, columnConfig.length - 1);
    const totalLabelCell = totalRow.getCell(1);
    totalLabelCell.value = 'TOTAL AKHIR';
    totalLabelCell.font = { bold: true };
    totalLabelCell.alignment = { horizontal: 'right' };

    // Cell untuk nilai total
    const totalValueCell = totalRow.getCell(columnConfig.length);
    totalValueCell.value = grandTotal;
    totalValueCell.font = { bold: true };
    totalValueCell.numFmt = '"Rp"#,##0.00';

    // Apply border untuk baris total
    for (let i = 1; i <= columnConfig.length; i++) {
      totalRow.getCell(i).border = borderStyle;
      totalRow.getCell(i).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F0F0' } // Abu-abu sangat muda
      };
    }

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
    a.download = `Laporan Purchase Aksesoris Ekspedisi - ${filterLabel}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
            
    Swal.fire({
      icon: 'success',
      title: 'Sukses',
      text: 'File Excel berhasil diunduh!',
      timer: 1000,
      showConfirmButton: false,
      timerProgressBar: true
    });

  } catch (error) {
    console.error('Error exporting to Excel:', error);
    Swal.fire("Error", "Terjadi kesalahan saat mengekspor data ke Excel.", "error");
  }
}