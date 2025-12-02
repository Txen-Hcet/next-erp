export class PenerimaanPiutangJualBeliProcessor {
  static formatTanggalIndo(tanggalString) {
    if (!tanggalString) return '-';
    try {
      const tanggal = new Date(tanggalString);
      const bulanIndo = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];
      return `${tanggal.getDate()} ${bulanIndo[tanggal.getMonth()]} ${tanggal.getFullYear()}`;
    } catch (error) {
      return tanggalString;
    }
  }

  static formatTanggalExcel(tanggalString) {
    if (!tanggalString) return '';
    try {
      const date = new Date(tanggalString);
      return `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
    } catch (error) {
      return tanggalString;
    }
  }

  static fmtRp(amount) {
    const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  }
}