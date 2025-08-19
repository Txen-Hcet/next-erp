import { createSignal, onMount } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  createSatuanUnit,
  getSatuanUnits,
  getUser,
  updateDataSatuanUnit,
} from "../../utils/auth";
import Swal from "sweetalert2";

export default function UnitsForm() {
  const [form, setForm] = createSignal({
    id: "",
    satuan: "",
  });
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const navigate = useNavigate();
  const user = getUser();

  onMount(async () => {
    if (isEdit) {
      const satuanUnitData = await getSatuanUnits(params.id, user?.token);
      console.log(satuanUnitData)

      setForm({
        id: params.id,
        satuan: satuanUnitData.data.satuan,
      });
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isEdit) {
        await updateDataSatuanUnit(user?.token, params.id, form().satuan);
      } else {
        await createSatuanUnit(user?.token, form().satuan);
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: isEdit
          ? "Berhasil mengubah data satuan unit"
          : "Berhasil mebuat satuan unit baru",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => navigate("/units"));
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: isEdit
          ? "Gagal mengubah data satuan unit"
          : "Gagal membuat data satuan unit baru",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
    }
  };

  return (
    <MainLayout>
      <h1 class="text-2xl font-bold mb-4">
        {isEdit ? "Edit" : "Tambah"} Satuan Unit
      </h1>
      <form class="space-y-4 max-w-lg" onSubmit={handleSubmit}>
        <div>
          <label class="block mb-1 font-medium">Satuan Unit</label>
          <input
            type="text"
            class="w-full border p-2 rounded"
            value={form().satuan}
            onInput={(e) => setForm({ ...form(), satuan: e.target.value })}
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
