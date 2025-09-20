import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  getAllJBDeliveryNotes,
  getUser,
  softDeleteJBDeliveryNote,
  setReturnJB,
  undoReturnJBItem,
  getJBDeliveryNotes,
} from "../../utils/auth";
import Swal from "sweetalert2";
import { Edit, Trash, Eye, Printer, RotateCcw, CheckCircle, XCircle } from "lucide-solid";

export default function ReturJBList() {
  const [packingOrders, setPackingOrders] = createSignal([]);
  const navigate = useNavigate();
  const tokUser = getUser();
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  const totalPages = createMemo(() => Math.max(1, Math.ceil(packingOrders().length / pageSize)));

  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;
    return packingOrders().slice(startIndex, startIndex + pageSize);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus Retur Jual Beli?",
      text: `Apakah kamu yakin ingin menghapus Retur Jual Beli dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        await softDeleteJBDeliveryNote(id, tokUser?.token);
        await Swal.fire({
          title: "Terhapus!",
          text: `Data Retur Jual Beli dengan ID ${id} berhasil dihapus.`,
          icon: "success",
          confirmButtonColor: "#6496df",
        });
        setPackingOrders(packingOrders().filter((s) => s.id !== id));
      } catch (error) {
        console.error(error);
        Swal.fire({
          title: "Gagal",
          text: error.message || `Gagal menghapus data surat penerimaan jual beli dengan ID ${id}`,
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
      const result = await getAllJBDeliveryNotes(tok);
      //console.log("Data All SP JB: ", JSON.stringify(result, null, 2));

      if (result && Array.isArray(result.suratJalans)) {
        const sortedData = result.suratJalans.sort((a, b) => b.id - a.id);
        setPackingOrders(sortedData);
      } else if (result.status === 403) {
        await Swal.fire({
          title: "Tidak Ada Akses",
          text: "Anda tidak memiliki izin untuk melihat Retur Jual Beli",
          icon: "warning",
          confirmButtonColor: "#6496df",
        });
        navigate("/dashboard");
      } else {
        Swal.fire({
          title: "Gagal",
          text: result.message || "Gagal mengambil data Retur Jual Beli",
          icon: "error",
          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
        });
        setPackingOrders([]);
      }
    } catch (error) {
      console.error("Gagal mengambil data Retur Jual Beli:", error);
      setPackingOrders([]);
    }
  };

  const qtyCounterbySystem = (sj, satuanUnit) => {
    let total = 0;
    let terkirim = 0;

    switch (satuanUnit) {
      case "Meter":
        total = parseFloat(sj.summary?.total_meter || 0);
        terkirim = parseFloat(sj.summary?.total_meter_dalam_proses || 0);
        break;
      case "Yard":
        total = parseFloat(sj.summary?.total_yard || 0);
        terkirim = parseFloat(sj.summary?.total_yard_dalam_proses || 0);
        break;
      default:
        return "-";
    }

    const sisa = total - terkirim;
    if (sisa <= 0) return "SELESAI";
    return `${sisa.toLocaleString("id-ID")} / ${total.toLocaleString("id-ID")}`;
  };

  // ========= Handler Retur =========
  const handleSetReturned = async (sj) => {
    if (sj.returned_at) {
      Swal.fire({
        title: "Sudah Retur",
        text: "Data ini sudah diretur.",
        icon: "info",
        timer: 1200,
        showConfirmButton: false,
      });
      return;
    }

    // ✅ VALIDASI BARU: wajib sudah dicetak
    if (!sj.printed_at) {
      Swal.fire({
        title: "Belum Dicetak",
        text: "Silakan cetak surat penerimaan terlebih dahulu sebelum set retur.",
        icon: "info",
        timer: 1400,
        showConfirmButton: false,
      });
      return;
    }

    const konfirm = await Swal.fire({
      title: "Konfirmasi Retur",
      text: `Jadikan Retur untuk ${sj.no_sj} dengan ID ${sj.id}? Stok pada kontrak akan dikembalikan.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Retur",
      cancelButtonText: "Batal",
      confirmButtonColor: "#2563eb",
    });
    if (!konfirm.isConfirmed) return;

    try {
      if (!sj.items || sj.items.length === 0) {
        await Swal.fire({
          title: "Tidak ada item",
          text: "Surat penerimaan ini tidak memiliki item untuk diretur.",
          icon: "info",
          timer: 1400,
          showConfirmButton: false,
        });
        return;
      }

      const itemIds = sj.items.map((it) => it.jbsj_item_id);
      await setReturnJB(tokUser?.token, sj.id, itemIds);

      setPackingOrders((prev) =>
        prev.map((x) =>
          x.id === sj.id
            ? {
                ...x,
                returned_at: new Date().toISOString().slice(0, 19).replace("T", " "),
                returned_by: tokUser?.id || 0,
              }
            : x
        )
      );

      Swal.fire({
        title: "Berhasil",
        text: "Retur berhasil diset.",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (e) {
      console.error(e);
      Swal.fire({
        title: "Gagal",
        text: e?.message || "Gagal set retur.",
        icon: "error",
      });
    }
  };


  const handleUnsetReturned = async (sj) => {
    if (!sj.returned_at) {
      Swal.fire({
        title: "Belum Retur",
        text: "Data ini belum diretur.",
        icon: "info",
        timer: 1200,
        showConfirmButton: false,
      });
      return;
    }

    const konfirm = await Swal.fire({
      title: "Batalkan Retur?",
      text: `Batalkan status retur untuk ${sj.no_sj} dengan ID ${sj.id}? Stok pada kontrak akan dikoreksi kembali.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Batalkan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#d97706",
    });
    if (!konfirm.isConfirmed) return;

    try {
      if (!sj.items || sj.items.length === 0) {
        await Swal.fire({
          title: "Tidak ada item",
          text: "Surat penerimaan ini tidak memiliki item untuk di-undo retur.",
          icon: "info",
          timer: 1400,
          showConfirmButton: false,
        });
        return;
      }

      const itemIds = sj.items.map((it) => it.jbsj_item_id);
      await undoReturnJBItem(tokUser?.token, sj.id, itemIds);

      setPackingOrders((prev) =>
        prev.map((x) => (x.id === sj.id ? { ...x, returned_at: null, returned_by: null } : x))
      );

      Swal.fire({
        title: "Dibatalkan",
        text: "Status retur dibatalkan.",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (e) {
      console.error(e);
      Swal.fire({
        title: "Gagal",
        text: e?.message || "Gagal membatalkan retur.",
        icon: "error",
      });
    }
  };

  const handlePrintRetur = async (sj) => {
    if (!sj.returned_at) {
      Swal.fire({
        title: "Belum Retur",
        text: "Set retur dulu sebelum mencetak dokumen retur.",
        icon: "info",
        timer: 1200,
        showConfirmButton: false,
      });
      return;
    }

    try {
      // Ambil detail SJ JB by id (supaya print lengkap)
      const detail = await getJBDeliveryNotes(sj.id, tokUser?.token);
      const suratJalan = detail?.suratJalan;
      if (!suratJalan) {
        Swal.fire("Gagal", "Data retur tidak ditemukan.", "error");
        return;
      }

      // Susun payload minimum yg dipakai print (ikut field yg dipakai komponen print kamu)
      const printData = {
        // header
        no_sj: suratJalan.no_sj,
        no_sj_supplier: suratJalan.no_sj_supplier,
        created_at: suratJalan.created_at,
        tanggal_kirim: suratJalan.tanggal_kirim,
        no_jb: suratJalan.no_jb,
        supplier_name: suratJalan.supplier_name,
        supplier_alamat: suratJalan.supplier_alamat,
        telepon: suratJalan.supllier_no_telp ?? suratJalan.supplier_no_telp ?? "0",
        satuan_unit_name: suratJalan.satuan_unit_name,
        keterangan: suratJalan.keterangan ?? "-",
        ppn_percent: suratJalan.ppn_percent ?? "0",

        // items (gunakan struktur yang dipakai tabel print)
        items: (suratJalan.items || []).map((it) => ({
          corak_kain: it.corak_kain,
          konstruksi_kain: it.konstruksi_kain,
          deskripsi_warna: it.deskripsi_warna ?? "-",  // mungkin tidak ada di list; backend detail biasanya ada
          lebar_kain: it.lebar_kain ?? 0,
          gulung: it.gulung ?? 0,
          lot: it.lot ?? 0,
          meter_total: it.meter_total ?? 0,
          yard_total: it.yard_total ?? 0,
          harga: it.harga ?? 0,
        })),

        // summary untuk total
        summary: {
          total_meter: suratJalan.summary?.total_meter ?? 0,
          total_yard: suratJalan.summary?.total_yard ?? 0,
          subtotal: suratJalan.summary?.subtotal ?? 0,
        },
      };

      // Kirim via hash (aman dari 431)
      //console.log("Data SP JB untuk Print: ", JSON.stringify(printData, null, 2));

      const encoded = encodeURIComponent(JSON.stringify(printData));
      window.open(`/print/retur-jualbeli#${encoded}`, "_blank");
    } catch (e) {
      console.error(e);
      Swal.fire("Gagal", e?.message || "Tidak bisa memuat data print.", "error");
    }
  };

  createEffect(() => {
    if (tokUser?.token) handleGetAllDeliveryNotes(tokUser?.token);
  });

  function formatTanggalIndo(tanggalString) {
    if (!tanggalString) return "-";
    const tanggal = new Date(tanggalString);
    const bulanIndo = [
      "Januari","Februari","Maret","April","Mei","Juni",
      "Juli","Agustus","September","Oktober","November","Desember",
    ];
    const tanggalNum = tanggal.getDate();
    const bulan = bulanIndo[tanggal.getMonth()];
    const tahun = tanggal.getFullYear();
    return `${tanggalNum} ${bulan} ${tahun}`;
  }

  const renderStatusRetur = (sj) => {
    const isReturned = !!sj.returned_at;

    return (
      <span
        class={`inline-flex items-center justify-center gap-1 w-full ${
          isReturned ? "text-green-600" : "text-red-600"
        }`}
        title={
          isReturned
            ? `Sudah retur${sj.returned_at ? ` • ${formatTanggalIndo(sj.returned_at)}` : ""}`
            : "Belum retur"
        }
      >
        {isReturned ? (
          <>
            <CheckCircle size={18} />
          </>
        ) : (
          <>
            <XCircle size={18} />
          </>
        )}
      </span>
    );
  };

  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Retur Jual Beli</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/jualbeli-deliverynote/form")}
          hidden
        >
          + Tambah Surat Penerimaan
        </button>
      </div>

      <div class="w-full overflow-x-auto">
        <table class="w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">ID</th>
              <th class="py-2 px-2">No Surat Penerimaan</th>
              <th class="py-2 px-2">Nama Customer</th>
              <th class="py-2 px-2">Tanggal</th>
              <th class="py-2 px-2">Supplier</th>
              <th class="py-2 px-2 text-center">
                <div>Qty by System</div>
                <span class="text-xs text-gray-500">
                  (Total - Total diproses / Total)
                </span>
              </th>
              <th class="py-2 px-2">Satuan Unit</th>
              <th class="py-2 px-2">Status Retur</th>
              <th class="py-2 px-4">Aksi</th>
              <th class="py-2 px-4">Print</th>
            </tr>
          </thead>

          <tbody>
            {paginatedData().map((sj, index) => {
              const canPrint = !!sj.returned_at;

              return (
                <tr class="border-b" key={sj.id}>
                  <td class="py-2 px-4">{(currentPage() - 1) * pageSize + (index + 1)}</td>
                  <td class="py-2 px-4">{sj.no_sj}</td>
                  <td class="py-2 px-4">{sj.customer_name}</td>
                  <td class="py-2 px-4">{formatTanggalIndo(sj.created_at)}</td>
                  <td class="py-2 px-4">{sj.supplier_name}</td>
                  <td
                    class={`py-2 px-4 text-center ${
                      qtyCounterbySystem(sj, sj.satuan_unit_name) === "SELESAI"
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {qtyCounterbySystem(sj, sj.satuan_unit_name)}
                  </td>
                  <td class="py-2 px-4">{sj.satuan_unit_name}</td>

                  {/* Status retur (ikon) */}
                  <td class="py-2 px-4">{renderStatusRetur(sj)}</td>

                  {/* Aksi (tanpa print) */}
                  <td class="py-2 px-4 space-x-2">
                  {!sj.returned_at ? (
                    <button
                      class={`${
                        sj.printed_at
                          ? "text-emerald-600 hover:underline"
                          : "text-gray-400 cursor-not-allowed"
                      }`}
                      onClick={() => sj.printed_at && handleSetReturned(sj)}
                      disabled={!sj.printed_at}                                  
                      title={
                        sj.printed_at
                          ? "Set Retur"
                          : "Belum dicetak — tidak bisa set retur"
                      }
                    >
                      ⤿ Retur
                    </button>
                  ) : (
                    <button
                      class="text-amber-600 hover:underline"
                      onClick={() => handleUnsetReturned(sj)}
                      title="Batalkan Retur"
                    >
                      <RotateCcw size={20} class="inline-block mr-1" /> Batal Retur
                    </button>
                  )}
                </td>

                  {/* Kolom Print (selalu ada) */}
                  <td class="py-2 px-4 text-center">
                    <button
                      class={`mx-auto ${
                        canPrint
                          ? "text-green-600 hover:underline"
                          : "text-gray-400 cursor-not-allowed"
                      }`}
                      onClick={() => canPrint && handlePrintRetur(sj)}
                      disabled={!canPrint}
                      title={canPrint ? "Print Retur" : "Belum retur — tidak bisa print"}
                    >
                      <Printer size={22} />
                    </button>
                  </td>
                </tr>
              );
            })}
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
          <span>Page {currentPage()} of {totalPages()}</span>
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
