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
  async getAllWithDetails(filterParams = {}) {
    try {
      // Ambil data header
      const headers = await this.getAll();
      
      // Filter berdasarkan tanggal DAN financeFilter
      const filteredHeaders = this.processDataForReport(headers, filterParams);
      
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
      supplier, 
      tanggal_sj_start, 
      tanggal_sj_end 
    } = filterParams;

    const s = this.normalizeDate(startDate);
    const e = this.normalizeDate(endDate);

    let filteredData = data;
    
    // Filter tanggal global (startDate, endDate)
    if (s || e) {
      filteredData = data.filter(item => {
        const itemDate = this.normalizeDate(item.tanggal_sj);
        if (itemDate === null) return false;
        if (s && itemDate < s) return false;
        if (e && itemDate > e) return false;
        return true;
      });
    }

    // TERAPKAN FILTER FINANCE JIKA ADA
    if (supplier || tanggal_sj_start || tanggal_sj_end) {
      filteredData = this.applyFinanceFilter(filteredData, filterParams);
    }

    return filteredData;
  }

  // METHOD BARU: Terapkan filter finance khusus purchase
  applyFinanceFilter(data, financeFilter) {
    
    if (!financeFilter) return data;
    
    return data.filter(item => {
      let passes = true;
      
      // Filter supplier berdasarkan supplier_id (ID numerik)
      if (financeFilter.supplier !== undefined && financeFilter.supplier !== null) {
        
        let filterSupplierValue = financeFilter.supplier;
        
        // Jika filter adalah object (dari select)
        if (typeof filterSupplierValue === 'object' && filterSupplierValue !== null) {
          if (filterSupplierValue.value !== undefined) {
            filterSupplierValue = filterSupplierValue.value;
          } else if (filterSupplierValue.id !== undefined) {
            filterSupplierValue = filterSupplierValue.id;
          }
        }
        
        // Sekarang filterSupplierValue bisa string atau number
        const filterSupplierStr = String(filterSupplierValue).toLowerCase();
        const itemSupplierId = String(item.supplier_id || '').toLowerCase();
        const itemSupplierName = item.supplier_name ? item.supplier_name.toLowerCase() : '';
        
        // Cek apakah ID atau Nama cocok
        if (itemSupplierId !== filterSupplierStr && !itemSupplierName.includes(filterSupplierStr)) {
          //console.log('🔴 Supplier tidak match');
          passes = false;
        } else {
          //console.log('🟢 Supplier match');
        }
      }

      // Filter tanggal SJ (jika ada di financeFilter)
      if (passes && (financeFilter.tanggal_sj_start || financeFilter.tanggal_sj_end)) {
        const itemDate = this.normalizeDate(item.tanggal_sj);
        const startDate = financeFilter.tanggal_sj_start ? this.normalizeDate(financeFilter.tanggal_sj_start) : null;
        const endDate = financeFilter.tanggal_sj_end ? this.normalizeDate(financeFilter.tanggal_sj_end) : null;
        
        if (startDate && itemDate < startDate) {
          passes = false;
        }
        if (endDate && itemDate > endDate) {
          passes = false;
        }
      }

      // Filter no_giro (untuk payment hutang)
      if (passes && financeFilter.no_giro) {
        const filterNoGiro = financeFilter.no_giro.toLowerCase();
        const itemNoGiro = item.no_giro ? item.no_giro.toLowerCase() : '';
        if (!itemNoGiro.includes(filterNoGiro)) {
          passes = false;
        }
      }

      return passes;
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