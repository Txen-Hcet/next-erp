// api.js
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL; // {{cloudflared}}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============ Interceptors ============
api.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem("user")); //
    const token = user?.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error("API Error:", err.response?.data || err.message);
    return Promise.reject(err);
  }
);

// ============ LAST SEQUENCE ============
const getLastSequence = async (doc, type, ppn) => {
  try {
    const res = await api.get("/last-sequence", {
      params: { doc, type, ppn },
    });
    return res.data;
  } catch (err) {
    const message =
      err.response?.data?.message ||
      err.message ||
      "Gagal mengambil nomor sequence terakhir";
    throw new Error(message);
  }
};

// ============ USER ============
export function getUser() {
  const data = localStorage.getItem("user");
  return data ? JSON.parse(data) : null;
}

// ============ SUPPLIER ============
const Suppliers = {
  create: async (payload) => {
    const res = await api.post("/create-supplier", payload);
    return res.data;
  },
  getAll: async () => {
    const res = await api.get("/suppliers");
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/suppliers/${id}`);
    return res.data;
  },
  update: async (id, payload) => {
    const res = await api.put(`/update-supplier/${id}`, payload);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/delete-supplier/${id}`);
    return res.data;
  },
};

// ============ PAYMENT METHODS ============
const PaymentMethods = {
  create: async (payload) => {
    console.log("Banks.create response:", payload);
    const res = await api.post("/create-payment-method", payload);
    return res.data;
  },
  getAll: async () => {
    const res = await api.get("/payment-methods");
    // console.log("Banks.getAll response:", res);
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/payment-methods/${id}`);
    // console.log("Banks.getById response:", res);
    return res.data;
  },
  update: async (id, payload) => {
    const res = await api.put(`/update-payment-method/${id}`, payload);
    // console.log("Banks.update response:", res);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/delete-payment-method/${id}`);
    // console.log("Banks.delete response:", res);
    return res.data;
  },
};

// ============ BANKS ============
const Banks = {
  create: async (payload) => {
    console.log("Banks.create response:", payload);
    const res = await api.post("/create-bank", payload);
    return res.data;
  },
  getAll: async () => {
    const res = await api.get("/banks");
    // console.log("Banks.getAll response:", res);
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/banks/${id}`);
    // console.log("Banks.getById response:", res);
    return res.data;
  },
  update: async (id, payload) => {
    const res = await api.put(`/update-bank/${id}`, payload);
    // console.log("Banks.update response:", res);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/delete-bank/${id}`);
    // console.log("Banks.delete response:", res);
    return res.data;
  },
};

// ============ JENIS POTONGAN ============
const JenisPotongan = {
  create: async (payload) => {
    const res = await api.post("/create-jenis-potongan", payload);
    // console.log("JenisPotongan.create response:", res);
    return res.data;
  },
  getAll: async () => {
    const res = await api.get("/jenis-potongan");
    // console.log("JenisPotongan.getAll response:", res);
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/jenis-potongan/${id}`);
    // console.log("JenisPotongan.getById response:", res);
    return res.data;
  },
  update: async (id, payload) => {
    const res = await api.put(`/update-jenis-potongan/${id}`, payload);
    // console.log("JenisPotongan.update response:", res);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/delete-jenis-potongan/${id}`);
    // console.log("JenisPotongan.delete response:", res);
    return res.data;
  },
};

// ============ JENIS HUTANG ============
const JenisHutang = {
  create: async (payload) => {
    const res = await api.post("/create-jenis-hutang", payload);
    // console.log("JenisHutang.create response:", res);
    return res.data;
  },
  getAll: async () => {
    const res = await api.get("/jenis-hutang");
    // console.log("JenisHutang.getAll response:", res);
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/jenis-hutang/${id}`);
    // console.log("JenisHutang.getById response:", res);
    return res.data;
  },
  update: async (id, payload) => {
    const res = await api.put(`/update-jenis-hutang/${id}`, payload);
    // console.log("JenisHutang.update response:", res);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/delete-jenis-hutang/${id}`);
    // console.log("JenisHutang.delete response:", res);
    return res.data;
  },
};

