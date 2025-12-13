import { createEffect, createMemo, createSignal, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../../layouts/MainLayout";
import {
  getAllOCX,
  getUser,
  softDeleteOCX,
  getAllSatuanUnits,
  getOCX,
  hasPermission,
} from "../../../utils/auth";
import Swal from "sweetalert2";
import { Edit, Eye, Trash } from "lucide-solid";
import { formatCorak } from "../../../components/CorakKainList";
import SearchSortFilter from "../../../components/SearchSortFilter";
import useSimpleFilterOCX from "../../../utils/useSimpleFilterOCX";

export default function OCXPurchaseOrderList() {
  const [orderCelups, setOrderCelups] = createSignal([]);
  const [satuanUnits, setSatuanUnits] = createSignal([]);
  const [ocxDetails, setOcxDetails] = createSignal({}); // Cache untuk detail per OCX
  const [loadingDetails, setLoadingDetails] = createSignal({}); // Loading state per OCX
  const { filteredData, applyFilter } = useSimpleFilterOCX(orderCelups, [
    "no_po_ex",
    "nama_supplier",
    "items",
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

  // Function to get satuan name by id
  const getSatuanName = (satuanUnitId) => {
    const unit = satuanUnits().find((u) => u.id == satuanUnitId);
    return unit ? unit.satuan : `ID ${satuanUnitId}`;
  };

  // Function to load OCX details
  const loadOCXDetails = async (id) => {
    if (ocxDetails()[id] || loadingDetails()[id]) return;

    setLoadingDetails((prev) => ({ ...prev, [id]: true }));

    try {
      const result = await getOCX(id, tokUser?.token);
      if (result.status === 200) {
        setOcxDetails((prev) => ({ ...prev, [id]: result.data }));
      }
    } catch (error) {
      console.error(`Failed to load OCX details for ID ${id}:`, error);
    } finally {
      setLoadingDetails((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Load details for current page items
  createEffect(() => {
    const currentItems = paginatedData();
    currentItems.forEach((item) => {
      if (!ocxDetails()[item.id] && !loadingDetails()[item.id]) {
        loadOCXDetails(item.id);
      }
    });
  });

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus OCX?",
      text: `Apakah kamu yakin ingin menghapus OCX dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        await softDeleteOCX(id, tokUser?.token);

        // Remove from UI
        const newOrderCelups = orderCelups().filter((s) => s.id !== id);
        setOrderCelups(newOrderCelups);
        
        // Remove from cache
        setOcxDetails((prev) => {
          const newDetails = { ...prev };
          delete newDetails[id];
          return newDetails;
        });

        // Trigger filter update
        applyFilter({
          search: "",
          sortField: "",
          sortOrder: "asc",
          filter: "",
        });

        await Swal.fire({
          title: "Terhapus!",
          text: `Data OCX dengan ID ${id} berhasil dihapus.`,
          icon: "success",
          confirmButtonColor: "#6496df",
          timer: 1500,
          showConfirmButton: false,
        });

      } catch (error) {
        console.error(error);
        Swal.fire({
          title: "Gagal",
          text: error.message || `Gagal menghapus data OCX dengan ID ${id}`,
          icon: "error",
          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
        });
      }
    }
  };

  const handleGetAllOCX = async (tok) => {
    try {
      const result = await getAllOCX(tok);

      if (result.status === 200) {
        const sortedData = result.data.sort((a, b) => b.id - a.id);
        setOrderCelups(sortedData);
        // Reset filter setelah mendapatkan data baru
        applyFilter({
          search: "",
          sortField: "",
          sortOrder: "asc",
          filter: "",
        });
      } else if (result.status === 403) {
        await Swal.fire({
          title: "Tidak Ada Akses",
          text: "Anda tidak memiliki izin untuk melihat OCX",
          icon: "warning",
          confirmButtonColor: "#6496df",
        });
        navigate("/dashboard");
      } else {
        Swal.fire({
          title: "Gagal",
          text: result.message || "Gagal mengambil data OCX",
          icon: "error",
          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
        });
      }
    } catch (error) {
      console.error("Error fetching OCX:", error);
      Swal.fire({
        title: "Gagal",
        text: "Terjadi kesalahan saat mengambil data OCX",
        icon: "error",
      });
    }
  };

  // Handler untuk filter dari SearchSortFilter
  const handleFilterChange = (params) => {
    const { search, sortField, sortOrder, filter } = params;
    
    // Terapkan filter langsung
    applyFilter({
      search: search || "",
      sortField: sortField || "",
      sortOrder: sortOrder || "asc",
      filter: filter || "",
    });
    
    // Reset ke halaman pertama ketika filter berubah
    setCurrentPage(1);
  };

  // Function to calculate Qty by System
  const qtyCounterbySystem = (ocxDetail, satuanUnitId) => {
    if (!ocxDetail || !ocxDetail.items || ocxDetail.items.length === 0) {
      return "Loading...";
    }

    const items = ocxDetail.items;
    let totalMeter = 0;
    let totalYard = 0;
    let totalDeliveredMeter = 0;
    let totalDeliveredYard = 0;

    items.forEach((item) => {
      totalMeter += parseFloat(item.meter_total || 0);
      totalYard += parseFloat(item.yard_total || 0);
      totalDeliveredMeter += parseFloat(item.delivered_meter_total || 0);
      totalDeliveredYard += parseFloat(item.delivered_yard_total || 0);
    });

    let sisa = 0;
    let total = 0;

    switch (parseInt(satuanUnitId)) {
      case 1: // Meter
        sisa = totalMeter - totalDeliveredMeter;
        total = totalMeter;
        break;
      case 2: // Yard
        sisa = totalYard - totalDeliveredYard;
        total = totalYard;
        break;
      default:
        return "-";
    }

    // Kalau udah habis
    if (sisa <= 0) {
      return "SELESAI";
    }

    return `${sisa.toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} / ${total.toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  onMount(async () => {
    if (tokUser?.token) {
      // Load satuan units first
      try {
        const satuanResult = await getAllSatuanUnits(tokUser.token);
        if (satuanResult.status === 200) {
          setSatuanUnits(satuanResult.data);
        }
      } catch (error) {
        console.error("Error loading satuan units:", error);
      }

      // Then load OCX data
      handleGetAllOCX(tokUser.token);
    }
  });

  // Effect untuk reset ke page 1 ketika filteredData berubah
  createEffect(() => {
    const length = filteredData().length;
  });

  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Daftar OCX</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/ordercelup-purchaseocx/form")}
        >
          + Tambah OCX
        </button>
      </div>
      
      <SearchSortFilter
        sortOptions={[
          { label: "No OCX", value: "no_po_ex" },
          { label: "Nama Supplier", value: "nama_supplier" },
          { label: "Satuan Unit", value: "satuan_unit_id" },
        ]}
        filterOptions={[
          { label: "OCX (Pajak)", value: "/P/" },
          { label: "OCX (Non Pajak)", value: "/N/" },
          { label: "Supplier (PT)", value: "PT" },
          { label: "Supplier (CV)", value: "CV" },
          { label: "Satuan (Meter)", value: "1" },
          { label: "Satuan (Yard)", value: "2" },
        ]}
        onChange={handleFilterChange}
      />
      
      <div class="w-full overflow-x-auto">
        <table class="w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">ID</th>
              <th class="py-2 px-2">No OCX</th>
              <th class="py-2 px-2">Supplier</th>
              <th class="py-2 px-2">Corak Kain</th>
              <th class="py-2 px-2 text-center">
                <div>Qty by System</div>
                <span class="text-xs text-gray-500">(Sisa / Total)</span>
              </th>
              <th class="py-2 px-2">Satuan Unit</th>
              <th class="py-2 px-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData().length === 0 ? (
              <tr>
                <td colSpan="7" class="py-4 px-4 text-center text-gray-500">
                  Tidak ada data OCX
                </td>
              </tr>
            ) : (
              paginatedData().map((po, index) => {
                const detail = ocxDetails()[po.id];
                const isLoading = loadingDetails()[po.id] && !detail;
                
                return (
                  <tr class="border-b" key={po.id}>
                    <td class="py-2 px-4">
                      {(currentPage() - 1) * pageSize + (index + 1)}
                    </td>
                    <td class="py-2 px-4">{po.no_po_ex}</td>
                    <td class="py-2 px-4">{po.nama_supplier}</td>
                    <td class="py-2 px-4">
                      {isLoading ? (
                        <span class="text-gray-500">Loading...</span>
                      ) : detail ? (
                        (() => {
                          const { display, full } = formatCorak(detail.items, {
                            maxShow: 3,
                          });
                          return (
                            <span
                              class="inline-block max-w-[260px] truncate align-middle"
                              title={full}
                            >
                              {display}
                            </span>
                          );
                        })()
                      ) : (
                        <span class="text-gray-500">-</span>
                      )}
                    </td>
                    <td
                      className={`py-2 px-4 text-center ${
                        detail && qtyCounterbySystem(detail, po.satuan_unit_id) === "SELESAI"
                          ? "text-green-500 font-bold"
                          : "text-red-500"
                      }`}
                    >
                      {isLoading ? (
                        <span class="text-gray-500">Loading...</span>
                      ) : detail ? (
                        qtyCounterbySystem(detail, po.satuan_unit_id)
                      ) : (
                        <span class="text-gray-500">-</span>
                      )}
                    </td>
                    <td class="py-2 px-4">
                      {getSatuanName(po.satuan_unit_id)}
                    </td>
                    <td class="py-2 px-4 space-x-2">
                      <button
                        class="text-yellow-600 hover:underline"
                        onClick={() =>
                          navigate(
                            `/ordercelup-purchaseocx/form?id=${po.id}&view=true`
                          )
                        }
                      >
                        <Eye size={25} />
                      </button>
                      {hasPermission("update_oc_ex") && (
                        <button
                          class="text-blue-600"
                          onClick={() =>
                            navigate(`/ordercelup-purchaseocx/form?id=${po.id}`)
                          }
                        >
                          <Edit size={25} />
                        </button>
                      )}
                      {hasPermission("delete_oc_ex") && (
                        <button
                          class="text-red-600 hover:underline"
                          onClick={() => handleDelete(po.id)}
                        >
                          <Trash size={25} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        
        {totalPages() > 1 && (
          <div class="w-full mt-8 flex justify-between space-x-2">
            <button
              class="px-3 py-1 bg-gray-200 rounded min-w-[80px] disabled:opacity-50"
              onClick={() => setCurrentPage(currentPage() - 1)}
              disabled={currentPage() === 1}
            >
              Prev
            </button>
            <span>
              Page {currentPage()} of {totalPages()}
            </span>
            <button
              class="px-3 py-1 bg-gray-200 rounded min-w-[80px] disabled:opacity-50"
              onClick={() => setCurrentPage(currentPage() + 1)}
              disabled={currentPage() === totalPages()}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}