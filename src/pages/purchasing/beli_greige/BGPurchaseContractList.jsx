import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../../layouts/MainLayout";
import {
  getAllBeliGreiges,
  getAllPackingLists,
  getUser,
  softDeleteBeliGreige,
  softDeletePackingList,
} from "../../../utils/auth";
import Swal from "sweetalert2";
import { Edit, Trash } from "lucide-solid";

export default function BGPurchaseContractList() {
  const [beliGreiges, setBeliGreiges] = createSignal([]);
  const navigate = useNavigate();
  const tokUser = getUser();
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  const totalPages = createMemo(() => {
    return Math.max(1, Math.ceil(beliGreiges().length / pageSize));
  });

  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;
    return beliGreiges().slice(startIndex, startIndex + pageSize);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus beli greige?",
      text: `Apakah kamu yakin ingin menghapus beli greige dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const deleteCustomer = await softDeleteBeliGreige(id, tokUser?.token);

        await Swal.fire({
          title: "Terhapus!",
          text: `Data beli greige dengan ID ${id} berhasil dihapus.`,
          icon: "success",
          confirmButtonColor: "#6496df",
        });

        // Optional: update UI setelah hapus
        setBeliGreiges(beliGreiges().filter((s) => s.id !== id));
      } catch (error) {
        console.error(error);
        Swal.fire({
          title: "Gagal",
          text:
            error.message ||
            `Gagal menghapus data beli greige dengan ID ${id}`,
          icon: "error",
          confirmButtonColor: "#6496df",
          confirmButtonText: "OK",
        });
      }
    }
  };

  const handleGetAllBeliGreiges = async (tok) => {
    const getDataBeliGreiges = await getAllBeliGreiges(tok);

    if (getDataBeliGreiges.status === 200) {
      const sortedData = getDataBeliGreiges.contracts.sort(
        (a, b) => a.id - b.id
      );
      setBeliGreiges(sortedData);
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
      handleGetAllBeliGreiges(tokUser?.token);
    }
  });

  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Daftar Purchase Contract</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/beligreige-purchasecontract/form")}
        >
          + Tambah Purchase Contract
        </button>
      </div>

      <div class="w-full overflow-x-auto">
        <table class="w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">ID</th>
              <th class="py-2 px-2">No Pembelian</th>
              <th class="py-2 px-2">Supplier</th>
              <th class="py-2 px-2">Total</th>
              <th class="py-2 px-2">Satuan Unit</th>
              <th class="py-2 px-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData().map((sc, index) => (
              <tr class="border-b" key={sc.id}>
                <td class="py-2 px-4">
                  {(currentPage() - 1) * pageSize + (index + 1)}
                </td>
                <td class="py-2 px-4">{sc.no_pc}</td>
                <td class="py-2 px-4">{sc.supplier_name}</td>
                <td class="py-2 px-4"></td>
                <td class="py-2 px-4">{sc.satuan_unit_name}</td>
                {/* <td class="py-2 px-4">{formatTanggalIndo(sc.created_at)}</td> */}
                <td class="py-2 px-4 space-x-2">
                  <button
                    class="text-blue-600 hover:underline"
                    onClick={() =>
                      navigate(`/beligreige-purchasecontract/form?id=${sc.id}`)
                    }
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
