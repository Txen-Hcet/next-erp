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
  const [loading, setLoading] = createSignal(true);
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const isView = params.view === 'true';

  const [form, setForm] = createSignal({
    jenis_po_id: "",
    sequence_number: "",
    tanggal: new Date().toISOString().substring(0, 10),
    pc_id: "",
    supplier_id: "",
    satuan_unit_id: "",
    termin: "",
    ppn: "",
    keterangan: "",
    items: [],
  });

  onMount(async () => {
    setLoading(true);
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
      const dataItems = res.order.items;

console.log("Struktur data asli dari API (dataItems):", dataItems);

      if (!data) return;

      // Normalisasi item
      const normalizedItems = (dataItems || []).map((item) => {
        return {
          id: item.id,
          pc_item_id: item.pc_item_id,
          //fabric_id: item.kain?.id || item.kain_id || item.fabric_id,
          lebar_greige: item.lebar_greige,
          meter: item.meter_total,
          yard: item.yard_total,
          harga: item.harga,
          subtotal: 0,
          subtotalFormatted:
            item.subtotal > 0
              ? new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0,
                }).format(item.subtotal)
              : "",
        };
      });
      console.log("Data setelah normalisasi (normalizedItems):", normalizedItems);
      handlePurchaseContractChange(data.pc_id, normalizedItems);

      setForm((prev) => ({
        ...prev,
        jenis_po_id: data.jenis_po_id ?? "",
        id: data.pc_id ?? "",
        sequence_number: data.no_po ?? "",
        no_seq: data.sequence_number ?? 0,
        supplier_id: data.supplier_id ?? "",
        satuan_unit_id: data.satuan_unit_id ?? "",
        termin: data.termin ?? "",
        ppn: data.ppn_percent ?? "",
        keterangan: data.keterangan ?? "",
        // items: prev.items,
      }));
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
    setLoading(false);
  });

  const handlePurchaseContractChange = async (contractId, overrideItems) => {
    let selectedContract = purchaseContracts().find(
      (sc) => sc.id == contractId
    );

    if (!selectedContract || !selectedContract.items?.length) {
      const detail = await getBeliGreiges(contractId, user?.token);
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

    const sourceItems = overrideItems ?? items;

    const mappedItems = sourceItems.map((poItem) => {
        // 1. Cari item kontrak yang cocok berdasarkan pc_item_id dari item PO
        const contractItem = selectedContract.items.find(
            (pcItem) => pcItem.id == poItem.pc_item_id
        );

        // 2. Ambil fabric_id dari item kontrak yang ditemukan
        const fabricId = contractItem ? (contractItem.kain_id || contractItem.fabric_id) : null;

        // 3. Lanjutkan kalkulasi seperti biasa menggunakan data dari item PO
        const meterNum = parseFloat(poItem.meter || 0);
        const yardNum = parseFloat(poItem.yard || 0);
        
        let qty = 0;
        if (satuan_unit_id === 1) qty = meterNum;
        else if (satuan_unit_id === 2) qty = yardNum;

        const harga = parseFloat(poItem.harga ?? 0);
        const subtotal = qty * harga;

        // 4. Return objek yang lengkap
        return {
            id: poItem.id,
            pc_item_id: poItem.pc_item_id,
            fabric_id: fabricId,
            lebar_greige: poItem.lebar_greige,
            meter: formatNumber(meterNum, { decimals: 2 }),
            meterValue: meterNum,
            yard: formatNumber(yardNum, { decimals: 2 }),
            yardValue: yardNum,
            harga,
            hargaValue: harga,
            hargaFormatted: formatIDR(harga),
            subtotal,
            subtotalFormatted: formatIDR(subtotal),
            readOnly: false,
        };
    });
    //console.log("Data setelah di-map ulang (mappedItems):", mappedItems);
    const lastSeq = await getLastSequence(
      user?.token,
      "bg_o",
      "domestik",
      form().ppn
    );
    setForm((prev) => ({
      ...prev,
      pc_id: contractId,
      supplier_id: supplier_id,
      satuan_unit_id: satuan_unit_id,
      termin: termin,
      ppn: ppn_percent,
      keterangan: prev.keterangan || "",
      items: mappedItems,
      sequence_number: prev.sequence_number || lastSeq?.no_sequence + 1 || "",
    }));
  };

  const formatIDR = (val) => {
    if (val === null || val === "") return "";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 2,
    }).format(val);
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
          pc_item_id: null,
          kain_id: "",
          lebar_greige: 0,
          meter: 0,
          meterValue: 0,
          yard: 0,
          yardValue: 0,
          harga: 0,
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

  const parseNumber = (str) => {
    if (typeof str !== 'string' || !str) return 0;
    // 1. Hapus semua karakter KECUALI angka (0-9) dan koma (,)
    let cleanStr = str.replace(/[^0-9,]/g, "");
    // 2. Ganti koma desimal (id) dengan titik (.)
    cleanStr = cleanStr.replace(",", ".");
    // 3. Parse menjadi angka
    return parseFloat(cleanStr) || 0;
  };

  const formatNumber = (num, { decimals } = {}) => {
    if (isNaN(num)) return "";
    return Number(num).toLocaleString("id-ID", {
      minimumFractionDigits: decimals ?? 0,
      maximumFractionDigits: decimals ?? (decimals > 0 ? decimals : 2),
    });
  };