// ============ PURCHASE AKSESORIS EKSPEDISI ============
const PurchaseAksesorisEkspedisi = {
  create: async (payload) => {
    const res = await api.post("/create-purchase-aksesoris-ekspedisi", payload);
    // console.log("PurchaseAksesorisEkspedisi.create response:", res);
    return res.data;
  },
  getAll: async () => {
    const res = await api.get("/purchase-aksesoris-ekspedisi");
    // console.log("PurchaseAksesorisEkspedisi.getAll response:", res);
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/purchase-aksesoris-ekspedisi/${id}`);
    // console.log("PurchaseAksesorisEkspedisi.getById response:", res);
    return res.data;
  },
  update: async (id, payload) => {
    const res = await api.put(
      `/update-purchase-aksesoris-ekspedisi/${id}`,
      payload
    );
    // console.log("PurchaseAksesorisEkspedisi.update response:", res);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/delete-purchase-aksesoris-ekspedisi/${id}`);
    // console.log("PurchaseAksesorisEkspedisi.delete response:", res);
    return res.data;
  },
};

// ============ PEMBAYARAN HUTANG PURCHASE GREIGE ============
const PembayaranHutangPurchaseGreige = {
  create: async (payload) => {
    const res = await api.post(
      "/create-pembayaran-hutang-purchase-greige",
      payload
    );
    return res.data;
  },
  getAll: async () => {
    const res = await api.get("/pembayaran-hutang-purchase-greige");
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/pembayaran-hutang-purchase-greige/${id}`);
    return res.data;
  },
  update: async (id, payload) => {
    const res = await api.put(
      `/update-pembayaran-hutang-purchase-greige/${id}`,
      payload
    );
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(
      `/delete-pembayaran-hutang-purchase-greige/${id}`
    );
    return res.data;
  },
};

// ============ PEMBAYARAN HUTANG PURCHASE CELUP ============
const PembayaranHutangPurchaseCelup = {
  create: async (payload) => {
    const res = await api.post(
      "/create-pembayaran-hutang-purchase-celup",
      payload
    );
    return res.data;
  },
  getAll: async () => {
    const res = await api.get("/pembayaran-hutang-purchase-celup");
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/pembayaran-hutang-purchase-celup/${id}`);
    return res.data;
  },
  update: async (id, payload) => {
    const res = await api.put(
      `/update-pembayaran-hutang-purchase-celup/${id}`,
      payload
    );
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(
      `/delete-pembayaran-hutang-purchase-celup/${id}`
    );
    return res.data;
  },
};

