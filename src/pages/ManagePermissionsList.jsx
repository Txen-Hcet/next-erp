import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../layouts/MainLayout";
import { getAllRoles, getUser, deleteRole } from "../utils/auth";
import Swal from "sweetalert2";
import { Edit, Trash } from "lucide-solid";

export default function ManagePermissionsList() {
  const [roles, setRoles] = createSignal([]);
  const navigate = useNavigate();
  const user = getUser();
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  const totalPages = createMemo(() => {
    return Math.max(1, Math.ceil(roles().length / pageSize));
  });

  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;
    return roles().slice(startIndex, startIndex + pageSize);
  };

  const handleGetAllRoles = async () => {
    try {
      const result = await getAllRoles(user?.token);

      if (result.status === 200 && result.result) {
        const sortedData = result.result.sort((a, b) => a.id - b.id);
        setRoles(sortedData);
      } else {
        throw new Error(result.message || "Struktur data roles tidak valid");
      }
    } catch (error) {
      const isForbidden = error.message.includes("403") || error.status === 403;
      if (isForbidden) {
        await Swal.fire({
          title: "Tidak Ada Akses",
          text: "Anda tidak memiliki izin untuk melihat data Roles",
          icon: "warning",
          confirmButtonColor: "#6496df",
        });
        navigate("/dashboard");
      } else {
        Swal.fire({
          title: "Gagal",
          text: error.message || "Gagal mengambil data Roles",
          icon: "error",
        });
      }
    }
  };

  const handleDelete = async (roleId) => {
      const result = await Swal.fire({
      title: "Hapus Role",
      text: `Apakah kamu yakin ingin menghapus Permission Role dengan ID ${roleId}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      });

      if (result.isConfirmed) {
      try {
          await deleteRole(roleId, user?.token);

          setRoles(roles().filter(role => role.id !== roleId));

          Swal.fire({
          title: "Terhapus!",
          text: `Data Permission Role dengan ID ${roleId} berhasil dihapus.`,
          icon: "success",
          timer: 1000,
          showConfirmButton: false,
          });
      } catch (error) {
          Swal.fire({
          title: "Gagal",
          text: error.message || "Gagal menghapus role.",
          icon: "error",
          });
        }
      }
  };  

  createEffect(() => {
    if (user?.token) {
      handleGetAllRoles();
    }
  });

  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Daftar Role & Permissions</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/manage-permissions/form")}
        >
          + Tambah Role
        </button>
      </div>

      <table class="w-full bg-white shadow rounded">
        <thead class="bg-gray-200 text-left text-sm uppercase text-gray-700">
          <tr>
            <th class="py-2 px-4">No</th>
            <th class="py-2 px-4">Nama Role</th>
            <th class="py-2 px-4">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData().map((role, index) => (
            <tr class="border-b" key={role.id}>
              <td class="py-2 px-4">{(currentPage() - 1) * pageSize + index + 1}</td>
              <td class="py-2 px-4 capitalize">{role.name}</td>
              <td class="py-2 px-4">
                <div class="flex items-center space-x-2">
                  <button
                    class="text-blue-600 hover:text-blue-800"
                    onClick={() => navigate(`/manage-permissions/form?role_id=${role.id}`)}
                  >
                    <Edit size={25} />
                  </button>
                  <button
                    class="text-red-600 hover:text-red-800"
                    onClick={() => handleDelete(role.id)}
                  >
                    <Trash size={25} />
                  </button>
                </div>
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
    </MainLayout>
  );
}