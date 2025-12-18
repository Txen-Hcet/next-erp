import { createSignal, createEffect, onMount, Show } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../../layouts/MainLayout";
import Swal from "sweetalert2";

import {
  createAksesorisAdjustment,
  getAksesorisAdjustment,
  updateAksesorisAdjustment,
  getUser,
} from "../../../utils/auth";

export default function InventoryAksesorisForm() {
  const navigate = useNavigate();
  const user = getUser();
  const [params] = useSearchParams();

  const isEdit = !!params.id;

  const [loading, setLoading] = createSignal(false);

  const [form, setForm] = createSignal({
    // === FIELD YANG DIMINTA BACKEND ===
    nama_aksesoris: "",
    deskripsi_aksesoris: "",
    kuantitas_awal: "",
    keterangan_adjustment_aksesoris: "",
    
    // === FIELD LAMA (KOMENTAR DULU JIKA TIDAK DIPAKAI, TAPI DISIMPAN) ===
    // tanggal: new Date().toISOString().split("T")[0],
    // type: "in", // in | out
    // qty: "", // Diganti kuantitas_awal
    // keterangan: "", // Diganti keterangan_adjustment_aksesoris
  });

  const [displayQty, setDisplayQty] = createSignal("");

  /* ================= HELPERS FORMATTING ================= */

  // Mengubah Angka Murni -> String Tampilan (1234.56 -> "1.234,56")
  const formatInputDisplay = (val) => {
    if (val === "" || val === null || val === undefined) return "";
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 2, // UBAH KE 2 AGAR SELALU ADA DESIMAL
      maximumFractionDigits: 2, 
    }).format(val);
  };

  // Mengubah String Input -> Angka Murni ("1.234,56" -> 1234.56)
  const parseInputToNumber = (valStr) => {
    if (!valStr) return "";
    // Hapus semua titik (pemisah ribuan)
    let cleaned = valStr.replace(/\./g, "");
    // Ganti koma (pemisah desimal) dengan titik agar bisa diparse float
    cleaned = cleaned.replace(/,/g, ".");
    return cleaned;
  };

  /* ================= HANDLERS INPUT QTY ================= */

  const handleQtyInput = (e) => {
    let val = e.target.value;
    
    // Simpan apa yang diketik user ke state display
    setDisplayQty(val);

    // Parse ke angka murni untuk state form
    const numericString = parseInputToNumber(val);
    
    setForm((prev) => ({ ...prev, kuantitas_awal: numericString }));
  };

  const handleQtyBlur = () => {
    // Saat user pindah fokus, rapikan format tampilannya
    const rawVal = form().kuantitas_awal;
    if (rawVal !== "" && !isNaN(parseFloat(rawVal))) {
       const formatted = formatInputDisplay(rawVal);
       setDisplayQty(formatted);
    }
  };

  // Helper untuk parsing angka
  const parseNumber = (val) => {
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  /* ================= FETCH (EDIT) ================= */
  onMount(async () => {
    if (!isEdit) return;

    setLoading(true);
    try {
      const res = await getAksesorisAdjustment(params.id, user?.token);
      const data = res?.data || res;

      setForm((prev) => ({
        ...prev,
        // Mapping response backend ke form state
        nama_aksesoris: data.nama_aksesoris || "",
        deskripsi_aksesoris: data.deskripsi_aksesoris || "",
        kuantitas_awal: data.kuantitas_awal || "",
        keterangan_adjustment_aksesoris: data.keterangan_adjustment_aksesoris || "",
        
        // Field lama mapping (jika masih ada di response)
        // tanggal: data.tanggal,
        // type: data.type,
      }));

      if (data.kuantitas_awal !== undefined && data.kuantitas_awal !== null) {
          setDisplayQty(formatInputDisplay(data.kuantitas_awal));
      }
    } catch (err) {
      Swal.fire("Error", "Gagal mengambil data inventory aksesoris", "error");
      navigate("/inventory/aksesoris");
    } finally {
      setLoading(false);
    }
  });

  /* ================= VALIDATION ================= */
  const validate = () => {
    if (!form().nama_aksesoris) {
      Swal.fire("Warning", "Nama Aksesoris wajib diisi", "warning");
      return false;
    }
    if (form().kuantitas_awal === "" || Number(form().kuantitas_awal) < 0) {
      Swal.fire("Warning", "Kuantitas Awal tidak boleh negatif", "warning");
      return false;
    }
    return true;
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      // Sesuaikan Payload dengan Backend
      const payload = {
        nama_aksesoris: form().nama_aksesoris,
        deskripsi_aksesoris: form().deskripsi_aksesoris,
        kuantitas_awal: parseNumber(form().kuantitas_awal),
        keterangan_adjustment_aksesoris: form().keterangan_adjustment_aksesoris,
        
        // Field lama (tidak dikirim karena tidak ada di request body contoh)
        // tanggal: form().tanggal,
        // type: form().type,
      };

      if (isEdit) {
        await updateAksesorisAdjustment(user?.token, {
          id: params.id,
          ...payload,
        });
      } else {
        await createAksesorisAdjustment(user?.token, payload);
      }

      Swal.fire({
        icon: "success",
        title: isEdit ? "Berhasil update" : "Berhasil menambah",
        timer: 1000,
        showConfirmButton: false,
      });

      navigate("/inventory/aksesoris");
    } catch (err) {
      Swal.fire(
        "Error",
        err?.message || "Gagal menyimpan inventory aksesoris",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      {/* LOADING */}
      <Show when={loading()}>
        <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div class="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Show>
      <h1 class="text-2xl font-bold mb-6">
        {isEdit ? "Edit" : "Tambah"} Inventory Aksesoris
      </h1>
      <form
        onSubmit={handleSubmit}
        class="max-w-lg space-y-4"
        onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
      >
        
        {/* === FIELD LAMA DIKOMEN (Disimpan untuk referensi) === */}
        {/* <div>
          <label class="block mb-1 font-medium">Tanggal</label>
          <input
            type="date"
            class="w-full border p-2 rounded bg-gray-100"
            value={form().tanggal}
            readOnly
          />
        </div>

        <div>
          <label class="block mb-1 font-medium">Jenis</label>
          <select
            class="border p-2 w-full rounded"
            value={form().type}
            onChange={(e) => setForm({ ...form(), type: e.target.value })}
          >
            <option value="in">Stok Masuk</option>
            <option value="out">Stok Keluar</option>
          </select>
        </div>
        */}

        {/* NAMA AKSESORIS */}
        <div>
          <label class="block mb-1 font-medium">Nama Aksesoris <span class="text-red-500">*</span></label>
          <input
            type="text"
            class="border p-2 w-full rounded"
            placeholder="Masukkan nama aksesoris..."
            value={form().nama_aksesoris}
            onInput={(e) => setForm({ ...form(), nama_aksesoris: e.target.value })}
            required
          />
        </div>

        {/* DESKRIPSI AKSESORIS */}
        <div>
          <label class="block mb-1 font-medium">Deskripsi Aksesoris</label>
          <textarea
            class="border p-2 w-full rounded"
            placeholder="Masukkan deskripsi aksesoris..."
            rows="2"
            value={form().deskripsi_aksesoris}
            onInput={(e) => setForm({ ...form(), deskripsi_aksesoris: e.target.value })}
          />
        </div>

        {/* KUANTITAS AWAL */}
        <div>
          <label class="block mb-1 font-medium">Kuantitas Awal</label>
          <input
            type="text" 
            class="border p-2 w-full rounded"
            placeholder="0,00"
            value={displayQty()} 
            onInput={handleQtyInput} 
            onBlur={handleQtyBlur}   
            required
          />
          <p class="text-xs text-gray-500 mt-1">Gunakan koma (,) untuk desimal. Contoh: 1.000,50</p>
        </div>

        {/* KETERANGAN ADJUSTMENT */}
        <div>
          <label class="block mb-1 font-medium">Keterangan Penyesuaian</label>
          <textarea
            class="border p-2 w-full rounded"
            placeholder="Masukkan alasan penyesuaian..."
            rows="3"
            value={form().keterangan_adjustment_aksesoris}
            onInput={(e) => setForm({ ...form(), keterangan_adjustment_aksesoris: e.target.value })}
          />
        </div>

        {/* ACTION */}
        <div class="flex gap-3 pt-4">
          <button
            type="submit"
            class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {isEdit ? "Update" : "Simpan"}
          </button>

          <button
            type="button"
            class="border px-4 py-2 rounded hover:bg-gray-100"
            onClick={() => navigate("/inventory/aksesoris")}
          >
            Batal
          </button>
        </div>
      </form>
    </MainLayout>
  );
}