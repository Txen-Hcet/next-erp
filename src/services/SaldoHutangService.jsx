import { SaldoHutang } from "../utils/financeAuth";

class SaldoHutangService {
  /* ================= BASIC ================= */
  async getAll() {
    const res = await SaldoHutang.getAll();
    return res.data || [];
  }

  /* ================= MAIN ================= */
  async getAllWithDetails(filterParams = {}) {
    try {
      const data = await this.getAll();
      const filteredData = this.processDataForReport(data, filterParams);
      return filteredData;
    } catch (error) {
      console.error("Error in getAllWithDetails (Saldo Hutang):", error);
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
    const { startDate = "", endDate = "", supplier } = filterParams;

    const s = this.normalizeDate(startDate);
    const e = this.normalizeDate(endDate);

    let filteredData = data;

    /* FILTER TANGGAL */
    if (s || e) {
      filteredData = filteredData.filter((item) => {
        const itemDate = this.normalizeDate(item.tanggal || item.created_at);
        if (itemDate === null) return false;
        if (s && itemDate < s) return false;
        if (e && itemDate > e) return false;
        return true;
      });
    }

    /* FILTER SUPPLIER */
    if (supplier) {
      const keyword = supplier.toLowerCase();
      filteredData = filteredData.filter((item) =>
        (item.supplier || "").toLowerCase().includes(keyword)
      );
    }

    return filteredData;
  }

  /* ================= TOTAL ================= */
  calculateTotals(data) {
    return data.reduce(
      (acc, item) => {
        acc.saldo_awal += Number(item.saldo_awal || 0);
        acc.jual += Number(item.jual || 0);
        acc.retur += Number(item.retur || 0);
        acc.pot_pemb += Number(item.pot_pemb || 0);
        acc.bayar += Number(item.bayar || 0);
        acc.cash_disc += Number(item.cash_disc || 0);
        acc.saldo_akhir += Number(item.saldo_akhir || 0);
        acc.giro_mundur += Number(item.giro_mundur || 0);
        acc.saldo_sth_gm += Number(item.saldo_sth_gm || 0);
        return acc;
      },
      {
        saldo_awal: 0,
        jual: 0,
        retur: 0,
        pot_pemb: 0,
        bayar: 0,
        cash_disc: 0,
        saldo_akhir: 0,
        giro_mundur: 0,
        saldo_sth_gm: 0,
      }
    );
  }
}

export default new SaldoHutangService();