const handleItemChange = (index, field, value) => {
  setForm((prev) => {
    const items = [...prev.items];
    const item = { ...items[index] };
    const satuanId = parseInt(prev.satuan_unit_id);

    if (field === "fabric_id" || field === "kain_id") {
      // Use consistent field name
      item.fabric_id = value;
      item.kain_id = value; // Keep both for compatibility

      // Cari pc_item_id yang sesuai dari Purchase Contract
      const contract = purchaseContracts().find((sc) => sc.id == prev.pc_id);
      if (contract && contract.items) {
        const matchedItem = contract.items.find(
          (i) => i.kain_id == value || i.fabric_id == value
        );
        if (matchedItem) {
          item.pc_item_id = matchedItem.id;
        }
      }
    } else {

      const numValue = parseNumber(value);
      item[`${field}Value`] = numValue;

      if (field === "harga") {
        item.hargaValue = numValue;
        item.harga = formatIDR(numValue);
      } else {
        item[field] = formatNumber(numValue, { decimals: field === "lebar_greige" ? 0 : 2 });
      }

      // Konversi otomatis antar meter <-> yard
      if (satuanId === 1 && field === "meter") {
        const yardValue = numValue * 1.093613;
        item.yardValue = yardValue;
        item.yard = formatNumber(yardValue, { decimals: 2 });
      } else if (satuanId === 2 && field === "yard") {
        const meterValue = numValue * 0.9144;
        item.meterValue = meterValue;
        item.meter = formatNumber(meterValue, { decimals: 2 });
      }
    }

    // Hitung subtotal
    const harga = item.hargaValue || 0;

    let qty = 0;

    if (satuanId === 1) qty = item.meterValue || 0;
    else if (satuanId === 2) qty = item.yardValue || 0;

    const subtotal = qty * harga;
    item.subtotal = subtotal;
    item.subtotalFormatted = formatIDR(subtotal);

    items[index] = item;
    return { ...prev, items };
  });
};

  const totalMeter = () =>
    form().items.reduce((sum, item) => sum + (item.meterValue || 0), 0);

  const totalYard = () =>
    form().items.reduce((sum, item) => sum + (item.yardValue || 0), 0);

  const totalKilogram = () =>
    form().items.reduce(
      (sum, item) => sum + (parseFloat(item.kilogram) || 0),
      0
    );

  const totalAll = () => {
    return form().items.reduce((sum, item) => {
      return sum + (item.subtotal || 0);
    }, 0);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form().no_seq && !isEdit) {
      Swal.fire({
        icon: "warning",
        title: "Generate Nomor PO",
        text: "Silakan klik tombol 'Generate' untuk membuat nomor PO terlebih dahulu.",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
      });
      return;
    }
    try {
      if (isEdit) {
        console.log(form().items);
        const payload = {
          no_po: form().sequence_number,
          pc_id: Number(form().pc_id),
          keterangan: form().keterangan,
          items: form().items.map((i) => ({
            id: i.id,
            pc_item_id: i.pc_item_id,
            meter_total: i.meterValue || 0,
            yard_total: i.yardValue || 0,
          })),
        };
        await updateDataBeliGreigeOrder(user?.token, params.id, payload);
      } else {
        const payload = {
          pc_id: Number(form().pc_id),
          supplier_id: Number(form().supplier_id),
          satuan_unit_id: Number(form().satuan_unit_id),
          termin: Number(form().termin),
          ppn: parseFloat(form().ppn) || 0,
          keterangan: form().keterangan,
          tanggal: form().tanggal,
          sequence_number: form().no_seq,
          no_po: form().sequence_number,
          items: form().items.map((i) => ({
            pc_item_id: i.pc_item_id,
            meter_total: i.meterValue || 0,
            yard_total: i.yardValue || 0,
          })),
        };
        await createBeliGreigeOrder(user?.token, payload);
      }
      Swal.fire({
        icon: "success",
        title: "Purchase Order berhasil disimpan!",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => {
        navigate("/beligreige-purchaseorder");
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gagal menyimpan Purchase Order",
        text: err.message,
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
    }
  };
  function handlePrint() {
    const encodedData = encodeURIComponent(JSON.stringify(form()));
    window.open(`/print/beligreige/order?data=${encodedData}`, "_blank");
  }
  return (
    <MainLayout>
      {loading() && (
        <div class="fixed inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-md bg-opacity-40 z-50 gap-10">
          <div class="w-52 h-52 border-[20px] border-white border-t-transparent rounded-full animate-spin"></div>
          <span class="animate-pulse text-[40px] text-white">Loading...</span>
        </div>
      )}
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
                hidden={isEdit}
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
              disabled={isEdit || isView} // <-- PASTIKAN BARIS INI ADA
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
            {/* Hidden input supaya value tetep kebawa */}
            <input type="hidden" name="termin" value={form().termin} />
            <select
              class="w-full border p-2 rounded bg-gray-200 cursor-not-allowed"
              value={form().termin}
              disabled
            >
              <option value="">-- Pilih Termin --</option>
              <option value="0">0 Hari/Cash</option>
              <option value="30">30 Hari</option>
              <option value="45">45 Hari</option>
              <option value="60">60 Hari</option>
              <option value="90">90 Hari</option>
            </select>
          </div>
          <div>
            <label class="block mb-1 font-medium">PPN (%)</label>
            {/* Hidden input biar tetap ke-submit */}
            <input type="hidden" name="ppn" value={form().ppn} />
            <label class="flex items-center gap-3">
              <div class="relative opacity-60 cursor-not-allowed">
                <input
                  type="checkbox"
                  checked={parseFloat(form().ppn) > 0}
                  disabled
                  class="sr-only peer"
                />
                <div class="w-24 h-10 bg-gray-200 rounded-full peer-checked:bg-green-600 transition-colors"></div>
                <div class="absolute left-0.5 top-0.5 w-9 h-9 bg-white border border-gray-300 rounded-full shadow-sm peer-checked:translate-x-14 transition-transform"></div>
              </div>
              <span class="text-lg text-gray-700">
                {parseFloat(form().ppn) > 0 ? `${form().ppn}%` : "0%"}
              </span>
            </label>
          </div>
        </div>
        <div>
          <label class="block mb-1 font-medium">Keterangan</label>
          <textarea
            class="w-full border p-2 rounded"
            value={form().keterangan}
            onInput={(e) => setForm({ ...form(), keterangan: e.target.value })}
          ></textarea>
        </div>
        <h2 class="text-lg font-bold mt-6 mb-2">Items</h2>
        <button
          type="button"
          class="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 mb-4"
          onClick={addItem}
          //hidden
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
                      disabled={true}
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="number"
                      class="border p-1 rounded w-full bg-gray-200"
                      value={item.lebar_greige}
                      readonly
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      inputmode="decimal"
                      class={`border p-1 rounded w-full ${
                        parseInt(form().satuan_unit_id) === 2 ? "bg-gray-200" : ""
                      }`}
                      readOnly={parseInt(form().satuan_unit_id) === 2}
                      value={item.meter}
                      onBlur={(e) =>
                        handleItemChange(i(), "meter", e.target.value, {
                          //triggerConversion: true,
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
                        parseInt(form().satuan_unit_id) === 1 ? "bg-gray-200" : ""
                      }`}
                      readOnly={parseInt(form().satuan_unit_id) === 1}
                      value={item.yard}
                      onBlur={(e) =>
                        handleItemChange(i(), "yard", e.target.value, {
                          //triggerConversion: true,
                        })
                      }
                      required
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      class="border p-2 rounded w-full bg-gray-200"
                      value={item.hargaFormatted || ""}
                      onBlur={(e) =>
                        handleItemChange(i(), "harga", e.target.value)
                      }
                      readonly
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      class="border p-1 rounded w-full bg-gray-200"
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
          <tfoot>
            <tr class="font-bold bg-gray-100">
              <td colSpan="3" class="text-right p-2">
                TOTAL
              </td>
              <td class="border p-2">{formatNumber(totalMeter(), { decimals: 2 })}</td>
              <td class="border p-2">{formatNumber(totalYard(), { decimals: 2 })}</td>
              <td></td>
              <td class="border p-2">{formatIDR(totalAll())}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
        <div>
          <button
            type="submit"
            class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            hidden={isView}
            disabled={isView}
          >
            Simpan
          </button>
        </div>
      </form>
    </MainLayout>
  );
}
