import { createSignal, createEffect, For, onMount } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  getLastSequence,
  getAllSuppliers,
  getAllSatuanUnits,
  getAllFabrics,
  getUser,
  updateDataOrderCelup,
  createOrderCelup,
  getOrderCelups,
  getAllColors,
} from "../../../utils/auth";
import { Printer, Trash2 } from "lucide-solid";
import SupplierDropdownSearch from "../../../components/SupplierDropdownSearch";
import FabricDropdownSearch from "../../../components/FabricDropdownSearch";
import ColorDropdownSearch from "../../../components/ColorDropdownSearch";

export default function OCPurchaseContractForm() {
  const navigate = useNavigate();
  const user = getUser();

  const [supplierOptions, setSupplierOptions] = createSignal([]);
  const [satuanUnitOptions, setSatuanUnitOptions] = createSignal([]);
  const [fabricOptions, setFabricOptions] = createSignal([]);
  const [colorOptions, setColorOptions] = createSignal([]);
  const [params] = useSearchParams();
  const isEdit = !!params.id;

  const [form, setForm] = createSignal({
    sequence_number: "",
    tanggal: new Date().toISOString().substring(0, 10),
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
  //     oc",
  //     "domestik",
  //     form().ppn
  //   );

  //   console.log(lastSeq);
  // });

  createEffect(async () => {
    const colors = await getAllColors(user?.token);

    setColorOptions(
      colors?.warna.map((c) => ({
        id: c.id, // wajib biar ColorDropdownSearch bisa nemu
        label: c.kode + " | " + c.deskripsi,
      })) || []
    );
  });

  onMount(async () => {
    const [suppliers, satuanUnits, fabrics] = await Promise.all([
      getAllSuppliers(user?.token),
      getAllSatuanUnits(user?.token),
      getAllFabrics(user?.token),
    ]);

    setSupplierOptions(suppliers.suppliers || []);
    setSatuanUnitOptions(satuanUnits.data || []);
    setFabricOptions(fabrics.kain || []);

    if (isEdit) {
      const res = await getOrderCelups(params.id, user?.token);
      const data = res.contract;
      const dataItems = data.items;

      if (!data) return;

      // Normalisasi item
      const normalizedItems = (dataItems || []).map((item) => ({
        fabric_id: item.kain_id,
        lebar_greige: item.lebar_greige,
        lebar_finish: item.lebar_finish,
        warna_id: item.warna_id || "",
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

      console.log(data);

      const str = data.no_pc;
      const bagianAkhir = str.split("-")[1]; // hasilnya: "0001"
      const sequenceNumber = parseInt(bagianAkhir, 10); // hasilnya: 1

      setForm((prev) => ({
        ...prev,
        sequence_number: data.no_pc ?? "",
        supplier_id: data.supplier_id ?? "",
        satuan_unit_id: data.satuan_unit_id ?? "",
        tanggal: new Date(data.created_at).toISOString().split("T")[0] ?? "",
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
        "oc_c",
        "domestik",
        form().ppn
      );

      setForm((prev) => ({
        ...prev,
        sequence_number: lastSeq?.no_sequence + 1 || "",
      }));
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

  const generateNomorKontrak = async () => {
    const lastSeq = await getLastSequence(
      user?.token,
      "oc_c",
      "domestik",
      form().ppn
    );

    console.log(lastSeq)

    const nextNum = String((lastSeq?.last_sequence || 0) + 1).padStart(5, "0");
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(2);
    const ppnValue = parseFloat(form().ppn) || 0;
    const type = ppnValue > 0 ? "P" : "N";
    const mmyy = `${month}${year}`;
    const nomor = `PC/OC/${type}/${mmyy}/${nextNum}`;
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
          lebar_finish: "",
          warna_id: "",
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
        // const rawHarga = value.replace(/[^\d]/g, "");
        const hargaNumber = parseFloat(value || "0") || 0;

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
          items[index].yard = yard > 0 ? yard.toFixed(4) : "";
        } else if (field === "yard") {
          yard = parseFloat(value) || 0;
          meter = yard * 0.9144;
          items[index].meter = meter > 0 ? meter.toFixed(4) : "";
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

    const payload = {
      ...form(),
      no_pc: form().sequence_number,
      sequence_number: Number(form().no_seq),
      termin: Number(form().termin),
      ppn_percent: Number(form().ppn),
      items: form().items.map((i) => ({
        kain_id: Number(i.fabric_id),
        lebar_greige: parseFloat(i.lebar_greige),
        lebar_finish: parseFloat(i.lebar_finish),
        warna_id: Number(i.warna_id),
        meter_total: parseFloat(i.meter),
        yard_total: parseFloat(i.yard),
        harga: parseFloat(i.harga),
        subtotal: parseFloat(i.subtotal),
      })),
    };

    try {
      if (isEdit) {
        await updateDataOrderCelup(user?.token, params.id, payload);
      } else {
        await createOrderCelup(user?.token, payload);
      }

      Swal.fire({
        icon: "success",
        title: "Purchase Order berhasil disimpan!",
      }).then(() => {
        navigate("/ordercelup-purchasecontract");
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

  function handlePrint() {
    const encodedData = encodeURIComponent(JSON.stringify(form()));
    window.open(`/print/ordercelup/contract?data=${encodedData}`, "_blank");
  }

  return (
    <MainLayout>
      <h1 class="text-2xl font-bold mb-4">Tambah Kontrak Proses</h1>
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
              <th class="border p-2">Warna</th>
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
                      class="border p-1 rounded w-full"
                      value={item.lebar_finish}
                      onBlur={(e) =>
                        handleItemChange(i(), "lebar_finish", e.target.value)
                      }
                    />
                  </td>
                  <td class="border p-2">
                    <ColorDropdownSearch
                      colors={colorOptions}
                      form={() => item}
                      setForm={(val) => handleItemChange(i(), "warna_id", val)}
                      onChange={(val) => handleItemChange(i(), "warna_id", val)}
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
