import { createSignal, onMount } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../layouts/MainLayout";
import { getDataUser, getUser, register, updateUser } from "../utils/auth";
import Swal from "sweetalert2";

export default function UserForm() {
  const [form, setForm] = createSignal({
    id: "",
    name: "",
    username: "",
    password: "",
    role: "1",
    account_type_id: "1",
  });
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const navigate = useNavigate();
  const user = getUser();

  onMount(async () => {
    if (isEdit) {
      const userData = await getDataUser(params.id, user?.token);
      let roleNumber = 0;
      if (userData.user.role_name === "super admin") {
        roleNumber = 1;
      } else if (userData.user.role_name === "admin") {
        roleNumber = 2;
      } else if (userData.user.role_name === "staff marketing 1") {
        roleNumber = 3;
      } else if (userData.user.role_name === "staff marketing 2") {
        roleNumber = 4;
      }

      let accountType = 0;
      if (userData.user.account_type_name === "non-ppn") {
        accountType = 1;
      } else if (userData.user.account_type_name === "ppn") {
        accountType = 2;
      }

      setForm({
        id: params.id,
        name: userData.user.name,
        username: userData.user.username,
        password: "",
        role: roleNumber,
        account_type_id: accountType,
      });
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isEdit) {
        await updateUser(
          form().id,
          form().name,
          form().username,
          form().password,
          form().role,
          form().account_type_id,
          user?.token
        );
      } else {
        await register(
          form().name,
          form().username,
          form().password,
          form().role,
          form().account_type_id,
          user?.token
        );
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: isEdit ? "Berhasil mengubah user" : "Berhasil membuat user baru",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => navigate("/users"));
    } catch (error) {
      console.log(error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text:
          error.message ||
          (isEdit ? "Gagal mengubah user" : "Gagal membuat user baru"),
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
    }
  };

  return (
    <MainLayout>
      <h1 class="text-2xl font-bold mb-4">{isEdit ? "Edit" : "Tambah"} User</h1>
      <form class="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-5 gap-4">
          <div>
            <label class="block mb-1 font-medium">Name</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().name}
              onInput={(e) => setForm({ ...form(), name: e.target.value })}
              required
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">Username</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().username}
              onInput={(e) => setForm({ ...form(), username: e.target.value })}
              required
            />
          </div>
          {/* {!isEdit && ( */}
          <div>
            <label class="block mb-1 font-medium">
              Password
              {/* {isEdit && (
                <span class="text-sm text-gray-500">
                  (kosongkan jika tidak ingin ubah)
                </span>
              )} */}
            </label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().password}
              onInput={(e) => setForm({ ...form(), password: e.target.value })}
              required={!isEdit}
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">Tipe Akses</label>
            <select
              class="w-full border p-2 rounded"
              value={form().role}
              onChange={(e) => setForm({ ...form(), role: e.target.value })}
            >
              <option value="1">Super Admin</option>
              <option value="2">Admin</option>
              <option value="3">Staff Marketing 1</option>
              <option value="4">Staff Marketing 2</option>
            </select>
          </div>
          <div>
            <label class="block mb-1 font-medium">
              Tipe Akun (PPN/Non-PPN)
            </label>
            <select
              class="w-full border p-2 rounded"
              value={form().account_type_id}
              onChange={(e) =>
                setForm({ ...form(), account_type_id: e.target.value })
              }
            >
              <option value="1">User (Non-PPN)</option>
              <option value="2">User (PPN)</option>
            </select>
          </div>
        </div>
        <button class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Simpan
        </button>
      </form>
    </MainLayout>
  );
}
