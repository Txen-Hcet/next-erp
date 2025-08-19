import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import { getAllSuppliers, getUser, softDeleteSupplier } from "../../utils/auth";
import Swal from "sweetalert2";
import { Edit, Trash } from "lucide-solid";

export default function SuppliersList() {
  const [suppliers, setSuppliers] = createSignal([]);
  const navigate = useNavigate();
  const tokUser = getUser();
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  const totalPages = createMemo(() => {
    return Math.max(1, Math.ceil(suppliers().length / pageSize));
  });

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
          
 showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
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
              <th class="py-2 px-4">Nama</th>
              <th class="py-2 px-4">No Telp</th>
              <th class="py-2 px-4">No HP</th>
              <th class="py-2 px-4">Alamat</th>
              <th class="py-2 px-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData().map((supp, index) => (
              <tr class="border-b" key={supp.id}>
                {/* ✅ FIX #5: tambahin align-top supaya baris table stabil */}
                <td class="py-2 px-4 align-top">
                  {(currentPage() - 1) * pageSize + (index + 1)}
                </td>
                <td class="py-2 px-4 align-top">{supp.kode}</td>
                <td
                  class="py-2 px-4 align-top max-w-[150px] tooltip-container"
                  data-full-text={supp.nama}
                >
                  <span class="truncate-text">
                    {supp.nama.length > 20
                      ? supp.nama.substring(0, 17) + "..."
                      : supp.nama}
                  </span>
                </td>
                <td
                  class="py-2 px-4 align-top max-w-[150px] tooltip-container"
                  data-full-text={formatPhoneNumber(supp.no_telp)}
                >
                  <span class="truncate-text">
                    {formatPhoneNumber(supp.no_telp).length > 20
                      ? formatPhoneNumber(supp.no_telp).substring(0, 17) + "..."
                      : formatPhoneNumber(supp.no_telp)}
                  </span>
                </td>
                <td
                  class="py-2 px-4 align-top max-w-[150px] tooltip-container"
                  data-full-text={supp.no_hp}
                >
                  <span class="truncate-text">
                    {supp.no_hp.length > 20
                      ? supp.no_hp.substring(0, 17) + "..."
                      : supp.no_hp}
                  </span>
                </td>
                <td
                  class="py-2 px-4 align-top max-w-[150px] tooltip-container"
                  data-full-text={supp.alamat}
                >
                  <span class="truncate-text">
                    {supp.alamat.length > 20
                      ? supp.alamat.substring(0, 17) + "..."
                      : supp.alamat}
                  </span>
                </td>
                <td class="py-2 px-4 align-top space-x-2">
                  <button
                    class="text-blue-600 hover:underline"
                    onClick={() => navigate(`/suppliers/form?id=${supp.id}`)}
                  >
                    <Edit size={25} />
                  </button>
                  <button
                    class="text-red-600 hover:underline"
                    onClick={() => handleDelete(supp.id)}
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
    </MainLayout>
  );
}
