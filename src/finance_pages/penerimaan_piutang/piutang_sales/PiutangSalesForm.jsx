import { createSignal, onMount } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { 
  PenerimaanPiutangSales,
  JenisPotongan,
  PaymentMethods,
  Banks,
  getLastSequence,   
} from "../../../utils/financeAuth";
import { 
  getAllDeliveryNotes,
  getDeliveryNotes,
  getUser, 
} from "../../../utils/auth";
import Swal from "sweetalert2";
import FinanceMainLayout from "../../../layouts/FinanceMainLayout";

import JenisPotonganDropdownSearch from "../../../components/JenisPotonganDropdownSearch";
import BanksDropdownSearch from "../../../components/BanksDropdownSearch";
import PaymentMethodsDropdownSearch from "../../../components/PaymentMethodsDropdownSearch";
import SuratJalanPiutangDropdownSearch from "../../../components/SuratJalanPiutangDropdownSearch";

export default function PiutangSalesForm() {
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const isView = params.view === "true";
  const navigate = useNavigate();
  const user = getUser();

  const [loading, setLoading] = createSignal(true);
  const [manualGenerateDone, setManualGenerateDone] = createSignal(false);
  const [jenisPotonganOptions, setJenisPotonganOptions] = createSignal([]);
  const [paymentMethodsOptions, setPaymentMethodsOptions] = createSignal([]);
  const [banksOptions, setBanksOptions] = createSignal([]);
  const [spOptions, setSpOptions] = createSignal([]);
  const [nominalInvoice, setNominalInvoice] = createSignal("");
  const [sisaUtang, setSisaUtang] = createSignal("");
  const [sisaUtangPerSJ, setSisaUtangPerSJ] = createSignal("");

  // Cache states
  const [deliveryNotesCache, setDeliveryNotesCache] = createSignal({});
  const [penerimaanCache, setPenerimaanCache] = createSignal([]);
  const [customerCalculationsCache, setCustomerCalculationsCache] = createSignal({});

  const [form, setForm] = createSignal({
    sequence_number: "",
    no_seq: 0,
    sj_id: "",
    jenis_potongan_id: "",
    potongan: "",
    pembulatan: "",
    pembayaran: "",
    payment_method_id: "",
    bank_id: "",
    tanggal_pembayaran: "",
    tanggal_jatuh_tempo: "",
    status: "",
    keterangan: "",
  });

  // ========= HELPER FUNCTIONS =========
  const parseNumber = (str) => {
    if (typeof str !== "string" || !str) return 0;
    const cleaned = str.replace(/[^0-9,]/g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  const formatIDR = (val, showCurrency = true, showZero = true) => {
    const num = typeof val === "string" ? parseNumber(val) : (val === 0 ? 0 : (val || 0));
    if ((val === null || val === undefined || val === "") && !showZero) return "";
    if (showCurrency) {
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    } else {
      return new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    }
  };

  const normalizeId = (v) => {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "object") {
      const maybe = v.id ?? v.value ?? v.key ?? null;
      const n = Number(maybe);
      return isNaN(n) ? null : n;
    }
    const n = Number(v);
    return isNaN(n) ? null : n;
  };  

  // ========= CACHED DATA LOADING =========
  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load data in parallel
      const [allSP, allPenerimaan] = await Promise.all([
        getAllDeliveryNotes(user?.token),
        PenerimaanPiutangSales.getAll()
      ]);

      const rawList = allSP?.suratJalans ?? allSP?.surat_jalan_list ?? allSP?.data ?? [];
      const filteredSP = Array.isArray(rawList) 
        ? rawList.filter(sp => sp.delivered_status === 1 || sp.delivered_status === true)
        : [];

      const penerimaanList = allPenerimaan?.data || [];
      setPenerimaanCache(penerimaanList);

      // Process with caching
      const spWithCalculations = await processSisaUtangBatch(filteredSP, penerimaanList);
      setSpOptions(spWithCalculations);

      // Pre-calculate customer data
      await preCalculateCustomerData(spWithCalculations, penerimaanList);

    } catch (error) {
      console.error("Gagal memuat data:", error);
      Swal.fire("Error", "Gagal memuat data", "error");
    } finally {
      setLoading(false);
    }
  };

  const processSisaUtangBatch = async (suratJalanList, penerimaanList) => {
    // Group payments by SJ
    const penerimaanPerSJ = {};
    penerimaanList.forEach(p => {
      const sjId = p.sj_id;
      const amount = parseFloat(p.pembayaran) || 0;
      const discount = parseFloat(p.potongan) || 0;
      if (sjId) {
        if (!penerimaanPerSJ[sjId]) penerimaanPerSJ[sjId] = 0;
        penerimaanPerSJ[sjId] += (amount + discount);
      }
    });

    const results = [];
    const batchSize = 3; // Reduced batch size for better performance
    
    for (let i = 0; i < suratJalanList.length; i += batchSize) {
      const batch = suratJalanList.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (sp) => {
        try {
          // Check cache first
          if (deliveryNotesCache()[sp.id]) {
            const detail = deliveryNotesCache()[sp.id];
            const nominalInvoice = detail?.order?.summary?.subtotal || 0;
            const totalPembayaranSJ = penerimaanPerSJ[sp.id] || 0;
            const sisaUtangPerSJ = Math.max(0, nominalInvoice - totalPembayaranSJ);

            return {
              ...sp,
              nominal_invoice: nominalInvoice,
              sisa_utang_per_sj: sisaUtangPerSJ
            };
          }

          // Fetch if not in cache
          const detail = await getDeliveryNotes(sp.id, user?.token);
          setDeliveryNotesCache(prev => ({ ...prev, [sp.id]: detail }));
          
          const nominalInvoice = detail?.order?.summary?.subtotal || 0;
          const totalPembayaranSJ = penerimaanPerSJ[sp.id] || 0;
          const sisaUtangPerSJ = Math.max(0, nominalInvoice - totalPembayaranSJ);

          return {
            ...sp,
            nominal_invoice: nominalInvoice,
            sisa_utang_per_sj: sisaUtangPerSJ
          };
        } catch (error) {
          console.error(`Gagal memproses SJ ${sp.id}:`, error);
          return {
            ...sp,
            nominal_invoice: 0,
            sisa_utang_per_sj: 0
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  };

  const preCalculateCustomerData = async (suratJalanList, penerimaanList) => {
    const customerData = {};
    
    // Group by customer
    suratJalanList.forEach(sp => {
      const customerName = sp.customer_name;
      if (!customerName) return;
      
      if (!customerData[customerName]) {
        customerData[customerName] = {
          totalUtang: 0,
          sjIds: []
        };
      }
      
      customerData[customerName].totalUtang += sp.nominal_invoice;
      customerData[customerName].sjIds.push(sp.id);
    });

    // Calculate payments per customer
    Object.keys(customerData).forEach(customerName => {
      const customerSjIds = customerData[customerName].sjIds;
      const totalPembayaran = penerimaanList.reduce((sum, p) => 
        customerSjIds.includes(p.sj_id) ? sum + (parseFloat(p.pembayaran) || 0) : sum
      , 0);
      
      customerData[customerName].totalPembayaran = totalPembayaran;
      customerData[customerName].sisaUtang = Math.max(0, customerData[customerName].totalUtang - totalPembayaran);
    });

    setCustomerCalculationsCache(customerData);
  };

  // ========= OPTIMIZED UTILITY FUNCTIONS =========
  const updateSisaUtangDisplay = (sjId) => {
    const selectedSP = spOptions().find(sp => sp.id === sjId);
    if (!selectedSP) return;

    // Use cached data - no API calls
    setNominalInvoice(formatIDR(selectedSP.nominal_invoice));
    setSisaUtangPerSJ(formatIDR(selectedSP.sisa_utang_per_sj));
    
    // Use pre-calculated customer data
    const customerName = selectedSP.customer_name;
    if (customerName && customerCalculationsCache()[customerName]) {
      const customerData = customerCalculationsCache()[customerName];
      setSisaUtang(formatIDR(customerData.sisaUtang));
    } else {
      setSisaUtang(formatIDR(0));
    }
  };

  const resetSisaUtangDisplay = () => {
    setNominalInvoice("");
    setSisaUtang("");
    setSisaUtangPerSJ("");
  };

  const handleSuratPenerimaanChange = async (val) => {
    const newSjId = normalizeId(val);
    const currentSjId = form().sj_id;
    
    if (newSjId !== currentSjId && manualGenerateDone()) {
      setForm({ 
        ...form(), 
        sj_id: newSjId, 
        sequence_number: "",
        no_seq: 0
      });
      setManualGenerateDone(false);
    } else {
      setForm({ ...form(), sj_id: newSjId });
    }

    if (newSjId) {
      updateSisaUtangDisplay(newSjId); // No await - synchronous now
    } else {
      resetSisaUtangDisplay();
    }
  };

  // ========= COMPONENT LIFECYCLE =========
  onMount(async () => {
    // Load dropdown options in parallel with main data
    await Promise.all([
      loadAllData(),
      loadDropdownOptions()
    ]);

    if (isEdit) {
      await loadEditData();
    }
  });

  const loadDropdownOptions = async () => {
    try {
      const [resJenisPotongan, resPaymentMethods, resBanks] = await Promise.all([
        JenisPotongan.getAll(),
        PaymentMethods.getAll(),
        Banks.getAll()
      ]);

      setJenisPotonganOptions(resJenisPotongan?.data ?? resJenisPotongan ?? []);
      setPaymentMethodsOptions(resPaymentMethods?.data ?? resPaymentMethods ?? []);
      setBanksOptions(resBanks?.data ?? resBanks ?? []);
    } catch (err) {
      console.error("Gagal memuat opsi dropdown:", err);
    }
  };

  const loadEditData = async () => {
    try {
      const res = await PenerimaanPiutangSales.getById(params.id);
      const data = (Array.isArray(res.data) && res.data.length > 0)
        ? res.data[0]
        : res.data;

      if (!data) throw new Error("Data penerimaan tidak ditemukan.");

      setForm({
        ...data,
        sequence_number: data.no_penerimaan || "",
        potongan: formatIDR(parseFloat(data.potongan || 0)),
        pembulatan: formatIDR(parseFloat(data.pembulatan || 0), 2),
        pembayaran: formatIDR(parseFloat(data.pembayaran || 0)),
        tanggal_pembayaran: data.tanggal_pembayaran || "",
        tanggal_jatuh_tempo: data.tanggal_jatuh_tempo || "",
        status: data.status || "",
        keterangan: data.keterangan || "",
      });

      if (data.sj_id) {
        // Wait a bit for data to be loaded, then update display
        setTimeout(() => updateSisaUtangDisplay(data.sj_id), 100);
      }
    } catch (err) {
      console.error("Gagal memuat data edit:", err);
      Swal.fire("Error", err.message || "Gagal memuat data", "error");
    }
  };

  // ========= REMAINING FUNCTIONS (unchanged) =========
  const generateNomor = async () => {
    try {
        const selectedSJId = form().sj_id;
        if (!selectedSJId) {
            Swal.fire("Gagal", "Pilih Surat Jalan terlebih dahulu.", "warning");
            return;
        }

        const selectedSP = spOptions().find(sp => sp.id === selectedSJId);
        if (!selectedSP) {
            Swal.fire("Gagal", "Detail Surat Jalan tidak ditemukan.", "error");
            return;
        }

        const no_sj = selectedSP.no_sj || "";
        const parts = no_sj.split('/');
        let taxFlag = "N";
        let region = "D";

        if (parts.length >= 3) {
            const regionPart = parts[1];
            const taxPart = parts[2];

            if (taxPart === "P" || taxPart === "N") {
                taxFlag = taxPart;
            }

            if (regionPart === "E" || regionPart === "D") {
                region = regionPart;
            }
        }

        let ppnValue = taxFlag === "P" ? 11 : 0;
        let regionValue = region === "E" ? "Ekspor" : "Domestik";

        const lastSeq = await getLastSequence("penerimaan_s", regionValue, ppnValue);
        
        if (!lastSeq || lastSeq.last_sequence === undefined) {
        throw new Error("Gagal mendapatkan sequence dari server");
        }

        const nextNum = String(lastSeq.last_sequence + 1).padStart(5, "0");
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const year = String(now.getFullYear()).slice(2);
        const mmyy = `${month}${year}`;

        const nomor = `PP/S/${region}/${taxFlag}/${mmyy}-${nextNum}`;

        setForm((prev) => ({
            ...prev,
            sequence_number: nomor,
            no_seq: lastSeq.last_sequence + 1,
        }));
        setManualGenerateDone(true);
    } catch (err) {
        console.error("Generate nomor error:", err);
        Swal.fire("Gagal", err?.message || "Gagal mendapatkan nomor terakhir", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isEdit && !manualGenerateDone()) {
      Swal.fire({
        icon: "warning",
        title: "Peringatan",
        text: "Harap generate nomor penerimaan terlebih dahulu.",
        showConfirmButton: false,
        timerProgressBar: true,
        timer: 1200,
      });
      return;
    }

    const rawForm = form();
    const payload = {
      no_penerimaan: rawForm.sequence_number,
      sj_id: normalizeId(rawForm.sj_id),
      jenis_potongan_id: normalizeId(rawForm.jenis_potongan_id),
      potongan: parseNumber(rawForm.potongan),
      pembulatan: parseNumber(rawForm.pembulatan),
      pembayaran: parseNumber(rawForm.pembayaran),
      payment_method_id: normalizeId(rawForm.payment_method_id),
      bank_id: normalizeId(rawForm.bank_id) || null,
      tanggal_pembayaran: rawForm.tanggal_pembayaran || null,
      tanggal_jatuh_tempo: rawForm.tanggal_jatuh_tempo || null,
      status: rawForm.status || null,
      keterangan: rawForm.keterangan || null,
    };

    try {
      if (isEdit) {
        await PenerimaanPiutangSales.update(params.id, payload);
      } else {
        await PenerimaanPiutangSales.create(payload);
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: isEdit ? "Data berhasil diperbarui" : "Data berhasil dibuat",
        showConfirmButton: false,
        timerProgressBar: true,
        timer: 1200,
      }).then(() => navigate("/piutang-sales"));
    } catch (error) {
      console.error(error);
      const errorMsg = error?.response?.data?.message || error?.message || "Terjadi kesalahan saat menyimpan data";
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: errorMsg,
        showConfirmButton: false,
        timerProgressBar: true,
        timer: 1200,
      });
    }
  };

  // ========= RENDER =========
  return (
    <FinanceMainLayout>
      {loading() && (
        <div class="fixed inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-md bg-opacity-40 z-50 gap-10">
          <div class="w-52 h-52 border-[20px] border-white border-t-transparent rounded-full animate-spin"></div>
          <span class="animate-pulse text-[40px] text-white">Loading...</span>
        </div>
      )}
      <h1 class="text-2xl font-bold mb-6">
        {isView ? "Detail" : isEdit ? "Edit" : "Tambah"} Penerimaan Piutang Penjualan (Sales)
      </h1>

      <form class="space-y-6" onSubmit={handleSubmit}>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-medium">No Penerimaan</label>
            <div class="flex gap-2">
              <input
                class="w-full border bg-gray-200 p-2 rounded"
                value={form().sequence_number}
                readOnly
              />
              <button
                type="button"
                class="bg-gray-300 text-sm px-2 rounded hover:bg-gray-400"
                onClick={generateNomor}
                hidden={isEdit || isView}
              >
                Generate
              </button>
            </div>
          </div>

          <div>
            <label class="block mb-1 font-medium">Surat Jalan</label>
            <SuratJalanPiutangDropdownSearch
              items={spOptions()}
              value={form().sj_id}
              onChange={handleSuratPenerimaanChange}
              disabled={isView || isEdit}
              required
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Nominal Invoice</label>
            <input
              type="text"
              class="w-full border bg-gray-200 p-2 rounded"
              value={nominalInvoice()}
              readOnly
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Total Utang Customer</label>
            <input
              type="text"
              class="w-full border bg-gray-200 p-2 rounded"
              value={sisaUtang()}
              readOnly
            />
            <div class="text-xs text-gray-500 mt-1">
              * Total sisa utang customer untuk semua invoice penjualan atau surat jalan
            </div>
          </div>

          <div>
            <label class="block mb-1 font-medium">Sisa Hutang</label>
            <input
              type="text"
              class="w-full border bg-gray-200 p-2 rounded"
              value={sisaUtangPerSJ()}
              readOnly
            />
          </div>

          {/* Rest of the form fields remain the same */}
          <div>
            <label class="block mb-1 font-medium">Jenis Potongan</label>
            <JenisPotonganDropdownSearch
              form={form}
              setForm={setForm}
              options={jenisPotonganOptions}
              valueKey="jenis_potongan_id"
              disabled={isView}
              required
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Diskon</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().potongan}
              onInput={(e) => setForm({ ...form(), potongan: e.target.value })}
              onBlur={(e) => {
                const num = parseNumber(e.target.value);
                setForm({ ...form(), potongan: formatIDR(num) });
              }}
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Pembulatan</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().pembulatan}
              onInput={(e) => setForm({ ...form(), pembulatan: e.target.value })}
              onBlur={(e) => {
                const num = parseNumber(e.target.value);
                setForm({ ...form(), pembulatan: formatIDR(num, 2) });
              }}
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Penerimaan</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().pembayaran}
              onInput={(e) => setForm({ ...form(), pembayaran: e.target.value })}
              onBlur={(e) => {
                const num = parseNumber(e.target.value);
                setForm({ ...form(), pembayaran: formatIDR(num) });
              }}
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
              required
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Payment Method</label>
            <PaymentMethodsDropdownSearch
              form={form}
              setForm={setForm}
              options={paymentMethodsOptions}
              valueKey="payment_method_id"
              disabled={isView}
              required
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Bank</label>
            <BanksDropdownSearch
              form={form}
              setForm={setForm}
              options={banksOptions}
              valueKey="bank_id"
              disabled={isView}
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Tanggal Penerimaan</label>
            <input
              type="date"
              class="w-full border p-2 rounded"
              value={form().tanggal_pembayaran}
              onInput={(e) => setForm({ ...form(), tanggal_pembayaran: e.target.value })}
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Tanggal Jatuh Tempo</label>
            <input
              type="date"
              class="w-full border p-2 rounded"
              value={form().tanggal_jatuh_tempo}
              onInput={(e) => setForm({ ...form(), tanggal_jatuh_tempo: e.target.value })}
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
              required
            />
          </div>

          <div class="md:col-span-2">
            <label class="block mb-1 font-medium">Status</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().status}
              onInput={(e) => setForm({ ...form(), status: e.target.value })}
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
            />
          </div>

          <div class="md:col-span-2">
            <label class="block mb-1 font-medium">Keterangan</label>
            <textarea
              class="w-full border p-2 rounded"
              rows="3"
              value={form().keterangan}
              onInput={(e) => setForm({ ...form(), keterangan: e.target.value })}
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
            />
          </div>
        </div>

        <div class="pt-6">
          <button
            type="submit"
            class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            hidden={isView}
          >
            Simpan
          </button>
        </div>
      </form>
    </FinanceMainLayout>
  );
}