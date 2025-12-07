import { PenerimaanPiutangSales } from "../utils/financeAuth";
import { getAllDeliveryNotes, getDeliveryNotes, getUser } from "../utils/auth";

class PenerimaanPiutangSalesService {
  async getAll() {
    const res = await PenerimaanPiutangSales.getAll();
    return res.data || [];
  }

  async getById(id) {
    const res = await PenerimaanPiutangSales.getById(id);
    return res.data || [];
  }

  // Method untuk mendapatkan data lengkap dengan nominal invoice dari surat jalan + SUPPORT FILTER
  async getAllWithDetails(filterParams = {}) {
    try {
      // Ambil data penerimaan piutang
      const headers = await this.getAll();
      
      // Filter berdasarkan tanggal DAN financeFilter
      const filteredHeaders = this.processDataForReport(headers, filterParams);
      
      // Dapatkan user untuk mendapatkan token
      const user = getUser();
      if (!user || !user.token) {
        console.error('User atau token tidak tersedia');
        return [];
      }

      // Ambil semua surat jalan untuk mendapatkan nominal invoice - DENGAN TOKEN
      const allDeliveryNotes = await getAllDeliveryNotes(user.token);
      const rawList = allDeliveryNotes?.suratJalans ?? allDeliveryNotes?.surat_jalan_list ?? allDeliveryNotes?.data ?? [];
      const deliveredSP = Array.isArray(rawList) 
        ? rawList.filter(sp => sp.delivered_status === 1 || sp.delivered_status === true)
        : [];

      // Untuk setiap header, ambil detail dan gabungkan dengan data surat jalan
      const dataWithDetails = [];
      
      for (const header of filteredHeaders) {
        try {
          const detail = await this.getById(header.id);
          const sjId = header.sj_id;

          let nominalInvoice = 0;
          let customerName = '';
          let noSJ = '';

          // Jika ada sj_id, ambil detail surat jalan untuk mendapatkan nominal invoice - DENGAN TOKEN
          if (sjId) {
            try {
              const sjDetail = await getDeliveryNotes(sjId, user.token);
              nominalInvoice = sjDetail?.order?.summary?.subtotal || 0;
              
              // Cari data customer dari list surat jalan
              const sjData = deliveredSP.find(sp => sp.id === sjId);
              if (sjData) {
                customerName = sjData.customer_name || '';
                noSJ = sjData.no_sj || '';
              }
            } catch (error) {
              console.error(`Error fetching SJ detail for ID ${sjId}:`, error);
            }
          }

          dataWithDetails.push({
            ...header,
            ...(detail && detail.length > 0 ? detail[0] : {}),
            nominal_invoice: nominalInvoice,
            customer_name: customerName,
            no_sj: noSJ,
            items: detail && detail.length > 0 ? (detail[0].items || []) : []
          });
        } catch (error) {
          console.error(`Error fetching detail for ID ${header.id}:`, error);
          dataWithDetails.push({
            ...header,
            nominal_invoice: 0,
            customer_name: '',
            no_sj: '',
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

  async getDataForPreview(filterParams = {}) {
    try {
      // Ambil data penerimaan piutang
      const headers = await this.getAll();
      
      // Filter berdasarkan filter yang ada
      const filteredHeaders = this.processDataForReport(headers, filterParams);
      
      // Dapatkan user untuk mendapatkan token
      const user = getUser();
      if (!user || !user.token) {
        console.error('User atau token tidak tersedia');
        return [];
      }

      // Ambil semua surat jalan untuk mendapatkan nominal invoice - DENGAN TOKEN
      const allDeliveryNotes = await getAllDeliveryNotes(user.token);
      const rawList = allDeliveryNotes?.suratJalans ?? allDeliveryNotes?.surat_jalan_list ?? allDeliveryNotes?.data ?? [];
      const deliveredSP = Array.isArray(rawList) 
        ? rawList.filter(sp => sp.delivered_status === 1 || sp.delivered_status === true)
        : [];

      // Hitung total utang per customer dari semua surat jalan
      const customerTotalUtang = {};
      
      for (const sp of deliveredSP) {
        const customerName = sp.customer_name;
        if (!customerName) continue;
        
        try {
          const sjDetail = await getDeliveryNotes(sp.id, user.token);
          const nominalInvoice = sjDetail?.order?.summary?.subtotal || 0;
          customerTotalUtang[customerName] = (customerTotalUtang[customerName] || 0) + nominalInvoice;
        } catch (error) {
          console.error(`Error fetching SJ detail for ${sp.id}:`, error);
        }
      }

      // Proses data untuk preview
      const previewData = [];
      
      for (const header of filteredHeaders) {
        try {
          const detail = await this.getById(header.id);
          const sjId = header.sj_id;

          let nominalInvoice = 0;
          let customerName = '';
          let noSJ = '';

          // Ambil detail surat jalan
          if (sjId) {
            try {
              const sjDetail = await getDeliveryNotes(sjId, user.token);
              nominalInvoice = sjDetail?.order?.summary?.subtotal || 0;
              
              const sjData = deliveredSP.find(sp => sp.id === sjId);
              if (sjData) {
                customerName = sjData.customer_name || '';
                noSJ = sjData.no_sj || '';
              }
            } catch (error) {
              console.error(`Error fetching SJ detail for ID ${sjId}:`, error);
            }
          }

          const detailData = detail && detail.length > 0 ? detail[0] : {};
          const pembayaran = parseFloat(detailData.pembayaran || 0);
          const potongan = parseFloat(detailData.potongan || 0);
          const saldoUtang = customerName ? (customerTotalUtang[customerName] || 0) : 0;

          previewData.push({
            // Data dari header
            id: header.id,
            no_penerimaan: header.no_penerimaan || '-',
            tanggal_pembayaran: header.tanggal_pembayaran,
            tanggal_jatuh_tempo: header.tanggal_jatuh_tempo,
            payment_method_name: header.payment_method_name || '-',
            bank_name: header.bank_name || '-',
            
            // Data dari detail
            ...detailData,
            
            // Data tambahan
            nominal_invoice: nominalInvoice,
            customer_name: customerName,
            no_sj: noSJ,
            saldo_utang: saldoUtang,
            penerimaan: pembayaran,
            potongan: potongan,
            pembayaran: pembayaran // alias untuk kompatibilitas
          });
        } catch (error) {
          console.error(`Error processing header ${header.id}:`, error);
        }
      }

      return previewData;
    } catch (error) {
      console.error('Error in getDataForPreview:', error);
      return [];
    }
  }

  normalizeDate(d) {
    if (!d) return null;
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return null;
    return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  }

  // MODIFIKASI: Tambah parameter financeFilter
  processDataForReport(data, filterParams = {} ) {
    const {
      startDate = "",
      endDate = "",
      customer,
      tanggal_pembayaran_start,
      tanggal_pembayaran_end,
      tanggal_jatuh_tempo_start,
      tanggal_jatuh_tempo_end,
    } = filterParams;

    const s = this.normalizeDate(startDate);
    const e = this.normalizeDate(endDate);

    let filteredData = data;
    
    // Filter tanggal global
    if (s || e) {
      filteredData = data.filter(item => {
        const itemDate = normalizeDate(item.tanggal_pembayaran || item.tanggal_jatuh_tempo);
        if (itemDate === null) return false;
        if (s && itemDate < s) return false;
        if (e && itemDate > e) return false;
        return true;
      });
    }

    // TERAPKAN FILTER FINANCE JIKA ADA
    if (customer || tanggal_pembayaran_start || tanggal_pembayaran_end || tanggal_jatuh_tempo_start || tanggal_jatuh_tempo_end) {
      filteredData = this.applyFinanceFilter(filteredData, filterParams);
    }

    return filteredData;
  }

  // METHOD BARU: Terapkan filter finance khusus penerimaan piutang
  applyFinanceFilter(data, financeFilter) {
    
    if (!financeFilter) return data;
    
    return data.filter(item => {
      let passes = true;
      
      if (financeFilter.customer !== undefined && financeFilter.customer !== null) {
        
        let filterCustomerValue = financeFilter.customer;
        
        // Jika filter adalah object (dari select)
        if (typeof filterCustomerValue === 'object' && filterCustomerValue !== null) {
          if (filterCustomerValue.value !== undefined) {
            filterCustomerValue = filterCustomerValue.value;
          } else if (filterCustomerValue.id !== undefined) {
            filterCustomerValue = filterCustomerValue.id;
          }
        }
        
        // Sekarang filterCustomerValue bisa string atau number
        const filterCustomerStr = String(filterCustomerValue).toLowerCase();
        const itemCustomerId = String(item.customer_id || '').toLowerCase();
        const itemCustomerName = item.customer_name ? item.customer_name.toLowerCase() : '';
        
        // Cek apakah ID atau Nama cocok
        if (itemCustomerId !== filterCustomerStr && !itemCustomerName.includes(filterCustomerStr)) {
          // console.log('🔴 Customer tidak match');
          passes = false;
        } else {
          // console.log('🟢 Customer match');
        }
      }

      if (passes && (financeFilter.tanggal_pembayaran_start || financeFilter.tanggal_pembayaran_end)) {
        const itemDate = this.normalizeDate(item.tanggal_pembayaran);
        const startDate = financeFilter.tanggal_pembayaran_start ? this.normalizeDate(financeFilter.tanggal_pembayaran_start) : null;
        const endDate = financeFilter.tanggal_pembayaran_end ? this.normalizeDate(financeFilter.tanggal_pembayaran_end) : null;
        
        if (startDate && itemDate < startDate) {
          passes = false;
        }
        if (endDate && itemDate > endDate) {
          passes = false;
        }
      }

      if (passes && (financeFilter.tanggal_jatuh_tempo_start || financeFilter.tanggal_jatuh_tempo_end)) {
        const itemDate = this.normalizeDate(item.tanggal_jatuh_tempo);
        const startDate = financeFilter.tanggal_jatuh_tempo_start ? this.normalizeDate(financeFilter.tanggal_jatuh_tempo_start) : null;
        const endDate = financeFilter.tanggal_jatuh_tempo_end ? this.normalizeDate(financeFilter.tanggal_jatuh_tempo_end) : null;
        
        if (startDate && itemDate < startDate) {
          passes = false;
        }
        if (endDate && itemDate > endDate) {
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
      return sum + pembayaran;
    }, 0);

    return { totalSuratJalan, totalNilai };
  }

  calculateStatus(data) {
    let totalPenerimaan = 0;
    let totalPotongan = 0;

    data.forEach(item => {
      totalPenerimaan += parseFloat(item.pembayaran || 0);
      totalPotongan += parseFloat(item.potongan || 0);
    });

    return { totalPenerimaan, totalPotongan };
  }

  // Method untuk menghitung saldo customer berdasarkan data yang ada
  async calculateCustomerSaldo(filterParams = {}) {
    try {
      // Ambil data penerimaan dengan filter
      const penerimaanData = await this.getAllWithDetails(filterParams);
      
      // Dapatkan user untuk mendapatkan token
      const user = getUser();
      if (!user || !user.token) {
        console.error('User atau token tidak tersedia');
        return {};
      }

      // Ambil semua surat jalan yang sudah delivered - DENGAN TOKEN
      const allDeliveryNotes = await getAllDeliveryNotes(user.token);
      const rawList = allDeliveryNotes?.suratJalans ?? allDeliveryNotes?.surat_jalan_list ?? allDeliveryNotes?.data ?? [];
      const deliveredSP = Array.isArray(rawList) 
        ? rawList.filter(sp => sp.delivered_status === 1 || sp.delivered_status === true)
        : [];

      // Group by customer
      const customerSaldo = {};
      
      // Hitung total utang per customer (dari semua surat jalan)
      for (const sp of deliveredSP) {
        const customerName = sp.customer_name;
        if (!customerName) continue;

        if (!customerSaldo[customerName]) {
          customerSaldo[customerName] = {
            totalUtang: 0,
            totalPembayaran: 0,
            saldoAkhir: 0,
            items: []
          };
        }

        // Ambil nominal invoice dari surat jalan - DENGAN TOKEN
        try {
          const sjDetail = await getDeliveryNotes(sp.id, user.token);
          const nominalInvoice = sjDetail?.order?.summary?.subtotal || 0;
          customerSaldo[customerName].totalUtang += nominalInvoice;
        } catch (error) {
          console.error(`Error fetching SJ detail for ${sp.id}:`, error);
        }
      }

      // Hitung total pembayaran per customer dari data penerimaan
      penerimaanData.forEach(item => {
        const customerName = item.customer_name;
        if (!customerName || !customerSaldo[customerName]) return;

        const pembayaran = parseFloat(item.pembayaran || 0);
        customerSaldo[customerName].totalPembayaran += pembayaran;
        customerSaldo[customerName].items.push(item);
      });

      // Hitung saldo akhir
      Object.keys(customerSaldo).forEach(customer => {
        const saldo = customerSaldo[customer];
        saldo.saldoAkhir = saldo.totalUtang - saldo.totalPembayaran;
      });

      return customerSaldo;
    } catch (error) {
      console.error('Error calculating customer saldo:', error);
      return {};
    }
  }
}

export default new PenerimaanPiutangSalesService();