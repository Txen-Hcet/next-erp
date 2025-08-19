import { createSignal, onMount } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  createCustomerType,
  getCustomerType,
  getUser,
  updateDataCustomerType,
} from "../../utils/auth";
import Swal from "sweetalert2";

export default function CustomerTypeForm() {
  const [form, setForm] = createSignal({
    id: "",
    jenis: "",
  });
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const navigate = useNavigate();
  const user = getUser();

  onMount(async () => {
    if (isEdit) {
      const customerType = await getCustomerType(params.id, user?.token);
      console.log(customerType)
      setForm({
        id: params.id,
        jenis: customerType.data.jenis,
      });
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isEdit) {
        await updateDataCustomerType(user?.token, params.id, form().jenis);
      } else {
        await createCustomerType(user?.token, form().jenis);
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: isEdit
          ? "Berhasil mengubah data jenis customer"
          : "Berhasil mebuat jenis customer baru",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => navigate("/customer-type"));
    } catch (error) {
      console.log(error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: isEdit
          ? "Gagal mengubah data jenis customer"
          : "Gagal membuat data jenis customer baru",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
    }
  };

  return (
    <MainLayout>
      <h1 class="text-2xl font-bold mb-4">
        {isEdit ? "Edit" : "Tambah"} Jenis SO
      </h1>
      <form class="space-y-4 max-w-lg" onSubmit={handleSubmit}>
        <div>
          <label class="block mb-1 font-medium">Jenis</label>
          <input
            type="text"
            class="w-full border p-2 rounded"
            value={form().jenis}
            onInput={(e) => setForm({ ...form(), jenis: e.target.value })}
            required
          />
        </div>
        <button class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Simpan
        </button>
      </form>
    </MainLayout>
  );
}
