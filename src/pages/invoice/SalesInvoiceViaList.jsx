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
  hasPermission,
} from "../../utils/auth";
import Swal from "sweetalert2";
import { Edit, Trash, Eye, Printer, FileDown, X } from "lucide-solid";
import html2pdf from "html2pdf.js";

import SearchSortFilter from "../../components/SearchSortFilter";
import useSimpleFilter from "../../utils/useSimpleFilter";
import { set } from "idb-keyval";

export default function SalesInvoiceViaList() {
  const [suratJalan, setSuratJalan] = createSignal([]);
  const { filteredData, applyFilter } = useSimpleFilter(suratJalan, [
    "no_sj",
    "created_at",
    "no_pl",
    "customer_name",
    "satuan_unit_name",
    "delivered_status",
  ]);

  const navigate = useNavigate();
  const tokUser = getUser();
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  const transactionType = createMemo(() =>
    filteredData().filter(
      (c) =>
        (c.is_via === 1 || c.is_via === true)
    )
  );

  const getViaStatus = (sc) => {
    if (sc.is_via === 1) {
      return <span class="text-green-600 font-medium">VIA</span>;
    } else if (sc.is_via === 0) {
      return <span class="text-gray-600">Tidak</span>;
    } else {
      return <span class="text-gray-400">-</span>;
    }
  };

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
    return Math.max(1, Math.ceil(transactionType().length / pageSize));
  });

  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;
    return transactionType().slice(startIndex, startIndex + pageSize);
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

  const handleGetAllDeliveryNotes = async (tok) => {
    try {
      const result = await getAllDeliveryNotes(tok);

      if (result.status === 200) {
        const suratJalanList = result.surat_jalan_list || [];
        const sortedData = suratJalanList.sort((a, b) => b.id - a.id);
        setSuratJalan(sortedData);
        applyFilter({});
      } else if (result.status === 403) {
        await Swal.fire({
          title: "Tidak Ada Akses",
          text: "Anda tidak memiliki izin untuk melihat Invoice Penjualan (VIA)",
          icon: "warning",
          confirmButtonColor: "#6496df",
        });
        navigate("/dashboard");
      } else {
        Swal.fire({
          title: "Gagal",
          text: result.message || "Gagal mengambil data Invoice Penjualan (VIA)",
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

  // async function handlePrint(sc) {
  //   try {
  //     let updatedSc = { ...sc };
  //     if (!sc.delivered_status) {
  //       await setInvoiceSales(tokUser?.token, sc.id, { delivered_status: 1 });
  //       updatedSc = { ...sc, delivered_status: 1 };
  //       setSuratJalan((prev) =>
  //         prev.map((item) => (item.id === sc.id ? updatedSc : item))
  //       );
  //     }
  //     const detail = await getDeliveryNotes(sc.id, tokUser?.token);
  //     if (!detail) {
  //       Swal.fire("Error", "Data cetak tidak ditemukan.", "error");
  //       return;
  //     }
  //     const encoded = encodeURIComponent(JSON.stringify(detail));
  //     window.open(`/print/deliverynote-invoice#${encoded}`, "_blank");
  //   } catch (err) {
  //     console.error(err);
  //     Swal.fire("Error", err.message || "Gagal memproses print", "error");
  //   }
  // }

  async function handlePrint(sc) {
    try {
      let updatedSc = { ...sc };

      // Update delivered_status jika belum
      if (!sc.delivered_status) {
        await setInvoiceSales(tokUser?.token, sc.id, { delivered_status: 1 });
        updatedSc = { ...sc, delivered_status: 1 };

        setSuratJalan((prev) =>
          prev.map((item) => (item.id === sc.id ? updatedSc : item))
        );
      }

      // Ambil detail untuk diprint
      const detail = await getDeliveryNotes(sc.id, tokUser?.token);
      if (!detail) {
        Swal.fire("Error", "Data cetak tidak ditemukan.", "error");
        return;
      }

      // Simpan ke IndexedDB → aman untuk data besar
      const key = "dn_" + Date.now();
      await set(key, detail);

      // Buka window print berdasarkan key
      window.open(`/print/deliverynote-invoice?key=${key}`, "_blank");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", err.message || "Gagal memproses print", "error");
    }
  }

  // async function handlePreview(sc) {
  //   try {
  //     const detail = await getDeliveryNotes(sc.id, tokUser?.token);
  //     if (!detail) {
  //       Swal.fire("Error", "Data untuk preview tidak ditemukan.", "error");
  //       return;
  //     }

  //     const detailForPreview = { ...detail, _previewMode: true };
  //     const encoded = encodeURIComponent(JSON.stringify(detailForPreview));

  //     window.open(`/print/deliverynote-invoice#${encoded}`, "_blank");
  //   } catch (err) {
  //     console.error(err);
  //     Swal.fire("Error", err.message || "Gagal memproses preview", "error");
  //   }
  // }

  async function handlePreview(sc) {
    try {
      const detail = await getDeliveryNotes(sc.id, tokUser?.token);
      if (!detail) {
        Swal.fire("Error", "Data untuk preview tidak ditemukan.", "error");
        return;
      }

      // Simpan ke IndexedDB sama seperti handlePrint
      const key = "dn_preview_" + Date.now();
      await set(key, detail);

      // Buka window preview berdasarkan key
      window.open(`/print/deliverynote-invoice?key=${key}&preview=true`, "_blank");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", err.message || "Gagal memproses preview", "error");
    }
  }

  async function handleDownloadPDF(sc) {
    Swal.fire({
      title: "Mempersiapkan PDF...",
      text: "Mohon tunggu sebentar, sedang proses file PDF.",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    let iframe;
    try {
      const detail = await getDeliveryNotes(sc.id, tokUser?.token);
      if (!detail) {
        throw new Error("Data untuk PDF tidak ditemukan.");
      }

      const detailForPdf = { ...detail, _pdfMode: true };
      const encoded = encodeURIComponent(JSON.stringify(detailForPdf));

      iframe = document.createElement("iframe");
      iframe.style.position = "absolute";
      iframe.style.left = "-9999px";
      iframe.style.width = "210mm";
      iframe.style.height = "297mm";

      document.body.appendChild(iframe);

      iframe.src = `/print/deliverynote-invoice#${encoded}`;

      iframe.onload = () => {
        const maxAttempts = 20;
        let attempts = 0;

        const checkInterval = setInterval(() => {
          const element =
            iframe.contentWindow.document.getElementById("printable-area");

          if (element) {
            clearInterval(checkInterval);

            const opt = {
              margin: [0, 0, 0, 0],
              filename: `Invoice Penjualan-${sc.no_sj}-${sc.customer_name}.pdf`,
              image: { type: "png", quality: 1.0 },
              html2canvas: {
                scale: 3,
                useCORS: true,
                logging: false,
              },
              jsPDF: {
                unit: "mm",
                format: "a4",
                orientation: "portrait",
              },
            };

            html2pdf()
              .from(element)
              .set(opt)
              .save()
              .then(() => {
                document.body.removeChild(iframe);
                Swal.close();
              });
          } else {
            attempts++;
            if (attempts > maxAttempts) {
              clearInterval(checkInterval);
              document.body.removeChild(iframe);
              Swal.fire(
                "Error",
                "Gagal memuat konten invoice untuk PDF.",
                "error"
              );
            }
          }
        }, 250);
      };
    } catch (err) {
      console.error(err);
      if (iframe) document.body.removeChild(iframe);
      Swal.fire("Error", err.message || "Gagal memproses PDF", "error");
    }
  }

  async function handleUnsetInvoice(sc) {
    try {
      const result = await Swal.fire({
        title: "Batalkan Invoice?",
        text: `Apakah anda yakin ingin membatalkan invoice VIA dengan ID ${sc.id}?`,
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
        <h1 class="text-2xl font-bold">Invoice Penjualan (VIA)</h1>
      </div>
      <SearchSortFilter
        sortOptions={[
          { label: "No SJ", value: "no_sj" },
          { label: "Tanggal", value: "created_at" },
          { label: "No PL", value: "no_pl" },
          { label: "Nama Customer", value: "customer_name" },
          { label: "Satuan Unit", value: "satuan_unit_name" },
          { label: "Status Invoice", value: "delivered_status" },
        ]}
        filterOptions={[
          { label: "Pembelian (Pajak)", value: "/P/" },
          { label: "Pembelian (Non Pajak)", value: "/N/" },
          { label: "Supplier (PT)", value: "PT" },
          { label: "Supplier (Non-PT)", value: "NON_PT" },
          { label: "Satuan Unit (Meter)", value: "Meter" },
          { label: "Satuan Unit (Yard)", value: "Yard" },
          { label: "Status Invoice (Sudah Print)", value: 1 },
          { label: "Status Invoice (Belum Print)", value: 0 },
        ]}
        onChange={applyFilter}
      />
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
              <th class="py-2 px-2 text-center">Status VIA</th>
              <th class="py-2 px-4 text-center">Preview</th>
              <th hidden class="py-2 px-4 text-center">
                Download PDF
              </th>
              <th class="py-2 px-4 text-center">Print</th>
              <th class="py-2 px-4 text-center">Batal</th>
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
                    ? `${formatNumber(sc.summary.total_meter_all)} m`
                    : sc.satuan_unit === "Yard"
                    ? `${formatNumber(sc.summary.total_yard_all)} yd`
                    : `${formatNumber(sc.summary.total_kilogram_all)} kg`}
                </td>
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
                <td class="py-2 px-4 text-center">{getViaStatus(sc)}</td>
                <td class="py-2 px-4 text-center">
                  <button
                    class="text-blue-600 hover:underline"
                    onClick={() => handlePreview(sc)}
                    title="Preview Invoice"
                  >
                    <Eye size={25} />
                  </button>
                </td>
                <td hidden class="py-2 px-4 text-center">
                  <button
                    class="text-teal-600 hover:underline"
                    onClick={() => handleDownloadPDF(sc)}
                    title="Download Invoice sebagai PDF"
                  >
                    <FileDown size={25} />
                  </button>
                </td>
                <td class="py-2 px-4 text-center">
                  <button
                    class={
                      sc.delivered_status
                        ? "text-yellow-600 hover:underline"
                        : "text-green-600 hover:underline"
                    }
                    onClick={() => handlePrint(sc)}
                    title="Cetak / tandai sudah print"
                  >
                    <Printer size={25} />
                  </button>
                </td>
                <td class="py-2 px-4 text-center">
                  <button
                    class={
                      hasPermission("unprint_invoice") && sc.delivered_status
                        ? "px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        : "px-2 py-1 bg-gray-300 text-gray-600 rounded cursor-not-allowed"
                    }
                    disabled={
                      !hasPermission("unprint_invoice") || !sc.delivered_status
                    }
                    onClick={() => handleUnsetInvoice(sc)}
                    title={
                      !hasPermission("unprint_invoice")
                        ? "Anda tidak memiliki izin"
                        : sc.delivered_status
                        ? "Batalkan invoice"
                        : "Tidak bisa batalkan sebelum dicetak"
                    }
                  >
                    <X size={16} />
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
