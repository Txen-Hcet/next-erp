import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import { getAllFabrics, getUser, softDeleteFabric } from "../../utils/auth";
import Swal from "sweetalert2";

export default function FabricsList() {
  const [fabrics, setFabrics] = createSignal([]);
  const navigate = useNavigate();
  const tokUser = getUser();
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 10;

  const totalPages = createMemo(() => {
    return Math.max(1, Math.ceil(fabrics().length / pageSize));
  });

  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;
    return fabrics().slice(startIndex, startIndex + pageSize);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus kain?",
      text: `Apakah kamu yakin ingin menghapus kain dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const deleteCustomer = await softDeleteFabric(id, tokUser?.token);

        await Swal.fire({
          title: "Terhapus!",
          text: `Data kain dengan ID ${id} berhasil dihapus.`,
          icon: "success",
          confirmButtonColor: "#6496df",
        });

        // Optional: update UI setelah hapus
        setFabrics(fabrics().filter((s) => s.id !== id));
      } catch (error) {
        Swal.fire({
          title: "Gagal",
          text: error.message || `Gagal menghapus data kain dengan ID ${id}`,
          icon: "error",
          confirmButtonColor: "#6496df",
          confirmButtonText: "OK",
        });
      }
    }
  };

  const handleGetAllFabrics = async (tok) => {
    const getDataFabrics = await getAllFabrics(tok);

    if (getDataFabrics.status === 200) {
      const sortedData = getDataFabrics.kain.sort((a, b) => a.id - b.id);
      setFabrics(sortedData);
    }
  };

  createEffect(() => {
    if (tokUser?.token) {
      handleGetAllFabrics(tokUser?.token);
    }
  });
  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Daftar Kain</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/fabrics/form")}
        >
          + Tambah Kain
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">ID</th>
              <th class="py-2 px-2">Corak Kain</th>
              <th class="py-2 px-2">Konstruksi</th>
              <th class="py-2 px-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData().map((fabric) => (
              <tr class="border-b" key={fabric.id}>
                <td class="py-2 px-4">{fabric.id}</td>
                <td class="py-2 px-4">{fabric.corak}</td>
                <td class="py-2 px-4">{fabric.konstruksi}</td>
                <td class="py-2 px-4 space-x-2">
                  <button
                    class="text-blue-600 hover:underline"
                    onClick={() => navigate(`/fabrics/form?id=${fabric.id}`)}
                  >
                    Edit
                  </button>
                  <button
                    class="text-red-600 hover:underline"
                    onClick={() => handleDelete(fabric.id)}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div class="w-full mt-8 flex justify-between space-x-2">
          <button
            class="px-3 py-1 bg-gray-200 rounded min-w-[80px]"
            onClick={() => setCurrentPage(currentPage() - 1)}
            disabled={currentPage() === 1}
          >
            Prev
          </button>
          <span>
            Page {currentPage()} of {totalPages()}
          </span>
          <button
            class="px-3 py-1 bg-gray-200 rounded min-w-[80px]"
            onClick={() => setCurrentPage(currentPage() + 1)}
            disabled={currentPage() === totalPages()}
          >
            Next
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
