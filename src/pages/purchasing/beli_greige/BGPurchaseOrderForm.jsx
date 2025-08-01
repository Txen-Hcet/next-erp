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
  getAllBeliGreiges,
  updateDataBeliGreigeOrder,
  createBeliGreigeOrder,
  getBeliGreigeOrders,
  getBeliGreiges,
  // createPurchaseOrder,
} from "../../../utils/auth";
import SupplierDropdownSearch from "../../../components/SupplierDropdownSearch";
import FabricDropdownSearch from "../../../components/FabricDropdownSearch";
import PurchasingContractDropdownSearch from "../../../components/PurchasingContractDropdownSearch";
import { Printer, Trash2 } from "lucide-solid";

export default function BGPurchaseOrderForm() {
  const navigate = useNavigate();
  const user = getUser();

  const [jenisPOOptions, setJenisPOOptions] = createSignal([]);
  const [supplierOptions, setSupplierOptions] = createSignal([]);
  const [satuanUnitOptions, setSatuanUnitOptions] = createSignal([]);
  const [fabricOptions, setFabricOptions] = createSignal([]);
  const [purchaseContracts, setPurchaseContracts] = createSignal([]);
  const [params] = useSearchParams();
  const isEdit = !!params.id;

  const [form, setForm] = createSignal({
    jenis_po_id: "",
    sequence_number: "",
    tanggal: new Date().toISOString().substring(0, 10),
    pc_id: "",
    supplier_id: "",
    satuan_unit_id: "",
    termin: "",
    ppn: "",
    catatan: "",
    items: [],
  });

  onMount(async () => {
    const [bgc, poTypes, suppliers, units, fabrics] = await Promise.all([
      getAllBeliGreiges(user?.token),
      getAllSOTypes(user?.token),
      getAllSuppliers(user?.token),
      getAllSatuanUnits(user?.token),
      getAllFabrics(user?.token),
    ]);

    setPurchaseContracts(bgc.contracts);
    setJenisPOOptions(poTypes.data);
    setSupplierOptions(suppliers.suppliers);
    setSatuanUnitOptions(units.data);
    setFabricOptions(fabrics.kain);

    if (isEdit) {
      const res = await getBeliGreigeOrders(params.id, user?.token);
      const data = res.order;
      const dataItems = res.items;

      if (!data) return;

      // Normalisasi item
      const normalizedItems = (dataItems || []).map((item) => ({
        id: item.id,
        fabric_id: item.kain_id,
        lebar_greige: item.lebar_greige,
        meter: item.meter_total,
        yard: item.yard_total,
        harga: item.harga,
        subtotal: item.subtotal,
        subtotalFormatted:
          item.subtotal > 0
            ? new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0,
              }).format(item.subtotal)
            : "",
      }));

      setForm((prev) => ({
        ...prev,
        jenis_po_id: data.jenis_po_id ?? "",
        pc_id: {
          id: data.pc_id ?? "",
          ppn_percent: data.ppn_percent ?? 0,
        },
        sequence_number: data.no_po ?? "",
        no_seq: data.sequence_number ?? 0,
        supplier_id: data.supplier_id ?? "",
        satuan_unit_id: data.satuan_unit_id ?? "",
        termin: data.termin ?? "",
        ppn: data.ppn_percent ?? "",
        catatan: data.catatan ?? "",
        items: normalizedItems,
      }));

      handlePurchaseContractChange(data.pc_id);
    } else {
      const lastSeq = await getLastSequence(
        user?.token,
        "bg_o",
        "domestik",
        form().ppn
      );

      setForm((prev) => ({
        ...prev,
        sequence_number: lastSeq?.no_sequence + 1 || "",
      }));

      form().items.forEach((item, index) => {
        // Panggil ulang handleItemChange untuk field-field penting
        handleItemChange(index, "meter", item.meter);
        handleItemChange(index, "yard", item.yard);
        handleItemChange(index, "harga", item.harga);
        handleItemChange(index, "lebar_greige", item.lebar_greige);
      });
    }
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
    let selectedContract = purchaseContracts().find(
      (sc) => sc.id == contractId
    );

    if (!selectedContract || !selectedContract.items?.length) {
      const detail = await getBeliGreiges(contractId, user?.token);
      // const itemsOrder = await getBeliGreigeOrders(23, user?.token);
      selectedContract = detail.contract;
    }

    if (!selectedContract) return;

    const {
      supplier_id,
      satuan_unit_id,
      termin,
      ppn_percent,
      items = [],
    } = selectedContract;

    const mappedItems = items.map((item) => {
      const harga = parseFloat(item.harga ?? 0);

      return {
        pc_item_id: item.id,
        fabric_id: item.kain_id,
        lebar_greige: item.lebar_greige,
        meter: item.meter_dalam_proses || "",
        yard: item.yard_dalam_proses || "",
        harga,
        hargaFormatted: formatIDR(harga),
        subtotal: 0,
        subtotalFormatted: formatIDR(item.total_harga),
        readOnly: true,
      };
    });

    const lastSeq = await getLastSequence(
      user?.token,
      "bg_o",
      "domestik",
      form().ppn
    );

    // merge form lama + update yang kosong
    setForm((prev) => ({
      ...prev,
      pc_id: contractId,
      supplier_id: prev.supplier_id || supplier_id,
      satuan_unit_id: prev.satuan_unit_id || satuan_unit_id,
      termin: prev.termin || termin,
      ppn: prev.ppn || ppn_percent,
      catatan: prev.catatan || "",
      items: prev.items.length ? prev.items : mappedItems,
      sequence_number: prev.sequence_number || lastSeq?.no_sequence + 1 || "",
    }));
  };

  const generateNomorKontrak = async () => {
    const lastSeq = await getLastSequence(
      user?.token,
      "bg_o",
      "domestik",
      form().ppn
    );

    const nextNum = String((lastSeq?.last_sequence || 0) + 1).padStart(5, "0");
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(2);
    const ppnValue = parseFloat(form().ppn) || 0;
    const type = ppnValue > 0 ? "P" : "N";
    const mmyy = `${month}${year}`;
    const nomor = `PO/BG/${type}/${mmyy}/${nextNum}`;
    setForm((prev) => ({
      ...prev,
      sequence_number: nomor,
      no_seq: lastSeq?.last_sequence + 1,
    }));
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          kain_id: "",
          lebar_greige: 0,
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
        const harga = parseFloat(value.toString().replace(/[^\d]/g, "") || 0);
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

    try {
      if (isEdit) {
        // console.log(form().items)
        const payload = {
          // ...form(),
          no_po: form().sequence_number,
          pc_id: form().pc_id,
          catatan: form().catatan,
          items: form().items.map((i) => ({
            id: i.id,
            pc_item_id: i.pc_item_id,
            // kain_id: Number(i.fabric_id),
            // lebar_greige: parseFloat(i.lebar_greige),
            // lebar_finish: parseFloat(i.lebar_finish),
            // warna_id: parseFloat(i.warna_id),
            meter_total: parseFloat(i.meter),
            yard_total: parseFloat(i.yard),
            // harga: parseFloat(i.harga),
            // subtotal: parseFloat(i.subtotal),
          })),
        };

        await updateDataBeliGreigeOrder(user?.token, params.id, payload);
      } else {
        const payload = {
          // ...form(),
          sequence_number: Number(form().no_seq),
          pc_id: form().pc_id,
          catatan: form().catatan,
          items: form().items.map((i) => ({
            pc_item_id: i.pc_item_id,
            // kain_id: Number(i.fabric_id),
            // lebar_greige: parseFloat(i.lebar_greige),
            // lebar_finish: parseFloat(i.lebar_finish),
            // warna_id: parseFloat(i.warna_id),
            meter_total: parseFloat(i.meter),
            yard_total: parseFloat(i.yard),
            // harga: parseFloat(i.harga),
            // subtotal: parseFloat(i.subtotal),
          })),
        };

        await createBeliGreigeOrder(user?.token, payload);
      }

      Swal.fire({
        icon: "success",
        title: "Purchase Order berhasil disimpan!",
      }).then(() => {
        navigate("/beligreige-purchaseorder");
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
    window.open(`/print/beligreige/order?data=${encodedData}`, "_blank");
  }

  return (
    <MainLayout>
      <h1 class="text-2xl font-bold mb-4">Tambah Purchase Order</h1>
      <button
        type="button"
        class="flex gap-2 bg-blue-600 text-white px-3 py-2 mb-4 rounded hover:bg-green-700"
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
                value={form().sequence_number || ""}
                readOnly
                required
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
          <div hidden>
            <label class="block mb-1 font-medium">Jenis Order</label>
            <input
              type="date"
              class="w-full border bg-gray-200 p-2 rounded"
              value="BG"
              readOnly
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">No Purchase Contract</label>
            <PurchasingContractDropdownSearch
              purchaseContracts={purchaseContracts}
              form={form}
              setForm={setForm}
              onChange={handlePurchaseContractChange}
              disabled={isEdit}
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
        <div class="grid grid-cols-4 gap-4">
          <div>
            <label class="block mb-1 font-medium">Supplier</label>
            <SupplierDropdownSearch
              suppliers={supplierOptions}
              form={form}
              setForm={setForm}
              onChange={(id) => setForm({ ...form(), supplier_id: id })}
              disabled={true}
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
          hidden
        >
          + Tambah Item
        </button>

        <table class="w-full text-sm border border-gray-300 mb-4">
          <thead class="bg-gray-100">
            <tr>
              <th class="border p-2">#</th>
              <th class="border p-2">Jenis Kain</th>
              <th class="border p-2">Lebar Greige</th>
              <th class="border p-2">Meter</th>
              <th class="border p-2">Yard</th>
              <th class="border p-2">Harga</th>
              <th class="border p-2">Subtotal</th>
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
                      type="text"
                      inputmode="decimal"
                      class={`border p-1 rounded w-full ${
                        form().satuan_unit_id === 2 ? "bg-gray-200" : ""
                      }`}
                      readOnly={form().satuan_unit_id === 2}
                      value={item.meter}
                      onBlur={(e) =>
                        handleItemChange(i(), "meter", e.target.value, {
                          triggerConversion: true,
                        })
                      }
                      required
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      inputmode="decimal"
                      class={`border p-1 rounded w-full ${
                        form().satuan_unit_id === 1 ? "bg-gray-200" : ""
                      }`}
                      readOnly={form().satuan_unit_id === 1}
                      value={item.yard}
                      // onInput={(e) =>
                      //   handleItemChange(i(), "yard", e.target.value)
                      // }
                      onBlur={(e) =>
                        handleItemChange(i(), "yard", e.target.value, {
                          triggerConversion: true,
                        })
                      }
                      required
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      class="border p-2 rounded w-full"
                      value={item.hargaFormatted || ""}
                      onBlur={(e) =>
                        handleItemChange(i(), "harga", e.target.value)
                      }
                      readOnly={item.readOnly}
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
