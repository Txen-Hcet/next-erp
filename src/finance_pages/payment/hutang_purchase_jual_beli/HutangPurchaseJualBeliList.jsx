import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { PembayaranHutangPurchaseJualBeli, User } from "../../../utils/financeAuth";
import Swal from "sweetalert2";
import { Edit, Trash, Eye } from "lucide-solid";
import FinanceMainLayout from "../../../layouts/FinanceMainLayout";

import SearchSortFilter from "../../../components/SearchSortFilter";
import useSimpleFilter from "../../../utils/useSimpleFilter";

export default function HutangPurchaseJualBeliList() {
  const [hutangPurchaseJualBeli, setHutangPurchaseJualBeli] = createSignal([]);
  const [searchActive, setSearchActive] = createSignal(false);
    const [currentSearch, setCurrentSearch] = createSignal("");
    const { filteredData, applyFilter } = useSimpleFilter(hutangPurchaseJualBeli, [
      "no_pembayaran",
      "no_sj",
      "tanggal_jatuh_tempo",
      "no_giro",
      "tanggal_pengambilan_giro",
      "payment_method",
    ]);  
  const navigate = useNavigate();
  const tokUser = User.getUser();
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  // Hitung total pembayaran dari data yang difilter
  const totalPembayaran = createMemo(() => {
    const data = filteredData();
    return data.reduce((sum, item) => sum + parseFloat(item.pembayaran || 0), 0);
  });

  const totalPages = createMemo(() =>
    Math.max(1, Math.ceil(filteredData().length / pageSize))
  );

  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;
    return filteredData().slice(startIndex, startIndex + pageSize);
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
      title: "Hapus data pembayaran hutang jual beli?",
      text: `Apakah kamu yakin ingin menghapus data pembayaran hutang jual beli dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      await PembayaranHutangPurchaseJualBeli.delete(id);

      await Swal.fire({
        title: "Terhapus!",
        text: `Data pembayaran hutang jual beli dengan ID ${id} berhasil dihapus.`,
        icon: "success",
        confirmButtonColor: "#6496df",
      });

      const filtered = hutangPurchaseJualBeli().filter((s) => s.id !== id);
      setHutangPurchaseJualBeli(filtered);

      if (currentPage() > Math.max(1, Math.ceil(filtered.length / pageSize))) {
        setCurrentPage(Math.max(1, Math.ceil(filtered.length / pageSize)));
      }
    } catch (error) {
      console.error(error);
      Swal.fire({
        title: "Gagal",
        text:
          error?.message ||
          `Gagal menghapus data pembayaran hutang jual beli dengan ID ${id}`,
        icon: "error",
        showConfirmButton: false,
        timer: 1200,
        timerProgressBar: true,
      });
    }
  };

  const handleGetAllHutangPurchaseJualBeli = async () => {
    try {
      const res = await PembayaranHutangPurchaseJualBeli.getAll();
      if (res?.status === 200) {
        const data = res.data || res;
        const sortedData = (Array.isArray(data) ? data : []).slice().sort((a, b) => b.id - a.id);
        
        if (sortedData.length > 0 && !sortedData[0].pembayaran) {
          const enrichedData = await Promise.all(
            sortedData.map(async (item) => {
              try {
                const detail = await PembayaranHutangPurchaseJualBeli.getById(item.id);
                return {
                  ...item,
                  pembayaran: detail.data?.pembayaran || detail?.pembayaran || 0
                };
              } catch (err) {
                console.error(`Gagal mengambil detail untuk ID ${item.id}:`, err);
                return { ...item, pembayaran: 0 };
              }
            })
          );
          setHutangPurchaseJualBeli(enrichedData);
        } else {
          setHutangPurchaseJualBeli(sortedData);
        }
        
        applyFilter({});
        setCurrentPage(1);
        setSearchActive(false); // Reset search active ketika load data baru
      } else {
        const data = res?.data ?? res ?? [];
        setHutangPurchaseJualBeli(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Gagal ambil data pembayaran hutang pembelian jual beli:", err);
      setHutangPurchaseJualBeli([]);
    }
  };

  function formatIDR(amount) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 2,
    }).format(amount || 0);
  }

  // Handle ketika search/filter diaplikasikan
  const handleFilterChange = (filters) => {
    applyFilter(filters);
    
    // Cek apakah ada pencarian aktif
    const hasSearch = filters.search && filters.search.trim() !== "";
    const hasFilter = filters.filter && filters.filter !== "";
    
    setSearchActive(hasSearch || hasFilter);
    setCurrentSearch(filters.search || "");
  };

  // Reset search
  const handleResetSearch = () => {
    applyFilter({});
    setSearchActive(false);
    setCurrentSearch("");
  };  

  createEffect(() => {
    if (tokUser?.token) {
      handleGetAllHutangPurchaseJualBeli();
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
          Daftar Pembayaran Hutang Pembelian Jual Beli
        </h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/hutang-purchase-jual-beli/form")}
        >
          + Pembayaran Hutang Pembelian Jual Beli
        </button>
      </div>

      <div class="mb-4">
        <SearchSortFilter
          sortOptions={[
            { label: "Tanggal Jatuh Tempo", value: "tanggal_jatuh_tempo" },
            { label: "No Giro", value: "no_giro" },
            { label: "Tanggal Pengambilan Giro", value: "tanggal_pengambilan_giro" },
            { label: "Payment Method", value: "payment_method" },
          ]}
          filterOptions={[
            { label: "Order (Pajak)", value: "/P/" },
            { label: "Order (Non Pajak)", value: "/N/" },
            // { label: "Payment Method (Cash)", value: "Cash" },
            // { label: "Payment Method (Hutang)", value: "Hutang" },
            // { label: "Payment Method (Transfer)", value: "Transfer" },
          ]}
          onChange={handleFilterChange}
        />

        {/* Tombol reset search */}
        {searchActive() && (
          <div class="mt-2 flex justify-end">
            <button
              class="text-sm text-gray-600 hover:text-gray-800 underline"
              onClick={handleResetSearch}
            >
              Reset Pencarian
            </button>
          </div>
        )}
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
              <th class="py-2 px-4">Jumlah Pembayaran</th>
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
                <td class="py-2 px-4 font-medium">{formatIDR(ph.pembayaran)}</td>
                <td class="py-2 px-4">{ph.payment_method_name || "-"}</td>
                <td class="py-2 px-4 space-x-2">
                  <button
                    class="text-yellow-600 hover:underline mr-2"
                    onClick={() =>
                      navigate(`/hutang-purchase-jual-beli/form?id=${ph.id}&view=true`)
                    }
                    title="View"
                  >
                    <Eye size={25} />
                  </button>                  
                  <button
                    class="text-blue-600 hover:underline"
                    onClick={() =>
                      navigate(
                        `/hutang-purchase-jual-beli/form?id=${ph.id}`
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

        {filteredData().length === 0 && (
          <div class="text-center py-8 text-gray-500">
            {searchActive() ? "Tidak ada data yang sesuai dengan pencarian" : "Tidak ada data pembayaran hutang jual beli"}
          </div>
        )}

        {/* Total Pembayaran - Muncul hanya setelah search dan ada data */}
        {searchActive() && filteredData().length > 0 && (
          <div class="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <div class="flex justify-between items-center">
              <div>
                <span class="font-bold text-green-800">Total Pembayaran: </span>
              </div>
              <span class="font-bold text-green-800 text-xl">
                {formatIDR(totalPembayaran())}
              </span>
            </div>
          </div>
        )}           

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
