import { createSignal, createEffect, For, onMount } from "solid-js";
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

  const [jenisPOOptions, setJenisPOOptions] = createSignal([]);
  const [supplierOptions, setSupplierOptions] = createSignal([]);
  const [satuanUnitOptions, setSatuanUnitOptions] = createSignal([]);
  const [fabricOptions, setFabricOptions] = createSignal([]);
  const [salesContracts, setSalesContracts] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
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
    ppn: 0,
    catatan: "",
    no_seq: 0,
    items: [],
  });

  // createEffect(async () => {
  //   lastSeq = await getLastSequence(
  //     user?.token,
  //     "bg_c",
  //     "domestik",
  //     form().ppn
  //   );

  //   console.log(lastSeq);
  // });

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

      if (!data) return;

      // Normalisasi item
      const normalizedItems = (dataItems || []).map((item) => ({
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

      const str = data.no_pc;
      const bagianAkhir = str.split("-")[1]; // hasilnya: "0001"
      const sequenceNumber = parseInt(bagianAkhir, 10); // hasilnya: 1

      setForm((prev) => ({
        ...prev,
        jenis_po_id: data.jenis_po_id ?? "",
        sequence_number: data.no_pc ?? "",
        supplier_id: data.supplier_id ?? "",
        satuan_unit_id: data.satuan_unit_id ?? "",
        termin: data.termin ?? "",
        ppn: data.ppn_percent ?? "",
        catatan: data.catatan ?? "",
        no_seq: sequenceNumber ?? 0,
        items: normalizedItems,
      }));

      form().items.forEach((item, index) => {
        // Panggil ulang handleItemChange untuk field-field penting
        handleItemChange(index, "meter", item.meter);
        handleItemChange(index, "yard", item.yard);
        handleItemChange(index, "harga", item.harga);
        handleItemChange(index, "lebar_greige", item.lebar_greige);
      });
    } else {
      const lastSeq = await getLastSequence(
        user?.token,
        "bg_c",
        "domestik",
        form().ppn
      );

      setForm((prev) => ({
        ...prev,
        sequence_number: lastSeq?.no_sequence + 1 || "",
      }));
    }
    setLoading(false);
  });

  const generateNomorKontrak = async () => {
    const lastSeq = await getLastSequence(
      user?.token,
      "bg_c",
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
    const nomor = `PC/BG/${type}/${mmyy}/${nextNum}`;
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
          fabric_id: "",
          lebar_greige: "",
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

  const formatIDR = (val) => {
    if (val === null || val === "") return "";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const parseIDR = (str) => {
    if (!str) return "";
    // Keep digits and optional decimal point
    const cleaned = str.replace(/[^0-9.]/g, "");
    return cleaned ? parseFloat(cleaned) : "";
  };

  const formatNumber = (num) => {
    if (num == null || num === "") return "";
    return new Intl.NumberFormat("id-ID").format(num);
  };

  const parseNumber = (str) => {
    if (!str) return 0;
    return parseFloat(str.replace(/\./g, "")) || 0;
  };

  const handleItemChange = (index, field, value, options = {}) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index] };

      // always store raw string
      if (["lebar_greige", "meter", "yard", "harga"].includes(field)) {
        const numberValue = parseNumber(value);
        items[index][field] = formatNumber(numberValue);
      } else {
        items[index][field] = value;
      }

      const satuanId = prev.satuan_unit_id;
      const satuan = satuanUnitOptions()
        .find((u) => u.id == satuanId)
        ?.satuan?.toLowerCase();

      let meter = parseFloat(items[index].meter || "") || 0;
      let yard = parseFloat(items[index].yard || "") || 0;

      // handle harga
      if (field === "harga") {
        // const rawHarga = value.replace(/[^\d]/g, "");
        const hargaNumber = parseIDR(value || "0") || 0;

        items[index].harga = hargaNumber;

        if (options.triggerFormat) {
          items[index].hargaFormatted = formatIDR(hargaNumber);
        } else {
          items[index].hargaFormatted = hargaNumber;
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
          items[index].yard = yard > 0 ? formatNumber(yard.toFixed(4)) : "";
        } else if (field === "yard") {
          yard = parseFloat(value) || 0;
          meter = yard * 0.9144;
          items[index].meter = meter > 0 ? formatNumber(meter.toFixed(4)) : "";
        }
      }

      if (field === "lebar_greige") {
        items[index].lebar_greige = value;
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

    try {
      if (isEdit) {
        const payload = {
          // ...form(),
          no_pc: form().sequence_number,
          supplier_id: Number(form().supplier_id),
          satuan_unit_id: Number(form().satuan_unit_id),
          termin: Number(form().termin),
          ppn_percent: parseFloat(form().ppn),
          catatan: form().catatan,
          items: form().items.map((i) => ({
            kain_id: Number(i.fabric_id),
            lebar_greige: parseFloat(i.lebar_greige),
            meter_total: parseFloat(i.meter),
            yard_total: parseFloat(i.yard),
            harga: parseFloat(i.harga),
            subtotal: parseFloat(i.subtotal),
          })),
        };

        await updateDataBeliGreige(user?.token, params.id, payload);
      } else {
        const payload = {
          // ...form(),
          satuan_unit_id: Number(form().satuan_unit_id),
          supplier_id: Number(form().supplier_id),
          sequence_number: Number(form().no_seq),
          termin: Number(form().termin),
          ppn_percent: Number(form().ppn),
          catatan: form().catatan,
          items: form().items.map((i) => ({
            kain_id: Number(i.fabric_id),
            lebar_greige: parseFloat(i.lebar_greige),
            meter_total: parseFloat(i.meter),
            yard_total: parseFloat(i.yard),
            harga: parseFloat(i.harga),
            subtotal: parseFloat(i.subtotal),
          })),
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

  function handlePrint() {
    const encodedData = encodeURIComponent(JSON.stringify(form()));
    window.open(`/print/beligreige/contract?data=${encodedData}`, "_blank");
  }

  return (
    <MainLayout>
      {loading() && (
        <div class="fixed inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-md bg-opacity-40 z-50 gap-10">
          <div class="w-52 h-52 border-[20px] border-white border-t-transparent rounded-full animate-spin"></div>
          <span class="animate-pulse text-[40px] text-white">Loading...</span>
        </div>
      )}
      <h1 class="text-2xl font-bold mb-4">Tambah Purchase Contract</h1>
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
            >
              <option value="">Pilih Satuan</option>
              <For each={satuanUnitOptions()}>
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
            <label class="flex items-center cursor-pointer gap-3">
              <div class="relative">
                <input
                  type="checkbox"
                  checked={form().ppn === "11"}
                  onChange={(e) =>
                    setForm({ ...form(), ppn: e.target.checked ? "11" : "0" })
                  }
                  class="sr-only peer"
                />
                <div class="w-24 h-10 bg-gray-200 rounded-full peer peer-checked:bg-green-600 transition-colors"></div>
                <div class="absolute left-0.5 top-0.5 w-9 h-9 bg-white border border-gray-300 rounded-full shadow-sm transition-transform peer-checked:translate-x-14"></div>
              </div>
              <span class="text-lg text-gray-700">
                {form().ppn === "11" ? "11%" : "0%"}
              </span>
            </label>
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
                      onChange={(val) =>
                        handleItemChange(i(), "fabric_id", val)
                      }
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
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      inputmode="decimal"
                      class={`border p-1 rounded w-full ${
                        parseInt(form().satuan_unit_id) === 2
                          ? "bg-gray-200"
                          : ""
                      }`}
                      readOnly={parseInt(form().satuan_unit_id) === 2}
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
                      class={`border p-1 rounded w-full ${
                        parseInt(form().satuan_unit_id) === 1
                          ? "bg-gray-200"
                          : ""
                      }`}
                      readOnly={parseInt(form().satuan_unit_id) === 1}
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
