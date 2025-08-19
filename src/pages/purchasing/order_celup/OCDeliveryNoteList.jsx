import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../../layouts/MainLayout";
import {
  getAllPackingLists,
  getUser,
  softDeletePackingList,
} from "../../../utils/auth";
import Swal from "sweetalert2";
import { Edit, Trash } from "lucide-solid";

export default function OCDeliveryNoteList() {
  const [packingOrders, setPackingOrders] = createSignal([]);
  const navigate = useNavigate();
  const tokUser = getUser();
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  const totalPages = createMemo(() => {
    return Math.max(1, Math.ceil(packingOrders().length / pageSize));
  });

  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;
    return packingOrders().slice(startIndex, startIndex + pageSize);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus packing order?",
      text: `Apakah kamu yakin ingin menghapus packing order dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const deleteCustomer = await softDeletePackingList(id, tokUser?.token);

        await Swal.fire({
          title: "Terhapus!",
          text: `Data packing order dengan ID ${id} berhasil dihapus.`,
          icon: "success",
          confirmButtonColor: "#6496df",
        });

        // Optional: update UI setelah hapus
        setPackingOrders(packingOrders().filter((s) => s.id !== id));
      } catch (error) {
        console.error(error);
        Swal.fire({
          title: "Gagal",
          text:
            error.message ||
            `Gagal menghapus data packing order dengan ID ${id}`,
          icon: "error",
          
 showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
        });
      }
    }
  };

  const handleGetAllpackingOrders = async (tok) => {
    const getDatapackingOrders = await getAllPackingLists(tok);

    const sortedData = getDatapackingOrders.sort((a, b) => a.id - b.id);
    setPackingOrders(sortedData);

    if (getDatapackingOrders.status === 200) {
      const sortedData = getDatapackingOrders.contracts.sort(
        (a, b) => a.id - b.id
      );
      setPackingOrders(sortedData);
    }
  };

  function formatTanggalIndo(tanggalString) {
    const tanggal = new Date(tanggalString);
    const bulanIndo = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];

    const tanggalNum = tanggal.getDate();
    const bulan = bulanIndo[tanggal.getMonth()];
    const tahun = tanggal.getFullYear();

    return `${tanggalNum} ${bulan} ${tahun}`;
  }

  createEffect(() => {
    if (tokUser?.token) {
      handleGetAllpackingOrders(tokUser?.token);
    }
  });

  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Daftar Surat Jalan</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/ordercelup-deliverynote/form")}
        >
          + Tambah Surat Jalan
        </button>
      </div>

      <div class="w-full overflow-x-auto">
        <table class="w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">ID</th>
              <th class="py-2 px-2">No Pembelian</th>
              <th class="py-2 px-2">No SC</th>
              <th class="py-2 px-2">Supplier</th>
              <th class="py-2 px-2">Tanggal Dibuat</th>
              <th class="py-2 px-2">Catatan</th>
              <th class="py-2 px-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData().map((sc, index) => (
              <tr class="border-b" key={sc.id}>
                <td class="py-2 px-4">
                  {(currentPage() - 1) * pageSize + (index + 1)}
                </td>
                <td class="py-2 px-4">{sc.no_so}</td>
                <td class="py-2 px-4">{sc.no_pl}</td>
                <td class="py-2 px-4">{sc.col}</td>
                <td class="py-2 px-4">{formatTanggalIndo(sc.created_at)}</td>
                <td class="py-2 px-4">{sc.catatan}</td>
                <td class="py-2 px-4 space-x-2">
                  <button
                    class="text-blue-600 hover:underline"
                    onClick={() => navigate(`/purchaseorder/form?id=${sc.id}`)}
                  >
                    <Edit size={25} />
                  </button>
                  <button
                    class="text-red-600 hover:underline"
                    onClick={() => handleDelete(sc.id)}
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
    </MainLayout>
  );
}
