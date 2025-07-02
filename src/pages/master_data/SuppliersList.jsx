import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import { getAllSuppliers, getUser, softDeleteSupplier } from "../../utils/auth";
import Swal from "sweetalert2";

export default function SuppliersList() {
  const [suppliers, setSuppliers] = createSignal([]);
  const navigate = useNavigate();
  const tokUser = getUser();
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 10;

  // ✅ FIX #1: tambahin return di createMemo, biar ga undefined
  const totalPages = createMemo(() => {
    return Math.max(1, Math.ceil(suppliers().length / pageSize));
  });

  // ✅ FIX #2: bikin paginatedData reactive
  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;
    return suppliers().slice(startIndex, startIndex + pageSize);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus supplier?",
      text: `Apakah kamu yakin ingin menghapus supplier dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const deleteSupplier = await softDeleteSupplier(id, tokUser?.token);

        await Swal.fire({
          title: "Terhapus!",
          text: `Data supplier dengan ID ${id} berhasil dihapus.`,
          icon: "success",
          confirmButtonColor: "#6496df",
        });

        // ✅ FIX #3: reset ke page 1 kalau data dihapus, biar ga error kalau page jadi kosong
        setSuppliers((prev) => {
          const newData = prev.filter((s) => s.id !== id);
          if (
            (currentPage() - 1) * pageSize >= newData.length &&
            currentPage() > 1
          ) {
            setCurrentPage(currentPage() - 1);
          }
          return newData;
        });
      } catch (error) {
        console.error(error);
        Swal.fire({
          title: "Gagal",
          text:
            error.message || `Gagal menghapus data supplier dengan ID ${id}`,
          icon: "error",
          confirmButtonColor: "#6496df",
          confirmButtonText: "OK",
        });
      }
    }
  };

  const handleGetAllSuppliers = async (tok) => {
    const getDataSuppliers = await getAllSuppliers(tok);

    if (getDataSuppliers.status === 200) {
      const sortedData = getDataSuppliers.suppliers.sort((a, b) => a.id - b.id);
      setSuppliers(sortedData);
    }
  };

  function formatPhoneNumber(phone) {
    if (!phone) return "";

    const area = phone.slice(0, 3);
    const number = phone.slice(3);

    return `(${area}) ${number}`;
  }

  createEffect(() => {
    if (tokUser?.token) {
      handleGetAllSuppliers(tokUser?.token);
    }
  });

  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Daftar Supplier</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/suppliers/form")}
        >
          + Tambah Supplier
        </button>
      </div>

      {/* ✅ FIX #4: tambahin min-height biar table stabil walau data sedikit */}
      <div class="overflow-x-auto min-h-[400px]">
        <table class="min-w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">ID</th>
              <th class="py-2 px-4">Kode Supplier</th>
              <th class="py-2 px-4">Alias</th>
              <th class="py-2 px-4">Nama</th>
              <th class="py-2 px-4">No Telp</th>
              <th class="py-2 px-4">No HP</th>
              <th class="py-2 px-4">Alamat</th>
              <th class="py-2 px-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData().map((supp) => (
              <tr class="border-b" key={supp.id}>
                {/* ✅ FIX #5: tambahin align-top supaya baris table stabil */}
                <td class="py-2 px-4 align-top">{supp.id}</td>
                <td class="py-2 px-4 align-top">{supp.kode}</td>
                <td class="py-2 px-4 align-top">{supp.alias}</td>
                <td class="py-2 px-4 align-top">{supp.nama}</td>
                <td class="py-2 px-4 align-top">
                  {formatPhoneNumber(supp.no_telp)}
                </td>
                <td class="py-2 px-4 align-top">{supp.no_hp}</td>
                <td class="py-2 px-4 align-top">{supp.alamat}</td>
                <td class="py-2 px-4 align-top space-x-2">
                  <button
                    class="text-blue-600 hover:underline"
                    onClick={() => navigate(`/suppliers/form?id=${supp.id}`)}
                  >
                    Edit
                  </button>
                  <button
                    class="text-red-600 hover:underline"
                    onClick={() => handleDelete(supp.id)}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ✅ FIX #6: tambahin mt-8 biar pagination ga mepet table */}
        {/* ✅ FIX #7: tambahin min-w supaya tombol ga loncat-loncat */}
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
