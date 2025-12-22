import ExcelJS from 'exceljs';
import Swal from 'sweetalert2';

function excelColLetter(colNumber) {
  let letters = '';
  while (colNumber > 0) {
    const mod = (colNumber - 1) % 26;
    letters = String.fromCharCode(65 + mod) + letters;
    colNumber = Math.floor((colNumber - 1) / 26);
  }
  return letters;
}

// Helper filter tanggal
const normalizeDate = (d) => {
  if (!d) return null;
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return null;
  return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
};

export async function exportInventoryAdjustmentToExcel({ 
  kind, // 'kain' atau 'aksesoris'
  data = [], 
  filterLabel = "Semua Data",
  startDate = "",
  endDate = "" 
}) {
  try {
    const isKain = kind === 'kain';
    const title = `Laporan Inventory ${isKain ? 'Kain' : 'Aksesoris'}`;

    if (!data || data.length === 0) {
      return Swal.fire("Info", "Tidak ada data untuk diekspor.", "info");
    }

    // 1. FILTER DATA BERDASARKAN TANGGAL (created_at)
    // Walaupun biasanya data yang dikirim sudah terfilter, kita filter ulang untuk keamanan
    let filteredData = data;
    const s = normalizeDate(startDate);
    const e = normalizeDate(endDate);

    if (s || e) {
      filteredData = data.filter(item => {
        const d = normalizeDate(item.created_at);
        if (d === null) return false;
        if (s && d < s) return false;
        if (e && d > e) return false;
        return true;
      });
    }

    if (filteredData.length === 0) {
      return Swal.fire("Info", "Tidak ada data pada rentang tanggal ini.", "info");
    }

    // 2. KONFIGURASI KOLOM
    let columnConfig = [];

    if (isKain) {
      columnConfig = [
        { header: 'No', key: 'no', width: 5, style: { alignment: { horizontal: 'center' } } },
        { header: 'Corak Kain', key: 'corak_kain', width: 25 },
        { header: 'Konstruksi Kain', key: 'konstruksi_kain', width: 30 },
        { header: 'Warna', key: 'kode_warna', width: 20 },
        { header: 'Meter', key: 'meter_awal', width: 15, style: { numFmt: '#,##0.00', alignment: { horizontal: 'right' } } },
        { header: 'Yard', key: 'yard_awal', width: 15, style: { numFmt: '#,##0.00', alignment: { horizontal: 'right' } } },
        { header: 'Kilogram', key: 'kilogram_awal', width: 15, style: { numFmt: '#,##0.00', alignment: { horizontal: 'right' } } },
        { header: 'Tanggal', key: 'created_at', width: 18, style: { alignment: { horizontal: 'center' } } },
      ];
    } else {
      // Aksesoris
      columnConfig = [
        { header: 'No', key: 'no', width: 5, style: { alignment: { horizontal: 'center' } } },
        { header: 'Nama Aksesoris', key: 'nama_aksesoris', width: 30 },
        { header: 'Deskripsi', key: 'deskripsi_aksesoris', width: 40 },
        { header: 'Quantity', key: 'kuantitas_awal', width: 15, style: { numFmt: '#,##0.00', alignment: { horizontal: 'right' } } },
        { header: 'Keterangan', key: 'keterangan_adjustment_aksesoris', width: 30 },
        { header: 'Tanggal', key: 'created_at', width: 18, style: { alignment: { horizontal: 'center' } } },
      ];
    }

    // 3. SETUP WORKBOOK
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Laporan Inventory');

    worksheet.columns = columnConfig;
    const lastColLetter = excelColLetter(columnConfig.length);

    // Header Judul
    worksheet.mergeCells(`A1:${lastColLetter}1`);
    const titleCell = worksheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { name: 'Calibri', size: 14, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Header Periode
    worksheet.mergeCells(`A2:${lastColLetter}2`);
    const periodCell = worksheet.getCell('A2');
    periodCell.value = `Periode: ${filterLabel}`;
    periodCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Header Tanggal Cetak
    worksheet.mergeCells(`A3:${lastColLetter}3`);
    const printDateCell = worksheet.getCell('A3');
    printDateCell.value = `Tanggal Cetak: ${new Date().toLocaleString('id-ID')}`;
    printDateCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Style Border
    const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    titleCell.border = borderStyle;
    periodCell.border = borderStyle;
    printDateCell.border = borderStyle;

    worksheet.addRow([]); // Spasi

    // 4. RENDER HEADER TABEL
    const headerRow = worksheet.addRow(columnConfig.map(c => c.header));
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

    // 5. RENDER DATA
    // Helper format tanggal excel
    const formatDateForExcel = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
    };

    filteredData.forEach((item, index) => {
      const rowData = {};

      // Common fields
      rowData.no = index + 1;
      rowData.created_at = formatDateForExcel(item.created_at);

      if (isKain) {
        rowData.corak_kain = item.corak_kain || '-';
        rowData.konstruksi_kain = item.konstruksi_kain || '-';
        rowData.kode_warna = item.kode_warna || '-';
        rowData.meter_awal = parseFloat(item.meter_awal || 0);
        rowData.yard_awal = parseFloat(item.yard_awal || 0);
        rowData.kilogram_awal = parseFloat(item.kilogram_awal || 0);
      } else {
        rowData.nama_aksesoris = item.nama_aksesoris || '-';
        rowData.deskripsi_aksesoris = item.deskripsi_aksesoris || '-';
        rowData.kuantitas_awal = parseFloat(item.kuantitas_awal || 0);
        rowData.keterangan_adjustment_aksesoris = item.keterangan_adjustment_aksesoris || '-';
      }

      // Map object ke array sesuai urutan kolom
      const rowValues = columnConfig.map(col => rowData[col.key]);
      const row = worksheet.addRow(rowValues);

      // Apply border per cell
      row.eachCell((cell) => {
        cell.border = borderStyle;
      });
    });

    // 6. FINISHING (Auto Filter & Freeze)
    worksheet.autoFilter = {
      from: { row: 5, column: 1 },
      to: { row: 5, column: columnConfig.length }
    };
    worksheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 5, activeCell: 'A6' }
    ];

    // 7. DOWNLOAD FILE
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

    Swal.fire({
      icon: 'success',
      title: 'Sukses',
      text: 'File Excel berhasil diunduh!',
      timer: 1000,
      showConfirmButton: false,
    });

  } catch (error) {
    console.error('Error exporting inventory to Excel:', error);
    Swal.fire("Error", "Terjadi kesalahan saat mengekspor data ke Excel.", "error");
  }
}