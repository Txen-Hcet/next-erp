import { createSignal, onMount, createMemo, Show } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import {
  PenerimaanPiutangJualBeli,
  JenisPotongan,
  PaymentMethods,
  Banks,
  getLastSequence,
} from "../../../utils/financeAuth";
import {
  getAllJBDeliveryNotes,
  getJBDeliveryNotes, // Tambahkan import untuk get detail SJ JB
  getUser,
} from "../../../utils/auth";
import Swal from "sweetalert2";
import FinanceMainLayout from "../../../layouts/FinanceMainLayout";

import JenisPotonganDropdownSearch from "../../../components/JenisPotonganDropdownSearch";
import BanksDropdownSearch from "../../../components/BanksDropdownSearch";
import PaymentMethodsDropdownSearch from "../../../components/PaymentMethodsDropdownSearch";
import SuratPenerimaanJualBeliDropdownSearch from "../../../components/SuratPenerimaanJualBeliDropdownSearch";

export default function PiutangJualBeliFormV2() {
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
  const [nominalInvoice, setNominalInvoice] = createSignal(""); // State untuk nominal invoice

  const [form, setForm] = createSignal({
    sequence_number: "",
    no_seq: 0,
    sj_id: "",
    jenis_potongan_id: "",
    nilai_potongan: "",
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
    const cleaned = str
      .replace(/Rp\s?/g, "")
      .replace(/\./g, "")
      .replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  const formatIDR = (val) => {
    const num = typeof val === "number" ? val : parseNumber(val);
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatNumber = (val, decimals = 2) => {
    const num = typeof val === "number" ? val : parseNumber(val);
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

  // Fungsi untuk mengambil data detail Surat Penerimaan Jual Beli
  const fetchSuratPenerimaanDetail = async (sjId) => {
    try {
      const response = await getJBDeliveryNotes(sjId, user?.token);
      const sjData = response?.suratJalan || response?.data;
      
      if (sjData && sjData.summary) {
        // Ambil subtotal dari summary dan format sebagai IDR
        const subtotal = sjData.summary.subtotal || 0;
        setNominalInvoice(formatIDR(subtotal));
      } else {
        setNominalInvoice(formatIDR(0));
        console.warn("Data summary tidak ditemukan dalam response Surat Penerimaan Jual Beli");
      }
    } catch (error) {
      console.error("Gagal mengambil detail Surat Penerimaan Jual Beli:", error);
      setNominalInvoice(formatIDR(0));
      Swal.fire("Error", "Gagal memuat data Surat Penerimaan", "error");
    }
  };

  // Memo untuk mendapatkan detail jenis potongan terpilih
  const selectedJenisPotongan = createMemo(() => {
    const id = form().jenis_potongan_id;
    if (!id) return null;
    return jenisPotonganOptions().find(jp => jp.id === id);
  });

  // Memo untuk label dinamis
  const dynamicLabel = createMemo(() => {
    return selectedJenisPotongan()?.name || "Nilai";
  });

  // Helper untuk format dinamis berdasarkan jenis potongan
  const formatDynamicValue = (val) => {
    const jp = selectedJenisPotongan();
    if (jp?.name?.toLowerCase().includes('pembulatan')) {
      return formatIDR(val, 2);
    }
    return formatIDR(val);
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

    // Jika ada SJ ID yang dipilih, ambil data detailnya
    if (newSjId) {
      await fetchSuratPenerimaanDetail(newSjId);
    } else {
      setNominalInvoice(""); // Reset jika tidak ada SJ yang dipilih
    }
  };  

  onMount(async () => {
    setLoading(true);

    try {
      await Promise.all([
        (async () => {
          const res = await JenisPotongan.getAll();
          setJenisPotonganOptions(res?.data ?? res ?? []);
        })(),
        (async () => {
          const res = await PaymentMethods.getAll();
          setPaymentMethodsOptions(res?.data ?? res ?? []);
        })(),
        (async () => {
          const res = await Banks.getAll();
          setBanksOptions(res?.data ?? res ?? []);
        })(),
        (async () => {
          const allSP = await getAllJBDeliveryNotes(user?.token);
          const rawList = allSP?.suratJalans ?? allSP?.surat_jalan_list ?? allSP?.data ?? [];
          
          // Filter hanya Surat Penerimaan dengan delivered_status = 1/true
          const filteredSP = Array.isArray(rawList) 
            ? rawList.filter(sp => sp.delivered_status === 1 || sp.delivered_status === true)
            : [];
            
          setSpOptions(filteredSP);
        })(),
      ]);

    } catch (err) {
      console.error("Gagal memuat opsi dropdown:", err);
      Swal.fire("Error", "Gagal memuat data dropdown", "error");
      setLoading(false);
      return;
    }

    if (isEdit) {
      try {
        const res = await PenerimaanPiutangJualBeli.getById(params.id);
        const data = (Array.isArray(res.data) && res.data.length > 0)
          ? res.data[0]
          : res.data;

        if (!data) {
          throw new Error("Data penerimaan tidak ditemukan.");
        }

        const jpId = data.jenis_potongan_id;
        let nilaiPotonganRaw = 0;
        let nilaiPotonganFormatted = "";

        const selectedJpEdit = jenisPotonganOptions().find(jp => jp.id === jpId);

        if (selectedJpEdit?.name?.toLowerCase().includes('pembulatan')) {
          nilaiPotonganRaw = parseFloat(data.pembulatan || 0);
          nilaiPotonganFormatted = formatNumber(nilaiPotonganRaw, 2);
        } else {
          nilaiPotonganRaw = parseFloat(data.potongan || 0);
          nilaiPotonganFormatted = formatIDR(nilaiPotonganRaw);
        }

        setForm({
          ...data,
          sequence_number: data.no_penerimaan || "",
          nilai_potongan: nilaiPotonganFormatted,
          pembayaran: formatIDR(parseFloat(data.pembayaran || 0)),
          tanggal_pembayaran: data.tanggal_pembayaran || "",
          tanggal_jatuh_tempo: data.tanggal_jatuh_tempo || "",
          status: data.status || "",
          keterangan: data.keterangan || "",
        });

        // Jika ada sj_id dalam data edit, ambil detail Surat Penerimaan untuk menampilkan nominal invoice
        if (data.sj_id) {
          await fetchSuratPenerimaanDetail(data.sj_id);
        }

      } catch (err) {
        console.error("Gagal memuat data edit:", err);
        Swal.fire("Error", err.message || "Gagal memuat data", "error");
      }
    }
    setLoading(false);
  });

  const generateNomor = async () => {
    try {
      const selectedSJId = form().sj_id;
      if (!selectedSJId) {
        Swal.fire("Gagal", "Pilih Surat Penerimaan terlebih dahulu.", "warning");
        return;
      }

      const selectedSP = spOptions().find(sp => sp.id === selectedSJId);
      if (!selectedSP) {
        Swal.fire("Gagal", "Detail Surat Penerimaan tidak ditemukan.", "error");
        return;
      }

      const no_sj = selectedSP.no_sj || "";
      const parts = no_sj.split('/');
      let taxFlag = "N";

      if (parts.length > 2 && (parts[2] === "P" || parts[2] === "N")) {
        taxFlag = parts[2];
      } else {
        console.warn("Format No SJ tidak terduga, default ke 'N'.", no_sj);
      }

      let ppnValue = null;
      if(taxFlag === "P"){
        ppnValue = 11;
      } else{
        ppnValue = 0;
      }      

      const lastSeq = await getLastSequence("penerimaan_jb", "", ppnValue);
      const nextNum = String((lastSeq?.last_sequence || 0) + 1).padStart(5, "0");

      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = String(now.getFullYear()).slice(2);
      const mmyy = `${month}${year}`;

      const nomor = `PP/JB/${taxFlag}/${mmyy}-${nextNum}`;

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

    const rawForm = form();

    const parsedNilaiPotongan = parseNumber(rawForm.nilai_potongan);
    let payloadPotongan = 0;
    let payloadPembulatan = 0;

    const selectedJpSubmit = jenisPotonganOptions().find(jp => jp.id === rawForm.jenis_potongan_id);

    if (selectedJpSubmit?.name?.toLowerCase().includes('pembulatan')) {
      payloadPembulatan = parsedNilaiPotongan;
    } else {
      payloadPotongan = parsedNilaiPotongan;
    }

    const payload = {
      no_penerimaan: rawForm.sequence_number,
      sj_id: normalizeId(rawForm.sj_id),
      jenis_potongan_id: normalizeId(rawForm.jenis_potongan_id),
      potongan: payloadPotongan,
      pembulatan: payloadPembulatan,
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
        await PenerimaanPiutangJualBeli.update(params.id, payload);
      } else {
        await PenerimaanPiutangJualBeli.create(payload);
      }
      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: isEdit ? "Data berhasil diperbarui" : "Data berhasil dibuat",
        showConfirmButton: false,
        timerProgressBar: true,
        timer: 1200,
      }).then(() => navigate("/piutang-jual-beli"));
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

  return (
    <FinanceMainLayout>
      {loading() && (
        <div class="fixed inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-md bg-opacity-40 z-50 gap-10">
          <div class="w-52 h-52 border-[20px] border-white border-t-transparent rounded-full animate-spin"></div>
          <span class="animate-pulse text-[40px] text-white">Loading...</span>
        </div>
      )}
      <h1 class="text-2xl font-bold mb-6">
        {isView ? "Detail" : isEdit ? "Edit" : "Tambah"} Penerimaan Piutang Jual Beli
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
            <label class="block mb-1 font-medium">Surat Penerimaan</label>
            <SuratPenerimaanJualBeliDropdownSearch
              items={spOptions()}
              value={form().sj_id}
              onChange={handleSuratPenerimaanChange}
              disabled={isView || isEdit}
              required
            />
          </div>

          {/* Tambahkan field Nominal Invoice di sini */}
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
            <label class="block mb-1 font-medium">Jenis Potongan</label>
            <JenisPotonganDropdownSearch
              form={form}
              setForm={setForm}
              options={jenisPotonganOptions}
              valueKey="jenis_potongan_id"
              onChange={() => setForm(f => ({...f, nilai_potongan: ''}))}
              disabled={isView}
              required
            />
          </div>

          <Show when={selectedJenisPotongan()}>
            <div>
              <label class="block mb-1 font-medium">{dynamicLabel()}</label>
              <input
                type="text"
                class="w-full border p-2 rounded"
                value={form().nilai_potongan}
                onInput={(e) =>
                  setForm({ ...form(), nilai_potongan: e.target.value })
                }
                onBlur={(e) => {
                  setForm({ ...form(), nilai_potongan: formatDynamicValue(e.target.value) });
                }}
                disabled={isView}
                classList={{ "bg-gray-200" : isView}}
              />
            </div>
          </Show>

          <div>
            <label class="block mb-1 font-medium">Penerimaan</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().pembayaran}
              onInput={(e) =>
                setForm({ ...form(), pembayaran: e.target.value })
              }
              onBlur={(e) => {
                setForm({ ...form(), pembayaran: formatIDR(e.target.value) });
              }}
              disabled={isView}
              classList={{ "bg-gray-200" : isView}}
              required
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Metode Pembayaran</label>
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
            <label class="block mb-1 font-medium">
              Tanggal Penerimaan
            </label>
            <input
              type="date"
              class="w-full border p-2 rounded"
              value={form().tanggal_pembayaran}
              onInput={(e) =>
                setForm({
                  ...form(),
                  tanggal_pembayaran: e.target.value,
                })
              }
              disabled={isView}
              classList={{ "bg-gray-200" : isView}}
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
              classList={{ "bg-gray-200" : isView}}
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
              classList={{ "bg-gray-200" : isView}}
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
              classList={{ "bg-gray-200" : isView}}
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