// ============ PEMBAYARAN HUTANG PURCHASE KAIN JADI ============
const PembayaranHutangPurchaseKainJadi = {
  create: async (payload) => {
    const res = await api.post(
      "/create-pembayaran-hutang-purchase-finish",
      payload
    );
    return res.data;
  },
  getAll: async () => {
    const res = await api.get("/pembayaran-hutang-purchase-finish");
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/pembayaran-hutang-purchase-finish/${id}`);
    return res.data;
  },
  update: async (id, payload) => {
    const res = await api.put(
      `/update-pembayaran-hutang-purchase-finish/${id}`,
      payload
    );
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(
      `/delete-pembayaran-hutang-purchase-finish/${id}`
    );
    return res.data;
  },
};

// ============ PEMBAYARAN HUTANG JUAL BELI ============
const PembayaranHutangPurchaseJualBeli = {
  create: async (payload) => {
    const res = await api.post("/create-pembayaran-hutang-jual-beli", payload);
    return res.data;
  },
  getAll: async () => {
    const res = await api.get("/pembayaran-hutang-jual-beli");
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/pembayaran-hutang-jual-beli/${id}`);
    return res.data;
  },
  update: async (id, payload) => {
    const res = await api.put(
      `/update-pembayaran-hutang-jual-beli/${id}`,
      payload
    );
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/delete-pembayaran-hutang-jual-beli/${id}`);
    return res.data;
  },
};

// ============ PEMBAYARAN HUTANG PURCHASE AKSESORIS EKSPEDISI ============
const PembayaranHutangPurchaseAksesorisEkspedisi = {
  create: async (payload) => {
    const res = await api.post(
      "/create-pembayaran-hutang-purchase-aksesoris-ekspedisi",
      payload
    );
    return res.data;
  },
  getAll: async () => {
    const res = await api.get(
      "/pembayaran-hutang-purchase-aksesoris-ekspedisi"
    );
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(
      `/pembayaran-hutang-purchase-aksesoris-ekspedisi/${id}`
    );
    return res.data;
  },
  update: async (id, payload) => {
    const res = await api.put(
      `/update-pembayaran-hutang-purchase-aksesoris-ekspedisi/${id}`,
      payload
    );
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(
      `/delete-pembayaran-hutang-purchase-aksesoris-ekspedisi/${id}`
    );
    return res.data;
  },
};

// ============ PENERIMAAN PIUTANG ============
const PenerimaanPiutangJualBeli = {
  create: async (payload) => {
    const res = await api.post("/create-penerimaan-piutang-jual-beli", payload);
    return res.data;
  },
  getAll: async () => {
    const res = await api.get("/penerimaan-piutang-jual-beli");
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/penerimaan-piutang-jual-beli/${id}`);
    return res.data;
  },
  update: async (id, payload) => {
    const res = await api.put(
      `/update-penerimaan-piutang-jual-beli/${id}`,
      payload
    );
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/delete-penerimaan-piutang-jual-beli/${id}`);
    return res.data;
  },
};

const PenerimaanPiutangSales = {
  create: async (payload) => {
    const res = await api.post("/create-penerimaan-piutang-sales", payload);
    return res.data;
  },
  getAll: async () => {
    const res = await api.get("/penerimaan-piutang-sales");
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/penerimaan-piutang-sales/${id}`);
    return res.data;
  },
  update: async (id, payload) => {
    const res = await api.put(
      `/update-penerimaan-piutang-sales/${id}`,
      payload
    );
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/delete-penerimaan-piutang-sales/${id}`);
    return res.data;
  },
};

const SaldoHutang = {
  create: async (payload) => {
    const res = await api.post("/create-saldo-hutang-adjustment", payload);
    return res.data;
  },

  getAll: async () => {
    const res = await api.get("/saldo-hutang-adjustment");
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/saldo-hutang-adjustment/${id}`);
    return res.data;
  },

  update: async (id, payload) => {
    const res = await api.put(`/update-saldo-hutang-adjustment/${id}`, payload);
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/delete-saldo-hutang-adjustment/${id}`);
    return res.data;
  },
};

const SaldoPiutang = {
  create: async (payload) => {
    const res = await api.post("/create-saldo-piutang-adjustment", payload);
    return res.data;
  },

  getAll: async () => {
    const res = await api.get("/saldo-piutang-adjustment");
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/saldo-piutang-adjustment/${id}`);
    return res.data;
  },

  update: async (id, payload) => {
    const res = await api.put(
      `/update-saldo-piutang-adjustment/${id}`,
      payload
    );
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/delete-saldo-piutang-adjustment/${id}`);
    return res.data;
  },
};

const User = {
  getUser: () => JSON.parse(localStorage.getItem("user")),
};

// Export bareng
export {
  getLastSequence,
  PaymentMethods,
  Banks,
  JenisPotongan,
  JenisHutang,
  Suppliers,
  PurchaseAksesorisEkspedisi,
  PembayaranHutangPurchaseGreige,
  PembayaranHutangPurchaseCelup,
  PembayaranHutangPurchaseKainJadi,
  PembayaranHutangPurchaseJualBeli,
  PembayaranHutangPurchaseAksesorisEkspedisi,
  PenerimaanPiutangJualBeli,
  PenerimaanPiutangSales,
  SaldoHutang,
  SaldoPiutang,
  User,
};
