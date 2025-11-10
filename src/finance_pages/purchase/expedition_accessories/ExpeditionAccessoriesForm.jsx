import { createSignal, onMount, For } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import {
  PurchaseAksesorisEkspedisi,
  JenisHutang,
  Suppliers,
  getLastSequence,
  getUser,
} from "../../../utils/financeAuth";
import Swal from "sweetalert2";
import FinanceMainLayout from "../../../layouts/FinanceMainLayout";
import { Trash } from "lucide-solid";

import JenisHutangDropdownSearch from "../../../components/JenisHutangDropdownSearch";
import SupplierDropdownSearch from "../../../components/SupplierDropdownSearch";

export default function ExpeditionAccessoriesForm() {
  const user = getUser();
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const isView = params.view === "true";
  const navigate = useNavigate();

  const [loading, setLoading] = createSignal(true);
  const [manualGenerateDone, setManualGenerateDone] = createSignal(false);
  const [jenisHutangOptions, setJenisHutangOptions] = createSignal([]);
  const [supplierOptions, setSupplierOptions] = createSignal([]);

  const [form, setForm] = createSignal({
    sequence_number: "",
    no_seq: 0,
    no_sj_supplier: "",
    tanggal_sj: new Date().toISOString().substring(0, 10),
    no_po: "",
    jenis_hutang_id: "",
    supplier_id: "",
    tanggal_jatuh_tempo: "",
    keterangan: "",
    items: [
      {
        nama: "",
        deskripsi: "",
        kuantitas: 0,
        harga: "",
        hargaValue: 0,
        subtotal: 0,
        subtotalFormatted: "",
      },
    ],
  });

  // FIXED: parseNumber yang benar
  const parseNumber = (str) => {
    if (typeof str !== 'string' || !str) return 0;
    // Hapus semua karakter non-digit termasuk titik (pemisah ribuan)
    const cleaned = str
      .replace(/[^\d,]/g, "") // Hanya pertahankan digit dan koma
      .replace(/\./g, "")     // Hapus semua titik (pemisah ribuan)
      .replace(",", ".");     // Ganti koma dengan titik untuk decimal
    return parseFloat(cleaned) || 0;
  };

  // FIXED: formatIDR untuk display saja
  const formatIDR = (val) => {
    const num = typeof val === "string" ? parseFloat(val) : (val || 0);
    if (num === 0) return "";
    
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // NEW: Format khusus untuk input harga (tanpa currency symbol)
  const formatHargaInput = (val) => {
    const num = typeof val === "string" ? parseFloat(val) : (val || 0);
    if (num === 0) return "";
    
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatQty = (val) => {
    const n = Number(val) || 0;
    if (n === 0) return "";
    const intVal = Math.floor(n);
    return String(intVal).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const normalizeId = (v) => {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "object") {
      const maybe = v.id ?? v.value ?? v.key ?? null;
      const n = Number(maybe);
      return isNaN(n) ? null : n;
    }
    const n = Number(v);
    return isNaN(n) ? null : n;
  };

  onMount(async () => {
    setLoading(true);

    try {
      const resJenis = await JenisHutang.getAll();
      setJenisHutangOptions(resJenis?.data ?? resJenis ?? []);

      const resSuppliers = await Suppliers.getAll();
      setSupplierOptions(
        resSuppliers?.suppliers ??
          resSuppliers?.data ??
          (Array.isArray(resSuppliers) ? resSuppliers : []) ??
          []
      );
    } catch (err) {
      console.error("Gagal ambil jenis hutang / suppliers:", err);
    }

    if (isEdit) {
      try {
        const res = await PurchaseAksesorisEkspedisi.getById(params.id);
        const raw = res.data ?? res;
        const data = Array.isArray(raw) && raw.length ? raw[0] : raw;

        // FIXED: Normalisasi items dengan benar
        const normalizedItems = (data.items || []).map((it) => {
          // Gunakan nilai langsung dari database, jangan parseNumber
          const hargaVal = parseFloat(it.harga || it.harga_value || 0);
          const kuant = parseInt(it.kuantitas ?? it.quantity ?? 0, 10) || 0;
          const subtotal = hargaVal * kuant;
          
          return {
            nama: it.nama ?? "",
            deskripsi: it.deskripsi ?? "",
            kuantitas: kuant,
            harga: formatHargaInput(hargaVal), // Format tanpa currency symbol
            hargaValue: hargaVal, // Simpan nilai asli
            subtotal: subtotal,
            subtotalFormatted: formatIDR(subtotal),
          };
        });

        setForm((prev) => ({
          ...prev,
          sequence_number: data.sequence_number ?? data.no_pembelian ?? "",
          no_seq: data.no_seq ?? prev.no_seq ?? 0,
          no_sj_supplier: data.no_sj_supplier ?? prev.no_sj_supplier ?? "",
          tanggal_sj: data.tanggal_sj
            ? new Date(data.tanggal_sj).toISOString().substring(0, 10)
            : prev.tanggal_sj,
          no_po: data.no_po ?? prev.no_po ?? "",
          jenis_hutang_id: data.jenis_hutang_id ?? prev.jenis_hutang_id ?? "",
          supplier_id: data.supplier_id ?? prev.supplier_id ?? "",
          tanggal_jatuh_tempo: data.tanggal_jatuh_tempo
            ? new Date(data.tanggal_jatuh_tempo).toISOString().substring(0, 10)
            : prev.tanggal_jatuh_tempo,
          keterangan: data.keterangan ?? prev.keterangan ?? "",
          items: normalizedItems.length ? normalizedItems : prev.items,
        }));
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Gagal memuat data aksesoris ekspedisi", "error");
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  });

  const generateNomor = async () => {
    try {
      const lastSeq = await getLastSequence("dbl");
      const nextNum = String((lastSeq?.last_sequence || 0) + 1).padStart(5, "0");
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = String(now.getFullYear()).slice(2);
      const mmyy = `${month}${year}`;
      const nomor = `DBL/${mmyy}-${nextNum}`;
      setForm((prev) => ({
        ...prev,
        sequence_number: nomor,
        no_seq: (lastSeq?.last_sequence || 0) + 1,
      }));
      setManualGenerateDone(true);
    } catch (err) {
      console.error("Generate nomor error:", err);
      Swal.fire("Gagal", err?.message || "Gagal mendapatkan nomor terakhir", "error");
    }
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          nama: "",
          deskripsi: "",
          kuantitas: 0,
          harga: "",
          hargaValue: 0,
          subtotal: 0,
          subtotalFormatted: "",
        },
      ],
    }));
  };

  const removeItem = (index) => {
    setForm((prev) => {
      const items = [...prev.items];
      items.splice(index, 1);
      return { ...prev, items };
    });
  };

  // FIXED: Handle item change dengan benar
  const handleItemChange = (index, field, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      const item = { ...items[index] };

      if (field === "kuantitas") {
        const intVal = parseInt(String(value).replace(/[^0-9]/g, ""), 10) || 0;
        item.kuantitas = intVal;
      } else if (field === "harga") {
        const num = parseNumber(value);
        item.hargaValue = num;
        item.harga = num ? formatHargaInput(num) : ""; // Format tanpa currency
      } else if (field === "nama" || field === "deskripsi") {
        item[field] = value;
      }

      const qty = Number(item.kuantitas || 0);
      const hargaVal = Number(item.hargaValue || 0);
      const subtotal = qty * hargaVal;
      item.subtotal = subtotal;
      item.subtotalFormatted = formatIDR(subtotal); // Format dengan currency untuk display

      items[index] = item;
      return { ...prev, items };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(false);

    try {
      const payloadItems = form().items.map((it) => ({
        nama: it.nama || "",
        deskripsi: it.deskripsi || "",
        kuantitas: Number(it.kuantitas || 0),
        harga: Number(it.hargaValue || 0),
        subtotal: Number(it.subtotal || 0),
      }));

      const payload = {
        no_pembelian: form().sequence_number,
        no_seq: Number(form().no_seq) || 0,
        no_sj_supplier: form().no_sj_supplier,
        tanggal_sj: form().tanggal_sj,
        no_po: form().no_po,
        jenis_hutang_id: normalizeId(form().jenis_hutang_id),
        supplier_id: form().supplier_id === "" ? null : Number(form().supplier_id),
        tanggal_jatuh_tempo: form().tanggal_jatuh_tempo,
        keterangan: form().keterangan,
        items: payloadItems,
      };

      if (isEdit) {
        await PurchaseAksesorisEkspedisi.update(params.id, payload);
      } else {
        await PurchaseAksesorisEkspedisi.create(payload);
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: isEdit
          ? "Data aksesoris ekspedisi berhasil diperbarui"
          : "Data aksesoris ekspedisi berhasil dibuat",
        showConfirmButton: false,
        timerProgressBar: true,
        timer: 1200,
      }).then(() => navigate("/expedition-accessories"));
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err?.message || "Terjadi kesalahan saat menyimpan data",
        showConfirmButton: false,
        timerProgressBar: true,
        timer: 1200,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FinanceMainLayout>
      {loading() && (
        <div class="fixed inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-md bg-opacity-40 z-50 gap-10">
          <div class="w-52 h-52 border-[20px] border-white border-t-transparent rounded-full animate-spin"></div>
          <span class="animate-pulse text-[40px] text-white">Loading...</span>
        </div>
      )}

      <h1 class="text-2xl font-bold mb-6">{isView ? "Detail" : isEdit ? "Edit" : "Tambah"} Aksesoris Ekspedisi</h1>

      <form class="space-y-6" onSubmit={handleSubmit}>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-medium">No Pembelian</label>
            <div class="flex gap-2">
              <input class="w-full border bg-gray-200 p-2 rounded" value={form().sequence_number} readOnly />
              <button
                type="button"
                class="bg-gray-300 text-sm px-2 rounded hover:bg-gray-400"
                onClick={generateNomor}
                hidden={isEdit}
              >
                Generate
              </button>
            </div>
          </div>

          <div>
            <label class="block mb-1 font-medium">No SJ Supplier</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().no_sj_supplier}
              onInput={(e) => setForm({ ...form(), no_sj_supplier: e.target.value })}
              required
              disabled={isView}
              classList={{ "bg-gray-200" : isView}}
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Tanggal SJ</label>
            <input
              type="date"
              class="w-full border p-2 rounded"
              value={form().tanggal_sj}
              onInput={(e) => setForm({ ...form(), tanggal_sj: e.target.value })}
              required
              disabled={isView}
              classList={{ "bg-gray-200" : isView}}
            />
          </div>

          {/* <div>
            <label class="block mb-1 font-medium">No PO</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().no_po}
              onInput={(e) => setForm({ ...form(), no_po: e.target.value })}
              required
              disabled={isView}
              classList={{ "bg-gray-200" : isView}}
            />
          </div> */}

          {/* <div>
            <label class="block mb-1 font-medium">Jenis Hutang</label>
              <JenisHutangDropdownSearch
                jenisHutangs={jenisHutangOptions}
                form={form}
                setForm={setForm}
                onChange={(val) => {
                  const id = (() => {
                    if (val === null || val === undefined || val === "") return "";
                    if (typeof val === "object") return String(val.id ?? val.value ?? "");
                    return String(val);
                  })();
                  setForm((prev) => ({ ...prev, jenis_hutang_id: id }));
                }}
                disabled={isView}
              />
            <input type="hidden" value={form().jenis_hutang_id} required />
          </div> */}

          <div>
            <label class="block mb-1 font-medium">Supplier</label>
            <SupplierDropdownSearch
              suppliers={supplierOptions}
              form={form}
              setForm={setForm}
              onChange={(id) => setForm((prev) => ({ ...prev, supplier_id: id }))}
              disabled={isView}
              classList={{ "bg-gray-200" : isView}}
            />
            <input type="hidden" value={form().supplier_id} required />
          </div>

          <div>
            <label class="block mb-1 font-medium">Tanggal Jatuh Tempo</label>
            <input
              type="date"
              class="w-full border p-2 rounded"
              value={form().tanggal_jatuh_tempo}
              onInput={(e) => setForm({ ...form(), tanggal_jatuh_tempo: e.target.value })}
              required
              disabled={isView}
              classList={{ "bg-gray-200" : isView}}
            />
          </div>

          <div class="md:col-span-2">
            <label class="block mb-1 font-medium">Keterangan</label>
            <textarea
              class="w-full border p-2 rounded"
              rows="3"
              value={form().keterangan}
              onInput={(e) => setForm({ ...form(), keterangan: e.target.value })}
              disabled={isView}
              classList={{ "bg-gray-200" : isView}}
            />
          </div>
        </div>

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
                  <th class="border p-2 text-center">Subtotal</th>
                  <th class="border p-2 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <For each={form().items}>
                  {(item, i) => (
                    <tr>
                      <td class="border p-2">
                        <input
                          type="text"
                          class="w-full border rounded p-1"
                          value={item.nama}
                          onBlur={(e) => handleItemChange(i(), "nama", e.target.value)}
                          required
                          disabled={isView}
                          classList={{ "bg-gray-200" : isView}}
                        />
                      </td>

                      <td class="border p-2">
                        <input
                          type="text"
                          class="w-full border rounded p-1"
                          value={item.deskripsi}
                          onBlur={(e) => handleItemChange(i(), "deskripsi", e.target.value)}
                          disabled={isView}
                          classList={{ "bg-gray-200" : isView}}
                        />
                      </td>

                      <td class="border p-2 text-center">
                        <input
                          type="text"
                          inputmode="numeric"
                          class="w-full border rounded p-1 text-center"
                          value={formatQty(item.kuantitas)}
                          onBlur={(e) => handleItemChange(i(), "kuantitas", e.target.value)}
                          required
                          disabled={isView}
                          classList={{ "bg-gray-200" : isView}}
                        />
                      </td>

                      <td class="border p-2 text-center">
                        <input
                          type="text"
                          inputmode="decimal"
                          class="w-full border rounded p-1 text-right"
                          value={item.harga}
                          onBlur={(e) => {
                            handleItemChange(i(), "harga", e.target.value);
                          }}
                          required
                          disabled={isView}
                          classList={{ "bg-gray-200" : isView}}
                        />
                      </td>

                      <td class="border p-2">
                        <input
                          type="text"
                          class="w-full border rounded p-1 text-right"
                          value={item.subtotalFormatted ?? ""}
                          disabled
                          classList={{ "bg-gray-200": true }}
                        />
                      </td>

                      <td class="border p-2 text-center">
                        <button
                          type="button"
                          class="text-red-600 hover:text-red-800"
                          onClick={() => removeItem(i())}
                          disabled={isView}
                        >
                          <Trash size={18} />
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
            onClick={addItem}
            hidden={isView}
          >
            + Tambah Item
          </button>
        </div>

        <div class="pt-6">
          <button 
            type="submit" 
            class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            hidden={isView}
          >
            Simpan
          </button>
        </div>
      </form>
    </FinanceMainLayout>
  );
}