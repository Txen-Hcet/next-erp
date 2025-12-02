export class PurchaseAksesorisEkspedisiProcessor {
  static formatTanggalIndo(tanggalString) {
    if (!tanggalString) return "-";
    const tanggal = new Date(tanggalString);
    const bulanIndo = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return `${tanggal.getDate()} ${bulanIndo[tanggal.getMonth()]} ${tanggal.getFullYear()}`;
  }

  static fmtRp(val) {
    if (val === undefined || val === null || val === "") return "-";
    const n = Number(String(val).replace(/,/g, ""));
    if (!Number.isFinite(n)) return "-";
    return new Intl.NumberFormat("id-ID", { 
      style: "currency", 
      currency: "IDR", 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(n);
  }

  // Tidak perlu processForPrint karena kita menggunakan data langsung
  static processForExcel(data) {
    const excelData = [];
    let grandTotal = 0;

    data.forEach(item => {
      if (item.items && item.items.length > 0) {
        item.items.forEach((detail, index) => {
          excelData.push({
            'No. Pembelian': index === 0 ? item.no_pembelian : '',
            'Tanggal SJ': index === 0 ? this.formatTanggalIndo(item.tanggal_sj) : '',
            'No. SJ Supplier': index === 0 ? item.no_sj_supplier : '',
            'Supplier': index === 0 ? item.supplier_name : '',
            'Tanggal Jatuh Tempo': index === 0 ? this.formatTanggalIndo(item.tanggal_jatuh_tempo) : '',
            'Nama Barang': detail.nama,
            'Kuantitas': detail.kuantitas,
            'Harga': detail.harga,
            'Total Harga': detail.total_harga
          });
        });
      } else {
        excelData.push({
          'No. Pembelian': item.no_pembelian,
          'Tanggal SJ': this.formatTanggalIndo(item.tanggal_sj),
          'No. SJ Supplier': item.no_sj_supplier,
          'Supplier': item.supplier_name,
          'Tanggal Jatuh Tempo': this.formatTanggalIndo(item.tanggal_jatuh_tempo),
          'Nama Barang': '-',
          'Kuantitas': '-',
          'Harga': '-',
          'Total Harga': item.summary?.total_harga || '0'
        });
      }
      
      grandTotal += parseFloat(item.summary?.total_harga || 0);
    });

    excelData.push({
      'No. Pembelian': '',
      'Tanggal SJ': '',
      'No. SJ Supplier': '',
      'Supplier': '',
      'Tanggal Jatuh Tempo': '',
      'Nama Barang': 'TOTAL AKHIR',
      'Kuantitas': '',
      'Harga': '',
      'Total Harga': grandTotal
    });

    return excelData;
  }
}