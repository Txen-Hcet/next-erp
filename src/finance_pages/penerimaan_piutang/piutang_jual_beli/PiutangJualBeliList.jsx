import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { PenerimaanPiutangJualBeli, User } from "../../../utils/financeAuth";
import Swal from "sweetalert2";
import { Edit, Trash, Eye } from "lucide-solid";
import FinanceMainLayout from "../../../layouts/FinanceMainLayout";

import SearchSortFilter from "../../../components/SearchSortFilter";
import useSimpleFilter from "../../../utils/useSimpleFilter";

export default function PiutangJualBeliList() {
  const [penerimaanPiutang, setPenerimaanPiutang] = createSignal([]);
  const [searchActive, setSearchActive] = createSignal(false);
  const [currentSearch, setCurrentSearch] = createSignal("");
  const { filteredData, applyFilter } = useSimpleFilter(penerimaanPiutang, [
    "no_penerimaan",
    "no_sj",
    "supplier_name",
    "customer_name",
    "tanggal_jatuh_tempo",
    "tanggal_pembayaran",
    "payment_method",
  ]);
  const navigate = useNavigate();
  const tokUser = User.getUser();
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  const totalPenerimaan = createMemo(() => {
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

  const formatIDR = (val) => {
    const num = typeof val === "string" ? parseFloat(val) : (val || 0);
    if (num === 0) return "";
    
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus data penerimaan piutang jual beli?",
      text: `Apakah kamu yakin ingin menghapus data penerimaan piutang jual beli dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;

    try {
      await PenerimaanPiutangJualBeli.delete(id);

      await Swal.fire({
        title: "Terhapus!",
        text: `Data penerimaan piutang jual beli dengan ID ${id} berhasil dihapus.`,
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
          `Gagal menghapus data penerimaan piutang jual beli dengan ID ${id}`,
        icon: "error",
        showConfirmButton: false,
        timer: 1200,
        timerProgressBar: true,
      });
    }
  };

  const handleGetAllPenerimaanPiutang = async () => {
    try {
      const res = await PenerimaanPiutangJualBeli.getAll();
      if (res?.status === 200) {
        const sortedData = (res.data || res).slice().sort((a, b) => b.id - a.id);
        setPenerimaanPiutang(sortedData);
        setCurrentPage(1);
      } else {
        const data = res?.data ?? res ?? [];
        setCurrentPage(Array.isArray(data) ? data : []);
      }
        applyFilter({});  
        setCurrentPage(1);
        setSearchActive(false); // Reset search active ketika load data baru
    } catch (err) {
      console.error("Gagal ambil data penerimaan piutang jual beli:", err);
      setPenerimaanPiutang([]);
    }
  };

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
          Daftar Penerimaan Piutang Jual Beli
        </h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/piutang-jual-beli/form")}
        >
          + Penerimaan Piutang Jual Beli
        </button>
      </div>

      <div class="mb-4">
        <SearchSortFilter
          sortOptions={[
            { label: "Nama Supplier", value: "supplier_name" },
            { label: "Nama Customer", value: "customer_name" },
            { label: "Tanggal Jatuh Tempo", value: "tanggal_jatuh_tempo" },
            { label: "Tanggal Penerimaan", value: "tanggal_pembayaran" },
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
              <th class="py-2 px-4">No Penerimaan Piutang</th>
              <th class="py-2 px-4">No SJ</th>
              <th class="py-2 px-4">Nama Supplier</th>
              <th class="py-2 px-4">Nama Customer</th>
              <th class="py-2 px-4">Tanggal Jatuh Tempo</th>
              <th class="py-2 px-4">Tanggal Penerimaan</th>
              <th class="py-2 px-4">Nominal Penerimaan</th>
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
                <td class="py-2 px-4">{pp.supplier_name}</td>
                <td class="py-2 px-4">{pp.customer_name}</td>
                <td class="py-2 px-4">{formatTanggal(pp.tanggal_jatuh_tempo || "-")}</td>
                <td class="py-2 px-4">{formatTanggal(pp.tanggal_pembayaran || "-")}</td>
                <td class="py-2 px-4">{formatIDR(pp.pembayaran || "0,00")}</td>
                <td class="py-2 px-4">{pp.payment_method_name || "-"}</td>
                <td class="py-2 px-4 space-x-2">
                  <button
                    class="text-yellow-600 hover:underline mr-2"
                    onClick={() =>
                      navigate(`/piutang-jual-beli/form?id=${pp.id}&view=true`)
                    }
                    title="View"
                  >
                    <Eye size={25} />
                  </button>                  
                  <button
                    class="text-blue-600 hover:underline"
                    onClick={() =>
                      navigate(
                        `/piutang-jual-beli/form?id=${pp.id}`
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

        {filteredData().length === 0 && (
          <div class="text-center py-8 text-gray-500">
            {searchActive() ? "Tidak ada data yang sesuai dengan pencarian" : "Tidak ada data penerimaan piutang jual beli"}
          </div>
        )}

        {/* Total Pembayaran - Muncul hanya setelah search dan ada data */}
        {searchActive() && filteredData().length > 0 && (
          <div class="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <div class="flex justify-between items-center">
              <div>
                <span class="font-bold text-green-800">Total Penerimaan: </span>
              </div>
              <span class="font-bold text-green-800 text-xl">
                {formatIDR(totalPenerimaan())}
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
