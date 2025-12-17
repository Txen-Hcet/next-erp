import { createSignal, onMount, createEffect } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import {
  PembayaranHutangPurchaseJualBeli,
  JenisPotongan,
  PaymentMethods,
  Banks,
  getLastSequence,
} from "../../../utils/financeAuth";
import { 
  getAllJBDeliveryNotes,
  getJBDeliveryNotes,
  getUser }
from "../../../utils/auth";
import Swal from "sweetalert2";
import FinanceMainLayout from "../../../layouts/FinanceMainLayout";

import JenisPotonganDropdownSearch from "../../../components/JenisPotonganDropdownSearch";
import BanksDropdownSearch from "../../../components/BanksDropdownSearch";
import PaymentMethodsDropdownSearch from "../../../components/PaymentMethodsDropdownSearch";
//import SuratPenerimaanJualBeliDropdownSearch from "../../../components/SuratPenerimaanJualBeliDropdownSearch";
import SuratPenerimaanJualBeliPiutangDropdownSearch from "../../../components/SuratPenerimaanJualBeliPiutangDropdownSearch";

export default function HutangPurchaseJualBeliForm() {
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

  // State Baru: Menyimpan nilai murni dari database (sebelum dikurangi input user saat ini)
  const [baseSisaUtangPerSJ, setBaseSisaUtangPerSJ] = createSignal(0);
  const [baseSisaUtangSupplier, setBaseSisaUtangSupplier] = createSignal(0);

  const [supplierCalculationsCache, setSupplierCalculationsCache] = createSignal({});
  const [allPembayaranData, setAllPembayaranData] = createSignal([]);
  const [detailedSPData, setDetailedSPData] = createSignal({});  

  const [form, setForm] = createSignal({
    // no_pembayaran: "",
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
    // Hapus semua karakter non-numerik KECUALI koma, lalu ganti koma dengan titik
    const cleaned = str.replace(/[^0-9,]/g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  // Format angka untuk mata uang rupiah
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

  // Format angka 2 desimal
  const formatNumber = (val, decimals = 2, showZero = true) => {
    const num =
      typeof val === "string" ? parseNumber(val) : val === 0 ? 0 : val || 0;
    if ((val === null || val === undefined || val === "") && !showZero)
      return "";
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
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

  // ========= FUNGSI HITUNG PUSAT (BARU) =========
  // Fungsi ini dipanggil saat data load DAN saat user mengetik
  const calculateDisplay = (baseSJ, baseSupp) => {
    // Ambil inputan user saat ini
    const currentPembayaran = parseNumber(form().pembayaran) || 0;
    const currentPotongan = parseNumber(form().potongan) || 0;

    // Rumus: Sisa = (Hutang Awal Database) - (Pembayaran Saat Ini) - (Potongan Saat Ini)
    const finalSJ = (baseSJ || 0) - currentPembayaran - currentPotongan;
    const finalSupp = (baseSupp || 0) - currentPembayaran - currentPotongan;

    // Update UI
    setSisaUtangPerSJ(formatIDR(finalSJ));
    setSisaUtang(formatIDR(finalSupp));
  };

  // ========= DATA FETCHING LOGIC =========
  const fetchSubtotalForSJ = async (sjId) => {
    try {
      if (detailedSPData()[sjId]) {
        return detailedSPData()[sjId];
      }
      
      const response = await getJBDeliveryNotes(sjId, user?.token);
      const data = response.suratJalan;
      
      setDetailedSPData(prev => ({
        ...prev,
        [sjId]: {
          subtotal: data.summary?.subtotal || 0,
          supplier_id: data.supplier_id,
          supplier_name: data.supplier_name
        }
      }));
      
      return {
        subtotal: data.summary?.subtotal || 0,
        supplier_id: data.supplier_id,
        supplier_name: data.supplier_name
      };
    } catch (error) {
      console.error(`Error fetching subtotal for SJ ${sjId}:`, error);
      return { subtotal: 0, supplier_id: null, supplier_name: null };
    }
  };

  const calculateRemainingDebtPerSJ = async (sjId, excludePaymentId = null) => {
    try {
      const sjDetail = await fetchSubtotalForSJ(sjId);
      const subtotal = sjDetail.subtotal;

      const currentPembayaranData = allPembayaranData();
      
      const pembayaranForThisSJ = currentPembayaranData.filter(
        payment => payment.sj_id == sjId && 
                   (excludePaymentId ? payment.id != excludePaymentId : true)
      );

      let totalPembayaranSJ = 0;
      let totalPotonganSJ = 0;

      pembayaranForThisSJ.forEach(payment => {
        totalPembayaranSJ += parseFloat(payment.pembayaran || 0);
        totalPotonganSJ += parseFloat(payment.potongan || 0);
      });

      const sisaUtangPerSJValue = subtotal - (totalPembayaranSJ + totalPotonganSJ);

      return {
        nominalInvoice: subtotal,
        sisaUtangPerSJ: sisaUtangPerSJValue,
        totalPembayaranSJ,
        totalPotonganSJ
      };
    } catch (error) {
      console.error(`Error calculating remaining debt for SJ ${sjId}:`, error);
      return { nominalInvoice: 0, sisaUtangPerSJ: 0, totalPembayaranSJ: 0, totalPotonganSJ: 0 };
    }
  };

  const calculateSupplierDebt = async (supplierId, supplierName, excludePaymentId = null) => {
    if (supplierCalculationsCache()[supplierName]) {
      return supplierCalculationsCache()[supplierName];
    }

    const allSPForSupplier = spOptions().filter(sp => 
      sp.supplier_id === supplierId || sp.supplier_name === supplierName
    );

    let totalHutangAwal = 0;
    const subtotalPromises = allSPForSupplier.map(async (sp) => {
      const detail = await fetchSubtotalForSJ(sp.id);
      return detail.subtotal;
    });

    const subtotals = await Promise.all(subtotalPromises);
    totalHutangAwal = subtotals.reduce((sum, subtotal) => sum + subtotal, 0);

    const pembayaranForSupplier = allPembayaranData().filter(
      payment => payment.supplier_id === supplierId &&
                 (excludePaymentId ? payment.id != excludePaymentId : true)
    );

    let totalPembayaran = 0;
    let totalPotongan = 0;

    pembayaranForSupplier.forEach(payment => {
      totalPembayaran += parseFloat(payment.pembayaran || 0);
      totalPotongan += parseFloat(payment.potongan || 0);
    });

    const sisaUtangSupplier = totalHutangAwal - (totalPembayaran + totalPotongan);

    const result = {
      totalHutangAwal,
      totalPembayaran,
      totalPotongan,
      sisaUtang: sisaUtangSupplier,
      jumlahSJ: allSPForSupplier.length
    };

    setSupplierCalculationsCache(prev => ({
      ...prev,
      [supplierName]: result
    }));

    return result;
  };  

  // ========= UPDATE LOGIC =========
  const updateSisaUtangDisplay = async (sjId) => {
    const selectedSP = spOptions().find((sp) => sp.id === sjId);
    if (!selectedSP) return;

    // 1. Ambil Data Base untuk SJ
    const excludePaymentId = isEdit ? params.id : null;
    const sjCalculations = await calculateRemainingDebtPerSJ(sjId, excludePaymentId);
    
    setNominalInvoice(formatIDR(sjCalculations.nominalInvoice));
    
    // Simpan ke state Base (nilai asli DB)
    const baseSJ = sjCalculations.sisaUtangPerSJ;
    setBaseSisaUtangPerSJ(baseSJ);

    // 2. Ambil Data Base untuk Supplier
    const supplierName = selectedSP.supplier_name || selectedSP.supplier;
    const supplierId = selectedSP.supplier_id;
    
    let baseSupp = 0;
    if (supplierName && supplierId) {
      const supplierCalculations = await calculateSupplierDebt(supplierId, supplierName, excludePaymentId);
      baseSupp = supplierCalculations.sisaUtang;
      setBaseSisaUtangSupplier(baseSupp);
    } else {
      setBaseSisaUtangSupplier(0);
    }

    // 3. PENTING: Panggil fungsi hitung agar UI langsung terisi (tidak kosong)
    calculateDisplay(baseSJ, baseSupp);
  };

  const resetSisaUtangDisplay = () => {
    setNominalInvoice("");
    setSisaUtang("");
    setSisaUtangPerSJ("");
    setBaseSisaUtangPerSJ(0);
    setBaseSisaUtangSupplier(0);
  };

  // ========= REACTIVITY =========
  // Effect ini memantau ketikan user di kolom Pembayaran & Potongan
  createEffect(() => {
    // Tracking dependencies
    form().pembayaran;
    form().potongan;

    // Ambil nilai base yang tersimpan
    const currentBaseSJ = baseSisaUtangPerSJ();
    const currentBaseSupp = baseSisaUtangSupplier();

    // Hitung ulang tampilan
    calculateDisplay(currentBaseSJ, currentBaseSupp);
  });  

  const handleSuratPenerimaanChange = async (val) => {
    const newSjId = normalizeId(val);
    const currentSjId = form().sj_id;

    if (newSjId !== currentSjId && manualGenerateDone()) {
      setForm({
        ...form(),
        sj_id: newSjId,
        sequence_number: "",
        no_seq: 0,
      });
      setManualGenerateDone(false);
    } else {
      setForm({ ...form(), sj_id: newSjId });
    }

    if (newSjId) {
      await updateSisaUtangDisplay(newSjId);
    } else {
      resetSisaUtangDisplay();
    }
  };

  // const handleSuratPenerimaanChange = (val) => {
  //   const newSjId = normalizeId(val);
  //   const currentSjId = form().sj_id;

  //   if (newSjId !== currentSjId && manualGenerateDone()) {
  //     setForm({
  //       ...form(),
  //       sj_id: newSjId,
  //       sequence_number: "",
  //       no_seq: 0,
  //     });
  //     setManualGenerateDone(false);
  //   } else {
  //     setForm({ ...form(), sj_id: newSjId });
  //   }
  // };

  // ========= ON MOUNT =========
  onMount(async () => {
    setLoading(true);

    try {
      const [resJenisPotongan, resPaymentMethods, resBanks, allSP, allPembayaran] = await Promise.all([
        JenisPotongan.getAll(),
        PaymentMethods.getAll(),
        Banks.getAll(),
        getAllJBDeliveryNotes(user?.token),
        PembayaranHutangPurchaseJualBeli.getAll()
      ]);

      setJenisPotonganOptions(resJenisPotongan?.data ?? resJenisPotongan ?? []);
      setPaymentMethodsOptions(resPaymentMethods?.data ?? resPaymentMethods ?? []);
      setBanksOptions(resBanks?.data ?? resBanks ?? []);

      const rawList = allSP?.suratJalans ?? allSP?.surat_jalan_list ?? allSP?.data ?? [];
      const allPembayaranArray = allPembayaran?.data ?? [];
      
      setAllPembayaranData(allPembayaranArray);

      const spWithRemainingDebt = await Promise.all(
        rawList.map(async (sp) => {
          const excludePaymentId = null;
          const sjCalculations = await calculateRemainingDebtPerSJ(sp.id, excludePaymentId);
          
          return {
            ...sp,
            sisa_utang_per_sj: sjCalculations.sisaUtangPerSJ
          };
        })
      );

      setSpOptions(Array.isArray(spWithRemainingDebt) ? spWithRemainingDebt : []);

      if (isEdit) {
        try {
          const res = await PembayaranHutangPurchaseJualBeli.getById(params.id);
          const data = Array.isArray(res.data) && res.data.length > 0
            ? res.data[0]
            : res.data;

          if (!data) {
            throw new Error("Data pembayaran tidak ditemukan.");
          }

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

          // Saat edit, trigger update display agar sisa hutang muncul
          if (data.sj_id) {
            await updateSisaUtangDisplay(data.sj_id);
          }
        } catch (err) {
          console.error("Gagal memuat data edit:", err);
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
      const selectedSJId = form().sj_id;
      if (!selectedSJId) {
        Swal.fire(
          "Gagal",
          "Pilih Surat Penerimaan terlebih dahulu.",
          "warning"
        );
        return;
      }

      const selectedSP = spOptions().find((sp) => sp.id === selectedSJId);
      if (!selectedSP) {
        Swal.fire("Gagal", "Detail Surat Penerimaan tidak ditemukan.", "error");
        return;
      }

      const no_sj = selectedSP.no_sj || "";
      const parts = no_sj.split("/");
      let taxFlag = "N";

      if (parts.length > 2 && (parts[2] === "P" || parts[2] === "N")) {
        taxFlag = parts[2];
      } else {
        console.warn("Format No SJ tidak terduga, default ke 'N'.", no_sj);
      }

      let ppnValue = null;
      if (taxFlag === "P") {
        ppnValue = 11;
      } else {
        ppnValue = 0;
      }

      const lastSeq = await getLastSequence("pembayaran_jb", "", ppnValue);
      const nextNum = String((lastSeq?.last_sequence || 0) + 1).padStart(
        5,
        "0"
      );

      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = String(now.getFullYear()).slice(2);
      const mmyy = `${month}${year}`;

      const nomor = `PH/JB/${taxFlag}/${mmyy}-${nextNum}`;

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
        text: "Harap generate nomor penerimaan terlebih dahulu.",
        showConfirmButton: false,
        timerProgressBar: true,
        timer: 1200,
      });
      return;
    }

    // Ambil data mentah dari form input
    const rawForm = form();

    // Payload untuk passing data ke backend
    const payload = {
      no_pembayaran: rawForm.sequence_number,

      // Passing data input manipulasi "string" untuk di konversi menjadi number
      sj_id: normalizeId(rawForm.sj_id),
      jenis_potongan_id: normalizeId(rawForm.jenis_potongan_id),
      potongan: parseNumber(rawForm.potongan),
      pembulatan: parseNumber(rawForm.pembulatan),
      pembayaran: parseNumber(rawForm.pembayaran),
      payment_method_id: normalizeId(rawForm.payment_method_id),

      // Fallback jika data kosong kirim sebagai null
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
        //console.log("Payload update pembayaran hutang jual beli:", JSON.stringify(payload, null, 2));

        await PembayaranHutangPurchaseJualBeli.update(params.id, payload);
      } else {
        //console.log("Payload create pembayaran hutang jual beli:", JSON.stringify(payload, null, 2));

        await PembayaranHutangPurchaseJualBeli.create(payload);
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: isEdit ? "Data berhasil diperbarui" : "Data berhasil dibuat",
        showConfirmButton: false,
        timerProgressBar: true,
        timer: 1200,
      }).then(() => navigate("/hutang-purchase-jual-beli"));
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
        {isView ? "Detail" : isEdit ? "Edit" : "Tambah"} Pembayaran Hutang Jual
        Beli
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
            <label class="block mb-1 font-medium">Surat Penerimaan</label>
            <SuratPenerimaanJualBeliPiutangDropdownSearch
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
            <label class="block mb-1 font-medium">Total Hutang Supplier</label>
            <input
              type="text"
              class="w-full border bg-gray-200 p-2 rounded"
              value={sisaUtang()}
              readOnly
            />
            <div class="text-xs text-gray-500 mt-1">
              * Total sisa utang untuk semua surat penerimaan jual beli
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
