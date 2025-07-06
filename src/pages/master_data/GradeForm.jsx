import { createSignal, onMount } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  createColor,
  createGrade,
  getColor,
  getGrades,
  getUser,
  updateDataColor,
  updateDataGrade,
} from "../../utils/auth";
import Swal from "sweetalert2";

export default function GradeForm() {
  const [form, setForm] = createSignal({
    id: "",
    grade: "",
  });
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const navigate = useNavigate();
  const user = getUser();

  onMount(async () => {
    if (isEdit) {
      const colorData = await getGrades(params.id, user?.token);
      setForm({
        id: params.id,
        grade: colorData.grade,
      });
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isEdit) {
        await updateDataGrade(user?.token, params.id, form().grade);
      } else {
        await createGrade(user?.token, form().grade);
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: isEdit
          ? "Berhasil mengubah data grade"
          : "Berhasil mebuat grade baru",
        confirmButtonColor: "#6496df",
        confirmButtonText: "OK",
      }).then(() => navigate("/grade"));
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: isEdit
          ? "Gagal mengubah data grade"
          : "Gagal membuat data grade baru",
        confirmButtonColor: "#6496df",
        confirmButtonText: "OK",
      });
    }
  };

  return (
    <MainLayout>
      <h1 class="text-2xl font-bold mb-4">
        {isEdit ? "Edit" : "Tambah"} Grade
      </h1>
      <form class="space-y-4 max-w-lg" onSubmit={handleSubmit}>
        <div>
          <label class="block mb-1 font-medium">Grade</label>
          <input
            type="text"
            class="w-full border p-2 rounded"
            value={form().grade}
            onInput={(e) => setForm({ ...form(), grade: e.target.value })}
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
