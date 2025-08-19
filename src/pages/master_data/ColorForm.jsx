import { createSignal, onMount } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  createColor,
  getColor,
  getUser,
  updateDataColor,
} from "../../utils/auth";
import Swal from "sweetalert2";

export default function ColorForm() {
  const [form, setForm] = createSignal({
    id: "",
    kode: "",
    deskripsi: "",
  });
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const navigate = useNavigate();
  const user = getUser();

  onMount(async () => {
    if (isEdit) {
      const colorData = await getColor(params.id, user?.token);
      setForm({
        id: params.id,
        kode: colorData.warna.kode,
        deskripsi: colorData.warna.deskripsi,
      });
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isEdit) {
        await updateDataColor(
          user?.token,
          params.id,
          form().kode,
          form().deskripsi
        );
      } else {
        await createColor(user?.token, form().kode, form().deskripsi);
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: isEdit
          ? "Berhasil mengubah data warna"
          : "Berhasil mebuat warna baru",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => navigate("/colors"));
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: isEdit
          ? "Gagal mengubah data warna"
          : "Gagal membuat data warna baru",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
    }
  };

  return (
    <MainLayout>
      <h1 class="text-2xl font-bold mb-4">
        {isEdit ? "Edit" : "Tambah"} Warna
      </h1>
      <form class="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-medium">Kode</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().kode}
              onInput={(e) => setForm({ ...form(), kode: e.target.value })}
              required
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">deskripsi</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().deskripsi}
              onInput={(e) => setForm({ ...form(), deskripsi: e.target.value })}
            />
          </div>
        </div>
        <button class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Simpan
        </button>
      </form>
    </MainLayout>
  );
}
