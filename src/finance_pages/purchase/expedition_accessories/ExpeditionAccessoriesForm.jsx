import { createSignal, onMount, For } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { PurchaseAksesorisEkspedisi } from "../../../utils/financeAuth";
import Swal from "sweetalert2";
import FinanceMainLayout from "../../../layouts/FinanceMainLayout";
import { Trash } from "lucide-solid";

export default function ExpeditionAccessoriesForm() {
  const [form, setForm] = createSignal({
    no_pembelian: "",
    no_sj_supplier: "",
    tanggal_sj: "",
    no_po: "",
    jenis_hutang_id: "",
    supplier_id: "",
    tanggal_jatuh_tempo: "",
    keterangan: "",
    items: [{ nama: "", deskripsi: "", kuantitas: 0, harga: 0 }],
  });

  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const navigate = useNavigate();

  onMount(async () => {
    if (isEdit) {
      try {
        const res = await PurchaseAksesorisEkspedisi.getById(params.id);
        setForm(res.data);
      } catch (err) {
        Swal.fire("Error", "Gagal memuat data aksesoris ekspedisi", "error");
      }
    }
  });

  const handleAddItem = () => {
    setForm({
      ...form(),
      items: [
        ...form().items,
        { nama: "", deskripsi: "", kuantitas: 0, harga: 0 },
      ],
    });
  };

  const handleRemoveItem = (index) => {
    const updated = [...form().items];
    updated.splice(index, 1);
    setForm({ ...form(), items: updated });
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...form().items];
    updated[index][field] = value;
    setForm({ ...form(), items: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isEdit) {
        await PurchaseAksesorisEkspedisi.update(params.id, form());
      } else {
        await PurchaseAksesorisEkspedisi.create(form());
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: isEdit
          ? "Data aksesoris ekspedisi berhasil diperbarui"
          : "Data aksesoris ekspedisi berhasil dibuat",
        showConfirmButton: false,
        timer: 1200,
      }).then(() => navigate("/expedition-accessories"));
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
        {isEdit ? "Edit" : "Tambah"} Aksesoris Ekspedisi
      </h1>

      <form class="space-y-6" onSubmit={handleSubmit}>
        {/* Informasi Umum */}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-medium">No Pembelian</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().no_pembelian}
              onInput={(e) =>
                setForm({ ...form(), no_pembelian: e.target.value })
              }
              required
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">No SJ Supplier</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().no_sj_supplier}
              onInput={(e) =>
                setForm({ ...form(), no_sj_supplier: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Tanggal SJ</label>
            <input
              type="date"
              class="w-full border p-2 rounded"
              value={form().tanggal_sj}
              onInput={(e) =>
                setForm({ ...form(), tanggal_sj: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">No PO</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().no_po}
              onInput={(e) => setForm({ ...form(), no_po: e.target.value })}
              required
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Jenis Hutang ID</label>
            <input
              type="number"
              class="w-full border p-2 rounded"
              value={form().jenis_hutang_id}
              onInput={(e) =>
                setForm({ ...form(), jenis_hutang_id: Number(e.target.value) })
              }
              required
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Supplier ID</label>
            <input
              type="number"
              class="w-full border p-2 rounded"
              value={form().supplier_id}
              onInput={(e) =>
                setForm({ ...form(), supplier_id: Number(e.target.value) })
              }
              required
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Tanggal Jatuh Tempo</label>
            <input
              type="date"
              class="w-full border p-2 rounded"
              value={form().tanggal_jatuh_tempo}
              onInput={(e) =>
                setForm({ ...form(), tanggal_jatuh_tempo: e.target.value })
              }
              required
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

        {/* Items Table */}
        <div class="mt-6">
          <h2 class="text-lg font-semibold mb-2">Daftar Barang</h2>
          <div class="overflow-x-auto">
            <table class="min-w-full border border-gray-300 text-sm">
              <thead class="bg-gray-100">
                <tr>
                  <th class="border p-2 text-left">Nama</th>
                  <th class="border p-2 text-left">Deskripsi</th>
                  <th class="border p-2 text-center">Kuantitas</th>
                  <th class="border p-2 text-center">Harga</th>
                  <th class="border p-2 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <For each={form().items}>
                  {(item, index) => (
                    <tr>
                      <td class="border p-2">
                        <input
                          type="text"
                          class="w-full border rounded p-1"
                          value={item.nama}
                          onInput={(e) =>
                            handleItemChange(index(), "nama", e.target.value)
                          }
                          required
                        />
                      </td>
                      <td class="border p-2">
                        <input
                          type="text"
                          class="w-full border rounded p-1"
                          value={item.deskripsi}
                          onInput={(e) =>
                            handleItemChange(
                              index(),
                              "deskripsi",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td class="border p-2 text-center">
                        <input
                          type="number"
                          class="w-full border rounded p-1 text-center"
                          value={item.kuantitas}
                          onInput={(e) =>
                            handleItemChange(
                              index(),
                              "kuantitas",
                              Number(e.target.value)
                            )
                          }
                          required
                        />
                      </td>
                      <td class="border p-2 text-center">
                        <input
                          type="number"
                          class="w-full border rounded p-1 text-center"
                          value={item.harga}
                          onInput={(e) =>
                            handleItemChange(
                              index(),
                              "harga",
                              Number(e.target.value)
                            )
                          }
                          required
                        />
                      </td>
                      <td class="border p-2 text-center">
                        <button
                          type="button"
                          class="text-red-600 hover:text-red-800"
                          onClick={() => handleRemoveItem(index())}
                          disabled={form().items.length === 1}
                        >
                          <Trash size={20} />
                        </button>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>

          <button
            type="button"
            class="mt-3 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            onClick={handleAddItem}
          >
            + Tambah Item
          </button>
        </div>

        {/* Submit */}
        <div class="pt-6">
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
