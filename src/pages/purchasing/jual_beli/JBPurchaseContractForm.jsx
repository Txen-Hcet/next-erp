import { createSignal, createEffect, For, onMount, Show } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  getLastSequence,
  getAllSuppliers,
  getAllSatuanUnits,
  getAllFabrics,
  getUser,
  updateDataJualBeli,
  createJualBeli,
  getJualBelis,
  getAllColors,
  getAllCustomers,
} from "../../../utils/auth";
import { Printer, Trash2 } from "lucide-solid";
import SupplierDropdownSearch from "../../../components/SupplierDropdownSearch";
import FabricDropdownSearch from "../../../components/FabricDropdownSearch";
import ColorDropdownSearch from "../../../components/ColorDropdownSearch";
import CustomerDropdownSearch from "../../../components/CustomerDropdownSearch";
import { jwtDecode } from "jwt-decode";

export default function JBPurchaseContractForm() {
  const navigate = useNavigate();
  const user = getUser();

  const [manualGenerateDone, setManualGenerateDone] = createSignal(false);
  const [supplierOptions, setSupplierOptions] = createSignal([]);
  const [customerOptions, setCustomerOptions] = createSignal([]);
  const [satuanUnitOptions, setSatuanUnitOptions] = createSignal([
    { id: 1, satuan: 'Meter' },
    { id: 2, satuan: 'Yard' },
    { id: 3, satuan: 'Kilogram' },
  ]);
  const [fabricOptions, setFabricOptions] = createSignal([]);
  const [colorOptions, setColorOptions] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const isView = params.view === 'true';
  const filteredSatuanOptions = () =>
    satuanUnitOptions().filter(
      (u) => u.satuan.toLowerCase() !== "kilogram"
    );
  const [jualBeliData, setJualBeliData] = createSignal(null);

  const payload = (() => {
    try { return user?.token ? jwtDecode(user.token) : null; }
    catch { return null; }
  })();

  const [me, setMe] = createSignal(payload);
  const strictFromParam = (params.strict || "").toLowerCase() === "warna";

  // role 12 / "staff marketing 2" → strict
  const isStrictColorEdit = () => {
    const u = me();
    const rid = Number(u?.role?.id ?? u?.role_id ?? 0);
    const rname = String(u?.role?.name ?? u?.role_name ?? "").toLowerCase();
    const byRole = rid === 12 || rname === "staff marketing 2";
    return strictFromParam || byRole;
  };

  // === RULES EDIT ===
  // CREATE (isEdit=false): semua field aktif
  // EDIT strict (isEdit=true && isStrictColorEdit): hanya dropdown Warna aktif
  // EDIT non-strict (isEdit=true && !strict): semua aktif
  const canEditAllFields = () => !isView && (!isEdit || !isStrictColorEdit());
  const canEditColorOnly = () => !isView && isEdit && isStrictColorEdit();
  const canEditQty = () => canEditAllFields();

  const [form, setForm] = createSignal({
    sequence_number: "",
    tanggal: new Date().toISOString().substring(0, 10),
    jenis_jb_id: "",
    supplier_id: "",
    customer_id: "",
    satuan_unit_id: "",
    termin: "",
    ppn_percent: "0.00",
    keterangan: "",
    instruksi_kain: "",
    no_seq: 0,
    items: [],
  });

  const formatNumber = (num, options = {}) => {
    const numValue = typeof num === 'string' ? parseNumber(num) : num;
    if (isNaN(numValue)) return "";
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
    const cleaned = str.replace(/[^0-9,]/g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  const formatIDR = (val) => {
    if (val === null || val === "") return "";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  createEffect(() => {
    // auto-generate nomor kalau user toggle PPN setelah tekan tombol Generate manual
    const ppn = form().ppn_percent;
    if (isEdit || isView || !manualGenerateDone()) return;
    generateNomorKontrak();
  });

  onMount(async () => {
    setLoading(true);
    const [suppliers, satuanUnits, fabrics, customers, colors] =
      await Promise.all([
        getAllSuppliers(user?.token),
        getAllSatuanUnits(user?.token),
        getAllFabrics(user?.token),
        getAllCustomers(user?.token),
        getAllColors(user?.token),
      ]);

    setSupplierOptions(suppliers.suppliers || []);
    setSatuanUnitOptions(satuanUnits.data || []);
    setFabricOptions(fabrics.kain || []);
    setCustomerOptions(customers.customers || []);
    setColorOptions(colors?.warna || ["Pilih"]);

    if (isEdit) {
      const res = await getJualBelis(params.id, user?.token);
      const data = res.mainRow;
      const dataItems = data.items;
      if (!data) return;

      const fullPrintData = { ...data };
      setJualBeliData(fullPrintData);

      const normalizedItems = (dataItems || []).map((item) => {
        const meterValue = parseFloat(item.meter_total) || 0;
        const yardValue = parseFloat(item.yard_total) || 0;
        const hargaValue = parseFloat(item.harga) || 0;
        const lebarKainValue = parseFloat(item.lebar_kain) || 0;

        const subtotal = hargaValue * (
          parseInt(data.satuan_unit_id) === 1 ? meterValue :
          parseInt(data.satuan_unit_id) === 2 ? yardValue : 0
        );

        return {
          // Data asli untuk info qty
          meter_total: item.meter_total,
          yard_total: item.yard_total,
          meter_dalam_proses: item.meter_dalam_proses,
          yard_dalam_proses: item.yard_dalam_proses,
          corak_kain: item.corak_kain,
          konstruksi_kain: item.konstruksi_kain,

          fabric_id: item.kain_id,
          warna_id: item.warna_id,
          keterangan_warna: item.keterangan_warna ?? "",
          lebar_kain: formatNumber(lebarKainValue, { decimals: 0 }),
          lebar_kainValue: lebarKainValue,
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

      const str = data.no_jb;
      const bagianAkhir = str.split("-")[1];
      const sequenceNumber = parseInt(bagianAkhir, 10);

      setForm((prev) => ({
        ...prev,
        sequence_number: data.no_jb ?? "",
        jenis_jb_id: data.jenis_jb_id ?? "",
        supplier_id: data.supplier_id ?? "",
        customer_id: data.customer_id ?? "",
        satuan_unit_id: data.satuan_unit_id ?? "",
        termin: data.termin ?? "",
        ppn_percent: parseFloat(data.ppn_percent) > 0 ? "11.00" : "0.00",
        keterangan: data.keterangan ?? "",
        instruksi_kain: data.instruksi_kain,
        tanggal: data.created_at
          ? new Date(data.created_at).toISOString().substring(0, 10)
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
      "jb",
      "domestik",
      form().ppn_percent
    );

    const nextNum = String((lastSeq?.last_sequence || 0) + 1).padStart(5, "0");
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(2);
    const ppnValue = parseFloat(form().ppn_percent) || 0;
    const type = ppnValue > 0 ? "P" : "N";
    const mmyy = `${month}${year}`;
    const nomor = `PC/JB/${type}/${mmyy}/${nextNum}`;
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
          lebar_kain: "", lebar_kainValue: 0,
          warna_id: "",
          keterangan_warna: "",
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

  const handleItemChange = (index, field, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      const item = { ...items[index] };
      const satuanId = parseInt(prev.satuan_unit_id);

      if (field === 'fabric_id' || field === 'warna_id') {
        item[field] = value;
      } else {
        const numValue = parseNumber(value);
        item[`${field}Value`] = numValue;

        let decimals = 2;
        if (['meter', 'yard'].includes(field)) decimals = 2;
        if (field === 'lebar_kain') decimals = 0;

        if (field === 'harga') {
          item.harga = formatIDR(numValue);
        } else if (field === "keterangan_warna") {
          item.keterangan_warna = value;
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
      const payloadItems = form().items.map((i) => ({
        kain_id: Number(i.fabric_id),
        warna_id: Number(i.warna_id),
        keterangan_warna: i.keterangan_warna || "",
        lebar_kain: i.lebar_kainValue || 0,
        meter_total: i.meterValue || 0,
        yard_total: i.yardValue || 0,
        harga: i.hargaValue || 0,
        subtotal: i.subtotal || 0,
      }));

      if (isEdit) {
        const payload = isStrictColorEdit()
          ? {
              no_jb: form().sequence_number,
              jenis_jb_id: Number(form().jenis_jb_id),
              customer_id: Number(form().customer_id),
              supplier_id: Number(form().supplier_id),
              satuan_unit_id: Number(form().satuan_unit_id),
              termin: Number(form().termin),
              ppn_percent: parseFloat(form().ppn_percent),
              keterangan: form().keterangan,
              instruksi_kain: form().instruksi_kain,
              // EDIT strict: backend tetap menerima field lain apa adanya,
              // tapi UI sudah mengunci sehingga yang berubah hanya warna.
              items: payloadItems,
            }
          : {
              no_jb: form().sequence_number,
              jenis_jb_id: Number(form().jenis_jb_id),
              customer_id: Number(form().customer_id),
              supplier_id: Number(form().supplier_id),
              satuan_unit_id: Number(form().satuan_unit_id),
              termin: Number(form().termin),
              ppn_percent: parseFloat(form().ppn_percent),
              keterangan: form().keterangan,
              instruksi_kain: form().instruksi_kain,
              items: payloadItems,
            };

        await updateDataJualBeli(user?.token, params.id, payload);
      } else {
        const payload = {
          sequence_number: Number(form().no_seq),
          jenis_jb_id: Number(form().jenis_jb_id),
          customer_id: Number(form().customer_id),
          supplier_id: Number(form().supplier_id),
          satuan_unit_id: Number(form().satuan_unit_id),
          termin: Number(form().termin),
          ppn_percent: parseFloat(form().ppn_percent),
          keterangan: form().keterangan,
          instruksi_kain: form().instruksi_kain,
          items: payloadItems,
        };
        await createJualBeli(user?.token, payload);
      }

      Swal.fire({
        icon: "success",
        title: "Purchase Order berhasil disimpan!",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => {
        navigate("/jualbeli-purchasecontract");
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
    if (!jualBeliData()) {
      Swal.fire("Gagal", "Data untuk mencetak tidak tersedia. Pastikan Anda dalam mode Edit/View.", "error");
      return;
    }
    const dataToPrint = { ...jualBeliData() };
    const encodedData = encodeURIComponent(JSON.stringify(dataToPrint));
    window.open(`/print/jualbeli/contract#${encodedData}`, "_blank");
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
        {isView ? "Detail" : isEdit ? "Edit" : "Tambah"} Kontrak Jual Beli
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
        <div class="grid grid-cols-4 gap-4">
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
              disabled={!canEditAllFields()}
              classList={{ "bg-gray-200": !canEditAllFields() }}
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Jenis Jual Beli</label>
            <select
              class="w-full border p-2 rounded"
              value={form().jenis_jb_id}
              onChange={(e) => setForm({ ...form(), jenis_jb_id: e.target.value })}
              required
              disabled={!canEditAllFields()}
              classList={{ "bg-gray-200": !canEditAllFields() }}
            >
              <option value="">Pilih Jenis Jual Beli</option>
              <option value="1">Greige</option>
              <option value="2">Celup</option>
              <option value="3">Finish</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-4 gap-4">
          <div>
            <label class="block mb-1 font-medium">Customer</label>
            <CustomerDropdownSearch
              customersList={customerOptions}
              form={form}
              setForm={setForm}
              onChange={(id) => setForm({ ...form(), customer_id: id })}
              disabled={!canEditAllFields()}
              classList={{ "bg-gray-200": !canEditAllFields() }}
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Satuan Unit</label>
            <select
              class="w-full border p-2 rounded"
              value={form().satuan_unit_id}
              onChange={(e) => setForm({ ...form(), satuan_unit_id: e.target.value })}
              required
              disabled={!canEditAllFields()}
              classList={{ "bg-gray-200": !canEditAllFields() }}
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
              disabled={!canEditAllFields()}
              classList={{ "bg-gray-200": !canEditAllFields() }}
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
                  disabled={!canEditAllFields()}
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

        <div class="grid grid-cols-2 gap-4">                  
          <div>
            <label class="block mb-1 font-medium">Keterangan</label>
            <textarea
              class="w-full border p-2 rounded"
              value={form().keterangan}
              onInput={(e) => setForm({ ...form(), keterangan: e.target.value })}
              disabled={!canEditAllFields()}
              classList={{ "bg-gray-200": !canEditAllFields() }}
            ></textarea>
          </div>

          <div>
            <label class="block mb-1 font-medium">Instruksi Kain</label>
            <textarea
              class="w-full border p-2 rounded"
              value={form().instruksi_kain}
              onInput={(e) => setForm({ ...form(), instruksi_kain: e.target.value })}
              disabled={!canEditAllFields()}
              classList={{ "bg-gray-200": !canEditAllFields() }}
            ></textarea>
          </div>
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
          class="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 mb-4 disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={addItem}
          hidden={isView || (isEdit && !canEditAllFields())}
        >
          + Tambah Item
        </button>

        <table class="w-full text-sm border border-gray-300 mb-4">
          <thead class="bg-gray-100">
            <tr>
              <th class="border p-2">#</th>
              <th class="border p-2">Jenis Kain</th>
              <th class="border p-2">Lebar Kain</th>
              <th class="border p-2">Warna</th>
              <th class="border p-2">Keterangan Warna</th>
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
                      onChange={(val) => handleItemChange(i(), "fabric_id", val)}
                      disabled={!canEditAllFields()}
                      classList={{ "bg-gray-200": !canEditAllFields() }}
                    />
                  </td>

                  <td class="border p-2">
                    <input
                      type="text"
                      inputmode="decimal"
                      class="border p-1 rounded w-full"
                      value={item.lebar_kain}
                      onBlur={(e) => handleItemChange(i(), "lebar_kain", e.target.value)}
                      disabled={!canEditAllFields()}
                      classList={{ "bg-gray-200": !canEditAllFields() }}
                    />
                  </td>

                  <td class="border p-2 w-48">
                    <ColorDropdownSearch
                      colors={colorOptions}
                      item={item}
                      onChange={(val) => handleItemChange(i(), "warna_id", val)}
                      disabled={isView}  // hanya View yang mengunci warna
                      classList={{ "bg-gray-200": isView }}
                    />
                  </td>

                  <td class="border p-2">
                    <input
                      type="text"
                      class="border p-1 rounded w-full"
                      value={item.keterangan_warna ?? ""}
                      onBlur={(e) => handleItemChange(i(), "keterangan_warna", e.target.value)}
                      disabled={isView || canEditColorOnly()}
                      classList={{ "bg-gray-200": isView || canEditColorOnly() }}
                      placeholder="Keterangan warna..."
                    />
                  </td>

                  <Show when={parseInt(form().satuan_unit_id) === 1}>
                    <td class="border p-2">
                      <input
                        type="text"
                        inputmode="decimal"
                        class="border p-1 rounded w-full"
                        readOnly={isView || !canEditQty() || parseInt(form().satuan_unit_id) === 2}
                        classList={{ "bg-gray-200": isView || !canEditQty() || parseInt(form().satuan_unit_id) === 2 }}
                        value={item.meter}
                        onBlur={(e) => {
                          if (parseInt(form().satuan_unit_id) === 1 && canEditQty()) {
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
                        readOnly={isView || !canEditQty() || parseInt(form().satuan_unit_id) === 1}
                        classList={{ "bg-gray-200": isView || !canEditQty() || parseInt(form().satuan_unit_id) === 1 }}
                        value={item.yard}
                        onBlur={(e) => {
                          if (parseInt(form().satuan_unit_id) === 2 && canEditQty()) {
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
                      onBlur={(e) => handleItemChange(i(), "harga", e.target.value)}
                      disabled={!canEditAllFields()}
                      classList={{ "bg-gray-200": !canEditAllFields() }}
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
                    {(() => {
                      const disabledDelete = isView || (isEdit && isStrictColorEdit());
                      return (
                        <button
                          type="button"
                          class="text-red-600 hover:text-red-800 text-xs disabled:text-gray-400 disabled:cursor-not-allowed"
                          onClick={() => { if (!disabledDelete) removeItem(i()); }}
                          disabled={disabledDelete}
                          title={
                            disabledDelete
                              ? (isView ? "Tidak bisa hapus pada tampilan View" : "Strict edit: hanya boleh ubah warna")
                              : "Hapus baris"
                          }
                        >
                          <Trash2 size={20} />
                        </button>
                      );
                    })()}
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
