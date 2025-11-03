// src/pages/retur/ReturJualBeliList.jsx
import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  getAllJualBeliReturs,
  getUser,
  softDeleteJualBeliRetur,
  hasPermission,
} from "../../utils/auth";
import Swal from "sweetalert2";
import { Eye, Edit, Trash } from "lucide-solid";

import SearchSortFilter from "../../components/SearchSortFilter";
import useSimpleFilter from "../../utils/useSimpleFilter";

export default function ReturJualBeliList() {
  const [returs, setReturs] = createSignal([]);
  const { filteredData, applyFilter } = useSimpleFilter(returs, [
    "no_retur",
    "no_sj",
    "created_at",
    "supplier_name",
    "satuan_unit_name",
  ]);

  const navigate = useNavigate();
  const tokUser = getUser();

  // // ---- permissions (opsional; contoh seperti KJ, sementara dimatikan) ----
  // const canCreate = () => hasPermission("purchase-jb-retur.create");
  // const canEdit   = () => hasPermission("purchase-jb-retur.update");
  // const canDelete = () => hasPermission("purchase-jb-retur.delete");

  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  const totalPages = createMemo(() =>
    Math.max(1, Math.ceil((filteredData().length || 0) / pageSize))
  );

  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;
    return filteredData().slice(startIndex, startIndex + pageSize);
  };

  const handleGetAllData = async (tok) => {
    try {
      const result = await getAllJualBeliReturs(tok);
      if (Array.isArray(result?.data)) {
        const sorted = result.data.sort((a, b) => b.id - a.id);
        setReturs(sorted);
        applyFilter({});
        const newTotal = Math.max(1, Math.ceil(sorted.length / pageSize));
        if (currentPage() > newTotal) setCurrentPage(newTotal);
      } else if (result?.status === 403) {
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
          text: result?.message || "Gagal mengambil data Retur Jual Beli",
          icon: "error",
          showConfirmButton: false,
          timer: 1200,
          timerProgressBar: true,
        });
        setReturs([]);
      }
    } catch (error) {
      console.error("Gagal mengambil data Retur Jual Beli:", error);
      setReturs([]);
    }
  };

  const fmtNum = (n) => (Number(n) || 0).toLocaleString("id-ID");
  const totalCounter = (row) => {
    const unit = String(
      row?.satuan_unit_name || row?.satuan_unit || ""
    ).toLowerCase();
    if (unit === "meter") return fmtNum(row?.summary?.total_meter ?? 0);
    if (unit === "yard") return fmtNum(row?.summary?.total_yard ?? 0);
    return fmtNum(row?.summary?.total_meter ?? 0);
  };

  const lotLabel = (row, maxShow = 3) => {
    const lots = (row?.items || [])
      .map((it) => it?.lot)
      .filter((v) => v !== null && v !== undefined && v !== "");
    const uniq = [...new Set(lots)];
    if (uniq.length === 0) return { text: "-", tooltip: "" };

    const shown = uniq.slice(0, maxShow).join(", ");
    const hiddenCount = Math.max(0, uniq.length - maxShow);
    const text = hiddenCount > 0 ? `${shown} +${hiddenCount}` : shown;
    const tooltip = uniq.join(", ");
    return { text, tooltip };
  };

  createEffect(() => {
    if (tokUser?.token) handleGetAllData(tokUser?.token);
  });

  function formatTanggalIndo(tanggalString) {
    if (!tanggalString) return "-";
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
    return `${tanggal.getDate()} ${
      bulanIndo[tanggal.getMonth()]
    } ${tanggal.getFullYear()}`;
  }

  const handleView = (row) => {
    navigate(`/retur-jualbeli/form?id=${row.id}&view=true`);
  };

  const handleEdit = (row) => {
    // if (!canEdit()) return; // dimatikan
    navigate(`/retur-jualbeli/form?id=${row.id}`);
  };

  const handleDelete = async (row) => {
    // if (!canDelete()) return; // dimatikan
    const confirm = await Swal.fire({
      title: "Hapus Retur?",
      text: `Kamu yakin mau menghapus Retur Jual Beli dengan \nID: ${row.id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#e3342f",
    });
    if (!confirm.isConfirmed) return;

    try {
      await softDeleteJualBeliRetur(tokUser?.token, row.id);
      await Swal.fire({
        icon: "success",
        title: "Terhapus",
        text: `Data Retur Jual Beli dengan ID ${row.id} berhasil dihapus.`,
        showConfirmButton: false,
        timer: 900,
        timerProgressBar: true,
      });
      handleGetAllData(tokUser?.token);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Gagal Menghapus",
        text: err?.message || "Terjadi kesalahan saat menghapus retur.",
        showConfirmButton: false,
        timer: 1300,
        timerProgressBar: true,
      });
    }
  };

  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Retur Jual Beli</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/retur-jualbeli/form")}
          // hidden={!canCreate()} // dimatikan
        >
          Tambah Retur Jual Beli
        </button>
      </div>
      <SearchSortFilter
        sortOptions={[
          { label: "No Retur", value: "no_retur" },
          { label: "No Surat Penerimaan", value: "no_sj" },
          { label: "Tanggal", value: "created_at" },
          { label: "Nama Supplier", value: "supplier_name" },
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
              <th class="py-2 px-2">No Surat Penerimaan</th>
              <th class="py-2 px-2">Tanggal</th>
              <th class="py-2 px-2">Lot</th>
              <th class="py-2 px-2">Supplier</th>
              <th class="py-2 px-2">Total</th>
              <th class="py-2 px-2">Satuan Unit</th>
              <th class="py-2 px-4">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {paginatedData().map((row, index) => {
              const { text: lotTxt, tooltip } = lotLabel(row, 3);
              return (
                <tr class="border-b" key={row.id}>
                  <td class="py-2 px-4">
                    {(currentPage() - 1) * pageSize + (index + 1)}
                  </td>
                  <td class="py-2 px-4">{row.no_retur}</td>
                  <td class="py-2 px-4">{row.no_sj}</td>
                  <td class="py-2 px-4">
                    {formatTanggalIndo(row.created_at || row.tanggal_kirim)}
                  </td>
                  <td class="py-2 px-4">
                    <span class="cursor-help" title={tooltip || undefined}>
                      {lotTxt}
                    </span>
                  </td>
                  <td class="py-2 px-4">{row.supplier_name}</td>
                  <td class="py-2 px-4">{totalCounter(row)}</td>
                  <td class="py-2 px-4">
                    {row.satuan_unit_name || row.satuan_unit}
                  </td>

                  <td class="py-2 px-4">
                    <button
                      class="text-yellow-600 hover:underline mr-2"
                      onClick={() => handleView(row)}
                      title="View"
                    >
                      <Eye size={25} />
                    </button>

                    <Show when={hasPermission("edit_jual_beli_retur")}>
                      <button
                        class="text-blue-600 hover:underline mr-2"
                        onClick={() => handleEdit(row)}
                        title="Edit"
                      >
                        <Edit size={25} />
                      </button>
                    </Show>

                    <Show when={hasPermission("delete_jual_beli_retur")}>
                      <button
                        class="text-red-600 hover:underline"
                        onClick={() => handleDelete(row)}
                        title="Delete"
                      >
                        <Trash size={25} />
                      </button>
                    </Show>
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
