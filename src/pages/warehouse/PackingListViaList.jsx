import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  getAllPackingLists,
  getUser,
  softDeletePackingList,
  hasPermission,
} from "../../utils/auth";
import Swal from "sweetalert2";
import { Edit, Trash, Eye } from "lucide-solid";

import SearchSortFilter from "../../components/SearchSortFilter";
import useSimpleFilter from "../../utils/useSimpleFilter";

export default function PackingListViaList() {
  const [packingLists, setPackingLists] = createSignal([]);
  const [viaFilter, setViaFilter] = createSignal(null);
  const { filteredData, applyFilter } = useSimpleFilter(packingLists, [
    "no_pl",
    "no_so",
    "customer_name",
    "satuan_unit_name",
  ]);

  const navigate = useNavigate();
  const tokUser = getUser();
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

const transactionType = createMemo(() => {
    let data = filteredData();

    if (viaFilter() !== null) {
      const targetVia = viaFilter() === "1" ? 1 : 0;
      data = data.filter((c) => c.is_via === targetVia);
    }

    return data.filter(
      (c) =>
        (c.transaction_type || "").toLowerCase() === "domestik" ||
        (c.transaction_type || "").toLowerCase() === "ekspor" ||
        (c.transaction_type || "").toLowerCase() === ""
    );
  });

  const totalPages = createMemo(() => {
    return Math.max(1, Math.ceil(transactionType().length / pageSize));
  });

  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;
    return transactionType().slice(startIndex, startIndex + pageSize);
  };

  const getViaStatus = (sc) => {
    if (sc.is_via === 1) {
      return <span class="text-green-600 font-medium">VIA</span>;
    } else if (sc.is_via === 0) {
      return <span class="text-gray-600">Tidak</span>;
    } else {
      return <span class="text-gray-400">-</span>;
    }
  };

  const handleFilterChange = (filterObj) => {
    const { filter, filterType, ...otherFilters } = filterObj;
    
    if (filterType === "is_via") {
      setViaFilter(filter);
    } else {
      setViaFilter(null);
    }
    
    // Tetap terapkan filter lainnya
    applyFilter({ filter, ...otherFilters });
  };  

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus packing list VIA",
      text: `Apakah kamu yakin ingin menghapus packing list VIA dengan ID ${id}?`,
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
          text: `Data packing list VIA dengan ID ${id} berhasil dihapus.`,
          icon: "success",
          confirmButtonColor: "#6496df",
        });

        // Optional: update UI setelah hapus
        setPackingLists(packingLists().filter((s) => s.id !== id));
      } catch (error) {
        console.error(error);
        Swal.fire({
          title: "Gagal",
          text:
            error.message ||
            `Gagal menghapus data packing list VIA dengan ID ${id}`,
          icon: "error",

          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
        });
      }
    }
  };

  // const handleGetAllPackingLists = async (tok) => {
  //   try {
  //     const response = await getAllPackingLists(tok);

  //     if (response && Array.isArray(response.packing_lists)) {
  //       const sortedData = response.packing_lists.sort((a, b) => b.id - a.id);
  //       setPackingLists(sortedData);
  //     } else {
  //       setPackingLists([]);
  //     }
  //   } catch (error) {
  //     console.error("Gagal mengambil data Packling List:", error);
  //     setPackingLists([]);
  //   }
  // };

  const handleGetAllPackingLists = async (tok) => {
    try {
      const result = await getAllPackingLists(tok);

      if (result && Array.isArray(result.packing_lists)) {
        const sortedData = result.packing_lists.sort((a, b) => b.id - a.id);
        setPackingLists(sortedData);
        applyFilter({});
      } else if (result.status === 403) {
        await Swal.fire({
          title: "Tidak Ada Akses",
          text: "Anda tidak memiliki izin untuk melihat Packing List",
          icon: "warning",
          confirmButtonColor: "#6496df",
        });
        navigate("/dashboard");
      } else {
        Swal.fire({
          title: "Gagal",
          text: result.message || "Gagal mengambil data Packing List",
          icon: "error",
          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
        });
        setPackingLists([]);
      }
    } catch (error) {
      console.error("Gagal mengambil data Packing List:", error);
      setPackingLists([]);
    }
  };

  const qtyCounterbySystem = (pl, satuanUnit) => {
    let total = 0;
    let terkirim = 0;

    switch (satuanUnit) {
      case "Meter": // Meter
        total = parseFloat(pl.summary?.total_meter || 0);
        terkirim = parseFloat(pl.summary?.total_meter_dalam_proses || 0);
        break;
      case "Yard": // Yard
        total = parseFloat(pl.summary?.total_yard || 0);
        terkirim = parseFloat(pl.summary?.total_yard_dalam_proses || 0);
        break;
      case "Kilogram": // Kilogram
        total = parseFloat(pl.summary?.total_kilogram || 0);
        terkirim = parseFloat(pl.summary?.total_kilogram_dalam_proses || 0);
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
      handleGetAllPackingLists(tokUser?.token);
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
        <h1 class="text-2xl font-bold">Daftar Packing list VIA</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/packinglistvia/form")}
        >
          + Tambah Packing list VIA
        </button>
      </div>
      <SearchSortFilter
        sortOptions={[
          { label: "No PL", value: "no_pl" },
          { label: "No SO", value: "no_so" },
          { label: "Nama Customer", value: "customer_name" },
          { label: "Satuan Unit", value: "satuan_unit_name" },
        ]}
        filterOptions={[
          { label: "Pembelian (Pajak)", value: "/P/" },
          { label: "Pembelian (Non Pajak)", value: "/N/" },
          { label: "Customer (PT)", value: "PT" },
          { label: "Customer (Non-PT)", value: "NON_PT" },
          { label: "Satuan Unit (Meter)", value: "Meter" },
          { label: "Satuan Unit (Yard)", value: "Yard" },
          { label: "Status VIA (Ya)", value: "1", type: "is_via" },
          { label: "Status VIA (Tidak)", value: "0", type: "is_via" },
        ]}
        onChange={handleFilterChange}
      />
      <div class="w-full overflow-x-auto">
        <table class="w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">ID</th>
              <th class="py-2 px-2">No Packing List</th>
              <th class="py-2 px-2">No Sales Order</th>
              <th class="py-2 px-2">Nama Customer</th>
              <th class="py-2 px-2">Status VIA</th>
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
            {paginatedData().map((pl, index) => (
              <tr class="border-b" key={pl.id}>
                <td class="py-2 px-4">
                  {(currentPage() - 1) * pageSize + (index + 1)}
                </td>
                <td class="py-2 px-4">{pl.no_pl}</td>
                <td class="py-2 px-4">{pl.no_so}</td>
                <td class="py-2 px-4">{pl.customer_name}</td>
                <td class="py-2 px-4 text-center">
                  {getViaStatus(pl)}
                </td>
                <td
                  className={`py-2 px-4 text-center ${
                    qtyCounterbySystem(pl, pl.satuan_unit) === "SELESAI"
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {qtyCounterbySystem(pl, pl.satuan_unit)}
                </td>
                <td class="py-2 px-4">{pl.satuan_unit}</td>
                <td class="py-2 px-4 space-x-2">
                  <button
                    class="text-yellow-600 hover:underline"
                    onClick={() =>
                      navigate(`/packinglistvia/form?id=${pl.id}&view=true`)
                    }
                  >
                    <Eye size={25} />
                  </button>
                  {hasPermission("edit_packing_lists") && (
                    <button
                      class="text-blue-600 hover:underline"
                      onClick={() => navigate(`/packinglistvia/form?id=${pl.id}`)}
                    >
                      <Edit size={25} />
                    </button>
                  )}
                  {hasPermission("delete_packing_lists") && (
                    <button
                      class="text-red-600 hover:underline"
                      onClick={() => handleDelete(pl.id)}
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
