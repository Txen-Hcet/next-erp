import { createEffect, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import { getAllSOTypes, getUser, softDeleteSOType } from "../../utils/auth";
import Swal from "sweetalert2";

export default function SOTypesList() {
  const navigate = useNavigate();
  const tokUser = getUser();

  const [soTypes, setSOTypes] = createSignal([]);

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus jenis SO?",
      text: `Apakah kamu yakin ingin menghapus jenis SO dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const deleteSOType = await softDeleteSOType(id, tokUser?.token);

        await Swal.fire({
          title: "Terhapus!",
          text: `Data jenis SO dengan ID ${id} berhasil dihapus.`,
          icon: "success",
          confirmButtonColor: "#6496df",
        });

        // Optional: update UI setelah hapus
        setSOTypes(soTypes().filter((s) => s.id !== id));
      } catch (error) {
        Swal.fire({
          title: "Gagal",
          text:
            error.message || `Gagal menghapus data jenis SO dengan ID ${id}`,
          icon: "error",
          confirmButtonColor: "#6496df",
          confirmButtonText: "OK",
        });
      }
    }
  };

  const handleGetAllSOTypes = async (tok) => {
    const getDataSOTypes = await getAllSOTypes(tok);

    const sortedData = getDataSOTypes.sort((a, b) => a.id - b.id);

    setSOTypes(sortedData);
    if (getDataSOTypes.status === 200) {
      setSOTypes(sortedData);
    }
  };

  createEffect(() => {
    if (tokUser?.token) {
      handleGetAllSOTypes(tokUser?.token);
    }
  });
  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Daftar Jenis SO</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/so-type/form")}
        >
          + Tambah Jenis SO
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
            {soTypes().map((soType) => (
              <tr class="border-b" key={soType.id}>
                <td class="py-2 px-4">{soType.id}</td>
                <td class="py-2 px-4">{soType.jenis}</td>
                <td class="py-2 px-4 space-x-2">
                  <button
                    class="text-blue-600 hover:underline"
                    onClick={() => navigate(`/so-type/form?id=${soType.id}`)}
                  >
                    Edit
                  </button>
                  <button
                    class="text-red-600 hover:underline"
                    onClick={() => handleDelete(soType.id)}
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
