import { createEffect, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  getAllSalesContracts,
  getUser,
  softDeleteCustomer,
  softDeleteSalesContract,
} from "../../utils/auth";
import Swal from "sweetalert2";

export default function SalesContractList() {
  const navigate = useNavigate();
  const tokUser = getUser();

  const [salesContracts, setSalesContracts] = createSignal([]);

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
        const deleteCustomer = await softDeleteSalesContract(id, tokUser?.token);

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
          confirmButtonColor: "#6496df",
          confirmButtonText: "OK",
        });
      }
    }
  };

  const handleGetAllSalesContracts = async (tok) => {
    const getDataSalesContracts = await getAllSalesContracts(tok);

    if (getDataSalesContracts.status === 200) {
      const sortedData = getDataSalesContracts.contracts.sort(
        (a, b) => a.id - b.id
      );
      setSalesContracts(sortedData);
    }
  };

  function formatTanggalIndo(tanggalString) {
    const tanggal = new Date(tanggalString);
    const hariIndo = [
      "Minggu",
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
    ];
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

    const hari = hariIndo[tanggal.getDay()];
    const tanggalNum = tanggal.getDate();
    const bulan = bulanIndo[tanggal.getMonth()];
    const tahun = tanggal.getFullYear();

    const jam = tanggal.getHours().toString().padStart(2, "0");
    const menit = tanggal.getMinutes().toString().padStart(2, "0");

    return `${hari}, ${tanggalNum} ${bulan} ${tahun} pk ${jam}:${menit}`;
  }

  createEffect(() => {
    if (tokUser?.token) {
      handleGetAllSalesContracts(tokUser?.token);
    }
  });

  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Daftar Sales Contract</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/salescontract/form")}
        >
          + Tambah Sales Contract
        </button>
      </div>

      <div class="w-full overflow-x-auto">
        <table class="w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">ID</th>
              <th class="py-2 px-2">No Pesanan</th>
              <th class="py-2 px-2">Tanggal</th>
              <th class="py-2 px-2">PO Customer</th>
              <th class="py-2 px-2">Nama Customer</th>
              <th class="py-2 px-4">Dibuat Oleh</th>
              <th class="py-2 px-4">Status Keseluruhan</th>
              <th class="py-2 px-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {salesContracts().map((sc) => (
              <tr class="border-b" key={sc.id}>
                <td class="py-2 px-4">{sc.id}</td>
                <td class="py-2 px-4">{sc.no_pesan}</td>
                <td class="py-2 px-4">{formatTanggalIndo(sc.tanggal)}</td>
                <td class="py-2 px-4">{sc.po_cust}</td>
                <td class="py-2 px-4">{sc.customer_name}</td>
                <td class="py-2 px-4">{sc.created_by_name}</td>
                <td class="py-2 px-4">{sc.overall_status}</td>
                <td class="py-2 px-4 space-x-2">
                  <button
                    class="text-blue-600 hover:underline"
                    onClick={() => navigate(`/salescontract/form?id=${sc.id}`)}
                  >
                    Edit
                  </button>
                  <button
                    class="text-red-600 hover:underline"
                    onClick={() => handleDelete(sc.id)}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MainLayout>
  );
}
