import { createEffect, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import { getAllColors, getUser, softDeleteColor } from "../../utils/auth";
import Swal from "sweetalert2";

export default function ColorsList() {
  const navigate = useNavigate();
  const tokUser = getUser();

  const [colors, setColors] = createSignal([]);

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus warna?",
      text: `Apakah kamu yakin ingin menghapus warna dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const deleteCustomer = await softDeleteColor(id, tokUser?.token);

        await Swal.fire({
          title: "Terhapus!",
          text: `Data warna dengan ID ${id} berhasil dihapus.`,
          icon: "success",
          confirmButtonColor: "#6496df",
        });

        // Optional: update UI setelah hapus
        setColors(colors().filter((s) => s.id !== id));
      } catch (error) {
        console.error(error);
        Swal.fire({
          title: "Gagal",
          text: error.message || `Gagal menghapus data warna dengan ID ${id}`,
          icon: "error",
          confirmButtonColor: "#6496df",
          confirmButtonText: "OK",
        });
      }
    }
  };

  const handleGetAllColors = async (tok) => {
    const getDataColors = await getAllColors(tok);

    const sortedData = getDataColors.warna.sort((a, b) => a.id - b.id);

    if (getDataColors.status === 200) {
      setColors(sortedData);
    }
  };

  createEffect(() => {
    if (tokUser?.token) {
      handleGetAllColors(tokUser?.token);
    }
  });
  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Daftar Warna</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/colors/form")}
        >
          + Tambah Warna
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">ID</th>
              <th class="py-2 px-2">Kode Warna</th>
              <th class="py-2 px-2">Jenis</th>
              <th class="py-2 px-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {colors().map((color) => (
              <tr class="border-b" key={color.id}>
                <td class="py-2 px-4">{color.id}</td>
                <td class="py-2 px-4">{color.kode}</td>
                <td class="py-2 px-4">{color.jenis}</td>
                <td class="py-2 px-4 space-x-2">
                  <button
                    class="text-blue-600 hover:underline"
                    onClick={() => navigate(`/colors/form?id=${color.id}`)}
                  >
                    Edit
                  </button>
                  <button
                    class="text-red-600 hover:underline"
                    onClick={() => handleDelete(color.id)}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MainLayout>
  );
}
