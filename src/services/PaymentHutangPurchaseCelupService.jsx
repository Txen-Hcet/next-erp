import { PembayaranHutangPurchaseCelup } from "../utils/financeAuth";

class PaymentHutangPurchaseCelupService {
  async getAll() {
    const res = await PembayaranHutangPurchaseCelup.getAll();
    return res.data || [];
  }

  async getById(id) {
    const res = await PembayaranHutangPurchaseCelup.getById(id);
    return res.data || [];
  }

  // Method untuk mendapatkan data lengkap dengan items
  async getAllWithDetails(startDate = "", endDate = "", financeFilter = null) {
    try {
      // Ambil data header
      const headers = await this.getAll();
      
      // Filter berdasarkan tanggal
      const filteredHeaders = this.processDataForReport(headers, startDate, endDate, financeFilter);
      
      // Untuk setiap header, ambil detail items
      const dataWithDetails = [];
      
      for (const header of filteredHeaders) {
        try {
          const detail = await this.getById(header.id);
          if (detail && detail.length > 0) {
            dataWithDetails.push({
              ...header,
              items: detail[0].items || [] // Ambil items dari response detail
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

  processDataForReport(data, startDate = "", endDate = "", financeFilter = null) {
    const normalizeDate = (d) => {
      if (!d) return null;
      const x = new Date(d);
      if (Number.isNaN(x.getTime())) return null;
      return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    };

    const s = normalizeDate(startDate);
    const e = normalizeDate(endDate);

    let filteredData = data;
    if (s || e) {
      filteredData = data.filter(item => {
        const itemDate = normalizeDate(item.created_at || item.tanggal_jatuh_tempo || tanggal_pengambilan_giro);
        if (itemDate === null) return false;
        if (s && itemDate < s) return false;
        if (e && itemDate > e) return false;
        return true;
      });
    }

    if (financeFilter) {
      filteredData = this.applyFinanceFilter(filteredData, financeFilter);
    }

    return filteredData;
  }

  applyFinanceFilter(data, financeFilter) {
    return data.filter(item => {
      // Filter tanggal jatuh tempo
      if (financeFilter.tanggal_jatuh_tempo_start || financeFilter.tanggal_jatuh_tempo_end) {
        const itemDate = new Date(item.tanggal_jatuh_tempo);
        const startDate = financeFilter.tanggal_jatuh_tempo_start ? new Date(financeFilter.tanggal_jatuh_tempo_start) : null;
        const endDate = financeFilter.tanggal_jatuh_tempo_end ? new Date(financeFilter.tanggal_jatuh_tempo_end) : null;
        
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
      }

      // Filter tanggal pengambilan giro
      if (financeFilter.tanggal_pengambilan_giro_start || financeFilter.tanggal_pengambilan_giro_end) {
        const itemDate = new Date(item.tanggal_pengambilan_giro);
        const startDate = financeFilter.tanggal_pengambilan_giro_start ? new Date(financeFilter.tanggal_pengambilan_giro_start) : null;
        const endDate = financeFilter.tanggal_pengambilan_giro_end ? new Date(financeFilter.tanggal_pengambilan_giro_end) : null;
        
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
      }

      // Filter no giro (case-insensitive partial match)
      if (financeFilter.no_giro && item.no_giro) {
        const filterNoGiro = financeFilter.no_giro.toLowerCase();
        const itemNoGiro = (item.no_giro || '').toLowerCase();
        if (!itemNoGiro.includes(filterNoGiro)) {
          return false;
        }
      }

      return true;
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
    // Untuk payment hutang, kita hitung total pembayaran dan potongan
    let totalPembayaran = 0;
    let totalPotongan = 0;

    data.forEach(item => {
      totalPembayaran += parseFloat(item.pembayaran || 0);
      totalPotongan += parseFloat(item.potongan || 0);
    });

    return { totalPembayaran, totalPotongan };
  }
}

export default new PaymentHutangPurchaseCelupService();