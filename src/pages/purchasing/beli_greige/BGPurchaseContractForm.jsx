import { createSignal, createEffect, For, onMount, Show } from "solid-js";
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
  updateDataBeliGreige,
  createBeliGreige,
  getBeliGreiges,
} from "../../../utils/auth";
import SearchableSalesContractSelect from "../../../components/SalesContractDropdownSearch";
import { Printer, Trash2 } from "lucide-solid";
import SupplierDropdownSearch from "../../../components/SupplierDropdownSearch";
import FabricDropdownSearch from "../../../components/FabricDropdownSearch";

export default function BGPurchaseContractForm() {
  const navigate = useNavigate();
  const user = getUser();

  const [manualGenerateDone, setManualGenerateDone] = createSignal(false)
  const [jenisPOOptions, setJenisPOOptions] = createSignal([]);
  const [supplierOptions, setSupplierOptions] = createSignal([]);
  const [satuanUnitOptions, setSatuanUnitOptions] = createSignal([
    { id: 1, satuan: 'Meter' },
    { id: 2, satuan: 'Yard' },
    { id: 3, satuan: 'Kilogram' },
  ]);
  const [fabricOptions, setFabricOptions] = createSignal([]);
  const [salesContracts, setSalesContracts] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const isView = params.view === 'true';
  const filteredSatuanOptions = () =>
    satuanUnitOptions().filter(
      (u) => u.satuan.toLowerCase() !== "kilogram"
    );
  const [purchaseContractData, setPurchaseContractData] = createSignal(null);

  const [form, setForm] = createSignal({
    jenis_po_id: "",
    sequence_number: "",
    tanggal: new Date().toISOString().substring(0, 10),
    sales_contract_id: "",
    supplier_id: "",
    satuan_unit_id: "",
    termin: "",
    ppn_percent: "0.00",
    keterangan: "",
    no_seq: 0,
    items: [],
  });

  const formatNumber = (num, options = {}) => {
    const numValue = typeof num === 'string' ? parseNumber(num) : num;
    if (isNaN(numValue)) return "";

    // Opsi untuk menampilkan "0,00" jika diperlukan
    if (numValue === 0 && options.showZero) {
      return new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: options.decimals ?? 0,
        maximumFractionDigits: options.decimals ?? 2,
      }).format(0);
    }
    
    if (numValue === 0) return "";

    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: options.decimals ?? 0,
      maximumFractionDigits: options.decimals ?? 4,
    }).format(numValue);
  };

  const formatNumberQty = (num, decimals = 2) => {
    if (num === "" || num === null || num === undefined) return "";

    const numValue = Number(num);
    
    if (isNaN(numValue)) return "";
    
    if (numValue === 0) return "0";

    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(numValue);
  };

  const parseNumber = (str) => {
    if (typeof str !== 'string' || !str) return 0;
    // Hapus semua karakter non-numerik KECUALI koma, lalu ganti koma dengan titik
    const cleaned = str.replace(/[^0-9,]/g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  createEffect(() => {
    const ppn = form().ppn_percent; 

    if (isEdit || isView || !manualGenerateDone()) {
        return;
    }
    generateNomorKontrak();
  });

  onMount(async () => {
    setLoading(true);
    const [contracts, jenisPO, suppliers, satuanUnits, fabrics] =
      await Promise.all([
        getAllSalesContracts(user?.token),
        getAllSOTypes(user?.token),
        getAllSuppliers(user?.token),
        getAllSatuanUnits(user?.token),
        getAllFabrics(user?.token),
      ]);

    setSalesContracts(contracts.contracts);
    setJenisPOOptions(jenisPO.data || []);
    setSupplierOptions(suppliers.suppliers || []);
    setSatuanUnitOptions(satuanUnits.data || []);
    setFabricOptions(fabrics.kain || []);

    if (isEdit) {
      const res = await getBeliGreiges(params.id, user?.token);
      const data = res.contract;
      const dataItems = data.items;

      //console.log("Data Greige: ", JSON.stringify(data, null, 2));

      const fullPrintData = {
        ...data,
      };
      // Simpan ke dalam signal
      setPurchaseContractData(fullPrintData);

      if (!data) return;

      // Normalisasi item
      const normalizedItems = (dataItems || []).map((item) => {
        const meterValue = parseFloat(item.meter_total) || 0;
        const yardValue = parseFloat(item.yard_total) || 0;
        const hargaValue = parseFloat(item.harga) || 0;
        const lebarGreigeValue = parseFloat(item.lebar_greige) || 0;
        
        const subtotal = hargaValue * (
          parseInt(data.satuan_unit_id) === 1 ? meterValue :
          parseInt(data.satuan_unit_id) === 2 ? yardValue : 0
        );
        
        return {
          // Data asli disimpan untuk display Quantity
          meter_total: item.meter_total,
          yard_total: item.yard_total,
          meter_dalam_proses: item.meter_dalam_proses,
          yard_dalam_proses: item.yard_dalam_proses,
          corak_kain: item.corak_kain,
          konstruksi_kain: item.konstruksi_kain,

          fabric_id: item.kain_id,
          lebar_greige: formatNumber(lebarGreigeValue, { decimals: 0 }),
          lebar_greigeValue: lebarGreigeValue,
          meter: formatNumber(meterValue, { decimals: 2, showZero: true }),
          meterValue: meterValue,
          yard: formatNumber(yardValue, { decimals: 2, showZero: true }),
          yardValue: yardValue,
          harga: formatIDR(hargaValue),
          hargaValue: hargaValue,
          subtotal: subtotal,
          subtotalFormatted: formatIDR(subtotal),
        };
      });

      const str = data.no_pc;
      const bagianAkhir = str.split("-")[1];
      const sequenceNumber = parseInt(bagianAkhir, 10);

      setForm((prev) => ({
        ...prev,
        jenis_po_id: data.jenis_po_id ?? "",
        sequence_number: data.no_pc ?? "",
        supplier_id: data.supplier_id ?? "",
        satuan_unit_id: data.satuan_unit_id ?? "",
        termin: data.termin ?? "",
        ppn_percent: parseFloat(data.ppn_percent) > 0 ? "11.00" : "0.00",
        keterangan: data.keterangan ?? "",
        tanggal: data.created_at 
          ? new Date(data.created_at).toISOString().substring(0, 10) // ⬅️ ambil created_at dari API
          : prev.tanggal,
        no_seq: sequenceNumber ?? 0,
        items: normalizedItems,
      }));
    }
    setLoading(false);
  });

  const generateNomorKontrak = async () => {
    const lastSeq = await getLastSequence(
      user?.token,
      "bg_c",
      "domestik",
      form().ppn_percent
    );

    const nextNum = String((lastSeq?.last_sequence || 0) + 1).padStart(5, "0");
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(2);
    const ppnValue = parseFloat(form().ppn_percent) || 0;
    const ppnType = ppnValue > 0 ? "P" : "N";
    const mmyy = `${month}${year}`;
    const nomor = `PC/BG/${ppnType}/${mmyy}/${nextNum}`;
    setForm((prev) => ({
      ...prev,
      sequence_number: nomor,
      no_seq: lastSeq?.last_sequence + 1,
    }));
    setManualGenerateDone(true);
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          fabric_id: "",
          lebar_greige: "", lebar_greigeValue: 0,
          meter: "", meterValue: 0,
          yard: "", yardValue: 0,
          harga: "", hargaValue: 0,
          subtotal: 0, subtotalFormatted: "",
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

  const handleItemChange = (index, field, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      const item = { ...items[index] };
      const satuanId = parseInt(prev.satuan_unit_id);

      if (field === 'fabric_id') {
        item[field] = value;
      }
      else {
        const numValue = parseNumber(value);
        item[`${field}Value`] = numValue;

        let decimals = 2;
        if (['meter', 'yard'].includes(field)) decimals = 2;
        if (field === 'lebar_greige') decimals = 0;

        if (field === 'harga') {
          item.harga = formatIDR(numValue);
        } else {
          item[field] = formatNumber(numValue, { decimals });
        }
        
        if (satuanId === 1 && field === 'meter') {
          item.yardValue = numValue * 1.093613;
          item.yard = formatNumber(item.yardValue, { decimals: 2, showZero: true });
        } else if (satuanId === 2 && field === 'yard') {
          item.meterValue = numValue * 0.9144;
          item.meter = formatNumber(item.meterValue, { decimals: 2, showZero: true });
        }
      }
      
      const hargaValue = item.hargaValue || 0;
      let qtyValue = 0;
      if (satuanId === 1) qtyValue = item.meterValue || 0;
      else if (satuanId === 2) qtyValue = item.yardValue || 0;

      const subtotal = qtyValue * hargaValue;
      item.subtotal = subtotal;
      item.subtotalFormatted = formatIDR(subtotal);

      items[index] = item;
      return { ...prev, items };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
        // Kirim raw value ke API
      const payloadItems = form().items.map((i) => ({
        kain_id: Number(i.fabric_id),
        lebar_greige: i.lebar_greigeValue || 0,
        meter_total: i.meterValue || 0,
        yard_total: i.yardValue || 0,
        harga: i.hargaValue || 0,
        subtotal: i.subtotal || 0,
      }));

      if (isEdit) {
        const payload = {
            no_pc: form().sequence_number,
            supplier_id: Number(form().supplier_id),
            satuan_unit_id: Number(form().satuan_unit_id),
            termin: Number(form().termin),
            ppn_percent: parseFloat(form().ppn_percent),
            keterangan: form().keterangan,
            items: payloadItems,
        };
        await updateDataBeliGreige(user?.token, params.id, payload);
      } else {
         const payload = {
            satuan_unit_id: Number(form().satuan_unit_id),
            supplier_id: Number(form().supplier_id),
            sequence_number: Number(form().no_seq),
            termin: Number(form().termin),
            ppn_percent: parseFloat(form().ppn_percent),
            keterangan: form().keterangan,
            items: payloadItems,
         };
        await createBeliGreige(user?.token, payload);
      }

      Swal.fire({
        icon: "success",
        title: "Purchase Order berhasil disimpan!",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => {
        navigate("/beligreige-purchasecontract");
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Gagal menyimpan Purchase Order",
        text: err?.message || "Terjadi kesalahan.",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
    }
  };

  // function handlePrint() {
  //   const encodedData = encodeURIComponent(JSON.stringify(form()));
  //   window.open(`/print/beligreige/contract?data=${encodedData}`, "_blank");
  // }

  function handlePrint() {
    if (!purchaseContractData()) {
      Swal.fire("Gagal", "Data untuk mencetak tidak tersedia. Pastikan Anda dalam mode Edit/View.", "error");
      return;
    }

    const dataToPrint = { ...purchaseContractData() };
    // CHANGED: kirim via hash, bukan query, agar tidak kena 431
    const encodedData = encodeURIComponent(JSON.stringify(dataToPrint));
    window.open(`/print/beligreige/contract#${encodedData}`, "_blank");
  }

  return (
    <MainLayout>
      {loading() && (
        <div class="fixed inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-md bg-opacity-40 z-50 gap-10">
          <div class="w-52 h-52 border-[20px] border-white border-t-transparent rounded-full animate-spin"></div>
          <span class="animate-pulse text-[40px] text-white">Loading...</span>
        </div>
      )}
      <h1 class="text-2xl font-bold mb-4">
        {isView ? "Detail" : isEdit ? "Edit" : "Tambah"} Purchase Contract Greige
      </h1>
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
                value={form().sequence_number}
                readOnly
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
            <label class="block mb-1 font-medium">Jenis Kontrak</label>
            <input
              type="date"
              class="w-full border bg-gray-200 p-2 rounded"
              value="BG"
              readOnly
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
          <div>
            <label class="block mb-1 font-medium">Supplier</label>
            <SupplierDropdownSearch
              suppliers={supplierOptions}
              form={form}
              setForm={setForm}
              onChange={(id) => setForm({ ...form(), supplier_id: id })}
              disabled={isView}
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
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block mb-1 font-medium">Satuan Unit</label>
            <select
              class="w-full border p-2 rounded"
              value={form().satuan_unit_id}
              onChange={(e) =>
                setForm({ ...form(), satuan_unit_id: e.target.value })
              }
              required
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
            >
              <option value="">Pilih Satuan</option>
              <For each={filteredSatuanOptions()}>
                {(u) => <option value={u.id}>{u.satuan}</option>}
              </For>
            </select>
          </div>

          <div>
            <label class="block mb-1 font-medium">Termin</label>
            <select
              class="w-full border p-2 rounded"
              value={form().termin}
              onInput={(e) => setForm({ ...form(), termin: e.target.value })}
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
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
            <label class="flex items-center cursor-pointer gap-3">
              <div class="relative">
                <input
                  type="checkbox"
                  checked={form().ppn_percent === "11.00"}
                  onChange={(e) =>
                    setForm({ ...form(), ppn_percent: e.target.checked ? "11.00" : "0.00" })
                  }
                  class="sr-only peer"
                  disabled={isView || isEdit}
                />
                <div class="w-24 h-10 bg-gray-200 rounded-full peer peer-checked:bg-green-600 transition-colors"></div>
                <div class="absolute left-0.5 top-0.5 w-9 h-9 bg-white border border-gray-300 rounded-full shadow-sm transition-transform peer-checked:translate-x-14"></div>
              </div>
              <span class="text-lg text-gray-700">
                {form().ppn_percent === "11.00" ? "11%" : "0%"}
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
            classList={{ "bg-gray-200": isView }}
          ></textarea>
        </div>

        <Show when={isView && form().items && form().items.length > 0}>
          <div class="border p-3 rounded my-4 bg-gray-50">
            <h3 class="text-md font-bold mb-2 text-gray-700">Quantity Kain:</h3>
            <ul class="space-y-1 pl-5">
              <For each={form().items}>
                {(item) => {
                  const unit = form().satuan_unit_id == 1 ? 'Meter' : 'Yard';
                  const sisa =
                    unit === 'Meter'
                      ? Number(item.meter_total) - Number(item.meter_dalam_proses || 0)
                      : Number(item.yard_total) - Number(item.yard_dalam_proses || 0);

                  return (
                    <li class="text-sm list-disc">
                      <span class="font-semibold">
                        {item.corak_kain} | {item.konstruksi_kain}
                      </span>{' '}
                      - Quantity:{' '}
                      {sisa > 0 ? (
                        <span class="font-bold text-blue-600">
                          {formatNumberQty(sisa)} {unit === 'Meter' ? 'm' : 'yd'}
                        </span>
                      ) : (
                        <span class="font-bold text-red-600">HABIS</span>
                      )}
                    </li>
                  );
                }}
              </For>
            </ul>
          </div>
        </Show>

        <h2 class="text-lg font-bold mt-6 mb-2">Items</h2>

        <button
          type="button"
          class="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 mb-4"
          onClick={addItem}
          hidden={isView}
        >
          + Tambah Item
        </button>

        <table class="w-full text-sm border border-gray-300 mb-4">
          <thead class="bg-gray-100">
            <tr>
              <th class="border p-2">#</th>
              <th class="border p-2">Jenis Kain</th>
              <th class="border p-2">Lebar Greige</th>
              <Show when={parseInt(form().satuan_unit_id) === 1}>
                <th class="border p-2">Meter</th>
              </Show>

              <Show when={parseInt(form().satuan_unit_id) === 2}>
                <th class="border p-2">Yard</th>
              </Show>
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
                      onChange={(val) =>
                        handleItemChange(i(), "fabric_id", val)
                      }
                      disabled={isView}
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      inputmode="decimal"
                      class="border p-1 rounded w-full"
                      value={item.lebar_greige}
                      onBlur={(e) =>
                        handleItemChange(i(), "lebar_greige", e.target.value)
                      }
                      disabled={isView}
                      classList={{ "bg-gray-200": isView }}
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
                  <td class="border p-2">
                    <input
                      type="text"
                      inputmode="decimal"
                      class="border p-1 rounded w-full"
                      value={item.harga}
                      onBlur={(e) =>
                        handleItemChange(i(), "harga", e.target.value, {
                        })
                      }
                      disabled={isView}
                      classList={{ "bg-gray-200": isView }}
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      class="border p-1 rounded w-full"
                      value={item.subtotalFormatted ?? ""}
                      disabled={true}
                      classList={{ "bg-gray-200": true }}
                    />
                  </td>
                  <td class="border p-2 text-center">
                    <button
                      type="button"
                      class="text-red-600 hover:text-red-800 text-xs"
                      onClick={() => removeItem(i())}
                      disabled={isView}
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
