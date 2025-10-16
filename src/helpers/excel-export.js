import ExcelJS from 'exceljs';

/**
 * Helper umum untuk mengekspor array of objects ke file .xlsx sederhana.
 * @param {Array<Object>} data - Data yang akan diekspor. Contoh: [{ KolomA: 'Nilai1', KolomB: 123 }]
 * @param {string} fileName - Nama file yang akan diunduh (misal: 'laporan.xlsx')
 */
export async function exportToExcel(data, fileName) {
  if (!data || data.length === 0) {
    console.error("Tidak ada data untuk diekspor.");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Laporan');

  // Membuat header kolom secara otomatis dari keys object pertama
  const headers = Object.keys(data[0]);
  worksheet.columns = headers.map(key => ({
    header: key.charAt(0).toUpperCase() + key.slice(1), // Kapitalisasi header
    key: key,
    width: 20
  }));

  // Menambahkan semua baris data
  worksheet.addRows(data);

  // Menghasilkan buffer dan memicu unduhan menggunakan Web API
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName; // Mengatur nama file unduhan
  document.body.appendChild(a);
  a.click(); // Trigger download window
  
  a.remove();
  window.URL.revokeObjectURL(url);
}