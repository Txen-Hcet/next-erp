import { createSignal, onMount } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  createCurrencies,
  getCurrencies,
  getUser,
  updateDataCurrencies,
} from "../../utils/auth";
import Swal from "sweetalert2";

export default function CurrencyForm() {
  const [form, setForm] = createSignal({
    id: "",
    name: "",
  });
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const navigate = useNavigate();
  const user = getUser();

  onMount(async () => {
    if (isEdit) {
      const currencies = await getCurrencies(params.id, user?.token);
      setForm({
        id: params.id,
        name: currencies.data.name,
      });
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isEdit) {
        await updateDataCurrencies(user?.token, params.id, form().name);
      } else {
        await createCurrencies(user?.token, form().name);
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: isEdit
          ? "Berhasil mengubah data jenis currency"
          : "Berhasil mebuat jenis currency baru",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => navigate("/currencies"));
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: isEdit
          ? "Gagal mengubah data jenis currency"
          : "Gagal membuat data jenis currency baru",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
    }
  };

  return (
    <MainLayout>
      <h1 class="text-2xl font-bold mb-4">
        {isEdit ? "Edit" : "Tambah"} Currency
      </h1>
      <form class="space-y-4 max-w-lg" onSubmit={handleSubmit}>
        <div>
          <label class="block mb-1 font-medium">Nama</label>
          <input
            type="text"
            class="w-full border p-2 rounded"
            value={form().name}
            onInput={(e) => setForm({ ...form(), name: e.target.value })}
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
