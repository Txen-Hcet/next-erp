import { createSignal, createEffect, For, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  getAllSOTypes,
  getLastSequence,
  getAllSuppliers,
  getAllSatuanUnits,
  getAllFabrics,
  // createPurchaseOrder,
  getUser,
  getAllSalesContracts,
} from "../../../utils/auth";
import SearchableSalesContractSelect from "../../../components/SalesContractDropdownSearch";
import { Trash2 } from "lucide-solid";

export default function PurchaseOrderForm() {
  const navigate = useNavigate();
  const user = getUser();

  const [jenisPOOptions, setJenisPOOptions] = createSignal([]);
  const [supplierOptions, setSupplierOptions] = createSignal([]);
  const [satuanUnitOptions, setSatuanUnitOptions] = createSignal([]);
  const [fabricOptions, setFabricOptions] = createSignal([]);
  const [salesContracts, setSalesContracts] = createSignal([]);

  const [form, setForm] = createSignal({
    jenis_po_id: "",
    sequence_number: "",
    tanggal: new Date().toISOString().substring(0, 10),
    sales_contract_id: "",
    supplier_id: "",
    satuan_unit_id: "",
    termin: "",
    ppn: "",
    catatan: "",
    items: [],
  });

  onMount(async () => {
    const getSalesContracts = await getAllSalesContracts(user?.token);
    const jenisPO = await getAllSOTypes(user?.token);
    const suppliers = await getAllSuppliers(user?.token);
    const satuanUnits = await getAllSatuanUnits(user?.token);
    const fabrics = await getAllFabrics(user?.token);

    setJenisPOOptions(jenisPO.data || []);
    setSupplierOptions(suppliers.data || []);
    setSatuanUnitOptions(satuanUnits.data || []);
    setSalesContracts(getSalesContracts.contracts);
    setFabricOptions(
      fabrics?.kain?.map((f) => ({
        value: f.id,
        label: `${f.kode} | ${f.jenis}`,
      })) || []
    );

    const lastSeq = await getLastSequence(user?.token, "sc", "domestik");
    setForm((prev) => ({
      ...prev,
      sequence_number: lastSeq?.sequence || "",
    }));
  });

  const formatIDR = (val) => {
    if (val === null || val === "") return "";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          fabric_id: "",
          lebar_greige: "",
          lebar_finish: "",
          meter: "",
          yard: "",
          harga: "",
          subtotal: "",
        },
      ],
    }));
  };

  const removeItem = (index) => {
    setForm((prev) => {
      const newItems = [...prev.items];
      newItems.splice(index, 1);
      return { ...prev, items: newItems };
    });
  };

  const handleItemChange = (index, field, value, options = {}) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index] };

      // always store raw string
      items[index][field] = value;

      const satuanId = prev.satuan_unit_id;
      const satuan = satuanUnitOptions()
        .find((u) => u.id == satuanId)
        ?.satuan?.toLowerCase();

      let meter = parseFloat(items[index].meter || "") || 0;
      let yard = parseFloat(items[index].yard || "") || 0;

      // handle harga
      if (field === "harga") {
        const rawHarga = value.replace(/[^\d]/g, "");
        const hargaNumber = parseFloat(rawHarga || "0") || 0;

        items[index].harga = rawHarga;

        if (options.triggerFormat) {
          items[index].hargaFormatted = formatIDR(hargaNumber);
        } else {
          items[index].hargaFormatted = rawHarga;
        }

        // hitung subtotal
        let qty = 0;
        if (satuan === "meter") qty = meter;
        else if (satuan === "yard") qty = yard;

        const subtotal = qty && hargaNumber ? qty * hargaNumber : 0;
        items[index].subtotal = subtotal.toFixed(2);
        items[index].subtotalFormatted =
          subtotal > 0 ? formatIDR(subtotal) : "";

        return {
          ...prev,
          items,
        };
      }

      // handle konversi meter/yard
      if (options.triggerConversion) {
        if (field === "meter") {
          meter = parseFloat(value) || 0;
          yard = meter * 1.093613;
          items[index].yard = yard > 0 ? yard.toFixed(4) : "";
        } else if (field === "yard") {
          yard = parseFloat(value) || 0;
          meter = yard * 0.9144;
          items[index].meter = meter > 0 ? meter.toFixed(4) : "";
        }
      }

      const harga = parseFloat(items[index].harga || "") || 0;
      let qty = 0;
      if (satuan === "meter") qty = meter;
      else if (satuan === "yard") qty = yard;

      const subtotal = qty && harga ? qty * harga : 0;
      items[index].subtotal = subtotal.toFixed(2);
      items[index].subtotalFormatted = subtotal > 0 ? formatIDR(subtotal) : "";

      return {
        ...prev,
        items,
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...form(),
      sequence_number: Number(form().sequence_number),
      termin: Number(form().termin),
      ppn: Number(form().ppn),
      items: form().items.map((i) => ({
        fabric_id: Number(i.fabric_id),
        lebar_greige: parseFloat(i.lebar_greige),
        lebar_finish: parseFloat(i.lebar_finish),
        meter: parseFloat(i.meter),
        yard: parseFloat(i.yard),
        harga: parseFloat(i.harga),
        subtotal: parseFloat(i.subtotal),
      })),
    };

    try {
      // await createPurchaseOrder(user?.token, payload);
      Swal.fire({
        icon: "success",
        title: "Purchase Order berhasil disimpan!",
      }).then(() => {
        navigate("/purchaseorders");
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Gagal menyimpan Purchase Order",
        text: err?.message || "Terjadi kesalahan.",
      });
    }
  };

  return (
    <MainLayout>
      <h1 class="text-2xl font-bold mb-4">Tambah Purchase Order</h1>
      <form class="space-y-4" onSubmit={handleSubmit}>
        <div class="grid grid-cols-4 gap-4">
          <div>
            <label class="block mb-1 font-medium">Jenis PO</label>
            <select
              class="w-full border p-2 rounded"
              value={form().jenis_po_id}
              onChange={(e) =>
                setForm({ ...form(), jenis_po_id: e.target.value })
              }
              required
            >
              <option value="">Pilih Jenis PO</option>
              <For each={jenisPOOptions()}>
                {(po) => <option value={po.id}>{po.jenis}</option>}
              </For>
            </select>
          </div>

          <div>
            <label class="block mb-1 font-medium">No PO</label>
            <input
              class="w-full border p-2 rounded"
              value={form().sequence_number}
              readOnly
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Tanggal</label>
            <input
              type="date"
              class="w-full border p-2 rounded"
              value={form().tanggal}
              readOnly
            />
          </div>

          <div class="">
            <label class="block mb-1 font-medium">No Sales Contract</label>
            <SearchableSalesContractSelect
              salesContracts={salesContracts}
              form={form}
              setForm={setForm}
              onChange={(id) => setForm({ ...form(), sales_contract_id: id })}
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Supplier</label>
            <select
              class="w-full border p-2 rounded"
              value={form().supplier_id}
              onChange={(e) =>
                setForm({ ...form(), supplier_id: e.target.value })
              }
              required
            >
              <option value="">Pilih Supplier</option>
              <For each={supplierOptions()}>
                {(s) => <option value={s.id}>{s.nama}</option>}
              </For>
            </select>
          </div>

          <div>
            <label class="block mb-1 font-medium">Satuan Unit</label>
            <select
              class="w-full border p-2 rounded"
              value={form().satuan_unit_id}
              onChange={(e) =>
                setForm({ ...form(), satuan_unit_id: e.target.value })
              }
              required
            >
              <option value="">Pilih Satuan</option>
              <For each={satuanUnitOptions()}>
                {(u) => <option value={u.id}>{u.satuan}</option>}
              </For>
            </select>
          </div>

          <div>
            <label class="block mb-1 font-medium">Termin</label>
            <input
              type="number"
              class="w-full border p-2 rounded"
              value={form().termin}
              onInput={(e) => setForm({ ...form(), termin: e.target.value })}
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">PPN (%)</label>
            <input
              type="number"
              class="w-full border p-2 rounded"
              value={form().ppn}
              onInput={(e) => setForm({ ...form(), ppn: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label class="block mb-1 font-medium">Catatan</label>
          <textarea
            class="w-full border p-2 rounded"
            value={form().catatan}
            onInput={(e) => setForm({ ...form(), catatan: e.target.value })}
          ></textarea>
        </div>

        <h2 class="text-lg font-bold mt-6 mb-2">Items</h2>

        <button
          type="button"
          class="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 mb-4"
          onClick={addItem}
        >
          + Tambah Item
        </button>

        <table class="w-full text-sm border border-gray-300 mb-4">
          <thead class="bg-gray-100">
            <tr>
              <th class="border p-2">#</th>
              <th class="border p-2">Jenis Kain</th>
              <th class="border p-2">Lebar Greige</th>
              <th class="border p-2">Lebar Finish</th>
              <th class="border p-2">Meter</th>
              <th class="border p-2">Yard</th>
              <th class="border p-2">Harga</th>
              <th class="border p-2">Subtotal</th>
              <th class="border p-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <For each={form().items}>
              {(item, i) => (
                <tr>
                  <td class="border p-2 text-center">{i() + 1}</td>
                  <td class="border p-2">
                    <select
                      class="border p-1 rounded w-full"
                      value={item.fabric_id}
                      // onChange={(e) =>
                      //   handleItemChange(i(), "fabric_id", e.target.value)
                      // }
                    >
                      <option value="">Pilih Kain</option>
                      <For each={fabricOptions()}>
                        {(f) => <option value={f.value}>{f.label}</option>}
                      </For>
                    </select>
                  </td>
                  <td class="border p-2">
                    <input
                      type="number"
                      class="border p-1 rounded w-full"
                      value={item.lebar_greige}
                      // onInput={(e) =>
                      //   handleItemChange(i(), "lebar_greige", e.target.value)
                      // }
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="number"
                      class="border p-1 rounded w-full"
                      value={item.lebar_finish}
                      // onInput={(e) =>
                      //   handleItemChange(i(), "lebar_finish", e.target.value)
                      // }
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      inputmode="decimal"
                      class="border p-1 rounded w-full"
                      value={item.meter}
                      // onInput={(e) =>
                      //   handleItemChange(i(), "meter", e.target.value)
                      // }
                      onBlur={(e) =>
                        handleItemChange(i(), "meter", e.target.value, {
                          triggerConversion: true,
                        })
                      }
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      inputmode="decimal"
                      class="border p-1 rounded w-full"
                      value={item.yard}
                      // onInput={(e) =>
                      //   handleItemChange(i(), "yard", e.target.value)
                      // }
                      onBlur={(e) =>
                        handleItemChange(i(), "yard", e.target.value, {
                          triggerConversion: true,
                        })
                      }
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      inputmode="decimal"
                      class="border p-1 rounded w-full"
                      value={formatIDR(item.harga)}
                      // onInput={(e) =>
                      //   handleItemChange(i(), "harga", e.target.value)
                      // }
                      onBlur={(e) =>
                        handleItemChange(i(), "harga", e.target.value, {
                          triggerConversion: true,
                        })
                      }
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      class="border p-1 rounded w-full"
                      value={item.subtotalFormatted ?? ""}
                      disabled
                    />
                  </td>
                  <td class="border p-2 text-center">
                    <button
                      type="button"
                      class="text-red-600 hover:text-red-800 text-xs"
                      onClick={() => removeItem(i())}
                    >
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>

        <div>
          <button
            type="submit"
            class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Simpan
          </button>
        </div>
      </form>
    </MainLayout>
  );
}
