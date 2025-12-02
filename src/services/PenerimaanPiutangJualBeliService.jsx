import { PenerimaanPiutangJualBeli } from "../utils/financeAuth";
import { getAllJBDeliveryNotes, getJBDeliveryNotes, getUser } from "../utils/auth";

class PenerimaanPiutangJualBeliService {
  async getAll() {
    const res = await PenerimaanPiutangJualBeli.getAll();
    return res.data || [];
  }

  async getById(id) {
    const res = await PenerimaanPiutangJualBeli.getById(id);
    return res.data || [];
  }

  // Method untuk mendapatkan data lengkap dengan nominal invoice dari surat jalan
  async getAllWithDetails(startDate = "", endDate = "", financeFilter = null) {
    try {
      // Ambil data penerimaan piutang
      const headers = await this.getAll();
      
      // Filter berdasarkan tanggal
      const filteredHeaders = this.processDataForReport(headers, startDate, endDate, financeFilter);
      
      // Dapatkan user untuk mendapatkan token
      const user = getUser();
      if (!user || !user.token) {
        console.error('User atau token tidak tersedia');
        return [];
      }

      // Ambil semua surat jalan untuk mendapatkan nominal invoice - DENGAN TOKEN
      const allDeliveryNotes = await getAllJBDeliveryNotes(user.token);
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
              const sjDetail = await getJBDeliveryNotes(sjId, user.token);
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
        const itemDate = normalizeDate(item.tanggal_pembayaran || item.tanggal_jatuh_tempo);
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
      // Filter customer (case-insensitive partial match)
      if (financeFilter.customer && item.customer_name) {
        const filterCustomer = financeFilter.customer.toLowerCase();
        const itemCustomer = (item.customer_name || '').toLowerCase();
        if (!itemCustomer.includes(filterCustomer)) {
          return false;
        }
      }

      // Filter tanggal penerimaan
      if (financeFilter.tanggal_penerimaan_start || financeFilter.tanggal_penerimaan_end) {
        const itemDate = new Date(item.tanggal_pembayaran);
        const startDate = financeFilter.tanggal_penerimaan_start ? new Date(financeFilter.tanggal_penerimaan_start) : null;
        const endDate = financeFilter.tanggal_penerimaan_end ? new Date(financeFilter.tanggal_penerimaan_end) : null;
        
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
      }

      // Filter tanggal jatuh tempo
      if (financeFilter.tanggal_jatuh_tempo_start || financeFilter.tanggal_jatuh_tempo_end) {
        const itemDate = new Date(item.tanggal_jatuh_tempo);
        const startDate = financeFilter.tanggal_jatuh_tempo_start ? new Date(financeFilter.tanggal_jatuh_tempo_start) : null;
        const endDate = financeFilter.tanggal_jatuh_tempo_end ? new Date(financeFilter.tanggal_jatuh_tempo_end) : null;
        
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
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
    let totalPenerimaan = 0;
    let totalPotongan = 0;

    data.forEach(item => {
      totalPenerimaan += parseFloat(item.pembayaran || 0);
      totalPotongan += parseFloat(item.potongan || 0);
    });

    return { totalPenerimaan, totalPotongan };
  }

  // Method untuk menghitung saldo customer berdasarkan data yang ada
  async calculateCustomerSaldo(startDate = "", endDate = "", financeFilter = null) {
    try {
      // Ambil data penerimaan
      const penerimaanData = await this.getAllWithDetails(startDate, endDate, financeFilter);
      
      // Dapatkan user untuk mendapatkan token
      const user = getUser();
      if (!user || !user.token) {
        console.error('User atau token tidak tersedia');
        return {};
      }

      // Ambil semua surat jalan yang sudah delivered - DENGAN TOKEN
      const allDeliveryNotes = await getAllJBDeliveryNotes(user.token);
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
          const sjDetail = await getJBDeliveryNotes(sp.id, user.token);
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

export default new PenerimaanPiutangJualBeliService();