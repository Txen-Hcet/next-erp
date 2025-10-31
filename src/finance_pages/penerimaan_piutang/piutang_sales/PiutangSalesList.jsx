import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { PenerimaanPiutangSales, User } from "../../../utils/financeAuth";
import Swal from "sweetalert2";
import { Edit, Trash, Eye } from "lucide-solid";
import FinanceMainLayout from "../../../layouts/FinanceMainLayout";

export default function PiutangSalesList() {
  const [penerimaanPiutang, setPenerimaanPiutang] = createSignal([]);
  const navigate = useNavigate();
  const tokUser = User.getUser();
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  const totalPages = createMemo(() =>
    Math.max(1, Math.ceil(penerimaanPiutang().length / pageSize))
  );

  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;
    return penerimaanPiutang().slice(startIndex, startIndex + pageSize);
  };

  function formatTanggal(tanggalString) {
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

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus data penerimaan piutang sales?",
      text: `Apakah kamu yakin ingin menghapus data penerimaan piutang sales dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      await PenerimaanPiutangSales.delete(id);

      await Swal.fire({
        title: "Terhapus!",
        text: `Data penerimaan piutang sales dengan ID ${id} berhasil dihapus.`,
        icon: "success",
        confirmButtonColor: "#6496df",
      });

      const filtered = penerimaanPiutang().filter((s) => s.id !== id);
      setPenerimaanPiutang(filtered);

      if (currentPage() > Math.max(1, Math.ceil(filtered.length / pageSize))) {
        setCurrentPage(Math.max(1, Math.ceil(filtered.length / pageSize)));
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: "Gagal",
        text:
          error?.message ||
          `Gagal menghapus data penerimaan piutang sales dengan ID ${id}`,
        icon: "error",
        showConfirmButton: false,
        timer: 1200,
        timerProgressBar: true,
      });
    }
  };

  const handleGetAllPenerimaanPiutang = async () => {
    try {
      const res = await PenerimaanPiutangSales.getAll();
      if (res?.status === 200) {
        const sortedData = (res.data || res).slice().sort((a, b) => b.id - a.id);
        setPenerimaanPiutang(sortedData);
        setCurrentPage(1);
      } else {
        const data = res?.data ?? res ?? [];
        setCurrentPage(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Gagal ambil data penerimaan piutang sales:", err);
      setPenerimaanPiutang([]);
    }
  };

  createEffect(() => {
    if (tokUser?.token) {
      handleGetAllPenerimaanPiutang();
    }
  });

  const goPrev = () => {
    setCurrentPage((p) => Math.max(1, p - 1));
  };
  const goNext = () => {
    setCurrentPage((p) => Math.min(totalPages(), p + 1));
  };  

  return (
    <FinanceMainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">
          Daftar Penerimaan Piutang Penjualan (Sales)
        </h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/piutang-sales/form")}
        >
          + Penerimaan Piutang Penjualan (Sales)
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">No</th>
              <th class="py-2 px-4">No Penerimaan Piutang</th>
              <th class="py-2 px-4">No SJ</th>
              <th class="py-2 px-4">Tanggal Jatuh Tempo</th>
              <th class="py-2 px-4">Tanggal Penerimaan</th>
              <th class="py-2 px-2">Payment Method</th>
              <th class="py-2 px-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData().map((pp, index) => (
              <tr class="border-b" key={pp.id}>
                <td class="py-2 px-4">{(currentPage() - 1) * pageSize + (index + 1)}</td>
                <td class="py-2 px-4">{pp.no_penerimaan}</td>
                <td class="py-2 px-4">{pp.no_sj}</td>
                <td class="py-2 px-4">{formatTanggal(pp.tanggal_jatuh_tempo || "-")}</td>
                <td class="py-2 px-4">{formatTanggal(pp.tanggal_pembayaran || "-")}</td>
                <td class="py-2 px-4">{pp.payment_method_name || "-"}</td>
                <td class="py-2 px-4 space-x-2">
                  <button
                    class="text-yellow-600 hover:underline mr-2"
                    onClick={() =>
                      navigate(`/piutang-sales/form?id=${pp.id}&view=true`)
                    }
                    title="View"
                  >
                    <Eye size={25} />
                  </button>                  
                  <button
                    class="text-blue-600 hover:underline"
                    onClick={() =>
                      navigate(
                        `/piutang-sales/form?id=${pp.id}`
                      )
                    }
                  >
                    <Edit size={25} />
                  </button>
                  <button
                    class="text-red-600 hover:underline"
                    onClick={() => handleDelete(pp.id)}
                  >
                    <Trash size={25} />
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
    </FinanceMainLayout>
  );
}
