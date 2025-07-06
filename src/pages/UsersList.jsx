import { createEffect, createMemo, createSignal, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../layouts/MainLayout";
import { getAllUsers, getUser, softDeleteUser } from "../utils/auth";
import Swal from "sweetalert2";

export default function UsersList() {
  const [users, setUsers] = createSignal([]);
  const navigate = useNavigate();
  const user = getUser();
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  const totalPages = createMemo(() => {
    return Math.max(1, Math.ceil(users().length / pageSize));
  });

  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;
    return users().slice(startIndex, startIndex + pageSize);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus Pengguna?",
      text: `Apakah kamu yakin ingin menghapus pengguna dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const deleteUser = await softDeleteUser(id, user?.token);
        console.log(deleteUser);

        // Optional: tampilkan alert sukses
        await Swal.fire({
          title: "Terhapus!",
          text: `Data pengguna dengan ID ${id} berhasil dihapus.`,
          icon: "success",
          confirmButtonColor: "#6496df",
        });

        // Optional: update UI setelah hapus
        setUsers(users().filter((u) => u.id !== id));
      } catch (error) {
        Swal.fire({
          title: "Gagal",
          text: `Gagal menghapus data pengguna dengan ID ${id}`,
          icon: "error",
          confirmButtonColor: "#6496df",
          confirmButtonText: "OK",
        });
      }
    }
  };

  const handleGetAllUsers = async () => {
    try {
      const users = await getAllUsers(user?.token);

      if (users.status === 200) {
        const sortedData = users.users.sort((a, b) => a.id - b.id);

        setUsers(sortedData);
      }
    } catch (error) {
      Swal.fire({
        title: "Gagal",
        text: "Gagal mengambil seluruh data pengguna",
        confirmButtonColor: "#6496df",
        confirmButtonText: "OK",
      });
    }
  };

  createEffect(() => {
    if (user?.token) {
      handleGetAllUsers();
    }
  });

  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Daftar Pengguna</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/users/form")}
        >
          + Tambah User
        </button>
      </div>

      <table class="w-full bg-white shadow rounded">
        <thead class="bg-gray-200 text-sm uppercase text-gray-700">
          <tr>
            <th class="py-2 px-4">ID</th>
            <th class="py-2 px-4">Name</th>
            <th class="py-2 px-4">Username</th>
            <th class="py-2 px-4">Role</th>
            <th class="py-2 px-4">Tanggal Pembuatan</th>
            <th class="py-2 px-4">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData().map((user, index) => (
            <tr class="border-b" key={user.id}>
              <td class="py-2 px-4">{index + 1}</td>
              <td class="py-2 px-4 capitalize">{user.name}</td>
              <td class="py-2 px-4 capitalize">{user.username}</td>
              <td class="py-2 px-4 capitalize">{user.role_name}</td>
              <td class="py-2 px-4">
                {new Date(user.created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </td>
              <td class="py-2 px-4 space-x-2">
                <button
                  class="text-blue-600 hover:underline"
                  onClick={() => navigate(`/users/form?id=${user.id}`)}
                >
                  Edit
                </button>
                <button
                  class="text-red-600 hover:underline"
                  onClick={() => handleDelete(user.id)}
                >
                  Hapus
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
    </MainLayout>
  );
}
