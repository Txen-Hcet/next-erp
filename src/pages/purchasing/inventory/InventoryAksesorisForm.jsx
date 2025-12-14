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
    tanggal: new Date().toISOString().split("T")[0],
    type: "in", // in | out
    qty: "",
    keterangan: "",
  });

  /* ================= FETCH (EDIT) ================= */
  onMount(async () => {
    if (!isEdit) return;

    setLoading(true);
    try {
      const res = await getAksesorisAdjustment(params.id, user?.token);
      const data = res?.data || res;

      setForm({
        tanggal: data.tanggal,
        type: data.type,
        qty: data.qty,
        keterangan: data.keterangan || "",
      });
    } catch (err) {
      Swal.fire("Error", "Gagal mengambil data inventory aksesoris", "error");
      navigate("/inventory/aksesoris");
    } finally {
      setLoading(false);
    }
  });

  /* ================= VALIDATION ================= */
  const validate = () => {
    if (!form().qty || form().qty <= 0) {
      Swal.fire("Warning", "Qty harus lebih dari 0", "warning");
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
        tanggal: form().tanggal,
        type: form().type,
        qty: Number(form().qty),
        keterangan: form().keterangan,
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
        {/* TANGGAL */}
        <div>
          <label class="block mb-1 font-medium">Tanggal</label>
          <input
            type="date"
            class="w-full border p-2 rounded bg-gray-100"
            value={form().tanggal}
            readOnly
          />
        </div>

        {/* TYPE */}
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

        {/* QTY */}
        <div>
          <label class="block mb-1 font-medium">Qty</label>
          <input
            type="number"
            min="1"
            class="border p-2 w-full rounded"
            placeholder="Masukkan qty"
            value={form().qty}
            onInput={(e) => setForm({ ...form(), qty: e.target.value })}
          />
        </div>

        {/* KETERANGAN */}
        <div>
          <label class="block mb-1 font-medium">Keterangan (opsional)</label>
          <textarea
            class="border p-2 w-full rounded"
            value={form().keterangan}
            onInput={(e) => setForm({ ...form(), keterangan: e.target.value })}
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
            class="border px-4 py-2 rounded"
            onClick={() => navigate("/inventory/aksesoris")}
          >
            Batal
          </button>
        </div>
      </form>
    </MainLayout>
  );
}
