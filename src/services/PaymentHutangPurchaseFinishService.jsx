import { PembayaranHutangPurchaseKainJadi } from "../utils/financeAuth";

class PaymentHutangPurchaseFinishService {
  async getAll() {
    const res = await PembayaranHutangPurchaseKainJadi.getAll();
    return res.data || [];
  }

  async getById(id) {
    const res = await PembayaranHutangPurchaseKainJadi.getById(id);
    return res.data || [];
  }

  // Method untuk mendapatkan data lengkap dengan items
  async getAllWithDetails(filterParams = {}) {
    try {
      // Ambil data header
      const headers = await this.getAll();
      
      // Filter berdasarkan filterParams
      const filteredHeaders = this.processDataForReport(headers, filterParams);
      
      // Untuk setiap header, ambil detail items
      const dataWithDetails = [];
      
      for (const header of filteredHeaders) {
        try {
          const detail = await this.getById(header.id);
          if (detail && detail.length > 0) {
            dataWithDetails.push({
              ...header,
              items: detail[0].items || []
            });
          } else {
            dataWithDetails.push({
              ...header,
              items: []
            });
          }
        } catch (error) {
          console.error(`Error fetching detail for ID ${header.id}:`, error);
          dataWithDetails.push({
            ...header,
            items: []
          });
        }
      }
      
      return dataWithDetails;
    } catch (error) {
      console.error('Error in getAllWithDetails:', error);
      return [];
    }
  }

  // METHOD UTAMA: Normalize date - dipindahkan ke method class
  normalizeDate(d) {
    if (!d) return null;
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return null;
    return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  }

  // MODIFIKASI: Hanya menerima satu parameter object filterParams
  processDataForReport(data, filterParams = {}) {
    const { 
      startDate = "", 
      endDate = "", 
      tanggal_jatuh_tempo_start, 
      tanggal_jatuh_tempo_end, 
      tanggal_pengambilan_giro_start, 
      tanggal_pengambilan_giro_end,
      no_giro
    } = filterParams;

    const s = this.normalizeDate(startDate);
    const e = this.normalizeDate(endDate);

    let filteredData = data;
    
    // Filter tanggal global (startDate, endDate)
    if (s || e) {
      filteredData = data.filter(item => {
        // Gunakan created_at sebagai fallback jika field spesifik tidak ada
        const itemDate = this.normalizeDate(item.tanggal_jatuh_tempo || item.tanggal_pengambilan_giro || item.created_at);
        if (itemDate === null) return false;
        if (s && itemDate < s) return false;
        if (e && itemDate > e) return false;
        return true;
      });
    }

    // TERAPKAN FILTER FINANCE JIKA ADA
    if (tanggal_jatuh_tempo_start || tanggal_jatuh_tempo_end || 
        tanggal_pengambilan_giro_start || tanggal_pengambilan_giro_end || 
        no_giro) {
      filteredData = this.applyFinanceFilter(filteredData, filterParams);
    }

    return filteredData;
  }

  // METHOD BARU: Terapkan filter finance khusus payment hutang
  applyFinanceFilter(data, financeFilter) {
    
    if (!financeFilter) return data;
    
    return data.filter(item => {
      let passes = true;
      
      // Filter tanggal jatuh tempo
      if (passes && (financeFilter.tanggal_jatuh_tempo_start || financeFilter.tanggal_jatuh_tempo_end)) {
        const itemDate = this.normalizeDate(item.tanggal_jatuh_tempo);
        const startDate = financeFilter.tanggal_jatuh_tempo_start ? 
          this.normalizeDate(financeFilter.tanggal_jatuh_tempo_start) : null;
        const endDate = financeFilter.tanggal_jatuh_tempo_end ? 
          this.normalizeDate(financeFilter.tanggal_jatuh_tempo_end) : null;
        
        if (startDate && itemDate < startDate) {
          passes = false;
        }
        if (endDate && itemDate > endDate) {
          passes = false;
        }
      }

      // Filter tanggal pengambilan giro
      if (passes && (financeFilter.tanggal_pengambilan_giro_start || financeFilter.tanggal_pengambilan_giro_end)) {
        const itemDate = this.normalizeDate(item.tanggal_pengambilan_giro);
        const startDate = financeFilter.tanggal_pengambilan_giro_start ? 
          this.normalizeDate(financeFilter.tanggal_pengambilan_giro_start) : null;
        const endDate = financeFilter.tanggal_pengambilan_giro_end ? 
          this.normalizeDate(financeFilter.tanggal_pengambilan_giro_end) : null;
        
        if (startDate && itemDate < startDate) {
          passes = false;
        }
        if (endDate && itemDate > endDate) {
          passes = false;
        }
      }

      // Filter no giro (case-insensitive partial match)
      if (passes && financeFilter.no_giro) {
        const filterNoGiro = financeFilter.no_giro.toLowerCase();
        const itemNoGiro = (item.no_giro || '').toLowerCase();
        if (!itemNoGiro.includes(filterNoGiro)) {
          passes = false;
        }
      }

      return passes;
    });
  }

  calculateTotals(data) {
    const totalSuratJalan = data.length;
    
    // Hitung total nilai dari pembayaran + potongan
    const totalNilai = data.reduce((sum, item) => {
      const pembayaran = parseFloat(item.pembayaran || 0);
      //const potongan = parseFloat(item.potongan || 0);
      return sum + pembayaran;
    }, 0);

    return { totalSuratJalan, totalNilai };
  }

  calculateStatus(data) {
    let totalPembayaran = 0;
    let totalPotongan = 0;

    data.forEach(item => {
      totalPembayaran += parseFloat(item.pembayaran || 0);
      totalPotongan += parseFloat(item.potongan || 0);
    });

    return { totalPembayaran, totalPotongan };
  }
}

export default new PaymentHutangPurchaseFinishService();