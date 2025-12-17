import { createSignal, onMount, createEffect } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import {
  PembayaranHutangPurchaseAksesorisEkspedisi,
  PurchaseAksesorisEkspedisi,
  JenisPotongan,
  PaymentMethods,
  Banks,
  getLastSequence,
} from "../../../utils/financeAuth";
import Swal from "sweetalert2";
import FinanceMainLayout from "../../../layouts/FinanceMainLayout";

import JenisPotonganDropdownSearch from "../../../components/JenisPotonganDropdownSearch";
import BanksDropdownSearch from "../../../components/BanksDropdownSearch";
import PaymentMethodsDropdownSearch from "../../../components/PaymentMethodsDropdownSearch";
import PurchaseAksesorisEkspedisiDropdownSearch from "../../../components/PurchaseAksesorisEkspedisiDropdownSearch";

export default function HutangPurchaseAksesorisEkspedisiForm() {
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const isView = params.view === "true";
  const navigate = useNavigate();

  const [loading, setLoading] = createSignal(true);
  const [manualGenerateDone, setManualGenerateDone] = createSignal(false);
  const [jenisPotonganOptions, setJenisPotonganOptions] = createSignal([]);
  const [paymentMethodsOptions, setPaymentMethodsOptions] = createSignal([]);
  const [banksOptions, setBanksOptions] = createSignal([]);
  const [paeOptions, setPaeOptions] = createSignal([]);

  // State untuk perhitungan hutang
  const [nominalInvoice, setNominalInvoice] = createSignal("");
  const [sisaUtang, setSisaUtang] = createSignal("");
  const [sisaUtangPerPAE, setSisaUtangPerPAE] = createSignal("");

  // Cache states
  const [allPembayaranData, setAllPembayaranData] = createSignal([]);
  const [supplierCalculationsCache, setSupplierCalculationsCache] = createSignal({});
  const [currentPaymentData, setCurrentPaymentData] = createSignal(null);

  // State untuk base calculations
  const [baseSisaUtangPerPAE, setBaseSisaUtangPerPAE] = createSignal(0);
  const [baseSisaUtangSupplier, setBaseSisaUtangSupplier] = createSignal(0);

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
    no_giro: "",
    bank_giro_id: "",
    tanggal_pengambilan_giro: "",
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
    const num = typeof val === "string" ? parseNumber(val) : val || 0;
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

  // ========= FUNGSI HITUNG PUSAT =========
  const calculateDisplay = (basePAE, baseSupp) => {
    const currentPembayaran = parseNumber(form().pembayaran) || 0;
    const currentPotongan = parseNumber(form().potongan) || 0;

    const finalPAE = Math.max(0, (basePAE || 0) - currentPembayaran - currentPotongan);
    const finalSupp = Math.max(0, (baseSupp || 0) - currentPembayaran - currentPotongan);

    setSisaUtangPerPAE(formatIDR(finalPAE));
    setSisaUtang(formatIDR(finalSupp));
  };

  // ========= FUNGSI PERHITUNGAN SISA UTANG =========
  const calculateRemainingDebtPerPAE = async (paeId, excludePaymentId = null) => {
    try {
      const selectedPAE = paeOptions().find(pae => pae.id === paeId);
      if (!selectedPAE) {
        return { nominalInvoice: 0, sisaUtangPerPAE: 0, totalPembayaranPAE: 0, totalPotonganPAE: 0 };
      }

      const totalHarga = parseFloat(selectedPAE.summary?.total_harga || 0);

      // Gabungkan semua data pembayaran
      const allPayments = [...allPembayaranData()];
      if (currentPaymentData() && !excludePaymentId) {
        allPayments.push(currentPaymentData());
      }

      // Ambil semua pembayaran untuk PAE ini
      const pembayaranForThisPAE = allPayments.filter(
        payment => payment.sj_id == paeId && 
                  (excludePaymentId ? payment.id != excludePaymentId : true)
      );

      let totalPembayaranPAE = 0;
      let totalPotonganPAE = 0;

      pembayaranForThisPAE.forEach(payment => {
        totalPembayaranPAE += parseNumber(payment.pembayaran);
        totalPotonganPAE += parseNumber(payment.potongan);
      });

      const sisaUtangPerPAEValue = totalHarga - (totalPembayaranPAE + totalPotonganPAE);

      return {
        nominalInvoice: totalHarga,
        sisaUtangPerPAE: Math.max(0, sisaUtangPerPAEValue),
        totalPembayaranPAE,
        totalPotonganPAE
      };
    } catch (error) {
      console.error(`Error calculating remaining debt for PAE ${paeId}:`, error);
      return { nominalInvoice: 0, sisaUtangPerPAE: 0, totalPembayaranPAE: 0, totalPotonganPAE: 0 };
    }
  };

  // ========= FUNGSI UNTUK MENGHITUNG TOTAL HUTANG SUPPLIER =========
  const calculateSupplierDebt = async (supplierId, supplierName, excludePaymentId = null) => {
    // Cek cache dulu
    if (supplierCalculationsCache()[supplierName]) {
      return supplierCalculationsCache()[supplierName];
    }

    // 1. Ambil semua PAE untuk supplier ini
    const allPAEForSupplier = paeOptions().filter(pae => 
      pae.supplier_id === supplierId || pae.supplier_name === supplierName
    );

    // 2. Hitung total hutang awal (SUM total_harga semua PAE)
    let totalHutangAwal = 0;
    allPAEForSupplier.forEach(pae => {
      totalHutangAwal += parseFloat(pae.summary?.total_harga || 0);
    });

    // 3. Gabungkan semua data pembayaran
    const allPayments = [...allPembayaranData()];
    if (currentPaymentData() && !excludePaymentId) {
      allPayments.push(currentPaymentData());
    }

    // 4. Ambil total pembayaran dan total potongan untuk supplier ini
    const pembayaranForSupplier = allPayments.filter(payment => {
      const paymentPAE = paeOptions().find(pae => pae.id == payment.sj_id);
      const isSameSupplier = paymentPAE && (paymentPAE.supplier_id === supplierId);
      const isExcluded = excludePaymentId ? payment.id != excludePaymentId : true;
      return isSameSupplier && isExcluded;
    });

    let totalPembayaran = 0;
    let totalPotongan = 0;

    pembayaranForSupplier.forEach(payment => {
      totalPembayaran += parseNumber(payment.pembayaran);
      totalPotongan += parseNumber(payment.potongan);
    });

    // 5. Hitung sisa utang = total hutang awal - (total pembayaran + total potongan)
    const sisaUtangSupplier = Math.max(0, totalHutangAwal - (totalPembayaran + totalPotongan));

    // 6. Simpan ke cache
    const result = {
      totalHutangAwal,
      totalPembayaran,
      totalPotongan,
      sisaUtang: sisaUtangSupplier,
      jumlahPAE: allPAEForSupplier.length
    };

    setSupplierCalculationsCache(prev => ({
      ...prev,
      [supplierName]: result
    }));

    return result;
  };

  // ========= FUNGSI UNTUK MENGOLAH DATA =========
  const processPAEWithRemainingDebt = async (paeList, pembayaranList) => {
    const results = [];
    
    // Kita gunakan Set/Map untuk performa pencarian pembayaran yang lebih cepat
    // tapi pakai filter array biasa juga tidak masalah untuk data kecil
    
    for (const pae of paeList) {
      try {
        // 1. Ambil Total Harga LANGSUNG dari item saat ini (jangan cari di paeOptions)
        const totalHarga = parseFloat(pae.summary?.total_harga || 0);

        // 2. Filter pembayaran untuk PAE ini
        const pembayaranForThisPAE = pembayaranList.filter(
          payment => payment.sj_id == pae.id
        );

        // 3. Hitung Total Bayar & Potongan
        let totalPembayaranPAE = 0;
        let totalPotonganPAE = 0;

        pembayaranForThisPAE.forEach(payment => {
          totalPembayaranPAE += parseNumber(payment.pembayaran);
          totalPotonganPAE += parseNumber(payment.potongan);
        });

        // 4. Hitung Sisa
        const sisaUtangPerPAEValue = totalHarga - (totalPembayaranPAE + totalPotonganPAE);
        
        results.push({
          ...pae,
          sisa_utang_per_sj: Math.max(0, sisaUtangPerPAEValue),
          nominal_invoice: totalHarga,
          total_harga: totalHarga
        });
      } catch (error) {
        console.error(`Error processing PAE ${pae.id}:`, error);
        results.push({
          ...pae,
          sisa_utang_per_sj: 0,
          nominal_invoice: 0,
          total_harga: parseFloat(pae.summary?.total_harga || 0)
        });
      }
    }
    
    return results;
  };

  // ========= UPDATE DISPLAY =========
  const updateSisaUtangDisplay = async (paeId) => {
    const selectedPAE = paeOptions().find((pae) => pae.id === paeId);
    if (!selectedPAE) return;

    // Untuk mode EDIT, exclude pembayaran ini dari perhitungan
    const excludePaymentId = isEdit ? params.id : null;
    const paeCalculations = await calculateRemainingDebtPerPAE(paeId, excludePaymentId);
    
    setNominalInvoice(formatIDR(paeCalculations.nominalInvoice));
    
    // Simpan ke state Base (nilai asli DB)
    const basePAE = paeCalculations.sisaUtangPerPAE;
    setBaseSisaUtangPerPAE(basePAE);

    // Hitung total hutang supplier
    const supplierName = selectedPAE.supplier_name;
    const supplierId = selectedPAE.supplier_id;
    
    let baseSupp = 0;
    if (supplierName && supplierId) {
      const supplierCalculations = await calculateSupplierDebt(supplierId, supplierName, excludePaymentId);
      baseSupp = supplierCalculations.sisaUtang;
      setBaseSisaUtangSupplier(baseSupp);
    } else {
      setBaseSisaUtangSupplier(0);
    }

    // Panggil fungsi hitung agar UI langsung terisi
    calculateDisplay(basePAE, baseSupp);
  };

  const resetSisaUtangDisplay = () => {
    setNominalInvoice("");
    setSisaUtang("");
    setSisaUtangPerPAE("");
    setBaseSisaUtangPerPAE(0);
    setBaseSisaUtangSupplier(0);
  };

  const handlePAEChange = async (val) => {
    const newPaeId = normalizeId(val);
    const currentPaeId = form().sj_id;

    if (newPaeId !== currentPaeId && manualGenerateDone()) {
      setForm({
        ...form(),
        sj_id: newPaeId,
        sequence_number: "",
        no_seq: 0,
      });
      setManualGenerateDone(false);
    } else {
      setForm({ ...form(), sj_id: newPaeId });
    }

    if (newPaeId) {
      await updateSisaUtangDisplay(newPaeId);
    } else {
      resetSisaUtangDisplay();
    }
  };

  // ========= REACTIVITY =========
  createEffect(() => {
    form().pembayaran;
    form().potongan;

    const currentBasePAE = baseSisaUtangPerPAE();
    const currentBaseSupp = baseSisaUtangSupplier();

    calculateDisplay(currentBasePAE, currentBaseSupp);
  });

  // ========= ON MOUNT =========
  onMount(async () => {
    setLoading(true);

    try {
      // Load semua data secara paralel
      const [resJenisPotongan, resPaymentMethods, resBanks, allPAE, allPembayaran] = await Promise.all([
        JenisPotongan.getAll(),
        PaymentMethods.getAll(),
        Banks.getAll(),
        PurchaseAksesorisEkspedisi.getAll(),
        PembayaranHutangPurchaseAksesorisEkspedisi.getAll()
      ]);

      setJenisPotonganOptions(resJenisPotongan?.data ?? resJenisPotongan ?? []);
      setPaymentMethodsOptions(resPaymentMethods?.data ?? resPaymentMethods ?? []);
      setBanksOptions(resBanks?.data ?? resBanks ?? []);

      const rawList = allPAE?.data ?? [];
      const allPembayaranArray = allPembayaran?.data ?? [];
      
      // Simpan semua data pembayaran untuk perhitungan
      setAllPembayaranData(allPembayaranArray);

      // Hitung sisa utang untuk setiap PAE
      const paeWithRemainingDebt = await processPAEWithRemainingDebt(
        Array.isArray(rawList) ? rawList : [], 
        allPembayaranArray
      );

      setPaeOptions(paeWithRemainingDebt);

      // Jika edit atau view, load data pembayaran saat ini
      if (isEdit || isView) {
        try {
          const res = await PembayaranHutangPurchaseAksesorisEkspedisi.getById(params.id);
          const data = Array.isArray(res.data) && res.data.length > 0
            ? res.data[0]
            : res.data;

          if (!data) {
            throw new Error("Data pembayaran tidak ditemukan.");
          }

          // Simpan data pembayaran saat ini
          setCurrentPaymentData(data);

          setForm({
            ...data,
            sequence_number: data.no_pembayaran || "",
            potongan: formatIDR(parseFloat(data.potongan || 0)),
            pembulatan: formatIDR(parseFloat(data.pembulatan || 0), 2),
            pembayaran: formatIDR(parseFloat(data.pembayaran || 0)),
            no_giro: data.no_giro || "",
            tanggal_pengambilan_giro: data.tanggal_pengambilan_giro || "",
            tanggal_jatuh_tempo: data.tanggal_jatuh_tempo || "",
            status: data.status || "",
            keterangan: data.keterangan || "",
          });

          // Hitung dan tampilkan data hutang untuk PAE yang diedit/dilihat
          if (data.sj_id) {
            await updateSisaUtangDisplay(data.sj_id);
          }
        } catch (err) {
          console.error("Gagal memuat data edit/view:", err);
          Swal.fire("Error", err.message || "Gagal memuat data", "error");
        }
      }
    } catch (err) {
      console.error("Gagal memuat opsi dropdown:", err);
      Swal.fire("Error", "Gagal memuat data awal", "error");
    } finally {
      setLoading(false);
    }
  });

  const generateNomor = async () => {
    try {
      const selectedPAEId = form().sj_id;
      if (!selectedPAEId) {
        Swal.fire(
          "Gagal",
          "Pilih Pembelian Aksesoris/Ekspedisi terlebih dahulu.",
          "warning"
        );
        return;
      }

      const selectedPAE = paeOptions().find((pae) => pae.id === selectedPAEId);
      if (!selectedPAE) {
        Swal.fire("Gagal", "Detail Pembelian tidak ditemukan.", "error");
        return;
      }

      const lastSeq = await getLastSequence("pembayaran_ae");
      const nextNum = String((lastSeq?.last_sequence || 0) + 1).padStart(5, "0");

      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = String(now.getFullYear()).slice(2);
      const mmyy = `${month}${year}`;

      const nomor = `PH/AE/${mmyy}-${nextNum}`;

      setForm((prev) => ({
        ...prev,
        sequence_number: nomor,
        no_seq: (lastSeq?.last_sequence || 0) + 1,
      }));
      setManualGenerateDone(true);
    } catch (err) {
      console.error("Generate nomor error:", err);
      Swal.fire(
        "Gagal",
        err?.message || "Gagal mendapatkan nomor terakhir",
        "error"
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isEdit && !manualGenerateDone()) {
      Swal.fire({
        icon: "warning",
        title: "Peringatan",
        text: "Harap generate nomor pembayaran terlebih dahulu.",
        showConfirmButton: false,
        timerProgressBar: true,
        timer: 1200,
      });
      return;
    }

    const rawForm = form();
    const payload = {
      no_pembayaran: rawForm.sequence_number,
      sj_id: normalizeId(rawForm.sj_id),
      jenis_potongan_id: normalizeId(rawForm.jenis_potongan_id),
      potongan: parseNumber(rawForm.potongan),
      pembulatan: parseNumber(rawForm.pembulatan),
      pembayaran: parseNumber(rawForm.pembayaran),
      payment_method_id: normalizeId(rawForm.payment_method_id),
      bank_id: normalizeId(rawForm.bank_id) || null,
      bank_giro_id: normalizeId(rawForm.bank_giro_id) || null,
      no_giro: rawForm.no_giro || null,
      tanggal_pengambilan_giro: rawForm.tanggal_pengambilan_giro || null,
      tanggal_jatuh_tempo: rawForm.tanggal_jatuh_tempo || null,
      status: rawForm.status || null,
      keterangan: rawForm.keterangan || null,
    };

    try {
      if (isEdit) {
        await PembayaranHutangPurchaseAksesorisEkspedisi.update(params.id, payload);
      } else {
        await PembayaranHutangPurchaseAksesorisEkspedisi.create(payload);
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: isEdit ? "Data berhasil diperbarui" : "Data berhasil dibuat",
        showConfirmButton: false,
        timerProgressBar: true,
        timer: 1200,
      }).then(() => navigate("/hutang-purchase-aksesoris-ekspedisi"));
    } catch (error) {
      console.error(error);
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        "Terjadi kesalahan saat menyimpan data";
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

  return (
    <FinanceMainLayout>
      {loading() && (
        <div class="fixed inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-md bg-opacity-40 z-50 gap-10">
          <div class="w-52 h-52 border-[20px] border-white border-t-transparent rounded-full animate-spin"></div>
          <span class="animate-pulse text-[40px] text-white">Loading...</span>
        </div>
      )}
      <h1 class="text-2xl font-bold mb-6">
        {isView ? "Detail" : isEdit ? "Edit" : "Tambah"} Pembayaran Hutang
        Pembelian Aksesoris Ekspedisi
      </h1>

      <form class="space-y-6" onSubmit={handleSubmit}>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-medium">No Pembayaran</label>
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
            <label class="block mb-1 font-medium">No Pembelian</label>
            <PurchaseAksesorisEkspedisiDropdownSearch
              items={paeOptions()}
              value={form().sj_id}
              onChange={handlePAEChange}
              disabled={isView || isEdit}
              isEdit={isEdit}
              isView={isView}
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
            <label class="block mb-1 font-medium">Total Hutang Supplier</label>
            <input
              type="text"
              class="w-full border bg-gray-200 p-2 rounded"
              value={sisaUtang()}
              readOnly
            />
            <div class="text-xs text-gray-500 mt-1">
              * Total sisa utang untuk semua pembelian aksesoris/ekspedisi
            </div>
          </div>

          <div>
            <label class="block mb-1 font-medium">Sisa Hutang</label>
            <input
              type="text"
              class="w-full border bg-gray-200 p-2 rounded"
              value={sisaUtangPerPAE()}
              readOnly
            />
          </div>

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
            <label class="block mb-1 font-medium">Potongan</label>
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
              onInput={(e) =>
                setForm({ ...form(), pembulatan: e.target.value })
              }
              onBlur={(e) => {
                const num = parseNumber(e.target.value);
                setForm({ ...form(), pembulatan: formatIDR(num, 2) });
              }}
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Pembayaran</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().pembayaran}
              onInput={(e) =>
                setForm({ ...form(), pembayaran: e.target.value })
              }
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
            <label class="block mb-1 font-medium">No Giro</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().no_giro}
              onInput={(e) => setForm({ ...form(), no_giro: e.target.value })}
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Bank Giro</label>
            <BanksDropdownSearch
              form={form}
              setForm={setForm}
              options={banksOptions}
              valueKey="bank_giro_id"
              placeholder="Pilih Bank Giro"
              disabled={isView}
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">
              Tanggal Pengambilan Giro
            </label>
            <input
              type="date"
              class="w-full border p-2 rounded"
              value={form().tanggal_pengambilan_giro}
              onInput={(e) =>
                setForm({
                  ...form(),
                  tanggal_pengambilan_giro: e.target.value,
                })
              }
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
              onInput={(e) =>
                setForm({
                  ...form(),
                  tanggal_jatuh_tempo: e.target.value,
                })
              }
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
              onInput={(e) =>
                setForm({ ...form(), keterangan: e.target.value })
              }
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