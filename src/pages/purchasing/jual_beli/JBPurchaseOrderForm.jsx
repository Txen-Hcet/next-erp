import { createSignal, onMount, For } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  getAllSOTypes,
  getLastSequence,
  getAllSuppliers,
  getAllSatuanUnits,
  getAllFabrics,
  getUser,
  getAllSalesContracts,
  // createPurchaseOrder,
} from "../../../utils/auth";
import SupplierDropdownSearch from "../../../components/SupplierDropdownSearch";
import FabricDropdownSearch from "../../../components/FabricDropdownSearch";
import PurchasingContractDropdownSearch from "../../../components/PurchasingContractDropdownSearch";
import { Printer, Trash2 } from "lucide-solid";

export default function JBPurchaseOrderForm() {
  const navigate = useNavigate();
  const user = getUser();

  const [jenisPOOptions, setJenisPOOptions] = createSignal([]);
  const [supplierOptions, setSupplierOptions] = createSignal([]);
  const [satuanUnitOptions, setSatuanUnitOptions] = createSignal([]);
  const [fabricOptions, setFabricOptions] = createSignal([]);
  const [salesContracts, setSalesContracts] = createSignal([]);
  const [params] = useSearchParams();
  const isEdit = !!params.id;

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
    const [scs, poTypes, suppliers, units, fabrics] = await Promise.all([
      getAllSalesContracts(user?.token),
      getAllSOTypes(user?.token),
      getAllSuppliers(user?.token),
      getAllSatuanUnits(user?.token),
      getAllFabrics(user?.token),
    ]);

    setSalesContracts(scs.contracts);
    setJenisPOOptions(poTypes.data);
    setSupplierOptions(suppliers.suppliers);
    setSatuanUnitOptions(units.data);
    setFabricOptions(fabrics.kain);

    const lastSeq = await getLastSequence(user?.token, "sc", "domestik");
    setForm((prev) => ({ ...prev, sequence_number: lastSeq?.sequence || "" }));
  });

  const formatIDR = (val) => {
    if (val === null || val === "") return "";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handlePurchaseContractChange = async (contractId) => {
    const selectedContract = salesContracts().find((sc) => sc.id == contractId);
    if (!selectedContract) return;

    const {
      supplier_id,
      satuan_unit_id,
      termin,
      ppn,
      items = [],
    } = selectedContract;

    const mappedItems = items.map((item) => {
      const meter = parseFloat(item.meter ?? 0);
      const yard = parseFloat(item.yard ?? 0);
      const harga = parseFloat(item.harga ?? 0);

      const satuan = satuanUnitOptions()
        .find((u) => u.id == satuan_unit_id)
        ?.satuan?.toLowerCase();
      const qty = satuan === "meter" ? meter : yard;
      const subtotal = isNaN(qty * harga) ? 0 : qty * harga;

      return {
        ...item,
        meter,
        yard,
        harga,
        hargaFormatted: formatIDR(harga),
        subtotal: subtotal.toFixed(2),
        subtotalFormatted: formatIDR(subtotal),
        readOnly: true,
      };
    });

    setForm((prev) => ({
      ...prev,
      sales_contract_id: contractId,
      supplier_id,
      satuan_unit_id,
      termin,
      ppn,
      items: mappedItems,
    }));
  };

  const generateNomorKontrak = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(2);
    const mmyy = `${month}${year}`;
    const type = parseFloat(form().ppn) > 0 ? "P" : "N";
    const nomor = `BG/${type}/${mmyy}/00001`;

    setForm((prev) => ({ ...prev, sequence_number: nomor }));
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          kain_id: "",
          lebar_greige: 0,
          lebar_finish: 0,
          meter: 0,
          yard: 0,
          harga: 0,
          subtotal: 0,
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

  const handleItemChange = (index, field, value, options = {}) => {
    setForm((prev) => {
      const items = [...prev.items];
      const satuan = satuanUnitOptions()
        .find((u) => u.id == prev.satuan_unit_id)
        ?.satuan?.toLowerCase();
      items[index] = { ...items[index], [field]: value };

      let meter = parseFloat(items[index].meter || 0);
      let yard = parseFloat(items[index].yard || 0);

      if (field === "harga") {
        const harga = parseFloat(value.replace(/[^\d]/g, "") || 0);
        items[index].harga = harga;
        items[index].hargaFormatted = formatIDR(harga);
      }

      if (options.triggerConversion) {
        if (field === "meter") yard = meter * 1.093613;
        if (field === "yard") meter = yard * 0.9144;
        items[index].meter = meter.toFixed(4);
        items[index].yard = yard.toFixed(4);
      }

      const harga = parseFloat(items[index].harga || 0);
      const qty = satuan === "meter" ? meter : yard;
      const subtotal = isNaN(qty * harga) ? 0 : qty * harga;
      items[index].subtotal = subtotal.toFixed(2);
      items[index].subtotalFormatted = formatIDR(subtotal);

      return { ...prev, items };
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
        kain_id: Number(i.kain_id),
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
      Swal.fire({
        icon: "error",
        title: "Gagal menyimpan Purchase Order",
        text: err.message,
      });
    }
  };

  function handlePrint() {
    const encodedData = encodeURIComponent(JSON.stringify(form()));
    window.open(`/print/jualbeli/contract?data=${encodedData}`, "_blank");
  }

  return (
    <MainLayout>
      <h1 class="text-2xl font-bold mb-4">Tambah PO Jual Beli</h1>
      <button
        type="button"
        class="flex gap-2 bg-blue-600 text-white px-3 py-2 rounded hover:bg-green-700"
        onClick={handlePrint}
        hidden={!isEdit}
      >
        <Printer size={20} />
        Print
      </button>
      <form class="space-y-4" onSubmit={handleSubmit}>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block mb-1 font-medium">No Kontrak</label>
            <div class="flex gap-2">
              <input
                class="w-full border bg-gray-200 p-2 rounded"
                value={form().sequence_number}
                readOnly
              />
              <button
                type="button"
                class="bg-gray-300 text-sm px-2 rounded hover:bg-gray-400"
                onClick={generateNomorKontrak}
              >
                Generate
              </button>
            </div>
          </div>
          <div>
            <label class="block mb-1 font-medium">No Purchase Contract</label>
            <PurchasingContractDropdownSearch
              purchaseContracts={salesContracts}
              form={form}
              setForm={setForm}
              onChange={handlePurchaseContractChange}
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">Tanggal</label>
            <input
              type="date"
              class="w-full border bg-gray-200 p-2 rounded"
              value={form().tanggal}
              readOnly
            />
          </div>
        </div>
        {/* 
          <div class="">
            <label class="block mb-1 font-medium">No Sales Contract</label>
            <SearchableSalesContractSelect
              salesContracts={salesContracts}
              form={form}
              setForm={setForm}
              onChange={(id) => setForm({ ...form(), sales_contract_id: id })}
            />
          </div> */}
        <div class="grid grid-cols-4 gap-4">
          <div>
            <label class="block mb-1 font-medium">Supplier</label>
            <SupplierDropdownSearch
              suppliers={supplierOptions}
              form={form}
              setForm={setForm}
              onChange={(id) => setForm({ ...form(), supplier_id: id })}
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Satuan Unit</label>

            {/* Hidden input to carry the value */}
            <input
              type="hidden"
              name="satuan_unit_id"
              value={form().satuan_unit_id}
            />

            <select
              class="w-full border p-2 rounded bg-gray-200 cursor-not-allowed"
              value={form().satuan_unit_id}
              disabled
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
              class="w-full border bg-gray-200 p-2 rounded"
              value={form().termin}
              onInput={(e) => setForm({ ...form(), termin: e.target.value })}
              readOnly
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">PPN (%)</label>
            <input
              type="number"
              class="w-full border bg-gray-200 p-2 rounded"
              value={form().ppn}
              onInput={(e) => setForm({ ...form(), ppn: e.target.value })}
              readOnly
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
                  <td class="border w-72 p-2">
                    <FabricDropdownSearch
                      fabrics={fabricOptions}
                      item={item}
                      onChange={(val) => handleItemChange(i(), "kain_id", val)}
                      disabled={item.readOnly}
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="number"
                      class="border p-1 rounded w-full"
                      value={item.lebar_greige}
                      readonly
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="number"
                      class="border p-1 rounded w-full"
                      value={item.lebar_finish}
                      readonly
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      inputmode="decimal"
                      class="border p-1 rounded w-full"
                      value={item.meter}
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
                      type="number"
                      class="border p-2"
                      value={item.harga}
                      onInput={(e) =>
                        handleItemChange(i(), "harga", e.target.value)
                      }
                      readOnly={item.harga !== undefined}
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      class="border p-1 rounded w-full"
                      value={item.subtotalFormatted ?? ""}
                      readonly
                    />
                  </td>
                  <td class="border p-2 text-center">
                    {!item.readOnly && (
                      <button
                        type="button"
                        class="text-red-600 hover:text-red-800 text-xs"
                        onClick={() => removeItem(i())}
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
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
