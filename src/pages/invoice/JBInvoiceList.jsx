import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  getAllJBDeliveryNotes,
  getUser,
  softDeleteJBDeliveryNote,
  getJBDeliveryNotes,
  setInvoiceJB,
  unsetInvoiceJB,
  hasPermission,
} from "../../utils/auth";
import Swal from "sweetalert2";
import { Edit, Trash, Eye, Printer, CheckCircle, XCircle, X } from "lucide-solid";

export default function JBInvoiceList() {
  const [packingOrders, setPackingOrders] = createSignal([]);
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

  const totalPages = createMemo(() => {
    return Math.max(1, Math.ceil(packingOrders().length / pageSize));
  });

  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;
    return packingOrders().slice(startIndex, startIndex + pageSize);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus surat penerimaan jual beli?",
      text: `Apakah kamu yakin ingin menghapus surat penerimaan jual beli dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const deleteCustomer = await softDeleteJBDeliveryNote(id, tokUser?.token);

        await Swal.fire({
          title: "Terhapus!",
          text: `Data surat penerimaan jual beli dengan ID ${id} berhasil dihapus.`,
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
            `Gagal menghapus data surat penerimaan jual beli dengan ID ${id}`,
          icon: "error",

          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
        });
      }
    }
  };

  // const handleGetAllDeliveryNotes = async (tok) => {
  //   try {
  //     const response = await getAllJBDeliveryNotes(tok);
  //     //console.log("Get all data sj-jb: ", JSON.stringify(response, null, 2));

  //     if (response && Array.isArray(response.suratJalans)) {
  //       const sortedData = response.suratJalans.sort((a, b) => b.id - a.id);
  //       setPackingOrders(sortedData);
  //     } else {
  //       setPackingOrders([]);
  //     }
  //   } catch (error) {
  //     console.error("Gagal mengambil data Surat Penerimaan Jual Beli:", error);
  //     setPackingOrders([]);
  //   }
  // };

  const handleGetAllDeliveryNotes = async (tok) => {
    try {
      const result = await getAllJBDeliveryNotes(tok);

      if (result && Array.isArray(result.suratJalans)) {
        const sortedData = result.suratJalans.sort((a, b) => b.id - a.id);
        setPackingOrders(sortedData);
      } else if (result.status === 403) {
        await Swal.fire({
          title: "Tidak Ada Akses",
          text: "Anda tidak memiliki izin untuk melihat Invoice Jual Beli",
          icon: "warning",
          confirmButtonColor: "#6496df",
        });
        navigate("/dashboard");
      } else {
        Swal.fire({
          title: "Gagal",
          text: result.message || "Gagal mengambil data Invoice Jual Beli",
          icon: "error",
          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
        });
        setPackingOrders([]);
      }
    } catch (error) {
      console.error("Gagal mengambil data Invoice Jual Beli:", error);
      setPackingOrders([]);
    }
  };

  async function handlePrint(sc) {
    try {
      let updatedSc = { ...sc };

      // Update delivered staus
      if (!sc.delivered_status) {
        await setInvoiceJB(tokUser?.token, sc.id, { delivered_status: 1 });
        updatedSc = { ...sc, delivered_status: 1 };

        setPackingOrders((prev) =>
          prev.map((item) => (item.id === sc.id ? updatedSc : item))
        );
      }

      // Get data surat jalan
      const detail = await getJBDeliveryNotes(sc.id, tokUser?.token);

      if (!detail) {
        Swal.fire("Error", "Data cetak tidak ditemukan.", "error");
        return;
      }

      // Kirim data ke print
      //console.log("Data print: ", JSON.stringify(detail, null, 2));
      const encodedData = encodeURIComponent(JSON.stringify(detail));
      //window.open(`/print/jualbeli-invoice?data=${encodedData}`, "_blank");
      window.open(`/print/jualbeli-invoice#${encodedData}`, "_blank");

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
        await unsetInvoiceJB(tokUser?.token, sc.id, { delivered_status: 0 });
      }

      await handleGetAllDeliveryNotes(tokUser?.token);

      Swal.fire("Berhasil", "Status invoice berhasil dibatalkan.", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", err.message || "Gagal unset status invoice", "error");
    }
  }

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
        <h1 class="text-2xl font-bold">Invoice Jual Beli</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/jualbeli-deliverynote/form")}
          hidden
        >
          + Tambah Surat Jalan
        </button>
      </div>

      <div class="w-full overflow-x-auto">
        <table class="w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">ID</th>
              <th class="py-2 px-2">No. SJ</th>
              <th class="py-2 px-2">Tanggal Pembuatan SJ</th>
              <th class="py-2 px-2">No. PC</th>
              <th class="py-2 px-2">Nama Customer</th>
              <th class="py-2 px-2 text-center">
                <div>Qty by System</div>
                <span class="text-xs text-gray-500">
                  (Total - Total diproses / Total)
                </span>
              </th>
              <th class="py-2 px-2">Satuan Unit</th>
              <th class="py-2 px-4">Status Invoice</th>
              <th class="py-2 px-4">Print Invoice</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData().map((sj, index) => (
              <tr class="border-b" key={sj.id}>
                <td class="py-2 px-4">
                  {(currentPage() - 1) * pageSize + (index + 1)}
                </td>
                <td class="py-2 px-4">{sj.no_sj}</td>
                <td class="py-2 px-4">{formatTanggalIndo(sj.created_at)}</td>
                <td class="py-2 px-4">{sj.no_jb}</td>
                <td class="py-2 px-4">{sj.customer_name}</td>
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
                <td class="py-2 px-4 text-center">
                  {sj.delivered_status ? (
                    <CheckCircle class="text-green-600 inline" size={20} />
                  ) : (
                    <XCircle class="text-red-600 inline" size={20} />
                  )}
                </td>
                <td class="py-2 px-4 space-x-2">
                  <button
                    class={sj.delivered_status ? "text-yellow-600 hover:underline" : "text-green-600 hover:underline"}
                    onClick={() => handlePrint(sj)}
                  >
                    <Printer size={25} />
                  </button>
                  {hasPermission("unprint_invoice_jual_beli") && sj.delivered_status === 1 && (
                    <button
                      class="text-red-600 hover:underline"
                      onClick={() => handleUnsetInvoice(sj)}
                    >
                      <X size={25} />
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
