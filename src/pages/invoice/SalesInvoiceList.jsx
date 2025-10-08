import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  getAllDeliveryNotes,
  getUser,
  softDeleteDeliveryNote,
  getDeliveryNotes,
  setInvoiceSales,
  unsetInvoiceSales,
  hasPermission
} from "../../utils/auth";
import Swal from "sweetalert2";
import { Edit, Trash, Eye, Printer, CheckCircle, XCircle, X } from "lucide-solid";

export default function SalesInvoiceList() {
  const [suratJalan, setSuratJalan] = createSignal([]);
  const [deliveryNoteData, setDeliveryNoteData] = createSignal(null); 
  const navigate = useNavigate();
  const tokUser = getUser();
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  const formatNumber = (num, decimals = 2) => {
    if (num === null || num === undefined) return "0";
    const numValue = Number(num);
    if (isNaN(numValue)) return "0";

    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(numValue);
  };

  const totalSummary = createMemo(() => {
    const list = suratJalan();
    if (!list || list.length === 0) {
      return { meter: 0, yard: 0, kilogram: 0, kain: 0 };
    }

    return list.reduce(
      (acc, sj) => {
        acc.meter += parseFloat(sj.summary?.total_meter || 0);
        acc.yard += parseFloat(sj.summary?.total_yard || 0);
        acc.kilogram += parseFloat(sj.summary?.total_kilogram || 0);
        acc.kain += parseInt(sj.summary?.jumlah_kain || 0, 10);
        return acc;
      },
      { meter: 0, yard: 0, kilogram: 0, kain: 0 }
    );
  });

  const totalPages = createMemo(() => {
    return Math.max(1, Math.ceil(suratJalan().length / pageSize));
  });

  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;
    return suratJalan().slice(startIndex, startIndex + pageSize);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus surat jalan?",
      text: `Apakah kamu yakin ingin menghapus surat jalan dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        await softDeleteDeliveryNote(id, tokUser?.token);

        await Swal.fire({
          title: "Terhapus!",
          text: `Data surat jalan dengan ID ${id} berhasil dihapus.`,
          icon: "success",
          confirmButtonColor: "#6496df",
        });

        setSuratJalan(suratJalan().filter((s) => s.id !== id));
      } catch (error) {
        console.error(error);
        Swal.fire({
          title: "Gagal",
          text:
            error.message || `Gagal menghapus data surat jalan dengan ID ${id}`,
          icon: "error",
          
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
        });
      }
    }
  };

  // const handleGetAllDeliveryNotes = async (tok) => {
  //   const getDataDeliveryNotes = await getAllDeliveryNotes(tok);
  //   //console.log("Respons dari getAllDeliveryNotes:", JSON.stringify(getDataDeliveryNotes, null, 2));

  //   if (getDataDeliveryNotes.status === 200) {
  //       const suratJalanList = getDataDeliveryNotes.surat_jalan_list || [];
      
  //     const sortedData = suratJalanList.sort(
  //       (a, b) => a.id - b.id
  //     );
  //     setSuratJalan(sortedData);
  //   }
  // };

  const handleGetAllDeliveryNotes = async (tok) => {
    try {
      const result = await getAllDeliveryNotes(tok);

      if (result.status === 200) {
        const suratJalanList = result.surat_jalan_list || [];
        const sortedData = suratJalanList.sort((a, b) => a.id - b.id);
        setSuratJalan(sortedData);
      } else if (result.status === 403) {
        await Swal.fire({
          title: "Tidak Ada Akses",
          text: "Anda tidak memiliki izin untuk melihat Invoice Penjualan",
          icon: "warning",
          confirmButtonColor: "#6496df",
        });
        navigate("/dashboard");
      } else {
        Swal.fire({
          title: "Gagal",
          text: result.message || "Gagal mengambil data Invoice Penjualan",
          icon: "error",
          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
        });
      }
    } catch (error) {
      console.error("Gagal mengambil data Delivery Notes:", error);
      Swal.fire({
        title: "Gagal",
        text: error.message || "Terjadi kesalahan saat mengambil data",
        icon: "error",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
    }
  };  

  async function handlePrint(sc) {
    try {
      let updatedSc = { ...sc };

      // set delivered_status jika belum
      if (!sc.delivered_status) {
        await setInvoiceSales(tokUser?.token, sc.id, { delivered_status: 1 });
        updatedSc = { ...sc, delivered_status: 1 };
        setSuratJalan((prev) => prev.map((item) => (item.id === sc.id ? updatedSc : item)));
      }

      // Ambil detail untuk dicetak
      const detail = await getDeliveryNotes(sc.id, tokUser?.token);
      if (!detail) {
        Swal.fire("Error", "Data cetak tidak ditemukan.", "error");
        return;
      }

      // ⬇️ Kirim via HASH agar tidak kena limit header/query (HTTP 431)
      const encoded = encodeURIComponent(JSON.stringify(detail));
      window.open(`/print/deliverynote-invoice#${encoded}`, "_blank");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", err.message || "Gagal memproses print", "error");
    }
  }

  async function handleUnsetInvoice(sc) {
    try {
      const result = await Swal.fire({
        title: "Batalkan Invoice?",
        text: `Apakah anda yakin ingin membatalkan invoice dengan ID ${sc.id}?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#aaa",
        confirmButtonText: "Ya, batalkan",
        cancelButtonText: "Batal",
      });

      if (!result.isConfirmed) return;

      if (sc.delivered_status) {
        await unsetInvoiceSales(tokUser?.token, sc.id, { delivered_status: 0 });
      }

      await handleGetAllDeliveryNotes(tokUser?.token);

      Swal.fire("Berhasil", "Status invoice berhasil dibatalkan.", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", err.message || "Gagal unset status invoice", "error");
    }
  }

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
      handleGetAllDeliveryNotes(tokUser?.token);
    }
  });

  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Invoice Penjualan</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/deliverynote/form")}
          hidden
        >
          + Tambah Surat Jalan
        </button>
      </div>

      <div class="w-full overflow-x-auto">
        <table class="w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">#</th>
              <th class="py-2 px-4">No. SJ</th>
              <th class="py-2 px-2">Tanggal Pembuatan SJ</th>
              <th class="py-2 px-2">No. PL</th>
              <th class="py-2 px-2">Nama Customer</th>
              <th class="py-2 px-2">Satuan Unit</th>
              <th class="py-2 px-2 text-center">Total</th>
              <th class="py-2 px-2 text-center">Status Invoice</th>
              <th class="py-2 px-4 text-center">Print Invoice</th>
              <th class="py-2 px-4 text-center">Batal Invoice</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData().map((sc, index) => (
              <tr class="border-b" key={sc.id}>
                <td class="py-2 px-4">
                  {(currentPage() - 1) * pageSize + (index + 1)}
                </td>
                <td class="py-2 px-4">{sc.no_sj}</td>
                <td class="py-2 px-4">{formatTanggalIndo(sc.created_at)}</td>
                <td class="py-2 px-4">{sc.no_pl}</td>
                <td class="py-2 px-4">{sc.customer_name}</td>
                <td class="py-2 px-4">{sc.satuan_unit}</td>
                <td class="py-2 px-4 text-center">
                  {sc.satuan_unit === "Meter"
                    ? `${formatNumber(sc.summary.total_meter)} m`
                    : sc.satuan_unit === "Yard"
                    ? `${formatNumber(sc.summary.total_yard)} yd`
                    : `${formatNumber(sc.summary.total_kilogram)} kg`}
                </td>
                {/* Status Invoice: tampilkan badge "Belum Print" / "Sudah Print" */}
                <td class="py-2 px-4 text-center">
                  {sc.delivered_status ? (
                    <span class="inline-block px-3 py-1 text-sm rounded-full bg-purple-100 text-purple-700 font-semibold">
                      Sudah Print
                    </span>
                  ) : (
                    <span class="inline-block px-3 py-1 text-sm rounded-full bg-red-100 text-red-700 font-semibold">
                      Belum Print
                    </span>
                  )}
                </td>
                
                {/* Print Invoice */}
                <td class="py-2 px-4 space-x-2 text-center">
                  <button
                    class={sc.delivered_status ? "text-yellow-600 hover:underline" : "text-green-600 hover:underline"}
                    onClick={() => handlePrint(sc)}
                    title="Cetak / tandai sudah print"
                  >
                    <Printer size={25} />
                  </button>
                </td>
                {/* Batal Invoice (misah) */}
                {hasPermission("unprint_invoice") && (
                  <td class="py-2 px-4 text-center">
                    <button
                      class={
                        sc.delivered_status
                          ? "px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                          : "px-2 py-1 bg-gray-300 text-gray-600 rounded cursor-not-allowed"
                      }
                      disabled={!sc.delivered_status}
                      onClick={() => handleUnsetInvoice(sc)}
                      title={sc.delivered_status ? "Batalkan invoice" : "Tidak bisa batalkan sebelum dicetak"}
                    >
                      <X size={16} />
                    </button>
                  </td>
                )}
                  {/* <button
                    class="text-blue-600 hover:underline"
                    onClick={() => navigate(`/deliverynote/form?id=${sc.id}`)}
                    hidden
                  >
                    <Edit size={25} />
                  </button>
                  <button
                    class="text-red-600 hover:underline"
                    onClick={() => handleDelete(sc.id)}
                    hidden
                  >
                    <Trash size={25} />
                  </button> */}
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
