import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { PurchaseAksesorisEkspedisi, User } from "../../../utils/financeAuth";
import Swal from "sweetalert2";
import { Edit, Trash } from "lucide-solid";
import FinanceMainLayout from "../../../layouts/FinanceMainLayout";

export default function HutangPurchaseKainJadiList() {
  const [hutangPurchaseKainJadi, setHutangPurchaseKainJadi] = createSignal([]);
  const navigate = useNavigate();
  const tokUser = User.getUser();
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  const totalPages = createMemo(() =>
    Math.max(1, Math.ceil(hutangPurchaseKainJadi().length / pageSize))
  );

  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;
    return hutangPurchaseKainJadi().slice(startIndex, startIndex + pageSize);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus data pembayaran hutang pembelian kain jadi?",
      text: `Apakah kamu yakin ingin menghapus data pembayaran hutang pembelian kain jadi dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        await PurchaseAksesorisEkspedisi.delete(id);

        await Swal.fire({
          title: "Terhapus!",
          text: `Data pembayaran hutang pembelian kain jadi dengan ID ${id} berhasil dihapus.`,
          icon: "success",
          confirmButtonColor: "#6496df",
        });

        setHutangPurchaseKainJadi(
          hutangPurchaseKainJadi().filter((s) => s.id !== id)
        );
      } catch (error) {
        console.error(error);
        Swal.fire({
          title: "Gagal",
          text:
            error.message ||
            `Gagal menghapus data pembayaran hutang pembelian kain jadi dengan ID ${id}`,
          icon: "error",
          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
        });
      }
    }
  };

  const handleGetAllHutangPurchaseKainJadi = async () => {
    const getDataHutangPurchaseKainJadi =
      await PurchaseAksesorisEkspedisi.getAll();

    if (getDataHutangPurchaseKainJadi.status === 200) {
      const sortedData = getDataHutangPurchaseKainJadi.data.sort(
        (a, b) => a.id - b.id
      );
      setHutangPurchaseKainJadi(sortedData);
    }
  };

  createEffect(() => {
    if (tokUser?.token) {
      handleGetAllHutangPurchaseKainJadi();
    }
  });

  return (
    <FinanceMainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">
          Daftar Pembayaran Hutang Pembelian Kain Jadi
        </h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/hutang-purchase-kain-jadi/form")}
        >
          + Pembayaran Hutang Pembelian Kain Jadi
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">No</th>
              <th class="py-2 px-2">
                Nama Pembayaran Hutang Pembelian Kain Jadi
              </th>
              <th class="py-2 px-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData().map((expeditionAccessories, index) => (
              <tr class="border-b" key={expeditionAccessories.id}>
                <td class="py-2 px-4">
                  {(currentPage() - 1) * pageSize + (index + 1)}
                </td>
                <td class="py-2 px-4">{expeditionAccessories.name}</td>
                <td class="py-2 px-4 space-x-2">
                  <button
                    class="text-blue-600 hover:underline"
                    onClick={() =>
                      navigate(
                        `/hutang-purchase-kain-jadi/form?id=${expeditionAccessories.id}`
                      )
                    }
                  >
                    <Edit size={25} />
                  </button>
                  <button
                    class="text-red-600 hover:underline"
                    onClick={() => handleDelete(expeditionAccessories.id)}
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
