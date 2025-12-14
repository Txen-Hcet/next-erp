import { SaldoPiutang } from "../utils/financeAuth";

class SaldoPiutangService {
  /* ================= BASIC ================= */
  async getAll() {
    const res = await SaldoPiutang.getAll();
    return res.data || [];
  }

  /* ================= MAIN ================= */
  async getAllWithDetails(filterParams = {}) {
    try {
      const data = await this.getAll();
      const filtered = this.processDataForReport(data, filterParams);
      return filtered;
    } catch (error) {
      console.error("Error getAllWithDetails SaldoPiutang:", error);
      return [];
    }
  }

  /* ================= DATE HELPER ================= */
  normalizeDate(d) {
    if (!d) return null;
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return null;
    return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  }

  /* ================= FILTER ================= */
  processDataForReport(data, filterParams = {}) {
    const { startDate = "", endDate = "", customer, no_faktur } = filterParams;

    const s = this.normalizeDate(startDate);
    const e = this.normalizeDate(endDate);

    let filtered = [...data];

    /* ===== FILTER TANGGAL ===== */
    if (s || e) {
      filtered = filtered.filter((item) => {
        const itemDate = this.normalizeDate(item.tanggal || item.created_at);
        if (itemDate === null) return false;
        if (s && itemDate < s) return false;
        if (e && itemDate > e) return false;
        return true;
      });
    }

    /* ===== FILTER CUSTOMER ===== */
    if (customer) {
      const c = customer.toLowerCase();
      filtered = filtered.filter((item) =>
        (item.customer || "").toLowerCase().includes(c)
      );
    }

    /* ===== FILTER NO FAKTUR ===== */
    if (no_faktur) {
      const nf = no_faktur.toLowerCase();
      filtered = filtered.filter((item) =>
        (item.no_faktur || "").toLowerCase().includes(nf)
      );
    }

    return filtered;
  }

  /* ================= TOTAL ================= */
  calculateTotals(data) {
    return data.reduce(
      (acc, item) => {
        acc.saldo_awal += Number(item.saldo_awal || 0);
        acc.penjualan += Number(item.penjualan || 0);
        acc.retur += Number(item.retur || 0);
        acc.pembayaran += Number(item.pembayaran || 0);
        acc.saldo_akhir += Number(item.saldo_akhir || 0);
        return acc;
      },
      {
        saldo_awal: 0,
        penjualan: 0,
        retur: 0,
        pembayaran: 0,
        saldo_akhir: 0,
      }
    );
  }
}

export default new SaldoPiutangService();
