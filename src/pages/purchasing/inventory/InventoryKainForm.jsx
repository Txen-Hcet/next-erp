import { createSignal, onMount, Show } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../../layouts/MainLayout";
import Swal from "sweetalert2";

import {
  createKainAdjustment,
  getKainAdjustment,
  updateKainAdjustment,
  getAllFabrics,
  getAllColors,
  getAllGrades,
  getUser,
} from "../../../utils/auth";
import FabricDropdownSearch from "../../../components/FabricDropdownSearch";
import ColorDropdownSearch from "../../../components/ColorDropdownSearch";
import GradeDropdownSearch from "../../../components/GradeDropdownSearch";

export default function InventoryKainForm() {
  const navigate = useNavigate();
  const user = getUser();
  const [params] = useSearchParams();

  const isEdit = !!params.id;
  const [loading, setLoading] = createSignal(false);
  const [fabrics, setFabrics] = createSignal([]);
  const [colors, setColors] = createSignal([]);
  const [grades, setGrades] = createSignal([]);

  // State form sesuai response BE
  const [form, setForm] = createSignal({
    kain_id: null,
    // Dikomen karena belum dipakai
    // lebar_kain: 0,
    // gramasi: 0,
    warna_id: null,
    // keterangan_warna: "",
    // grade_id: null,
    // description_of_goods: "",
    meter_awal: "",
    yard_awal: "",
    kilogram_awal: "",
    // gulung_awal: 0,
    // lot: 0,
    // no_bal: 0,
    keterangan_adjustment_kain: "",
  });

  /* ================= FETCH MASTER DATA ================= */
  onMount(async () => {
    setLoading(true);
    try {
      // Fetch master data untuk dropdown menggunakan fungsi yang sudah ada
      const [fabricsRes, colorsRes, gradesRes] = await Promise.all([
        getAllFabrics(user?.token),
        getAllColors(user?.token),
        getAllGrades(user?.token),
      ]);
      
      console.log("Fabrics Response:", fabricsRes);
      console.log("Colors Response:", colorsRes);
      console.log("Grades Response:", gradesRes);
      
      // MENYESUAIKAN DENGAN CARA OCPurchaseOrderForm
      // Untuk Fabrics - ambil dari fabricsRes.kain seperti di OCPurchaseOrderForm
      let fabricsData = [];
      if (fabricsRes && fabricsRes.kain && Array.isArray(fabricsRes.kain)) {
        fabricsData = fabricsRes.kain;
        console.log("Fabrics Data dari fabrics.kain:", fabricsData);
      } else if (fabricsRes && fabricsRes.data && Array.isArray(fabricsRes.data)) {
        fabricsData = fabricsRes.data;
      } else if (Array.isArray(fabricsRes)) {
        fabricsData = fabricsRes;
      }
      
      // Pastikan data fabrics memiliki format yang benar untuk FabricDropdownSearch
      // FabricDropdownSearch mengharapkan array dengan properti: id, corak, konstruksi
      const normalizedFabrics = fabricsData.map(item => {
        // Komponen FabricDropdownSearch mencari dengan f.id == item.fabric_id
        // Jadi kita perlu memastikan id ada di properti 'id'
        return {
          id: item.id || item.kain_id || item.fabric_id,
          corak: item.corak || item.nama || item.name || "",
          konstruksi: item.konstruksi || item.deskripsi || item.description || "",
          // Simpan properti asli juga untuk referensi
          ...item
        };
      });
      
      setFabrics(normalizedFabrics);
      console.log("Fabrics Data yang dikirim ke dropdown:", normalizedFabrics);
      
      // Untuk Colors - dari log sebelumnya, data ada di properti 'warna'
      let colorsData = [];
      if (colorsRes && colorsRes.warna && Array.isArray(colorsRes.warna)) {
        colorsData = colorsRes.warna;
        console.log("Colors Data dari colors.warna:", colorsData);
      } else if (Array.isArray(colorsRes)) {
        colorsData = colorsRes;
      } else if (colorsRes && colorsRes.data && Array.isArray(colorsRes.data)) {
        colorsData = colorsRes.data;
      }
      
      // Normalisasi data colors untuk ColorDropdownSearch
      // ColorDropdownSearch mengharapkan: id, kode, deskripsi
      const normalizedColors = colorsData.map(item => {
        return {
          id: item.id || item.warna_id,
          kode: item.kode || item.code || "",
          deskripsi: item.deskripsi || item.description || "",
          ...item
        };
      });
      
      setColors(normalizedColors);
      console.log("Colors Data yang dikirim ke dropdown:", normalizedColors);
      
      // Untuk Grades
      let gradesData = [];
      if (gradesRes && gradesRes.data && Array.isArray(gradesRes.data)) {
        gradesData = gradesRes.data;
      } else if (Array.isArray(gradesRes)) {
        gradesData = gradesRes;
      }
      
      // Normalisasi data grades untuk GradeDropdownSearch
      const normalizedGrades = gradesData.map(item => {
        return {
          id: item.id || item.grade_id,
          grade: item.grade || item.nama || item.name || "",
          ...item
        };
      });
      
      setGrades(normalizedGrades);
      console.log("Grades Data yang dikirim ke dropdown:", normalizedGrades);

      // Jika mode edit, fetch data adjustment
      if (isEdit) {
        const res = await getKainAdjustment(params.id, user?.token);
        console.log("Adjustment Response:", res);
        
        const data = res?.data || res || {};
        
        // Pastikan kain_id dan warna_id dalam format yang benar
        // Komponen dropdown mencari dengan f.id == item.fabric_id dan s.id == item.warna_id
        setForm({
          kain_id: data.kain_id || null,
          // Dikomen karena belum dipakai
          // lebar_kain: data.lebar_kain || 0,
          // gramasi: data.gramasi || 0,
          warna_id: data.warna_id || null,
          // keterangan_warna: data.keterangan_warna || "",
          // grade_id: data.grade_id || null,
          // description_of_goods: data.description_of_goods || "",
          meter_awal: data.meter_awal || "",
          yard_awal: data.yard_awal || "",
          kilogram_awal: data.kilogram_awal || "",
          // gulung_awal: data.gulung_awal || 0,
          // lot: data.lot || 0,
          // no_bal: data.no_bal || 0,
          keterangan_adjustment_kain: data.keterangan_adjustment_kain || "",
        });
      }
    } catch (err) {
      console.error("Error in onMount:", err);
      Swal.fire("Error", "Gagal mengambil data", "error");
      navigate("/inventory/kain");
    } finally {
      setLoading(false);
    }
  });

  /* ================= VALIDATION ================= */
  const validate = () => {
    if (!form().kain_id) {
      Swal.fire("Warning", "Pilih jenis kain terlebih dahulu", "warning");
      return false;
    }
    
    // Validasi minimal salah satu dari meter, yard, atau kilogram harus diisi
    if (!form().meter_awal && !form().yard_awal && !form().kilogram_awal) {
      Swal.fire("Warning", "Harap isi minimal satu dari: Meter, Yard, atau Kilogram", "warning");
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
      const payload = {
        kain_id: form().kain_id,
        // Dikomen karena belum dipakai
        // lebar_kain: Number(form().lebar_kain) || 0,
        // gramasi: Number(form().gramasi) || 0,
        warna_id: form().warna_id || null,
        // keterangan_warna: form().keterangan_warna,
        // grade_id: form().grade_id || null,
        // description_of_goods: form().description_of_goods,
        meter_awal: form().meter_awal ? Number(form().meter_awal) : 0,
        yard_awal: form().yard_awal ? Number(form().yard_awal) : 0,
        kilogram_awal: form().kilogram_awal ? Number(form().kilogram_awal) : 0,
        // gulung_awal: Number(form().gulung_awal) || 0,
        // lot: Number(form().lot) || 0,
        // no_bal: Number(form().no_bal) || 0,
        keterangan_adjustment_kain: form().keterangan_adjustment_kain,
      };

      console.log("Payload yang akan dikirim:", payload);

      if (isEdit) {
        await updateKainAdjustment(user?.token, {
          id: params.id,
          ...payload,
        });
      } else {
        await createKainAdjustment(user?.token, payload);
      }

      Swal.fire({
        icon: "success",
        title: isEdit ? "Berhasil update" : "Berhasil menambah",
        timer: 1000,
        showConfirmButton: false,
      });

      navigate("/inventory/kain");
    } catch (err) {
      console.error("Error in handleSubmit:", err);
      Swal.fire(
        "Error",
        err?.message || "Gagal menyimpan inventory kain",
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
        {isEdit ? "Edit" : "Tambah"} Inventory Kain
      </h1>
      
      <form
        onSubmit={handleSubmit}
        class="max-w-lg space-y-4"
        onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
      >
        {/* 1. JENIS KAIN */}
        <div>
          <label class="block mb-1 font-medium">Jenis Kain *</label>
          <FabricDropdownSearch
            fabrics={fabrics}
            item={{ fabric_id: form().kain_id }}
            onChange={(id) => {
              console.log("Kain dipilih:", id);
              setForm({ ...form(), kain_id: id });
            }}
          />
        </div>

        {/* 2. WARENA (optional) */}
        <div>
          <label class="block mb-1 font-medium">Warna (opsional)</label>
          <ColorDropdownSearch
            colors={colors}
            item={{ warna_id: form().warna_id }}
            onChange={(id) => {
              console.log("Warna dipilih:", id);
              setForm({ ...form(), warna_id: id });
            }}
          />
        </div>

        {/* GRADE - Dikomen karena belum dipakai */}
        {/* <div>
          <label class="block mb-1 font-medium">Grade (opsional)</label>
          <GradeDropdownSearch
            grades={grades}
            item={{ grade_id: form().grade_id }}
            onChange={(id) => setForm({ ...form(), grade_id: id })}
          />
        </div> */}

        {/* 3. METER (optional) */}
        <div>
          <label class="block mb-1 font-medium">Meter (opsional)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            class="border p-2 w-full rounded"
            placeholder="Masukkan meter"
            value={form().meter_awal}
            onInput={(e) => setForm({ ...form(), meter_awal: e.target.value })}
          />
        </div>

        {/* 4. YARD (optional) */}
        <div>
          <label class="block mb-1 font-medium">Yard (opsional)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            class="border p-2 w-full rounded"
            placeholder="Masukkan yard"
            value={form().yard_awal}
            onInput={(e) => setForm({ ...form(), yard_awal: e.target.value })}
          />
        </div>

        {/* 5. KILOGRAM (optional) */}
        <div>
          <label class="block mb-1 font-medium">Kilogram (opsional)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            class="border p-2 w-full rounded"
            placeholder="Masukkan kilogram"
            value={form().kilogram_awal}
            onInput={(e) => setForm({ ...form(), kilogram_awal: e.target.value })}
          />
        </div>

        {/* KETERANGAN */}
        <div>
          <label class="block mb-1 font-medium">Keterangan (opsional)</label>
          <textarea
            class="border p-2 w-full rounded"
            rows="3"
            placeholder="Keterangan adjustment kain"
            value={form().keterangan_adjustment_kain}
            onInput={(e) => setForm({ ...form(), keterangan_adjustment_kain: e.target.value })}
          />
        </div>

        {/* FIELD TAMBAHAN YANG DIBUTUHKAN - Dikomen karena belum dipakai */}
        {/* 
        <div>
          <label class="block mb-1 font-medium">Lebar Kain (opsional)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            class="border p-2 w-full rounded"
            placeholder="Lebar kain dalam cm"
            value={form().lebar_kain}
            onInput={(e) => setForm({ ...form(), lebar_kain: e.target.value })}
          />
        </div>

        <div>
          <label class="block mb-1 font-medium">Gramasi (opsional)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            class="border p-2 w-full rounded"
            placeholder="Gramasi kain"
            value={form().gramasi}
            onInput={(e) => setForm({ ...form(), gramasi: e.target.value })}
          />
        </div>
        */}

        {/* ACTION BUTTONS */}
        <div class="flex gap-3 pt-4">
          <button
            type="submit"
            class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
            disabled={loading()}
          >
            {loading() ? "Menyimpan..." : (isEdit ? "Update" : "Simpan")}
          </button>

          <button
            type="button"
            class="border px-4 py-2 rounded hover:bg-gray-50"
            onClick={() => navigate("/inventory/kain")}
            disabled={loading()}
          >
            Batal
          </button>
        </div>
      </form>
    </MainLayout>
  );
}