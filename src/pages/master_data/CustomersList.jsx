import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  getAllCustomers,
  getUser,
  softDeleteCustomer,
  hasAllPermission,
} from "../../utils/auth";
import Swal from "sweetalert2";
import { Edit, Trash } from "lucide-solid";

import SearchSortFilter from "../../components/SearchSortFilter";
import useSimpleFilter from "../../utils/useSimpleFilter";

export default function CustomerList() {
  const [customers, setCustomers] = createSignal([]);
  const { filteredData, applyFilter } = useSimpleFilter(customers, [
    "kode",
    "nama",
    "customer_type_name",
    "termin",
    "alamat",
    "limit_kredit",
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
      title: "Hapus customer?",
      text: `Apakah kamu yakin ingin menghapus customer dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const deleteCustomer = await softDeleteCustomer(id, tokUser?.token);

        await Swal.fire({
          title: "Terhapus!",
          text: `Data customer dengan ID ${id} berhasil dihapus.`,
          icon: "success",
          confirmButtonColor: "#6496df",
        });

        // Optional: update UI setelah hapus
        setCustomers(customers().filter((s) => s.id !== id));
      } catch (error) {
        console.error(error);
        Swal.fire({
          title: "Gagal",
          text:
            error.message || `Gagal menghapus data customer dengan ID ${id}`,
          icon: "error",

          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
        });
      }
    }
  };

  const handleGetAllCustomers = async (tok) => {
    const getDataCustomers = await getAllCustomers(tok);

    if (getDataCustomers.status === 200) {
      const sortedData = getDataCustomers.customers.sort((a, b) => a.id - b.id);
      setCustomers(sortedData);
      applyFilter({});
    }
  };

  function formatPhoneNumber(phone) {
    if (!phone) return "";

    // Ambil kode area (3 digit pertama)
    const area = phone.slice(0, 3);
    const number = phone.slice(3);

    return `(${area}) ${number}`;
  }

  createEffect(() => {
    if (tokUser?.token) {
      handleGetAllCustomers(tokUser?.token);
    }
  });
  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Daftar Customer</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/customers/form")}
        >
          + Tambah Customer
        </button>
      </div>

      <SearchSortFilter
        sortOptions={[
          { label: "Kode", value: "kode" },
          { label: "Nama", value: "nama" },
          { label: "Customer Type Name", value: "customer_type_name" },
          { label: "Termin", value: "termin" },
          { label: "Alamat", value: "alamat" },
          { label: "Limit Kredit", value: "limit_kredit" },
        ]}
        filterOptions={[
          { label: "Tipe Customer Domestik", value: "Domestik" },
          { label: "Tipe Customer Ekspor", value: "Ekspor" },
        ]}
        onChange={applyFilter}
      />
      <div class="w-full overflow-x-auto">
        <table class="w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">ID</th>
              <th class="py-2 px-2">Kode</th>
              <th class="py-2 px-2">Nama</th>
              <th class="py-2 px-2">Tipe</th>
              <th class="py-2 px-4">Alamat</th>
              <th class="py-2 px-4">Termin</th>
              <th class="py-2 px-4">Limit Kredit</th>
              {hasAllPermission(["edit_customers", "delete_customers"]) && (
                <th class="py-2 px-4">Aksi</th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedData().map((cust, index) => (
              <tr class="border-b" key={cust.id}>
                <td class="py-2 px-4">
                  {(currentPage() - 1) * pageSize + (index + 1)}
                </td>
                <td class="py-2 px-4">{cust.kode}</td>
                <td class="py-2 px-4">{cust.nama}</td>
                <td class="py-2 px-4">
                  {cust.customer_type_id === 1 ? "Domestik" : "Ekspor"}
                </td>
                <td class="py-2 px-4">{cust.alamat}</td>
                <td class="py-2 px-4">{cust.termin}</td>
                <td class="py-2 px-4">
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    minimumFractionDigits: 0,
                  }).format(cust.limit_kredit || 0)}
                </td>
                {hasAllPermission(["edit_customers", "delete_customers"]) && (
                  <td class="py-2 px-4 space-x-2">
                    <button
                      class="text-blue-600 hover:underline"
                      onClick={() => navigate(`/customers/form?id=${cust.id}`)}
                    >
                      <Edit size={25} />
                    </button>
                    <button
                      class="text-red-600 hover:underline"
                      onClick={() => handleDelete(cust.id)}
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
