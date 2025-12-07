import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  getAllFabrics,
  getAllSalesContracts,
  getUser,
  softDeleteCustomer,
  softDeleteSalesContract,
  hasPermission,
} from "../../utils/auth";
import Swal from "sweetalert2";
import { Edit, Eye, Trash } from "lucide-solid";

import SearchSortFilter from "../../components/SearchSortFilter";
import useSimpleFilter from "../../utils/useSimpleFilter";

export default function SalesContractList() {
  const [salesContracts, setSalesContracts] = createSignal([]);
  const { filteredData, applyFilter } = useSimpleFilter(salesContracts, [
    "no_sc",
    "created_at",
    "customer_name",
    "satuan_unit_name",
  ]);

  const navigate = useNavigate();
  const tokUser = getUser();
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

const transactionType = createMemo(() =>
    filteredData().filter(
      (c) =>
        (c.transaction_type || "").toLowerCase() === "domestik" &&
        // Izinkan jika 0, false, atau fieldnya tidak ada (null/undefined)
        (c.is_via === 0 || c.is_via === false || c.is_via == null)
    )
  );

  const totalPages = createMemo(() => {
    return Math.max(1, Math.ceil(transactionType().length / pageSize));
  });

  const paginatedData = () => {
    const start = (currentPage() - 1) * pageSize;
    return transactionType().slice(start, start + pageSize);
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
        const deleteCustomer = await softDeleteSalesContract(
          id,
          tokUser?.token
        );

        await Swal.fire({
          title: "Terhapus!",
          text: `Data sales contract dengan ID ${id} berhasil dihapus.`,
          icon: "success",
          confirmButtonColor: "#6496df",
        });

        // Optional: update UI setelah hapus
        setSalesContracts(salesContracts().filter((s) => s.id !== id));
      } catch (error) {
        console.error(error);
        Swal.fire({
          title: "Gagal",
          text:
            error.message ||
            `Gagal menghapus data sales contract dengan ID ${id}`,
          icon: "error",

          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
        });
      }
    }
  };

  const handleGetAllSalesContracts = async (tok) => {
    const getDataSalesContracts = await getAllSalesContracts(tok);

    //console.log("Data Sales Contract Lokal: ", JSON.stringify(getDataSalesContracts, null, 2));

    if (getDataSalesContracts.status === 200) {
      const sortedData = getDataSalesContracts.contracts.sort(
        (a, b) => b.id - a.id
      );
      setSalesContracts(sortedData);
      applyFilter({});
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
      return <span class="text-green-500">SELESAI</span>;
    }

    return `${sisa.toLocaleString("id-ID")} / ${total.toLocaleString("id-ID")}`;
  };

  const qtyCounterbySystem = (sc, satuanUnit) => {
    let total = 0;
    let terkirim = 0;

    switch (satuanUnit) {
      case 1: // Meter
        total = parseFloat(sc.summary?.total_meter || 0);
        terkirim = parseFloat(sc.summary?.total_meter_dalam_proses || 0);
        break;
      case 2: // Yard
        total = parseFloat(sc.summary?.total_yard || 0);
        terkirim = parseFloat(sc.summary?.total_yard_dalam_proses || 0);
        break;
      case 3: // Kilogram
        total = parseFloat(sc.summary?.total_kilogram || 0);
        terkirim = parseFloat(sc.summary?.total_kilogram_dalam_proses || 0);
        break;
      default:
        return "-";
    }

    const sisa = total - terkirim;

    // Kalau udah habis
    if (sisa <= 0) {
      return <span class="text-green-500">SELESAI</span>;
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

  const getCorakName = (sc) => {
    // pastikan sales contract ada items
    if (!sc.items || sc.items.length === 0) return "-";

    const corakId = parseInt(sc.items[0].corak_kain);

    const kain = allFabrics().find((f) => parseInt(f.id) === corakId);

    return kain?.corak || "-";
  };

  createEffect(() => {
    if (tokUser?.token) {
      handleGetAllSalesContracts(tokUser?.token);
    }
  });

  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Daftar Sales Contract (Lokal)</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/salescontract/form")}
        >
          + Tambah Sales Contract
        </button>
      </div>
      <SearchSortFilter
        sortOptions={[
          { label: "No SC", value: "no_sc" },
          { label: "Tanngal", value: "created_at" },
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
        ]}
        onChange={applyFilter}
      />
      <div class="w-full overflow-x-auto">
        <table class="w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">ID</th>
              <th class="py-2 px-2">No Pesanan</th>
              <th class="py-2 px-2">Tanggal</th>
              <th class="py-2 px-2">Nama Customer</th>
              <th class="py-2 px-2">Satuan</th>
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
            {paginatedData().map((sc, index) => (
              <tr class="border-b" key={sc.id}>
                <td class="py-2 px-4">
                  {(currentPage() - 1) * pageSize + (index + 1)}
                </td>
                <td class="py-2 px-4">{sc.no_sc}</td>
                <td class="py-2 px-4">{formatTanggalIndo(sc.created_at)}</td>
                <td class="py-2 px-4">{sc.customer_name}</td>
                <td class="py-2 px-4">{sc.satuan_unit_name}</td>
                <td class="py-2 px-4 text-red-500 text-center">
                  {/* {parseFloat(sc.summary.total_meter_kontrak || 0) -
                    parseFloat(sc.summary.total_meter_terkirim || 0)}{" "}
                  <span class="text-black">
                    / {parseFloat(sc.summary.total_meter_kontrak || 0)}
                  </span> */}
                  {qtyCounterReal(sc, sc.satuan_unit_id)}
                </td>
                <td class="py-2 px-4 text-red-500 text-center">
                  {qtyCounterbySystem(sc, sc.satuan_unit_id)}
                </td>
                <td class="py-2 px-4 space-x-2">
                  <button
                    class="text-yellow-600 hover:underline"
                    onClick={() =>
                      navigate(`/salescontract/form?id=${sc.id}&view=true`)
                    }
                  >
                    <Eye size={25} />
                  </button>
                  {hasPermission("edit_sales_contracts") && (
                    <button
                      class="text-blue-600 hover:underline"
                      onClick={() =>
                        navigate(`/salescontract/form?id=${sc.id}`)
                      }
                    >
                      <Edit size={25} />
                    </button>
                  )}
                  {sc.is_create_updated === 0 && (
                    <button
                      class="text-green-600 hover:underline"
                      onClick={() =>
                        navigate(`/salescontract/form?id=${sc.id}&quick_edit=true`)
                      }
                    >
                      <Edit size={25} />
                    </button>
                  )}
                  {hasPermission("delete_sales_contracts") && (
                    <button
                      class="text-red-600 hover:underline"
                      onClick={() => handleDelete(sc.id)}
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
