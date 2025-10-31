import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../../layouts/MainLayout";
import {
  getAllKJDeliveryNotes,
  getUser,
  softDeleteKJDeliveryNote,
  hasPermission,
} from "../../../utils/auth";
import Swal from "sweetalert2";
import { Edit, Trash, Eye } from "lucide-solid";
import { getLotsLabelTruncated } from "../../../helpers/lot-helpers";
import { formatCorak } from "../../../components/CorakKainList";

export default function KJDeliveryNoteList() {
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
      title: "Hapus surat penerimaan kain jadi?",
      text: `Apakah kamu yakin ingin menghapus surat penerimaan kain jadi dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const deleteCustomer = await softDeleteKJDeliveryNote(id, tokUser?.token);

        await Swal.fire({
          title: "Terhapus!",
          text: `Data surat penerimaan kain jadi dengan ID ${id} berhasil dihapus.`,
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
            `Gagal menghapus data surat penerimaan kain jadi dengan ID ${id}`,
          icon: "error",
          
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
        });
      }
    }
  };

  const handleGetAllDeliveryNotes = async (tok) => {
    try {
      const result = await getAllKJDeliveryNotes(tok);

      //console.log("Data All SP KJ: ", JSON.stringify(result, null, 2));

      if (result && Array.isArray(result.suratJalans)) {
        const sortedData = result.suratJalans.sort((a, b) => b.id - a.id);
        setPackingOrders(sortedData);
      } else if (result.status === 403) {
        await Swal.fire({
          title: "Tidak Ada Akses",
          text: "Anda tidak memiliki izin untuk melihat Surat Penerimaan Kain Finish",
          icon: "warning",
          confirmButtonColor: "#6496df",
        });
        navigate("/dashboard");
      } else {
        Swal.fire({
          title: "Gagal",
          text: result.message || "Gagal mengambil data Surat Penerimaan Kain Finish",
          icon: "error",
          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
        });
        setPackingOrders([]);
      }
    } catch (error) {
      console.error("Gagal mengambil data Surat Penerimaan Kain Finish:", error);
      setPackingOrders([]);
    }
  };  

  const qtyCounterbySystem = (sj, satuanUnit) => {
    let total = 0;
    let terkirim = 0;

    switch (satuanUnit) {
      case "Meter": // Meter
        total = parseFloat(sj.summary?.total_meter || 0);
        terkirim = parseFloat(sj.summary?.total_meter_dalam_proses || 0);
        break;
      case "Yard": // Yard
        total = parseFloat(sj.summary?.total_yard || 0);
        terkirim = parseFloat(sj.summary?.total_yard_dalam_proses || 0);
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

  createEffect(() => {
    if (tokUser?.token) {
      handleGetAllDeliveryNotes(tokUser?.token);
    }
  });

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

  return (
    <MainLayout>
          <div class="flex justify-between items-center mb-4">
            <h1 class="text-2xl font-bold">Daftar Surat Penerimaan Kain Jadi</h1>
            <button
              class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              onClick={() => navigate("/kainjadi-deliverynote/form")}
            >
              + Tambah Surat Penerimaan
            </button>
          </div>
    
          <div class="w-full overflow-x-auto">
            <table class="w-full bg-white shadow-md rounded">
              <thead>
                <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
                  <th class="py-2 px-4">ID</th>
                  {/* <th class="py-2 px-2">No Surat Penerimaan</th> */}
                  <th class="py-2 px-2">No Purchase Order</th>
                  <th class="py-2 px-2">No Surat Jalan Supplier</th>
                  <th class="py-2 px-2">Tanggal</th>
                  <th class="py-2 px-2">No Lot</th>
                  <th class="py-2 px-2">Corak Kain</th>
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
                {paginatedData().map((sj, index) => (
                  <tr class="border-b" key={sj.id}>
                    <td class="py-2 px-4">
                      {(currentPage() - 1) * pageSize + (index + 1)}
                    </td>
                    {/* <td class="py-2 px-4">{sj.no_sj}</td> */}
                    <td class="py-2 px-4">{sj.no_po}</td>
                    <td class="py-2 px-4">{sj.no_sj_supplier}</td>
                    <td class="py-2 px-4">{formatTanggalIndo(sj.created_at)}</td>
                    <td class="py-2 px-4">
                      {(() => {
                        const { text, tooltip } = getLotsLabelTruncated(sj, 3);
                        return (
                          <span class="cursor-help" title={tooltip || undefined}>
                            {text}
                          </span>
                        );
                      })()}
                    </td>
                  <td class="py-2 px-4">
                    {(() => {
                      const { display, full } = formatCorak(sj.items, { maxShow: 3 });
                      return (
                        <span
                          class="inline-block max-w-[260px] truncate align-middle"
                          title={full}
                        >
                          {display}
                        </span>
                      );
                    })()}
                  </td>                    
                    <td
                      className={`py-2 px-4 text-center ${
                        qtyCounterbySystem(sj, sj.satuan_unit_name) === "SELESAI"
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {qtyCounterbySystem(sj, sj.satuan_unit_name)}
                    </td>
                  <td class="py-2 px-4">{sj.satuan_unit_name}</td>
                    <td class="py-2 px-4 space-x-2">
                      <button
                        class="text-yellow-600 hover:underline"
                        onClick={() =>
                          navigate(`/kainjadi-deliverynote/form?id=${sj.id}&view=true`)
                        }
                      >
                        <Eye size={25} />
                      </button>
                      {hasPermission("edit_purchase_finish_surat_jalan") && (
                        <button
                          class="text-blue-600 hover:underline"
                          onClick={() => navigate(`/kainjadi-deliverynote/form?id=${sj.id}`)}
                        >
                          <Edit size={25} />
                        </button>
                      )}
                      {hasPermission("delete_purchase_finish_surat_jalan") && (
                        <button
                          class="text-red-600 hover:underline"
                          onClick={() => handleDelete(sj.id)}
                        >
                          <Trash size={25} />
                        </button>
                      )}
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
