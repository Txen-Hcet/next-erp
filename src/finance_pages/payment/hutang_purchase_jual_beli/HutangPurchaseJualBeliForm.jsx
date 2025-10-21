import { createSignal, onMount } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { PembayaranHutangPurchaseJualBeli } from "../../../utils/financeAuth";
import Swal from "sweetalert2";
import FinanceMainLayout from "../../../layouts/FinanceMainLayout";

export default function HutangPurchaseJualBeliForm() {
  const [form, setForm] = createSignal({
    no_pembayaran: "",
    sj_id: "",
    jenis_potongan_id: "",
    potongan: 0,
    pembulatan: 0,
    pembayaran: 0,
    payment_method_id: "",
    bank_id: "",
    no_giro: "",
    bank_giro_id: "",
    tanggal_pengambilan_giro: "",
    tanggal_jatuh_tempo: "",
    status: "",
    keterangan: "",
  });

  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const navigate = useNavigate();

  onMount(async () => {
    if (isEdit) {
      try {
        const res = await PembayaranHutangPurchaseJualBeli.getById(params.id);
        setForm(res.data);
      } catch (err) {
        Swal.fire("Error", "Gagal memuat data", "error");
      }
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isEdit) {
        await PembayaranHutangPurchaseJualBeli.update(params.id, form());
      } else {
        await PembayaranHutangPurchaseJualBeli.create(form());
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: isEdit ? "Data berhasil diperbarui" : "Data berhasil dibuat",
        showConfirmButton: false,
        timer: 1200,
      }).then(() => navigate("/hutang-purchase-jual-beli"));
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Terjadi kesalahan saat menyimpan data",
        showConfirmButton: true,
      });
    }
  };

  return (
    <FinanceMainLayout>
      <h1 class="text-2xl font-bold mb-6">
        {isEdit
          ? "Edit Pembayaran Hutang Pembelian Jual Beli"
          : "Tambah Pembayaran Hutang Pembelian Jual Beli"}
      </h1>

      <form class="space-y-6" onSubmit={handleSubmit}>
        {/* GRID FORM */}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Kolom kiri */}
          <div>
            <label class="block mb-1 font-medium">No Pembayaran</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().no_pembayaran}
              onInput={(e) =>
                setForm({ ...form(), no_pembayaran: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">SJ ID</label>
            <input
              type="number"
              class="w-full border p-2 rounded"
              value={form().sj_id}
              onInput={(e) =>
                setForm({ ...form(), sj_id: Number(e.target.value) })
              }
              required
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Jenis Potongan ID</label>
            <input
              type="number"
              class="w-full border p-2 rounded"
              value={form().jenis_potongan_id}
              onInput={(e) =>
                setForm({
                  ...form(),
                  jenis_potongan_id: Number(e.target.value),
                })
              }
              required
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Potongan</label>
            <input
              type="number"
              class="w-full border p-2 rounded"
              value={form().potongan}
              onInput={(e) =>
                setForm({ ...form(), potongan: Number(e.target.value) })
              }
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Pembulatan</label>
            <input
              type="number"
              class="w-full border p-2 rounded"
              value={form().pembulatan}
              onInput={(e) =>
                setForm({ ...form(), pembulatan: Number(e.target.value) })
              }
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Pembayaran</label>
            <input
              type="number"
              class="w-full border p-2 rounded"
              value={form().pembayaran}
              onInput={(e) =>
                setForm({ ...form(), pembayaran: Number(e.target.value) })
              }
              required
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Payment Method ID</label>
            <input
              type="number"
              class="w-full border p-2 rounded"
              value={form().payment_method_id}
              onInput={(e) =>
                setForm({
                  ...form(),
                  payment_method_id: Number(e.target.value),
                })
              }
              required
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Bank ID</label>
            <input
              type="number"
              class="w-full border p-2 rounded"
              value={form().bank_id}
              onInput={(e) =>
                setForm({ ...form(), bank_id: Number(e.target.value) })
              }
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">No Giro</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().no_giro}
              onInput={(e) => setForm({ ...form(), no_giro: e.target.value })}
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Bank Giro ID</label>
            <input
              type="number"
              class="w-full border p-2 rounded"
              value={form().bank_giro_id}
              onInput={(e) =>
                setForm({ ...form(), bank_giro_id: Number(e.target.value) })
              }
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">
              Tanggal Pengambilan Giro
            </label>
            <input
              type="date"
              class="w-full border p-2 rounded"
              value={form().tanggal_pengambilan_giro}
              onInput={(e) =>
                setForm({
                  ...form(),
                  tanggal_pengambilan_giro: e.target.value,
                })
              }
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Tanggal Jatuh Tempo</label>
            <input
              type="date"
              class="w-full border p-2 rounded"
              value={form().tanggal_jatuh_tempo}
              onInput={(e) =>
                setForm({
                  ...form(),
                  tanggal_jatuh_tempo: e.target.value,
                })
              }
              required
            />
          </div>

          <div class="md:col-span-2">
            <label class="block mb-1 font-medium">Status</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().status}
              onInput={(e) => setForm({ ...form(), status: e.target.value })}
            />
          </div>

          <div class="md:col-span-2">
            <label class="block mb-1 font-medium">Keterangan</label>
            <textarea
              class="w-full border p-2 rounded"
              rows="3"
              value={form().keterangan}
              onInput={(e) =>
                setForm({ ...form(), keterangan: e.target.value })
              }
            />
          </div>
        </div>

        {/* Tombol Simpan */}
        <div class="pt-6 flex justify-end">
          <button
            type="submit"
            class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Simpan
          </button>
        </div>
      </form>
    </FinanceMainLayout>
  );
}
