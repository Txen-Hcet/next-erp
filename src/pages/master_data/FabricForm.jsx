import { createSignal, onMount } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  createFabric,
  getFabric,
  getUser,
  updateDataFabric,
} from "../../utils/auth";
import Swal from "sweetalert2";

export default function FabricForm() {
  const [form, setForm] = createSignal({
    id: "",
    corak: "",
    konstruksi: "",
  });
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const navigate = useNavigate();
  const user = getUser();

  onMount(async () => {
    if (isEdit) {
      const fabricData = await getFabric(params.id, user?.token);
      setForm({
        id: params.id,
        corak: fabricData.corak,
        konstruksi: fabricData.konstruksi,
      });
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isEdit) {
        await updateDataFabric(
          user?.token,
          params.id,
          form().corak,
          form().konstruksi
        );
      } else {
        await createFabric(user?.token, form().corak, form().konstruksi);
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: isEdit
          ? "Berhasil mengubah data kain"
          : "Berhasil mebuat kain baru",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => navigate("/fabrics"));
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: isEdit
          ? "Gagal mengubah data kain"
          : "Gagal membuat data kain baru",
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
              value={form().corak}
              onInput={(e) => setForm({ ...form(), corak: e.target.value })}
              required
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">konstruksi</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().konstruksi}
              onInput={(e) =>
                setForm({ ...form(), konstruksi: e.target.value })
              }
              required
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
