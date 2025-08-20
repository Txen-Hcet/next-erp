import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../../layouts/MainLayout";
import {
  getAllKainJadiOrders,
  getUser,
  softDeletePackingList,
} from "../../../utils/auth";
import Swal from "sweetalert2";
import { Edit, Eye, Trash } from "lucide-solid";

export default function KJPurchaseOrderList() {
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

  const handleGetAllPurchaseOrders = async (tok) => {
    const getDataPurchaseOrders = await getAllKainJadiOrders(tok);

    if (getDataPurchaseOrders.status === 200) {
      const sortedData = getDataPurchaseOrders.orders.sort(
        (a, b) => a.id - b.id
      );
      setPackingOrders(sortedData);
    }
  };

  const qtyCounterbySystem = (po, satuanUnit) => {
    let total = 0;
    let terkirim = 0;

    switch (satuanUnit) {
      case "Meter": // Meter
        total = parseFloat(po.summary?.total_meter || 0);
        terkirim = parseFloat(po.summary?.total_meter_dalam_proses || 0);
        break;
      case "Yard": // Yard
        total = parseFloat(po.summary?.total_yard || 0);
        terkirim = parseFloat(po.summary?.total_yard_dalam_proses || 0);
        break;
      case "Kilogram": // Kilogram
        total = parseFloat(po.summary?.total_kilogram || 0);
        terkirim = parseFloat(po.summary?.total_kilogram_dalam_proses || 0);
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
      handleGetAllPurchaseOrders(tokUser?.token);
    }
  });

  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Daftar Order Kain Jadi</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/kainjadi-purchaseorder/form")}
        >
          + Tambah Order Kain Jadi
        </button>
      </div>

      <div class="w-full overflow-x-auto">
        <table class="w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">ID</th>
              <th class="py-2 px-2">No Order</th>
              <th class="py-2 px-2">No PC</th>
              <th class="py-2 px-2">Supplier</th>
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
            {paginatedData().map((po, index) => (
              <tr class="border-b" key={po.id}>
                <td class="py-2 px-4">
                  {(currentPage() - 1) * pageSize + (index + 1)}
                </td>
                <td class="py-2 px-4">{po.no_po}</td>
                <td class="py-2 px-4">{po.no_pc}</td>
                <td class="py-2 px-4">{po.supplier_name}</td>
                {/* <td class="py-2 px-4">{formatTanggalIndo(po.created_at)}</td> */}
                <td
                  className={`py-2 px-4 text-center ${
                    qtyCounterbySystem(po, po.satuan_unit_name) === "SELESAI"
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {qtyCounterbySystem(po, po.satuan_unit_name)}
                </td>
                <td class="py-2 px-4">{po.satuan_unit_name}</td>
                <td class="py-2 px-4 space-x-2">
                   <button
                    class="text-yellow-600 hover:underline"
                    onClick={() =>
                      navigate(`/kainjadi-purchaseorder/form?id=${po.id}&view=true`)
                    }
                  >
                    <Eye size={25} />
                  </button>
                  <button
                    class="text-blue-600 hover:underline"
                    onClick={() =>
                      navigate(`/kainjadi-purchaseorder/form?id=${po.id}`)
                    }
                  >
                    <Edit size={25} />
                  </button>
                  <button
                    class="text-red-600 hover:underline"
                    onClick={() => handleDelete(po.id)}
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
