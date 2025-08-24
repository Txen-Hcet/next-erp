import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../../layouts/MainLayout";
import {
  getAllKainJadis,
  getUser,
  softDeleteKainJadi,
} from "../../../utils/auth";
import Swal from "sweetalert2";
import { Edit, Eye, Trash } from "lucide-solid";

export default function KJPurchaseContractList() {
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
      title: "Hapus kain jadi?",
      text: `Apakah kamu yakin ingin menghapus kain jadi dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const deleteCustomer = await softDeleteKainJadi(id, tokUser?.token);

        await Swal.fire({
          title: "Terhapus!",
          text: `Data kain jadi dengan ID ${id} berhasil dihapus.`,
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
            `Gagal menghapus data kain jadi dengan ID ${id}`,
          icon: "error",
          
 showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
        });
      }
    }
  };

  const handleGetAllBeliGreiges = async (tok) => {
    const getDataBeliGreiges = await getAllKainJadis(tok);

    if (getDataBeliGreiges.status === 200) {
      const sortedData = getDataBeliGreiges.contracts.sort(
        (a, b) => a.id - b.id
      );
      setBeliGreiges(sortedData);
    }
  };

   const qtyCounterReal = (bg, satuanUnit) => {
    let total = 0;
    let terkirim = 0;

    switch (satuanUnit) {
      case 1: // Meter
        total = parseFloat(bg.summary?.total_meter || 0);
        terkirim = parseFloat(bg.summary?.total_meter_dalam_surat_jalan || 0);
        break;
      case 2: // Yard
        total = parseFloat(bg.summary?.total_yard || 0);
        terkirim = parseFloat(bg.summary?.total_yard_dalam_surat_jalan || 0);
        break;
      case 3: // Kilogram
        total = parseFloat(bg.summary?.total_kilogram || 0);
        terkirim = parseFloat(
          bg.summary?.total_kilogram_dalam_surat_jalan || 0
        );
        break;
      default:
        return "-";
    }

    const sisa = total - terkirim;

    // Kalau udah habis
    if (sisa <= 0) {
      return "SELESAI";
    }

    return `${sisa.toLocaleString("id-ID")} / ${total.toLocaleString("id-ID")}`;
  };

  const qtyCounterbySystem = (kj, satuanUnit) => {
    let total = 0;
    let terkirim = 0;

    switch (satuanUnit) {
      case 1: // Meter
        total = parseFloat(kj.summary?.total_meter || 0);
        terkirim = parseFloat(kj.summary?.total_meter_dalam_proses || 0);
        break;
      case 2: // Yard
        total = parseFloat(kj.summary?.total_yard || 0);
        terkirim = parseFloat(kj.summary?.total_yard_dalam_proses || 0);
        break;
      case 3: // Kilogram
        total = parseFloat(kj.summary?.total_kilogram || 0);
        terkirim = parseFloat(kj.summary?.total_kilogram_dalam_proses || 0);
        break;
      default:
        return "-";
    }

    const sisa = total - terkirim;

    // Kalau udah habis
    if (sisa <= 0) {
      return "SELESAI";
    }

    return `${sisa.toLocaleString("id-ID")} / ${total.toLocaleString("id-ID")}`;
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
        <h1 class="text-2xl font-bold">Daftar Kontrak Kain Jadi</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/kainjadi-purchasecontract/form")}
        >
          + Tambah Kontrak Kain Jadi
        </button>
      </div>

      <div class="w-full overflow-x-auto">
        <table class="w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">ID</th>
              <th class="py-2 px-2">No Pembelian</th>
              <th class="py-2 px-2">Supplier</th>
              <th class="py-2 px-2 text-center">
                <div>Qty Faktual</div>
                <span class="text-xs text-gray-500">
                  (Total - Total terkirim / Total)
                </span>
              </th>
              <th class="py-2 px-2 text-center">
                <div>Qty by System</div>
                <span class="text-xs text-gray-500">
                  (Total - Total diproses / Total)
                </span>
              </th>
              <th class="py-2 px-2">Satuan Unit</th>
              <th class="py-2 px-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData().map((kj, index) => (
              <tr class="border-b" key={kj.id}>
                <td class="py-2 px-4">
                  {(currentPage() - 1) * pageSize + (index + 1)}
                </td>
                <td class="py-2 px-4">{kj.no_pc}</td>
                <td class="py-2 px-4">{kj.supplier_name}</td>
                <td
                  class={`py-2 px-4 text-center ${
                    qtyCounterReal(kj, kj.satuan_unit_id) === "SELESAI"
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {qtyCounterReal(kj, kj.satuan_unit_id)}
                </td>
                <td
                  className={`py-2 px-4 text-center ${
                    qtyCounterbySystem(kj, kj.satuan_unit_id) === "SELESAI"
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {qtyCounterbySystem(kj, kj.satuan_unit_id)}
                </td>
                <td class="py-2 px-4">{kj.satuan_unit_name}</td>
                {/* <td class="py-2 px-4">{formatTanggalIndo(kj.created_at)}</td> */}
                <td class="py-2 px-4 space-x-2">
                   <button
                    class="text-yellow-600 hover:underline"
                    onClick={() =>
                      navigate(`/kainjadi-purchasecontract/form?id=${kj.id}&view=true`)
                    }
                  >
                    <Eye size={25} />
                  </button>
                  <button
                    class="text-blue-600 hover:underline"
                    onClick={() =>
                      navigate(`/kainjadi-purchasecontract/form?id=${kj.id}`)
                    }
                    hidden
                  >
                    <Edit size={25} />
                  </button>
                  <button
                    class="text-red-600 hover:underline"
                    onClick={() => handleDelete(kj.id)}
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
