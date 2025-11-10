import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  getAllSalesReturs,
  softDeleteSalesRetur,
  getUser,
  hasPermission,
} from "../../utils/auth";
import Swal from "sweetalert2";
import { Eye, Edit, Trash } from "lucide-solid";

import SearchSortFilter from "../../components/SearchSortFilter";
import useSimpleFilter from "../../utils/useSimpleFilter";

export default function ReturSalesListV2() {
  const [rows, setRows] = createSignal([]);
  const { filteredData, applyFilter } = useSimpleFilter(rows, [
    "no_retur",
    "no_sj",
    "created_at",
    "customer_name",
    "satuan_unit_name",
  ]);

  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;
  const navigate = useNavigate();
  const tokUser = getUser();

  const totalPages = createMemo(() =>
    Math.max(1, Math.ceil((filteredData().length || 0) / pageSize))
  );

  const paginated = () => {
    const start = (currentPage() - 1) * pageSize;
    return filteredData().slice(start, start + pageSize);
  };

  const handleLoad = async () => {
    try {
      const res = await getAllSalesReturs(tokUser?.token);
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.returs)
        ? res.returs
        : [];
      const sorted = list.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
      setRows(sorted);
      applyFilter({});
      const newTotal = Math.max(1, Math.ceil(sorted.length / pageSize));
      if (currentPage() > newTotal) setCurrentPage(newTotal);
    } catch (e) {
      console.error(e);
      Swal.fire(
        "Gagal",
        e?.message || "Gagal mengambil data Retur Sales",
        "error"
      );
      setRows([]);
    }
  };

  createEffect(() => {
    if (tokUser?.token) handleLoad();
  });

  function fmtNum(n) {
    return (Number(n) || 0).toLocaleString("id-ID");
  }

  function fmtCurrency(n) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(n) || 0);
  }

   // Fungsi untuk mendapatkan harga dari item pertama
  function getHarga(row) {
    if (!row.items || row.items.length === 0) return 0;
    return Number(row.items[0]?.harga) || 0;
  }

  // Fungsi untuk menghitung nominal retur
  function calculateNominal(row) {
    const harga = getHarga(row);
    const unit = String(row.satuan_unit_name || row.satuan_unit || "").toLowerCase();
    
    let quantity = 0;
    if (unit === "meter") quantity = Number(row?.summary?.total_meter ?? 0);
    else if (unit === "yard") quantity = Number(row?.summary?.total_yard ?? 0);
    else if (unit === "kg" || unit === "kilogram") quantity = Number(row?.summary?.total_kilogram ?? 0);
    else quantity = Number(row?.summary?.total_meter ?? 0);
    
    return harga * quantity;
  }

  function totalCounter(row) {
    const unit = String(
      row?.satuan_unit_name || row?.satuan_unit || ""
    ).toLowerCase();
    if (unit === "meter") return fmtNum(row?.summary?.total_meter ?? 0);
    if (unit === "yard") return fmtNum(row?.summary?.total_yard ?? 0);
    if (unit === "kg" || unit === "kilogram")
      return fmtNum(row?.summary?.total_kilogram ?? 0);
    return fmtNum(row?.summary?.total_meter ?? 0);
    // sesuaikan dengan summary yang dikirim backend
  }

  function formatTanggalIndo(s) {
    if (!s) return "-";
    const d = new Date(s);
    const bulan = [
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
    return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
  }

  const handleView = (row) =>
    navigate(`/retur-sales/form?id=${row.id}&view=true`);
  const handleEdit = (row) => navigate(`/retur-sales/form?id=${row.id}`); // aktifkan jika ada form edit
  const handleDelete = async (row) => {
    const ok = await Swal.fire({
      title: "Hapus Retur Sales?",
      text: `Yakin hapus retur dengan ID: ${row.id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#e3342f",
    });
    if (!ok.isConfirmed) return;
    try {
      await softDeleteSalesRetur(tokUser?.token, row.id);
      await Swal.fire({
        icon: "success",
        title: "Terhapus",
        timer: 900,
        showConfirmButton: false,
      });
      handleLoad();
    } catch (e) {
      Swal.fire(
        "Gagal",
        e?.message || "Terjadi kesalahan saat menghapus retur.",
        "error"
      );
    }
  };

  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Retur Sales</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/retur-sales/form")}
        >
          Tambah Retur Sales
        </button>
      </div>
      <SearchSortFilter
        sortOptions={[
          { label: "No Retur", value: "no_retur" },
          { label: "No Surat Jalan", value: "no_sj" },
          { label: "Tanggal", value: "created_at" },
          { label: "Nama Customer", value: "customer_name" },
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
              <th class="py-2 px-2">No Retur</th>
              <th class="py-2 px-2">No Surat Jalan</th>
              <th class="py-2 px-2">Tanggal</th>
              <th class="py-2 px-2">Customer</th>
              <th class="py-2 px-2">Quantity</th>
              <th class="py-2 px-2">Satuan</th>
              <th class="py-2 px-2">Harga</th>
              <th class="py-2 px-2">Nominal Retur</th>
              <th class="py-2 px-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginated().map((row, idx) => (
              <tr class="border-b" key={row.id}>
                <td class="py-2 px-4">
                  {(currentPage() - 1) * pageSize + (idx + 1)}
                </td>
                <td class="py-2 px-2">{row.no_retur}</td>
                <td class="py-2 px-2">{row.no_sj}</td>
                <td class="py-2 px-2">{formatTanggalIndo(row.created_at)}</td>
                <td class="py-2 px-2">{row.customer_name}</td>
                <td class="py-2 px-2">{totalCounter(row)}</td>
                <td class="py-2 px-2">
                  {row.satuan_unit_name || row.satuan_unit}
                </td>
                <td class="py-2 px-2">{fmtCurrency(getHarga(row))}</td>
                <td class="py-2 px-2">{fmtCurrency(calculateNominal(row))}</td>
                <td class="py-2 px-4">
                  <button
                    class="text-yellow-600 mr-2"
                    onClick={() => handleView(row)}
                    title="View"
                  >
                    <Eye size={25} />
                  </button>
                  <Show when={hasPermission("edit_sales_retur")}>
                    <button
                      class="text-blue-600 mr-2"
                      onClick={() => handleEdit(row)}
                      title="Edit"
                    >
                      <Edit size={25} />
                    </button>
                  </Show>
                  <Show when={hasPermission("delete_sales_retur")}>
                    <button
                      class="text-red-600"
                      onClick={() => handleDelete(row)}
                      title="Delete"
                    >
                      <Trash size={25} />
                    </button>
                  </Show>
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
