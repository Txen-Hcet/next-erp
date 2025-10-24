import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { PembayaranHutangPurchaseGreige, User } from "../../../utils/financeAuth";
import Swal from "sweetalert2";
import { Edit, Trash, Eye } from "lucide-solid";
import FinanceMainLayout from "../../../layouts/FinanceMainLayout";

export default function HutangPurchaseGreigeList() {
  const [hutangPurchaseGreige, setHutangPurchaseGreige] = createSignal([]);
  const navigate = useNavigate();
  const tokUser = User.getUser();
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  const totalPages = createMemo(() =>
    Math.max(1, Math.ceil(hutangPurchaseGreige().length / pageSize))
  );

  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;
    return hutangPurchaseGreige().slice(startIndex, startIndex + pageSize);
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
      title: "Hapus data pembayaran hutang pembelian greige?",
      text: `Apakah kamu yakin ingin menghapus data pembayaran hutang pembelian greige dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      await PembayaranHutangPurchaseGreige.delete(id);

      await Swal.fire({
        title: "Terhapus!",
        text: `Data pembayaran hutang pembelian greige dengan ID ${id} berhasil dihapus.`,
        icon: "success",
        confirmButtonColor: "#6496df",
      });

      const filtered = hutangPurchaseGreige().filter((s) => s.id !== id);
      setHutangPurchaseGreige(filtered);

      if (currentPage() > Math.max(1, Math.ceil(filtered.length / pageSize))) {
        setCurrentPage(Math.max(1, Math.ceil(filtered.length / pageSize)));
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: "Gagal",
        text:
          error?.message ||
          `Gagal menghapus data pembayaran hutang pembelian greige dengan ID ${id}`,
        icon: "error",
        showConfirmButton: false,
        timer: 1200,
        timerProgressBar: true,
      });
    }
  };

  const handleGetAllHutangPurchaseGreige = async () => {
    try {
      const res = await PembayaranHutangPurchaseGreige.getAll();
      if (res?.status === 200) {
        const sortedData = (res.data || res).slice().sort((a, b) => b.id - a.id);
        setHutangPurchaseGreige(sortedData);
        setCurrentPage(1);
      } else {
        const data = res?.data ?? res ?? [];
        setHutangPurchaseGreige(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Gagal ambil data pembayaran hutang pembelian greige:", err);
      setHutangPurchaseGreige([]);
    }
  };

  createEffect(() => {
    if (tokUser?.token) {
      handleGetAllHutangPurchaseGreige();
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
          Daftar Pembayaran Hutang Pembelian Greige
        </h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/hutang-purchase-greige/form")}
        >
          + Pembayaran Hutang Pembelian Greige
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">No</th>
              <th class="py-2 px-4">No Pembayaran</th>
              <th class="py-2 px-4">No SJ</th>
              <th class="py-2 px-4">Tanggal Jatuh Tempo</th>
              <th class="py-2 px-4">No Giro</th>
              <th class="py-2 px-4">Tanggal Pengambilan Giro</th>
              <th class="py-2 px-2">Payment Method</th>
              <th class="py-2 px-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData().map((ph, index) => (
              <tr class="border-b" key={ph.id}>
                <td class="py-2 px-4">{(currentPage() - 1) * pageSize + (index + 1)}</td>
                <td class="py-2 px-4">{ph.no_pembayaran}</td>
                <td class="py-2 px-4">{ph.no_sj}</td>
                <td class="py-2 px-4">{formatTanggal(ph.tanggal_jatuh_tempo || "-")}</td>
                <td class="py-2 px-4">{ph.no_giro}</td>
                <td class="py-2 px-4">{formatTanggal(ph.tanggal_pengambilan_giro || "-")}</td>
                <td class="py-2 px-4">{ph.payment_method_name || "-"}</td>
                <td class="py-2 px-4 space-x-2">
                  <button
                    class="text-yellow-600 hover:underline mr-2"
                    onClick={() =>
                      navigate(`/hutang-purchase-greige/form?id=${ph.id}&view=true`)
                    }
                    title="View"
                  >
                    <Eye size={25} />
                  </button>
                  <button
                    class="text-blue-600 hover:underline"
                    onClick={() =>
                      navigate(
                        `/hutang-purchase-greige/form?id=${ph.id}`
                      )
                    }
                  >
                    <Edit size={25} />
                  </button>
                  <button
                    class="text-red-600 hover:underline"
                    onClick={() => handleDelete(ph.id)}
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
