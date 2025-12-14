import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../../layouts/MainLayout";
import Swal from "sweetalert2";
import { Trash, Edit, Printer } from "lucide-solid";

import {
  getAllKainAdjustment,
  softDeleteKainAdjustment,
  getUser,
} from "../../../utils/auth";

export default function InventoryAksesorisList() {
  const [rows, setRows] = createSignal([]);
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  const navigate = useNavigate();
  const user = getUser();

  /* ================= FETCH ================= */
  const fetchInventory = async () => {
    try {
      const res = await getAllKainAdjustment(user?.token);
      setRows(res?.data || []);
    } catch {
      Swal.fire("Error", "Gagal mengambil data inventory kain", "error");
    }
  };

  createEffect(() => {
    if (user?.token) fetchInventory();
  });

  /* ================= PAGINATION ================= */
  const totalPages = createMemo(() =>
    Math.max(1, Math.ceil(rows().length / pageSize))
  );

  const paginatedData = createMemo(() => {
    const start = (currentPage() - 1) * pageSize;
    return rows().slice(start, start + pageSize);
  });

  /* ================= DELETE ================= */
  const handleDelete = async (row) => {
    const confirm = await Swal.fire({
      title: "Hapus Inventory Kain?",
      text: "Data yang dihapus tidak bisa dikembalikan",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Hapus",
      cancelButtonText: "Batal",
    });

    if (!confirm.isConfirmed) return;

    try {
      await softDeleteKainAdjustment(user?.token, { id: row.id });
      Swal.fire("Berhasil", "Inventory kain dihapus", "success");
      fetchInventory();
    } catch {
      Swal.fire("Gagal", "Gagal menghapus inventory kain", "error");
    }
  };

  /* ================= PRINT ================= */
  const handlePrint = () => {
    if (!rows().length) {
      Swal.fire("Kosong", "Tidak ada data", "warning");
      return;
    }

    const payload = encodeURIComponent(
      JSON.stringify({
        title: "Inventory Kain",
        printed_at: new Date(),
        data: rows(),
      })
    );

    window.open(`/print/inventory-kain#${payload}`, "_blank");
  };

  return (
    <MainLayout>
      <button
        type="button"
        class="flex gap-2 items-center mb-3 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
        onClick={() => navigate("/dashboard")}
      >
        Kembali
      </button>
      {/* HEADER */}
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Inventory Kain</h1>

        <div class="flex gap-2">
          <button
            class="flex gap-2 items-center bg-gray-200 px-3 py-2 rounded"
            onClick={handlePrint}
          >
            <Printer size={16} />
            Print
          </button>

          <button
            class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={() => navigate("/inventory/kain/form")}
          >
            + Tambah
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div class="w-full overflow-x-auto bg-white rounded shadow">
        <table class="w-full">
          <thead>
            <tr class="bg-gray-100 text-sm uppercase">
              <th class="p-3 border">No</th>
              <th class="p-3 border">Tanggal</th>
              <th class="p-3 border">Jenis</th>
              <th class="p-3 border">Qty</th>
              <th class="p-3 border text-center">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {paginatedData().map((row, idx) => (
              <tr class="border-b hover:bg-gray-50">
                <td class="p-3 border">
                  {(currentPage() - 1) * pageSize + idx + 1}
                </td>

                <td class="p-3 border">{row.tanggal}</td>

                <td class="p-3 border">
                  <span
                    class={
                      row.type === "in"
                        ? "text-green-600 font-semibold"
                        : "text-red-600 font-semibold"
                    }
                  >
                    {row.type === "in" ? "Masuk" : "Keluar"}
                  </span>
                </td>

                <td class="p-3 border">{row.qty}</td>

                <td class="p-3 border text-center space-x-2">
                  <button
                    class="text-blue-600"
                    onClick={() => navigate(`/inventory/kain/form/${row.id}`)}
                  >
                    <Edit size={18} />
                  </button>

                  <button
                    class="text-red-600"
                    onClick={() => handleDelete(row)}
                  >
                    <Trash size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div class="mt-6 flex justify-between items-center">
        <button
          class="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          disabled={currentPage() === 1}
          onClick={() => setCurrentPage(currentPage() - 1)}
        >
          Prev
        </button>

        <span>
          Page {currentPage()} of {totalPages()}
        </span>

        <button
          class="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          disabled={currentPage() === totalPages()}
          onClick={() => setCurrentPage(currentPage() + 1)}
        >
          Next
        </button>
      </div>
    </MainLayout>
  );
}
