import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  getAllDeliveryNotes,
  getUser,
  softDeleteDeliveryNote,
  hasPermission,
} from "../../utils/auth";
import Swal from "sweetalert2";
import { Edit, Trash, Eye } from "lucide-solid";

import SearchSortFilter from "../../components/SearchSortFilter";
import useSimpleFilter from "../../utils/useSimpleFilter";

export default function SuratJalanList() {
  const [suratJalan, setSuratJalan] = createSignal([]);
  const { filteredData, applyFilter } = useSimpleFilter(suratJalan, [
    "no_sj",
    "created_at",
    "no_pl",
    "customer_name",
    "satuan_unit_name",
    "jenis_so_name",
  ]);

  const navigate = useNavigate();
  const tokUser = getUser();
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  const formatNumber = (num, decimals = 2) => {
    if (num === null || num === undefined) return "0";
    const numValue = Number(num);
    if (isNaN(numValue)) return "0";

    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(numValue);
  };

  const totalSummary = createMemo(() => {
    const list = suratJalan();
    if (!list || list.length === 0) {
      return { meter: 0, yard: 0, kilogram: 0, kain: 0 };
    }

    return list.reduce(
      (acc, sj) => {
        acc.meter += parseFloat(sj.summary?.total_meter || 0);
        acc.yard += parseFloat(sj.summary?.total_yard || 0);
        acc.kilogram += parseFloat(sj.summary?.total_kilogram || 0);
        acc.kain += parseInt(sj.summary?.jumlah_kain || 0, 10);
        return acc;
      },
      { meter: 0, yard: 0, kilogram: 0, kain: 0 }
    );
  });

  const totalPages = createMemo(() => {
    return Math.max(1, Math.ceil(filteredData().length / pageSize));
  });

  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;
    return filteredData().slice(startIndex, startIndex + pageSize);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus surat jalan?",
      text: `Apakah kamu yakin ingin menghapus surat jalan dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        await softDeleteDeliveryNote(id, tokUser?.token);

        await Swal.fire({
          title: "Terhapus!",
          text: `Data surat jalan dengan ID ${id} berhasil dihapus.`,
          icon: "success",
          confirmButtonColor: "#6496df",
        });

        setSuratJalan(suratJalan().filter((s) => s.id !== id));
      } catch (error) {
        console.error(error);
        Swal.fire({
          title: "Gagal",
          text:
            error.message || `Gagal menghapus data surat jalan dengan ID ${id}`,
          icon: "error",

          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
        });
      }
    }
  };

  // const handleGetAllDeliveryNotes = async (tok) => {
  //   const getDataDeliveryNotes = await getAllDeliveryNotes(tok);
  //   //console.log("Respons dari getAllDeliveryNotes:", JSON.stringify(getDataDeliveryNotes, null, 2));

  //   if (getDataDeliveryNotes.status === 200) {
  //       const suratJalanList = getDataDeliveryNotes.surat_jalan_list || [];

  //     const sortedData = suratJalanList.sort(
  //       (a, b) => a.id - b.id
  //     );
  //     setSuratJalan(sortedData);
  //   }
  // };

  const handleGetAllDeliveryNotes = async (tok) => {
    try {
      const result = await getAllDeliveryNotes(tok);

      //console.log("Data SJ: ", JSON.stringify(result, null, 2))

      if (result.status === 200) {
        const suratJalanList = result.surat_jalan_list || [];
        const sortedData = suratJalanList.sort((a, b) => b.id - a.id);
        setSuratJalan(sortedData);
        applyFilter({});
      } else if (result.status === 403) {
        await Swal.fire({
          title: "Tidak Ada Akses",
          text: "Anda tidak memiliki izin untuk melihat Surat Jalan",
          icon: "warning",
          confirmButtonColor: "#6496df",
        });
        navigate("/dashboard");
      } else {
        Swal.fire({
          title: "Gagal",
          text: result.message || "Gagal mengambil data Surat Jalan",
          icon: "error",
          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
        });
      }
    } catch (error) {
      console.error("Gagal mengambil data Delivery Notes:", error);
      Swal.fire({
        title: "Gagal",
        text: error.message || "Terjadi kesalahan saat mengambil data",
        icon: "error",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
    }
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

  createEffect(() => {
    if (tokUser?.token) {
      handleGetAllDeliveryNotes(tokUser?.token);
    }
  });

  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Daftar Surat Jalan</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/deliverynote/form")}
        >
          + Tambah Surat Jalan
        </button>
      </div>
      no_sj created_at no_pl customer_name satuan_unit_name jenis_so_name
      <SearchSortFilter
        sortOptions={[
          { label: "No SJ", value: "no_sj" },
          { label: "Tanggal", value: "created_at" },
          { label: "No PL", value: "no_pl" },
          { label: "Nama Customer", value: "customer_name" },
          { label: "Satuan Unit", value: "satuan_unit_name" },
          { label: "Jenis SO", value: "jenis_so_name" },
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
              <th class="py-2 px-4">#</th>
              <th class="py-2 px-4">No. Surat Jalan</th>
              <th class="py-2 px-2">Tanggal</th>
              <th class="py-2 px-2">No. Packing List</th>
              <th class="py-2 px-2">Nama Customer</th>
              <th class="py-2 px-2">Satuan Unit</th>
              <th class="py-2 px-2">Jenis Sales Order</th>
              <th class="py-2 px-2">Jumlah Kain</th>
              <th class="py-2 px-2">Total</th>

              <th class="py-2 px-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData().map((sc, index) => (
              <tr class="border-b" key={sc.id}>
                <td class="py-2 px-4">
                  {(currentPage() - 1) * pageSize + (index + 1)}
                </td>
                <td class="py-2 px-4">{sc.no_sj}</td>
                <td class="py-2 px-4">{formatTanggalIndo(sc.created_at)}</td>
                <td class="py-2 px-4">{sc.no_pl}</td>
                <td class="py-2 px-4">{sc.customer_name}</td>
                <td class="py-2 px-4">{sc.satuan_unit}</td>
                <td class="py-2 px-4">{sc.jenis_so_name}</td>
                <td class="py-2 px-4 text-center">{sc.summary.jumlah_kain}</td>
                <td class="py-2 px-4 text-right">
                  {sc.satuan_unit === "Meter"
                    ? `${formatNumber(sc.summary.total_meter)} m`
                    : sc.satuan_unit === "Yard"
                    ? `${formatNumber(sc.summary.total_yard)} yd`
                    : `${formatNumber(sc.summary.total_kilogram)} kg`}
                </td>

                <td class="py-2 px-4 space-x-2">
                  <button
                    class="text-yellow-600 hover:underline"
                    onClick={() =>
                      navigate(`/deliverynote/form?id=${sc.id}&view=true`)
                    }
                  >
                    <Eye size={25} />
                  </button>
                  {hasPermission("edit_surat_jalan") && (
                    <button
                      class="text-blue-600 hover:underline"
                      onClick={() => navigate(`/deliverynote/form?id=${sc.id}`)}
                    >
                      <Edit size={25} />
                    </button>
                  )}
                  {hasPermission("delete_surat_jalan") && (
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
