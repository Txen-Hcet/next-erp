import { PurchaseAksesorisEkspedisi } from "../utils/financeAuth";

class PurchaseAksesorisEkspedisiService {
  async getAll() {
    const res = await PurchaseAksesorisEkspedisi.getAll();
    return res.data || [];
  }

  async getById(id) {
    const res = await PurchaseAksesorisEkspedisi.getById(id);
    return res.data || [];
  }

  // Method untuk mendapatkan data lengkap dengan items + SUPPORT FILTER
  async getAllWithDetails(startDate = "", endDate = "", financeFilter = null) {
    try {
      // Ambil data header
      const headers = await this.getAll();
      
      // Filter berdasarkan tanggal DAN financeFilter
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

  // MODIFIKASI: Tambah parameter financeFilter
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
    
    // Filter tanggal global
    if (s || e) {
      filteredData = data.filter(item => {
        const itemDate = normalizeDate(item.tanggal_sj);
        if (itemDate === null) return false;
        if (s && itemDate < s) return false;
        if (e && itemDate > e) return false;
        return true;
      });
    }

    // TERAPKAN FILTER FINANCE JIKA ADA
    if (financeFilter) {
      filteredData = this.applyFinanceFilter(filteredData, financeFilter);
    }

    return filteredData;
  }

  // METHOD BARU: Terapkan filter finance khusus purchase
  applyFinanceFilter(data, financeFilter) {
    return data.filter(item => {
      // Filter tanggal SJ (jika ada di financeFilter)
      if (financeFilter.tanggal_sj_start || financeFilter.tanggal_sj_end) {
        const itemDate = new Date(item.tanggal_sj);
        const startDate = financeFilter.tanggal_sj_start ? new Date(financeFilter.tanggal_sj_start) : null;
        const endDate = financeFilter.tanggal_sj_end ? new Date(financeFilter.tanggal_sj_end) : null;
        
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
      }

      // Filter supplier (case-insensitive partial match)
      if (financeFilter.supplier && item.supplier_name) {
        const filterSupplier = financeFilter.supplier.toLowerCase();
        const itemSupplier = item.supplier_name.toLowerCase();
        if (!itemSupplier.includes(filterSupplier)) {
          return false;
        }
      }

      return true;
    });
  }

  calculateTotals(data) {
    const totalSuratJalan = data.length;
    const totalNilai = data.reduce((sum, item) => {
      return sum + parseFloat(item.summary?.total_harga || 0);
    }, 0);

    return { totalSuratJalan, totalNilai };
  }

  calculateStatus(data) {
    const today = new Date().getTime();
    
    const statusCounts = {
      belumJatuhTempo: 0,
      lewatJatuhTempo: 0
    };

    data.forEach(item => {
      const totalHarga = parseFloat(item.summary?.total_harga || 0);
      const jatuhTempo = new Date(item.tanggal_jatuh_tempo).getTime();
      
      if (jatuhTempo > today) {
        statusCounts.belumJatuhTempo++;
      } else {
        statusCounts.lewatJatuhTempo++;
      }
    });

    return statusCounts;
  }
}

export default new PurchaseAksesorisEkspedisiService();