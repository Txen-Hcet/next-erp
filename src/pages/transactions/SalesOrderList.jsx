import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  getAllSalesOrders,
  getUser,
  softDeleteSalesOrder,
} from "../../utils/auth";
import Swal from "sweetalert2";
import { Edit, Eye, Trash } from "lucide-solid";

export default function SalesOrderList() {
  const [salesOrders, setSalesOrders] = createSignal([]);
  const navigate = useNavigate();
  const tokUser = getUser();
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  const totalPages = createMemo(() => {
    return Math.max(1, Math.ceil(salesOrders().length / pageSize));
  });

  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;
    return salesOrders().slice(startIndex, startIndex + pageSize);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus sales contract?",
      text: `Apakah kamu yakin ingin menghapus sales contract dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const deleteSalesOrder = await softDeleteSalesOrder(id, tokUser?.token);

        await Swal.fire({
          title: "Terhapus!",
          text: `Data sales order dengan ID ${id} berhasil dihapus.`,
          icon: "success",
          confirmButtonColor: "#6496df",
        });

        // Optional: update UI setelah hapus
        setSalesOrders(salesOrders().filter((s) => s.id !== id));
      } catch (error) {
        console.error(error);
        Swal.fire({
          title: "Gagal",
          text:
            error.message || `Gagal menghapus data sales order dengan ID ${id}`,
          icon: "error",
          
 showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
        });
      }
    }
  };

  const handleGetAllSalesOrders = async (tok) => {
    const getDataSalesOrder = await getAllSalesOrders(tok);

    if (getDataSalesOrder.status === 200) {
      const sortedData = getDataSalesOrder.orders.sort((a, b) => a.id - b.id);
      setSalesOrders(sortedData);
    }
  };

  const qtyCounterReal = (sc, satuanUnit) => {
    let total = 0;
    let terkirim = 0;

    switch (satuanUnit) {
      case 1: // Meter
        total = parseFloat(sc.summary?.total_meter || 0);
        terkirim = parseFloat(sc.summary?.total_meter_dalam_surat_jalan || 0);
        break;
      case 2: // Yard
        total = parseFloat(sc.summary?.total_yard || 0);
        terkirim = parseFloat(sc.summary?.total_yard_dalam_surat_jalan || 0);
        break;
      case 3: // Kilogram
        total = parseFloat(sc.summary?.total_kilogram || 0);
        terkirim = parseFloat(
          sc.summary?.total_kilogram_dalam_surat_jalan || 0
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

  const qtyCounterbySystem = (so, satuanUnit) => {
    let total = 0;
    let terkirim = 0;

    switch (satuanUnit) {
      case 1: // Meter
        total = parseFloat(so.summary?.total_meter || 0);
        terkirim = parseFloat(so.summary?.total_meter_dalam_proses || 0);
        break;
      case 2: // Yard
        total = parseFloat(so.summary?.total_yard || 0);
        terkirim = parseFloat(so.summary?.total_yard_dalam_proses || 0);
        break;
      case 3: // Kilogram
        total = parseFloat(so.summary?.total_kilogram || 0);
        terkirim = parseFloat(so.summary?.total_kilogram_dalam_proses || 0);
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
    const hariIndo = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];
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
      handleGetAllSalesOrders(tokUser?.token);
    }
  });

  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Daftar Sales Order</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/salesorder/form")}
        >
          + Tambah Sales Order
        </button>
      </div>

      <div class="w-full overflow-x-auto">
        <table class="w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">ID</th>
              <th class="py-2 px-2">No Sales Order</th>
              <th class="py-2 px-2">Tanggal Pembuatan SO</th>
              <th class="py-2 px-2">No Sales Contract</th>
              <th class="py-2 px-4">Nama Customer</th>
              <th class="py-2 px-4">Satuan</th>
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
              <th class="py-2 px-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData().map((so, index) => (
              <tr class="border-b" key={so.id}>
                <td class="py-2 px-4">
                  {(currentPage() - 1) * pageSize + (index + 1)}
                </td>
                <td class="py-2 px-4">{so.no_so}</td>
                <td class="py-2 px-4">{formatTanggalIndo(so.created_at)}</td>
                <td class="py-2 px-4">{so.no_sc}</td>
                <td class="py-2 px-4">{so.customer_name}</td>
                <td class="py-2 px-4">{so.satuan_unit_name}</td>
                <td class="py-2 px-4 text-red-500 text-center">
                  {/* {parseFloat(sc.summary.total_meter_kontrak || 0) -
                    parseFloat(sc.summary.total_meter_terkirim || 0)}{" "}
                  <span class="text-black">
                    / {parseFloat(sc.summary.total_meter_kontrak || 0)}
                  </span> */}
                  {qtyCounterReal(so, so.satuan_unit_id)}
                </td>
                <td class="py-2 px-4 text-red-500 text-center">
                  {qtyCounterbySystem(so, so.satuan_unit_id)}
                </td>
                <td class="py-2 px-4 space-x-2">
                  <button
                    class="text-yellow-600 hover:underline"
                    onClick={() => navigate(`/salesorder/form?id=${so.id}&view=true`)}
                  >
                    <Eye size={25} />
                  </button>
                  <button
                    class="text-blue-600 hover:underline"
                    onClick={() => navigate(`/salesorder/form?id=${so.id}`)}
                    hidden
                  >
                    <Edit size={25} />
                  </button>
                  <button
                    class="text-red-600 hover:underline"
                    onClick={() => handleDelete(so.id)}
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
