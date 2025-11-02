import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  getAllCustomerTypes,
  getUser,
  softDeleteCustomerType,
  hasPermission,
  hasAllPermission,
} from "../../utils/auth";
import Swal from "sweetalert2";
import { Edit, Trash } from "lucide-solid";

import SearchSortFilter from "../../components/SearchSortFilter";
import useSimpleFilter from "../../utils/useSimpleFilter";

export default function CustomerTypesList() {
  const [customerTypes, setCustomerTypes] = createSignal([]);
  const { filteredData, applyFilter } = useSimpleFilter(customerTypes, ["jenis"]);

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
      title: "Hapus jenis customer?",
      text: `Apakah kamu yakin ingin menghapus jenis customer dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const deleteSOType = await softDeleteCustomerType(id, tokUser?.token);

        await Swal.fire({
          title: "Terhapus!",
          text: `Data jenis customer dengan ID ${id} berhasil dihapus.`,
          icon: "success",
          confirmButtonColor: "#6496df",
        });

        // Optional: update UI setelah hapus
        setCustomerTypes(customerTypes().filter((s) => s.id !== id));
      } catch (error) {
        Swal.fire({
          title: "Gagal",
          text:
            error.message ||
            `Gagal menghapus data jenis customer dengan ID ${id}`,
          icon: "error",

          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
        });
      }
    }
  };

  // const handleGetAllCustomerTypes = async (tok) => {
  //   const getDataCustomerTypes = await getAllCustomerTypes(tok);

  //   if (getDataCustomerTypes.status === 200) {
  //     const sortedData = getDataCustomerTypes.data.sort((a, b) => a.id - b.id);

  //     setCustomerTypes(sortedData);
  //   }
  // };

  const handleGetAllCustomerTypes = async () => {
    const result = await getAllCustomerTypes(tokUser?.token);

    if (result.status === 200) {
      const sortedData = result.data.sort((a, b) => a.id - b.id);
      setCustomerTypes(sortedData);
      applyFilter({});
    } else if (result.status === 403) {
      await Swal.fire({
        title: "Tidak Ada Akses",
        text: "Anda tidak memiliki izin untuk melihat Tipe Customer",
        icon: "warning",
        confirmButtonColor: "#6496df",
      });
      navigate("/dashboard");
    } else {
      Swal.fire({
        title: "Gagal",
        text: result.message || "Gagal mengambil seluruh data Tipe Customer",
        icon: "error",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
    }
  };

  createEffect(() => {
    if (tokUser?.token) {
      handleGetAllCustomerTypes(tokUser?.token);
    }
  });
  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Daftar Jenis Customer</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/customer-type/form")}
        >
          + Tambah Jenis Customer
        </button>
      </div>

      <SearchSortFilter
        sortOptions={[{ label: "Jenis", value: "jenis" }]}
        filterOptions={
          [
            // { label: "Tipe (PT)", value: "PT" },
            // { label: "Tipe (CV)", value: "CV" },
          ]
        }
        onChange={applyFilter}
      />
      <div class="overflow-x-auto">
        <table class="min-w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">ID</th>
              <th class="py-2 px-2">Jenis</th>
              {hasAllPermission([
                "edit_customer_types",
                "delete_customer_types",
              ]) && <th class="py-2 px-2">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedData().map((custType, index) => (
              <tr class="border-b" key={custType.id}>
                <td class="py-2 px-4">
                  {(currentPage() - 1) * pageSize + (index + 1)}
                </td>
                <td class="py-2 px-4">{custType.jenis}</td>
                {hasAllPermission([
                  "edit_customer_types",
                  "delete_customer_types",
                ]) && (
                  <td class="py-2 px-4 space-x-2">
                    <button
                      class="text-blue-600 hover:underline"
                      onClick={() =>
                        navigate(`/customer-type/form?id=${custType.id}`)
                      }
                    >
                      <Edit size={25} />
                    </button>
                    <button
                      class="text-red-600 hover:underline"
                      onClick={() => handleDelete(custType.id)}
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
