import { createSignal, onMount, For, Show } from "solid-js";
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
  getOrderCelupOrders,
  getAllOrderCelups,
  updateDataOrderCelupOrder,
  createOrderCelupOrder,
  getAllColors,
  getOrderCelups,
} from "../../../utils/auth";
import SupplierDropdownSearch from "../../../components/SupplierDropdownSearch";
import FabricDropdownSearch from "../../../components/FabricDropdownSearch";
import PurchasingContractDropdownSearch from "../../../components/PurchasingContractDropdownSearch";
import { Printer, Trash2 } from "lucide-solid";
import ColorDropdownSearch from "../../../components/ColorDropdownSearch";

export default function OCPurchaseOrderForm() {
  const navigate = useNavigate();
  const user = getUser();

  const [supplierOptions, setSupplierOptions] = createSignal([]);
  const [satuanUnitOptions, setSatuanUnitOptions] = createSignal([
    { id: 1, satuan: 'Meter' },
    { id: 2, satuan: 'Yard' },
    { id: 3, satuan: 'Kilogram' },
  ]);
  const [fabricOptions, setFabricOptions] = createSignal([]);
  const [purchaseContracts, setPurchaseContracts] = createSignal([]);
  const [colorOptions, setColorOptions] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const isView = params.view === "true";
  const filteredSatuanOptions = () =>
    satuanUnitOptions().filter(
      (u) => u.satuan.toLowerCase() !== "kilogram"
    );

  // State untuk menyimpan item asli dari kontrak sebagai template
  const [contractItems, setContractItems] = createSignal([]);

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

  const formatIDR = (val) => {
    const numValue = typeof val === 'string' ? parseNumber(val) : val;
    if (isNaN(numValue) || numValue === 0) return "";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numValue);
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

  onMount(async () => {
    setLoading(true);
    const [bgc, suppliers, units, fabrics, colors] = await Promise.all([
      getAllOrderCelups(user?.token),
      getAllSuppliers(user?.token),
      getAllSatuanUnits(user?.token),
      getAllFabrics(user?.token),
      getAllColors(user?.token),
    ]);

    setPurchaseContracts(bgc.contracts);
    setSupplierOptions(suppliers.suppliers);
    setSatuanUnitOptions(units.data);
    setFabricOptions(fabrics.kain);
    setColorOptions(colors?.warna || ["Pilih"]);

    if (isEdit) {
      const res = await getOrderCelupOrders(params.id, user?.token);
      const data = res.order;
      const dataItems = res.order.items;

      if (!data) return;
      const normalizedItems = (dataItems || []).map((item) => {

        return {
          pc_item_id: item.pc_item_id,
          fabric_id: item.kain_id,
          lebar_greige: item.lebar_greige,
          lebar_finish: item.lebar_finish,
          warna_id: item.warna_id,
          meter: item.meter_total,
          yard: item.yard_total,
          harga: item.harga,
          subtotal: 0,
          subtotalFormatted:
            item.subtotal > 0 ? 
              new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0,
              }).format(item.subtotal) : "",
        };
      });

      handlePurchaseContractChange(data.pc_id, normalizedItems);

      setForm((prev) => ({
        ...prev,
        pc_id: Number(data.pc_id) ?? "",
        sequence_number: data.no_po ?? "",
        no_seq: data.sequence_number ?? 0,
        supplier_id: data.supplier_id ?? "",
        satuan_unit_id: data.satuan_unit_id ?? "",
        termin: data.termin ?? "",
        ppn: data.ppn_percent ?? "",
        keterangan: data.keterangan ?? "",
        //items: normalizedItems,
      }));
    } else{
      const lastSeq = await getLastSequence(
        user?.token, 
        "oc_o", 
        "domestik", 
        form().ppn,
      );

      setForm((prev) => ({
        ...prev,
        sequence_number: lastSeq?.no_sequence + 1 || "",
      }));
      
      form().items.forEach((item, index) => {
        handleItemChange(index, "meter", item.meter);
        handleItemChange(index, "yard", item.yard);
        handleItemChange(index, "harga", item.harga);
        handleItemChange(index, "lebar_greige", item.lebar_greige);
        handleItemChange(index, "lebar_finish", item.lebar_finish);
      });
    }
    setLoading(false);
  });

  const handlePurchaseContractChange = async (contractId, overrideItems) => {
      let selectedContract = purchaseContracts().find(
          (sc) => sc.id == contractId
      );

      if (!selectedContract || !selectedContract.items?.length) {
          const detail = await getOrderCelups(contractId, user?.token);
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

      const mappedItems = sourceItems.map((item) => {
          let fabricId = null;
          let dataSumber = {};

          if (overrideItems) {
              const contractItem = selectedContract.items.find(
                  (pcItem) => pcItem.id == item.pc_item_id
              );
              fabricId = contractItem ? (contractItem.kain_id || contractItem.fabric_id || contractItem.kain?.id) : null;
              dataSumber = item;
          } else {
              fabricId = item.kain_id || item.fabric_id || item.kain?.id;
              dataSumber = {
                  id: null,
                  pc_item_id: item.id, 
                  lebar_greige: item.lebar_greige,
                  lebar_finish: item.lebar_finish,
                  meter: item.meter_total || item.meter,
                  yard: item.yard_total || item.yard,
                  harga: item.harga,
              };
          }

          const meterNum = parseFloat(dataSumber.meter || 0);
          const yardNum = parseFloat(dataSumber.yard || 0);
          
          let qty = 0;
          if (satuan_unit_id === 1) qty = meterNum;
          else if (satuan_unit_id === 2) qty = yardNum;

          const harga = parseFloat(dataSumber.harga ?? 0);
          const subtotal = qty * harga;

          return {
              id: dataSumber.id,
              pc_item_id: dataSumber.pc_item_id,
              fabric_id: fabricId,
              warna_id: dataSumber.warna_id,
              lebar_greige: dataSumber.lebar_greige,
              lebar_finish: dataSumber.lebar_finish,
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

      const lastSeq = await getLastSequence(
          user?.token,
          "oc_o",
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

  const generateNomorKontrak = async () => {
    const lastSeq = await getLastSequence(
      user?.token,
      "oc_o",
      "domestik",
      form().ppn
    );

    const nextNum = String((lastSeq?.last_sequence || 0) + 1).padStart(5, "0");
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(2);
    const ppnValue = parseFloat(form().ppn) || 0;
    const ppnType = ppnValue > 0 ? "P" : "N";
    const mmyy = `${month}${year}`;
    const nomor = `PO/OC/${ppnType}/${mmyy}/${nextNum}`;
    setForm((prev) => ({
      ...prev,
      sequence_number: nomor,
      no_seq: lastSeq?.last_sequence + 1,
    }));
  };

  // FIX: Fungsi untuk menambah seluruh item dari kontrak
  const addItem = () => {
    const existingItems = form().items;

    if (!existingItems || existingItems.length === 0) {
      Swal.fire("Peringatan", "Tidak ada item untuk diduplikasi. Silakan pilih Purchase Contract terlebih dahulu.", "warning");
      return;
    }

    const newItemsToDuplicate = existingItems.map(item => ({
      ...item,
      id: null,
    }));

    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        ...newItemsToDuplicate
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

const handleItemChange = (index, field, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      const item = { ...items[index] };
      const satuanId = parseInt(prev.satuan_unit_id);
  
      if (field === "fabric_id" || field === "kain_id" || field === "warna_id") {
        item[field] = value;
  
        if (field === "fabric_id" || field === "kain_id") {
          item.kain_id = value; 
          const contract = purchaseContracts().find((sc) => sc.id == prev.pc_id);
          if (contract && contract.items) {
            const matchedItem = contract.items.find(
              (i) => i.fabric_id == value || i.kain_id == value
            );
            if (matchedItem) {
              item.pc_item_id = matchedItem.id;
            }
          }
        }
      } else { 
        const numValue = parseNumber(value);
        item[`${field}Value`] = numValue;
  
        if (field === "harga") {
          item.hargaValue = numValue;
          const formattedValue = formatIDR(numValue);
          item.harga = formattedValue; 
          item.hargaFormatted = formattedValue;
        } else {
          item[field] = formatNumber(numValue, {
            decimals: field === "lebar_greige" || field === "lebar_finish" ? 0 : 2,
          });
        }
  
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
  
      const harga = item.hargaValue || 0;
      let qty = 0;
  
      if (satuanId === 1) {
        qty = item.meterValue || 0;
      } else if (satuanId === 2) {
        qty = item.yardValue || 0;
      }
  
      const subtotal = qty * harga;
      item.subtotal = subtotal;
      item.subtotalFormatted = formatIDR(subtotal);
  
      items[index] = item;
      return {
        ...prev,
        items,
      };
    });
  };

  const totalMeter = () =>
    form().items.reduce((sum, item) => sum + (item.meterValue || 0), 0);

  const totalYard = () =>
    form().items.reduce((sum, item) => sum + (item.yardValue || 0), 0);

  const totalAll = () => {
    return form().items.reduce((sum, item) => {
      return sum + (item.subtotal || 0);
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form().no_seq && !isEdit){
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
        const payload = {
          no_po: form().sequence_number,
          pc_id: Number(form().pc_id),
          keterangan: form().keterangan,
          items: form().items.map((i) => ({
            pc_item_id: i.pc_item_id,
            warna_id: i.warna_id,
            meter_total: i.meterValue || 0,
            yard_total: i.yardValue || 0,
          })),
        };
        await updateDataOrderCelupOrder(user?.token, params.id, payload);
      } else {
        const payload = {
          pc_id: Number(form().pc_id),
          supplier_id: Number(form().supplier_id),
          satuan_unit_id: Number(form().satuan_unit_id),
          termin: Number(form().termin),
          ppn: parseFloat(form().ppn) || 0,
          keterangan: form().keterangan,
          sequence_number: Number(form().no_seq),
          no_po: form().sequence_number,
          items: form().items.map((i) => ({
            pc_item_id: i.pc_item_id,
            warna_id: i.warna_id,
            meter_total: i.meterValue || 0,
            yard_total: i.yardValue || 0,
          })),
        };
        await createOrderCelupOrder(user?.token, payload);
      }
      Swal.fire({
        icon: "success",
        title: "Purchase Order berhasil disimpan!",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => {
        navigate("/ordercelup-purchaseorder");
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
    window.open(`/print/ordercelup/order?data=${encodedData}`, "_blank");
  }

  return (
    <MainLayout>
      {loading() && (
        <div class="fixed inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-md bg-opacity-40 z-50 gap-10">
          <div class="w-52 h-52 border-[20px] border-white border-t-transparent rounded-full animate-spin"></div>
          <span class="animate-pulse text-[40px] text-white">Loading...</span>
        </div>
      )}
      <h1 class="text-2xl font-bold mb-4">Tambah Order Celup</h1>
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
            <label class="block mb-1 font-medium">No Order</label>
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
          <div>
            <label class="block mb-1 font-medium">No Purchase Contract</label>
            <PurchasingContractDropdownSearch
              purchaseContracts={purchaseContracts}
              form={form}
              setForm={setForm}
              onChange={handlePurchaseContractChange}
              disabled={isView || isEdit}
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
              <For each={filteredSatuanOptions()}>
                {(u) => <option value={u.id}>{u.satuan}</option>}
              </For>
            </select>
          </div>

          <div>
            <label class="block mb-1 font-medium">Termin</label>
            <input type="hidden" name="termin" value={form().termin} />
            <select
              class="w-full border p-2 rounded bg-gray-200 cursor-not-allowed"
              value={form().termin}
              disabled
            >
              <option value="">-- Pilih Termin --</option>
              <option value="0">Cash</option>
              <option value="30">30 Hari</option>
              <option value="45">45 Hari</option>
              <option value="60">60 Hari</option>
              <option value="90">90 Hari</option>
            </select>
          </div>

          <div>
            <label class="block mb-1 font-medium">PPN (%)</label>
            <input type="hidden" name="ppn" value={form().ppn}/>
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
                {parseFloat(form().ppn) === 11 ? "11%" : "0%"} 
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
            disabled={isView}
            classList={{ "bg-gray-200" : isView }}
          ></textarea>
        </div>

        <h2 class="text-lg font-bold mt-6 mb-2">Items</h2>

        <button
          type="button"
          class="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 mb-4"
          onClick={addItem}
          hidden={ isView }
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
              <th class="border p-2">Warna</th>
              <Show when={parseInt(form().satuan_unit_id) === 1}>
                <th class="border p-2">Meter</th>
              </Show>

              <Show when={parseInt(form().satuan_unit_id) === 2}>
                <th class="border p-2">Yard</th>
              </Show>
              <th class="border p-2" hidden>Harga</th>
              <th class="border p-2" hidden>Subtotal</th>
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
                      disabled={true}
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="number"
                      class="border p-1 rounded w-full bg-gray-200"
                      value={item.lebar_finish}
                      disabled={true}
                    />
                  </td>
                  <td class="border p-2">
                    <ColorDropdownSearch
                      colors={colorOptions}
                      item={item}
                      onChange={(val) => handleItemChange(i(), "warna_id", val)}
                      disabled={isView}
                    />
                  </td>
                  <Show when={parseInt(form().satuan_unit_id) === 1}>
                    <td class="border p-2">
                      <input
                        type="text"
                        inputmode="decimal"
                        class="border p-1 rounded w-full"
                        classList={{
                          "bg-gray-200": isView || parseInt(form().satuan_unit_id) === 2,
                        }}
                        readOnly={isView || parseInt(form().satuan_unit_id) === 2}
                        value={item.meter}
                        onBlur={(e) => {
                          if (parseInt(form().satuan_unit_id) === 1) {
                              handleItemChange(i(), "meter", e.target.value);
                          }
                        }}
                      />
                    </td>
                  </Show>
                  <Show when={parseInt(form().satuan_unit_id) === 2}>
                    <td class="border p-2">
                      <input
                        type="text"
                        inputmode="decimal"
                        class="border p-1 rounded w-full"
                        classList={{
                          "bg-gray-200": isView || parseInt(form().satuan_unit_id) === 1,
                        }}
                        readOnly={isView || parseInt(form().satuan_unit_id) === 1}
                        value={item.yard}
                        onBlur={(e) => {
                          if (parseInt(form().satuan_unit_id) === 2) {
                              handleItemChange(i(), "yard", e.target.value);
                          }
                        }}
                      />
                    </td>
                  </Show>
                  <td class="border p-2" hidden>
                    <input
                      type="text"
                      class="border p-2 rounded w-full bg-gray-200"
                      value={item.hargaFormatted || ""}
                      onBlur={(e) =>
                        handleItemChange(i(), "harga", e.target.value)
                      }
                      disabled={isView || isEdit}
                      classList={{ "bg-gray-200": isView || isEdit }}
                    />
                  </td>
                  <td class="border p-2" hidden>
                    <input
                      type="text"
                      class="border p-1 rounded w-full bg-gray-200"
                      value={item.subtotalFormatted ?? ""}
                      disabled={true}
                      classList={{ "bg-gray-200": true }}
                    />
                  </td>
                  <td class="border p-2 text-center">
                    {!item.readOnly && (
                      <button
                        type="button"
                        class="text-red-600 hover:text-red-800 text-xs"
                        onClick={() => removeItem(i())}
                        disabled={isView}
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
              <td colSpan="5" class="text-right p-2">
                TOTAL
              </td>
              <Show when={parseInt(form().satuan_unit_id) === 1}>
                <td class="border p-2">{formatNumber(totalMeter(), { decimals: 2 })}</td>
              </Show>
              <Show when={parseInt(form().satuan_unit_id) === 2}>
                <td class="border p-2">{formatNumber(totalYard(), { decimals: 2 })}</td>
              </Show>
              <td></td>
              <td class="border p-2" hidden>{formatIDR(totalAll())}</td>
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