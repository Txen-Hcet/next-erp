import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { PaymentMethods, User } from "../../../utils/financeAuth";
import Swal from "sweetalert2";
import { Edit, Trash } from "lucide-solid";
import FinanceMainLayout from "../../../layouts/FinanceMainLayout";

import SearchSortFilter from "../../../components/SearchSortFilter";
import useSimpleFilter from "../../../utils/useSimpleFilter";

export default function PaymentMethodsList() {
  const [paymentMethods, setPaymentMethods] = createSignal([]);
  const { filteredData, applyFilter } = useSimpleFilter(paymentMethods, [
    "name",
  ]);

  const navigate = useNavigate();
  const tokUser = User.getUser();
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  const totalPages = createMemo(() =>
    Math.max(1, Math.ceil(filteredData().length / pageSize))
  );

  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;
    return filteredData().slice(startIndex, startIndex + pageSize);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus jenis pembayaran?",
      text: `Apakah kamu yakin ingin menghapus jenis pembayaran dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        await PaymentMethods.delete(id);

        await Swal.fire({
          title: "Terhapus!",
          text: `Data jenis pembayaran dengan ID ${id} berhasil dihapus.`,
          icon: "success",
          confirmButtonColor: "#6496df",
        });

        setPaymentMethods(paymentMethods().filter((s) => s.id !== id));
      } catch (error) {
        console.error(error);
        Swal.fire({
          title: "Gagal",
          text:
            error.message ||
            `Gagal menghapus data jenis pembayaran dengan ID ${id}`,
          icon: "error",
          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
        });
      }
    }
  };

  const handleGetAllPaymentMethods = async () => {
    const getDataPaymentMethods = await PaymentMethods.getAll();

    if (getDataPaymentMethods.status === 200) {
      const sortedData = getDataPaymentMethods.data.sort((a, b) => a.id - b.id);
      setPaymentMethods(sortedData);
      applyFilter({});
    }
  };

  createEffect(() => {
    if (tokUser?.token) {
      handleGetAllPaymentMethods();
    }
  });

  return (
    <FinanceMainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Daftar Jenis Pembayaran</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/payment-methods/form")}
        >
          + Jenis Pembayaran
        </button>
      </div>

      <SearchSortFilter
        sortOptions={[{ label: "Name", value: "name" }]}
        filterOptions={
          [
            // { label: "Grade A", value: "A" },
            // { label: "Grade B", value: "B" },
          ]
        }
        onChange={applyFilter}
      />
      <div class="overflow-x-auto">
        <table class="min-w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">No</th>
              <th class="py-2 px-2">Nama Jenis Pembayaran</th>
              <th class="py-2 px-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData().map((paymentmethods, index) => (
              <tr class="border-b" key={paymentmethods.id}>
                <td class="py-2 px-4">
                  {(currentPage() - 1) * pageSize + (index + 1)}
                </td>
                <td class="py-2 px-4">{paymentmethods.name}</td>
                <td class="py-2 px-4 space-x-2">
                  <button
                    class="text-blue-600 hover:underline"
                    onClick={() =>
                      navigate(`/payment-methods/form?id=${paymentmethods.id}`)
                    }
                  >
                    <Edit size={25} />
                  </button>
                  <button
                    class="text-red-600 hover:underline"
                    onClick={() => handleDelete(paymentmethods.id)}
                  >
                    <Trash size={25} />
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
    </FinanceMainLayout>
  );
}
