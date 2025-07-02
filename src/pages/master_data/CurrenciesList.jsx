import { createEffect, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  getAllCurrenciess,
  getUser,
  softDeleteCurrencies,
} from "../../utils/auth";
import Swal from "sweetalert2";

export default function CurrenciesList() {
  const navigate = useNavigate();
  const tokUser = getUser();
  const [currencies, setCurrencies] = createSignal([]);
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 15;
  const totalPages = Math.ceil(currencies().length / pageSize);

  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;

    return currencies().slice(startIndex, startIndex + pageSize);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus currency?",
      text: `Apakah kamu yakin ingin menghapus currency dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const deleteSOType = await softDeleteCurrencies(id, tokUser?.token);

        await Swal.fire({
          title: "Terhapus!",
          text: `Data currency dengan ID ${id} berhasil dihapus.`,
          icon: "success",
          confirmButtonColor: "#6496df",
        });

        // Optional: update UI setelah hapus
        setCurrencies(currencies().filter((s) => s.id !== id));
      } catch (error) {
        Swal.fire({
          title: "Gagal",
          text:
            error.message || `Gagal menghapus data currency dengan ID ${id}`,
          icon: "error",
          confirmButtonColor: "#6496df",
          confirmButtonText: "OK",
        });
      }
    }
  };

  const handleGetAllCurrencies = async (tok) => {
    const getDataCurrencies = await getAllCurrenciess(tok);

    const sortedData = getDataCurrencies.sort((a, b) => a.id - b.id);

    setCurrencies(sortedData);
    if (getDataCurrencies.status === 200) {
      setCurrencies(sortedData);
    }
  };

  createEffect(() => {
    if (tokUser?.token) {
      handleGetAllCurrencies(tokUser?.token);
    }
  });
  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Daftar currency</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/currencies/form")}
        >
          + Tambah currency
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">ID</th>
              <th class="py-2 px-2">Nama</th>
              <th class="py-2 px-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData().map((curr) => (
              <tr class="border-b" key={curr.id}>
                <td class="py-2 px-4">{curr.id}</td>
                <td class="py-2 px-4">{curr.name}</td>
                <td class="py-2 px-4 space-x-2">
                  <button
                    class="text-blue-600 hover:underline"
                    onClick={() => navigate(`/currencies/form?id=${curr.id}`)}
                  >
                    Edit
                  </button>
                  <button
                    class="text-red-600 hover:underline"
                    onClick={() => handleDelete(curr.id)}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div class="w-full mt-4 flex justify-between space-x-2">
          <button
            class="px-3 py-1 bg-gray-200 rounded"
            onClick={() => setCurrentPage(currentPage() - 1)}
            disabled={currentPage() === 1}
          >
            Prev
          </button>
          <span>
            Page {currentPage()} of {totalPages}
          </span>
          <button
            class="px-3 py-1 bg-gray-200 rounded"
            onClick={() => setCurrentPage(currentPage() + 1)}
            disabled={currentPage() === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
