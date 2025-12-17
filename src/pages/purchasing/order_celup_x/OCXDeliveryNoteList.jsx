import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../../layouts/MainLayout";
import {
  getAllSJOCX,
  getSJOCX,
  getUser,
  softDeleteSJOCX,
  hasPermission,
} from "../../../utils/auth";
import Swal from "sweetalert2";
import { Edit, Trash, Eye } from "lucide-solid";

import SearchSortFilter from "../../../components/SearchSortFilter";
import useSimpleFilter from "../../../utils/useSimpleFilter";

export default function OCXDeliveryNoteList() {
  const [packingOrders, setPackingOrders] = createSignal([]);
  const [loading, setLoading] = createSignal(false);
  const { filteredData, applyFilter } = useSimpleFilter(packingOrders, [
    "no_po",
    "no_sj_supplier",
    "created_at",
    "supplier_name",
    "items",
    "satuan_unit_name",
  ]);

  const navigate = useNavigate();
  const tokUser = getUser();
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  const totalPages = createMemo(() => {
    return Math.max(1, Math.ceil(filteredData().length / pageSize));
  });

  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;
    return filteredData().slice(startIndex, startIndex + pageSize);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus surat penerimaan order celup?",
      text: `Apakah kamu yakin ingin menghapus Surat Penerimaan OCX dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const deleteCustomer = await softDeleteSJOCX(
          id,
          tokUser?.token
        );

        await Swal.fire({
          title: "Terhapus!",
          text: `Data Surat Penerimaan OCX dengan ID ${id} berhasil dihapus.`,
          icon: "success",
          confirmButtonColor: "#6496df",
        });

        setPackingOrders(packingOrders().filter((s) => s.id !== id));
      } catch (error) {
        console.error(error);
        Swal.fire({
          title: "Gagal",
          text:
            error.message ||
            `Gagal menghapus data Surat Penerimaan OCX dengan ID ${id}`,
          icon: "error",
          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
        });
      }
    }
  };

  // Fetch detail untuk setiap SJOCX
  const fetchSJOCXDetails = async (sjList) => {
    setLoading(true);
    const updatedList = [];
    
    for (const sj of sjList) {
      try {
        const result = await getSJOCX(sj.id, tokUser?.token);
        if (result && result.data) {
          updatedList.push({
            ...sj,
            items: result.data.items || [],
            summary: result.data.summary || null
          });
        } else {
          updatedList.push({
            ...sj,
            items: [],
            summary: null
          });
        }
      } catch (error) {
        console.error(`Gagal mengambil detail SJOCX ${sj.id}:`, error);
        updatedList.push({
          ...sj,
          items: [],
          summary: null
        });
      }
    }
    
    setPackingOrders(updatedList);
    setLoading(false);
  };

  const handleGetAllDeliveryNotes = async (tok) => {
    try {
      setLoading(true);
      const result = await getAllSJOCX(tok);

      if (result && Array.isArray(result.data)) {
        const sortedData = result.data.sort((a, b) => b.id - a.id);
        
        // Fetch detail untuk setiap data
        await fetchSJOCXDetails(sortedData);
        applyFilter({});
      } else if (result.status === 403) {
        await Swal.fire({
          title: "Tidak Ada Akses",
          text: "Anda tidak memiliki izin untuk melihat Surat Penerimaan OCX",
          icon: "warning",
          confirmButtonColor: "#6496df",
        });
        navigate("/dashboard");
      } else {
        Swal.fire({
          title: "Gagal",
          text:
            result.message ||
            "Gagal mengambil data Surat Penerimaan OCX",
          icon: "error",
          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
        });
        setPackingOrders([]);
      }
    } catch (error) {
      console.error(
        "Gagal mengambil data Surat Penerimaan OCX",
        error
      );
      setPackingOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Hitung Qty: (total meter_order/yard_order - total meter_total/yard_total) / total
  const calculateQty = (sj) => {
    if (!sj.items || !Array.isArray(sj.items) || sj.items.length === 0) {
      return { display: "-", isSelesai: false };
    }

    const satuanUnit = sj.satuan;
    let totalOrder = 0;
    let totalReceived = 0;

    if (satuanUnit === "Meter") {
      // Jumlah yang diterima (meter_total) / jumlah yang dipesan (meter_order)
      totalOrder = sj.items.reduce((sum, item) => sum + parseFloat(item.meter_order || 0), 0);
      totalReceived = sj.items.reduce((sum, item) => sum + parseFloat(item.meter_total || 0), 0);
    } else if (satuanUnit === "Yard") {
      // Jumlah yang diterima (yard_total) / jumlah yang dipesan (yard_order)
      totalOrder = sj.items.reduce((sum, item) => sum + parseFloat(item.yard_order || 0), 0);
      totalReceived = sj.items.reduce((sum, item) => sum + parseFloat(item.yard_total || 0), 0);
    } else if (satuanUnit === "Kilogram") {
      // Jumlah yang diterima (kilogram_total) / jumlah yang dipesan (kilogram_order)
      totalOrder = sj.items.reduce((sum, item) => sum + parseFloat(item.kilogram_order || 0), 0);
      totalReceived = sj.items.reduce((sum, item) => sum + parseFloat(item.kilogram_total || 0), 0);
    } else {
      return { display: "-", isSelesai: false };
    }

    // Format dengan 2 desimal
    const formattedOrder = totalOrder.toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    
    const formattedReceived = totalReceived.toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return {
      display: `${formattedReceived} / ${formattedOrder}`,
      isSelesai: totalReceived >= totalOrder,
      totalOrder: formattedOrder,
      totalReceived: formattedReceived
    };
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

  // Helper function to get unique values from array
  const getUniqueValues = (array) => {
    return [...new Set(array.filter(item => item && item.trim() !== ""))];
  };

  // Format kode warna ex (kode_warna_ex) - Hanya tampilkan nilai unik
  const formatKodeWarnaEx = (items, options = { maxShow: 3 }) => {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return { display: "-", full: "-" };
    }

    // Ambil semua kode_warna_ex yang valid, lalu ambil nilai unik
    const allWarna = items
      .map((item) => item.kode_warna_ex)
      .filter(warna => warna && warna.trim() !== "");
    
    // Gunakan Set untuk mendapatkan nilai unik
    const uniqueWarna = getUniqueValues(allWarna);
    
    if (uniqueWarna.length === 0) {
      return { display: "-", full: "-" };
    }

    const displayed = uniqueWarna.slice(0, options.maxShow);
    const full = uniqueWarna.join(", ");
    const display =
      displayed.join(", ") +
      (uniqueWarna.length > options.maxShow ? `, ...` : "");

    return { display, full };
  };

  // Format kode warna baru (kode_warna_new) - Hanya tampilkan nilai unik
  const formatKodeWarnaNew = (items, options = { maxShow: 3 }) => {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return { display: "-", full: "-" };
    }

    // Ambil semua kode_warna_new yang valid, lalu ambil nilai unik
    const allWarna = items
      .map((item) => item.kode_warna_new)
      .filter(warna => warna && warna.trim() !== "");
    
    // Gunakan Set untuk mendapatkan nilai unik
    const uniqueWarna = getUniqueValues(allWarna);
    
    if (uniqueWarna.length === 0) {
      return { display: "-", full: "-" };
    }

    const displayed = uniqueWarna.slice(0, options.maxShow);
    const full = uniqueWarna.join(", ");
    const display =
      displayed.join(", ") +
      (uniqueWarna.length > options.maxShow ? `, ...` : "");

    return { display, full };
  };

  // Format corak kain dari items - Hanya tampilkan nilai unik
  const formatCorakKain = (items, options = { maxShow: 3 }) => {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return { display: "-", full: "-" };
    }

    // Ambil semua corak_kain yang valid, lalu ambil nilai unik
    const allCorak = items
      .map((item) => item.corak_kain)
      .filter(corak => corak && corak.trim() !== "");
    
    // Gunakan Set untuk mendapatkan nilai unik
    const uniqueCorak = getUniqueValues(allCorak);
    
    if (uniqueCorak.length === 0) {
      return { display: "-", full: "-" };
    }

    const displayed = uniqueCorak.slice(0, options.maxShow);
    const full = uniqueCorak.join(", ");
    const display =
      displayed.join(", ") +
      (uniqueCorak.length > options.maxShow ? `, ...` : "");

    return { display, full };
  };

  createEffect(() => {
    if (tokUser?.token) {
      handleGetAllDeliveryNotes(tokUser?.token);
    }
  });

  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Daftar Surat Penerimaan OCX</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/sjocx/form")}
        >
          + Tambah Surat Penerimaan OCX
        </button>
      </div>
      
      {loading() && (
        <div class="text-center py-4">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p class="mt-2 text-gray-600">Memuat data...</p>
        </div>
      )}
      
      <SearchSortFilter
        sortOptions={[
          { label: "No PO", value: "no_po" },
          { label: "No SJ Supplier", value: "no_sj_supplier" },
          { label: "Tanggal", value: "created_at" },
          { label: "Nama Supplier", value: "supplier_name" },
          { label: "Corak Kain", value: "items" },
          { label: "Satuan Unit", value: "satuan_unit_name" },
        ]}
        filterOptions={[
          { label: "Pembelian (Pajak)", value: "/P/" },
          { label: "Pembelian (Non Pajak)", value: "/N/" },
          { label: "Supplier (PT)", value: "PT" },
          { label: "Supplier (Non-PT)", value: "NON_PT" },
          { label: "Satuan Unit (Meter)", value: "Meter" },
          { label: "Satuan Unit (Yard)", value: "Yard" },
        ]}
        onChange={applyFilter}
      />
      <div class="w-full overflow-x-auto">
        <table class="w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">ID</th>
              <th class="py-2 px-2">No Surat Penerimaan OCX</th>
              <th class="py-2 px-2">No OCX</th>
              <th class="py-2 px-2">No Surat Jalan Supplier</th>
              <th class="py-2 px-2">Tanggal</th>
              <th class="py-2 px-2">Supplier</th>
              <th class="py-2 px-2">Corak Kain</th>
              <th class="py-2 px-2">Kode Warna Ex</th>
              <th class="py-2 px-2">Kode Warna Baru</th>
              <th class="py-2 px-2 text-center">
                <div>Qty by System</div>
                <span class="text-xs text-gray-500">
                  (Total - Total Diproses / Total)
                </span>
              </th>
              <th class="py-2 px-2">Satuan Unit</th>
              <th class="py-2 px-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {!loading() && paginatedData().map((sj, index) => {
              const qty = calculateQty(sj);
              const corak = formatCorakKain(sj.items, { maxShow: 3 });
              const warnaEx = formatKodeWarnaEx(sj.items, { maxShow: 3 });
              const warnaNew = formatKodeWarnaNew(sj.items, { maxShow: 3 });
              
              return (
                <tr class="border-b" key={sj.id}>
                  <td class="py-2 px-4">
                    {(currentPage() - 1) * pageSize + (index + 1)}
                  </td>
                  <td class="py-2 px-4">{sj.no_sj_ex}</td>
                  <td class="py-2 px-4">{sj.no_po_ex}</td>
                  <td class="py-2 px-4">{sj.no_sj_supplier}</td>
                  <td class="py-2 px-4">{formatTanggalIndo(sj.created_at)}</td>
                  <td class="py-2 px-4">{sj.nama_supplier}</td>
                  <td class="py-2 px-4">
                    <span
                      class="inline-block max-w-[260px] truncate align-middle"
                      title={corak.full}
                    >
                      {corak.display}
                    </span>
                  </td>
                  {/* Kode Warna Ex */}
                  <td class="py-2 px-4">
                    <span
                      class="inline-block max-w-[200px] truncate align-middle"
                      title={warnaEx.full}
                    >
                      {warnaEx.display}
                    </span>
                  </td>
                  {/* Kode Warna Baru */}
                  <td class="py-2 px-4">
                    <span
                      class="inline-block max-w-[200px] truncate align-middle"
                      title={warnaNew.full}
                    >
                      {warnaNew.display}
                    </span>
                  </td>
                  <td class={`py-2 px-4 text-center ${qty.isSelesai ? 'text-red-500' : 'text-red-500'}`}>
                    {qty.display}
                  </td>
                  <td class="py-2 px-4">{sj.satuan}</td>
                  <td class="py-2 px-4 space-x-2">
                    <button
                      class="text-yellow-600 hover:underline"
                      onClick={() =>
                        navigate(
                          `/sjocx/form?id=${sj.id}&view=true`
                        )
                      }
                    >
                      <Eye size={25} />
                    </button>
                    {hasPermission("update_sj_ex") && (
                      <button
                        class="text-blue-600 hover:underline"
                        onClick={() =>
                          navigate(`/sjocx/form?id=${sj.id}`)
                        }
                      >
                        <Edit size={25} />
                      </button>
                    )}
                    {hasPermission("delete_sj_ex") && (
                      <button
                        class="text-red-600 hover:underline"
                        onClick={() => handleDelete(sj.id)}
                      >
                        <Trash size={25} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {!loading() && paginatedData().length === 0 && (
          <div class="text-center py-8 text-gray-500">
            Tidak ada data Surat Penerimaan OCX
          </div>
        )}
        
        <div class="w-full mt-8 flex justify-between space-x-2">
          <button
            class="px-3 py-1 bg-gray-200 rounded min-w-[80px] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setCurrentPage(currentPage() - 1)}
            disabled={currentPage() === 1 || loading()}
          >
            Prev
          </button>
          <span>
            Page {currentPage()} of {totalPages()}
          </span>
          <button
            class="px-3 py-1 bg-gray-200 rounded min-w-[80px] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setCurrentPage(currentPage() + 1)}
            disabled={currentPage() === totalPages() || loading()}
          >
            Next
          </button>
        </div>
      </div>
    </MainLayout>
  );
}