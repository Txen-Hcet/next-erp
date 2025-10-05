import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  getAllFinishReturs,
  getUser,
  hasPermission,
  softDeleteFinishRetur,
} from "../../utils/auth";
import Swal from "sweetalert2";
import { Eye, Edit, Trash } from "lucide-solid";

export default function ReturKainJadiList() {
  const [returs, setReturs] = createSignal([]);
  const navigate = useNavigate();
  const tokUser = getUser();

  // // ---- permissions (dimatikan sementara) ----
  // const canCreate = () => hasPermission("purchase-finish-retur.create");
  // const canEdit   = () => hasPermission("purchase-finish-retur.update");
  // const canDelete = () => hasPermission("purchase-finish-retur.delete");

  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  const totalPages = createMemo(() =>
    Math.max(1, Math.ceil((returs().length || 0) / pageSize))
  );

  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;
    return returs().slice(startIndex, startIndex + pageSize);
  };

  const handleGetAllData = async (tok) => {
    try {
      const result = await getAllFinishReturs(tok);
      if (Array.isArray(result?.data)) {
        const sorted = result.data.sort((a, b) => b.id - a.id);
        setReturs(sorted);
        const newTotal = Math.max(1, Math.ceil(sorted.length / pageSize));
        if (currentPage() > newTotal) setCurrentPage(newTotal);
      } else if (result?.status === 403) {
        await Swal.fire({
          title: "Tidak Ada Akses",
          text: "Anda tidak memiliki izin untuk melihat Retur Pembelian Kain Jadi",
          icon: "warning",
          confirmButtonColor: "#6496df",
        });
        navigate("/dashboard");
      } else {
        Swal.fire({
          title: "Gagal",
          text: result?.message || "Gagal mengambil data Retur Kain Jadi",
          icon: "error",
          showConfirmButton: false,
          timer: 1200,
          timerProgressBar: true,
        });
        setReturs([]);
      }
    } catch (error) {
      console.error("Gagal mengambil data Retur Kain Jadi:", error);
      setReturs([]);
    }
  };

  const fmtNum = (n) => (Number(n) || 0).toLocaleString("id-ID");
  const totalCounter = (row) => {
    const unit = String(row?.satuan_unit_name || "").toLowerCase();
    if (unit === "meter") return fmtNum(row?.summary?.total_meter ?? 0);
    if (unit === "yard")  return fmtNum(row?.summary?.total_yard ?? 0);
    return fmtNum(row?.summary?.total_meter ?? 0);
  };

  const lotLabel = (row, maxShow = 3) => {
    const lots = (row?.items || [])
      .map((it) => it?.lot)
      .filter((v) => v !== null && v !== undefined);
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
      "Januari","Februari","Maret","April","Mei","Juni",
      "Juli","Agustus","September","Oktober","November","Desember",
    ];
    return `${tanggal.getDate()} ${bulanIndo[tanggal.getMonth()]} ${tanggal.getFullYear()}`;
  }

  const handleView = (row) => {
    navigate(`/retur-kainjadi/form?id=${row.id}&view=true`);
  };

  const handleEdit = (row) => {
    // if (!canEdit()) return; // dimatikan
    navigate(`/retur-kainjadi/form?id=${row.id}`);
  };

  const handleDelete = async (row) => {
    const confirm = await Swal.fire({
      title: "Hapus Retur?",
      text: `Kamu yakin mau menghapus Retur Kain Jadi dengan \nID: ${row.id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#e3342f",
    });
    if (!confirm.isConfirmed) return;

    try {
      await softDeleteFinishRetur(tokUser?.token, row.id);
      await Swal.fire({
        icon: "success",
        title: "Terhapus",
        text: `Data Retur Kain Jadi dengan ID ${row.id} berhasil dihapus.`,
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
        <h1 class="text-2xl font-bold">Retur Kain Jadi</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/retur-kainjadi/form")}
          // hidden={!canCreate()} // dimatikan
        >
          Tambah Retur Kain Jadi
        </button>
      </div>

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
                  <td class="py-2 px-4">{formatTanggalIndo(row.created_at)}</td>
                  <td class="py-2 px-4">
                    <span class="cursor-help" title={tooltip || undefined}>
                      {lotTxt}
                    </span>
                  </td>
                  <td class="py-2 px-4">{row.supplier_name}</td>
                  <td class="py-2 px-4">{totalCounter(row)}</td>
                  <td class="py-2 px-4">{row.satuan_unit_name}</td>

                  <td class="py-2 px-4">
                    <button
                      class="text-yellow-600 hover:underline mr-2"
                      onClick={() => handleView(row)}
                      title="View"
                    >
                      <Eye size={25} />
                    </button>

                    <Show when={hasPermission("edit_purchase_finish_retur")}>
                      <button
                        class="text-blue-600 hover:underline mr-2"
                        onClick={() => handleEdit(row)}
                        title="Edit"
                      >
                        <Edit size={25} />
                      </button>
                    </Show>

                    <Show when={hasPermission("delete_purchase_finish_retur")}>
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
