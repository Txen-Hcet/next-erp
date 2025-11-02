import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  getAllFabrics,
  getUser,
  softDeleteFabric,
  hasAllPermission,
} from "../../utils/auth";
import Swal from "sweetalert2";
import { Edit, Trash } from "lucide-solid";

import SearchSortFilter from "../../components/SearchSortFilter";
import useSimpleFilter from "../../utils/useSimpleFilter";

export default function FabricsList() {
  const [fabrics, setFabrics] = createSignal([]);
  const { filteredData, applyFilter } = useSimpleFilter(fabrics, [
    "corak",
    "konstruksi",
  ]);

  const navigate = useNavigate();
  const tokUser = getUser();
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  const totalPages = createMemo(() => {
    return Math.max(1, Math.ceil(filteredData().length / pageSize));
  });

  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;
    return filteredData().slice(startIndex, startIndex + pageSize);
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

          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
        });
      }
    }
  };

  const handleGetAllFabrics = async (tok) => {
    const getDataFabrics = await getAllFabrics(tok);

    if (getDataFabrics.status === 200) {
      const sortedData = getDataFabrics.kain.sort((a, b) => a.id - b.id);
      setFabrics(sortedData);
      applyFilter({});
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
      <SearchSortFilter
        sortOptions={[
          { label: "Corak", value: "corak" },
          { label: "Konstruksi", value: "konstruksi" },
        ]}
        filterOptions={
          [
            // { label: "Kode", value: "kode" },
            // { label: "Deskripsi", value: "deskripsi" },
          ]
        }
        onChange={applyFilter}
      />
      <div class="overflow-x-auto">
        <table class="min-w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">ID</th>
              <th class="py-2 px-2">Corak Kain</th>
              <th class="py-2 px-2">Konstruksi</th>
              {hasAllPermission(["edit_kain", "delete_kain"]) && (
                <th class="py-2 px-2">Aksi</th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedData().map((fabric, index) => (
              <tr class="border-b" key={fabric.id}>
                <td class="py-2 px-4">
                  {(currentPage() - 1) * pageSize + (index + 1)}
                </td>
                <td class="py-2 px-4">{fabric.corak}</td>
                <td class="py-2 px-4">{fabric.konstruksi}</td>
                {hasAllPermission(["edit_kain", "delete_kain"]) && (
                  <td class="py-2 px-4 space-x-2">
                    <button
                      class="text-blue-600 hover:underline"
                      onClick={() => navigate(`/fabrics/form?id=${fabric.id}`)}
                    >
                      <Edit size={25} />
                    </button>
                    <button
                      class="text-red-600 hover:underline"
                      onClick={() => handleDelete(fabric.id)}
                    >
                      <Trash size={25} />
                    </button>
                  </td>
                )}
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
