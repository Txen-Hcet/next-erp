import { createEffect, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  getAllCustomerTypes,
  getUser,
  softDeleteCustomerType,
} from "../../utils/auth";
import Swal from "sweetalert2";

export default function CustomerTypesList() {
  const navigate = useNavigate();
  const tokUser = getUser();

  const [customerTypes, setCustomerTypes] = createSignal([]);

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus jenis customer?",
      text: `Apakah kamu yakin ingin menghapus jenis customer dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const deleteSOType = await softDeleteCustomerType(id, tokUser?.token);

        await Swal.fire({
          title: "Terhapus!",
          text: `Data jenis customer dengan ID ${id} berhasil dihapus.`,
          icon: "success",
          confirmButtonColor: "#6496df",
        });

        // Optional: update UI setelah hapus
        setCustomerTypes(customerTypes().filter((s) => s.id !== id));
      } catch (error) {
        Swal.fire({
          title: "Gagal",
          text:
            error.message ||
            `Gagal menghapus data jenis customer dengan ID ${id}`,
          icon: "error",
          confirmButtonColor: "#6496df",
          confirmButtonText: "OK",
        });
      }
    }
  };

  const handleGetAllCustomerTypes = async (tok) => {
    const getDataCustomerTypes = await getAllCustomerTypes(tok);

    const sortedData = getDataCustomerTypes.sort((a, b) => a.id - b.id);

    setCustomerTypes(sortedData);
    if (getDataCustomerTypes.status === 200) {
      setCustomerTypes(sortedData.jenis);
    }
  };

  createEffect(() => {
    if (tokUser?.token) {
      handleGetAllCustomerTypes(tokUser?.token);
    }
  });
  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Daftar Jenis Customer</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/customer-type/form")}
        >
          + Tambah Jenis Customer
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">ID</th>
              <th class="py-2 px-2">Jenis</th>
              <th class="py-2 px-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {customerTypes().map((custType) => (
              <tr class="border-b" key={custType.id}>
                <td class="py-2 px-4">{custType.id}</td>
                <td class="py-2 px-4">{custType.jenis}</td>
                <td class="py-2 px-4 space-x-2">
                  <button
                    class="text-blue-600 hover:underline"
                    onClick={() =>
                      navigate(`/customer-type/form?id=${custType.id}`)
                    }
                  >
                    Edit
                  </button>
                  <button
                    class="text-red-600 hover:underline"
                    onClick={() => handleDelete(custType.id)}
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
