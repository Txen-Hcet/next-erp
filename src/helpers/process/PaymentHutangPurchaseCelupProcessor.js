export class PaymentHutangPurchaseCelupProcessor {
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

  static fmtNumber(val) {
    if (val === undefined || val === null || val === "") return "0";
    const n = Number(String(val).replace(/,/g, ""));
    if (!Number.isFinite(n)) return "0";
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(n);
  }

  static processForExcel(data) {
    const excelData = [];
    let totalPembayaran = 0;
    let totalPotongan = 0;
    let grandTotal = 0;

    data.forEach(item => {
      const pembayaranNum = parseFloat(item.pembayaran || 0);
      const potonganNum = parseFloat(item.potongan || 0);
      const subtotal = pembayaranNum + potonganNum;

      totalPembayaran += pembayaranNum;
      totalPotongan += potonganNum;
      grandTotal += subtotal;

      excelData.push({
        'No. Pembayaran': item.no_pembayaran,
        'No. Pembelian': item.no_pembelian,
        'Tanggal Jatuh Tempo': this.formatTanggalIndo(item.tanggal_jatuh_tempo),
        'No. Giro': item.no_giro || '-',
        'Tanggal Pengambilan Giro': this.formatTanggalIndo(item.tanggal_pengambilan_giro),
        'Pembayaran': pembayaranNum,
        'Jenis Potongan': item.jenis_potongan_name || '-',
        'Potongan': potonganNum,
        'Subtotal': subtotal,
        'Metode Pembayaran': item.payment_method_name || '-',
      });
    });

    // Tambahkan baris summary
    excelData.push({}); // Baris kosong
    
    // Total Pembayaran
    excelData.push({
      'No. Pembayaran': 'TOTAL PEMBAYARAN',
      'Pembayaran': totalPembayaran
    });

    // Total Potongan
    excelData.push({
      'No. Pembayaran': 'TOTAL POTONGAN', 
      'Potongan': totalPotongan
    });

    // Grand Total (Pembayaran + Potongan)
    excelData.push({
      'No. Pembayaran': 'GRAND TOTAL',
      'Subtotal': grandTotal
    });

    return excelData;
  }

  // Method untuk print (jika diperlukan)
  static processForPrint(data) {
    let totalPembayaran = 0;
    let totalPotongan = 0;
    let grandTotal = 0;

    const processedData = data.map(item => {
      const pembayaranNum = parseFloat(item.pembayaran || 0);
      const potonganNum = parseFloat(item.potongan || 0);
      const subtotal = pembayaranNum + potonganNum;

      totalPembayaran += pembayaranNum;
      totalPotongan += potonganNum;
      grandTotal += subtotal;

      return {
        mainData: {
          no_pembayaran: item.no_pembayaran,
          no_pembelian: item.no_pembelian,
          tanggal_jatuh_tempo: item.tanggal_jatuh_tempo,
          no_giro: item.no_giro,
          tanggal_pengambilan_giro: item.tanggal_pengambilan_giro,
          pembayaran: pembayaranNum,
          jenis_potongan_name: item.jenis_potongan_name,
          potongan: potonganNum,
          subtotal: subtotal,
          payment_method_name: item.payment_method_name
        },
        summary: {
          total_pembayaran: totalPembayaran,
          total_potongan: totalPotongan,
          grand_total: grandTotal
        }
      };
    });

    return {
      data: processedData,
      summary: {
        total_pembayaran: totalPembayaran,
        total_potongan: totalPotongan, 
        grand_total: grandTotal
      }
    };
  }
}