import { createSignal, createEffect, For, onMount } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  getLastSequence,
  getAllSatuanUnits,
  getAllFabrics,
  getUser,
  getAllSalesContracts,
  getAllCustomerTypes,
  getAllCurrenciess,
  getAllCustomers,
  getAllGrades,
  createSalesContract,
  updateDataSalesContract,
  getSalesContracts,
} from "../../utils/auth";
import { Printer, Trash2 } from "lucide-solid";
import FabricDropdownSearch from "../../components/FabricDropdownSearch";
import SearchableCustomerSelect from "../../components/CustomerDropdownSearch";
import GradeDropdownSearch from "../../components/GradeDropdownSearch";

export default function SalesContractForm() {
  const navigate = useNavigate();
  const user = getUser();

  const [manualGenerateDone, setManualGenerateDone] = createSignal(false)

  const [salesContracts, setSalesContracts] = createSignal([]);
  const [satuanUnitOptions, setSatuanUnitOptions] = createSignal([]);
  const [fabricOptions, setFabricOptions] = createSignal([]);
  const [customerType, setCustomerType] = createSignal([]);
  const [currencyList, setCurrencyList] = createSignal([]);
  const [customersList, setCustomersList] = createSignal([]);
  const [gradeOptions, setGradeOptions] = createSignal([]);
  const [loading, setLoading] = createSignal(true);

  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const isView = params.view === "true";

  const [form, setForm] = createSignal({
    type: "",
    sequence_number: "",
    tanggal: "",
    po_cust: "-",
    no_pesan: "",
    validity_contract: "",
    customer_id: "",
    currency_id: "",
    kurs: "",
    termin: "",
    ppn_percent: "0.00",
    keterangan: "",
    satuan_unit_id: "",
    items: [],
  });

  createEffect(() => {
    const ppn = form().ppn_percent; 

    if (isEdit || isView || !manualGenerateDone()) {
        return;
    }
    generateNomorKontrak();
  });

  const selectedCurrency = () =>
    currencyList().find((c) => c.id == form().currency_id);

  const formatIDR = (val) => {
    if (val === null || val === "") return "";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

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
      maximumFractionDigits: options.decimals ?? 2,
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

  const roundTo = (n, d = 2) =>
    Math.round((Number(n) + Number.EPSILON) * 10 ** d) / 10 ** d;

  const sanitizeInt = (v) => {
    const s = String(v).replace(/[^\d]/g, ""); // hanya digit
    return s === "" ? 0 : parseInt(s, 10);
  };

  onMount(async () => {
    setLoading(true);
    const [
      contracts,
      satuanUnits,
      fabrics,
      dataCustomerTypes,
      getCurrencies,
      getCustomers,
      grades,
    ] = await Promise.all([
      getAllSalesContracts(user?.token),
      getAllSatuanUnits(user?.token),
      getAllFabrics(user?.token),
      getAllCustomerTypes(user?.token),
      getAllCurrenciess(user?.token),
      getAllCustomers(user?.token),
      getAllGrades(user?.token),
    ]);

    setSalesContracts(contracts.contracts);
    setSatuanUnitOptions(satuanUnits.data || []);
    setFabricOptions(fabrics.kain || []);
    setCustomerType(dataCustomerTypes.data || []);
    setCurrencyList(getCurrencies.data || []);
    setCustomersList(getCustomers.customers || []);
    setGradeOptions(grades?.data || []);

    if (isEdit) {
      const res = await getSalesContracts(params.id, user?.token);
      const data = res.contract;

      console.log("Data sales contracts: ", JSON.stringify(data, null, 2));

      if (!data) return;

      const normalizedItems = (data.items || []).map((item) => {
        const lebarValue     = parseFloat(item.lebar) || 0;
        const gramasiValue   = parseFloat(item.gramasi) || 0;
        const meterValue     = parseFloat(item.meter_total) || 0;
        const yardValue      = parseFloat(item.yard_total) || 0;
        const kilogramValue  = parseFloat(item.kilogram_total) || 0;
        const hargaValue     = parseFloat(item.harga) || 0;

        const subtotal = hargaValue * (
          parseInt(data.satuan_unit_id) === 1 ? meterValue :
          parseInt(data.satuan_unit_id) === 2 ? yardValue :
          parseInt(data.satuan_unit_id) === 3 ? kilogramValue : 0
        );

        return {
          meter_total: item.meter_total,
          yard_total: item.yard_total,
          kilogram_total: item.kilogram_total,
          meter_dalam_proses: item.meter_dalam_proses,
          yard_dalam_proses: item.yard_dalam_proses,
          kilogram_dalam_proses: item.kilogram_dalam_proses,
          corak_kain: item.corak_kain,
          konstruksi_kain: item.konstruksi_kain,

          id: item.id,
          fabric_id: item.kain_id ?? null,
          grade_id: item.grade_id ?? "",
          // lebar: tanpa desimal
          lebar: formatNumber(lebarValue, { decimals: 0, showZero: true }),
          lebarValue: Math.round(lebarValue),

          gramasi:  formatNumber(roundTo(gramasiValue, 2), { decimals: 2, showZero: true }),
          gramasiValue: roundTo(gramasiValue, 2),

          meter:    formatNumber(roundTo(meterValue, 2),   { decimals: 2, showZero: true }),
          meterValue: roundTo(meterValue, 2),

          yard:     formatNumber(roundTo(yardValue, 2),    { decimals: 2, showZero: true }),
          yardValue: roundTo(yardValue, 2),

          kilogram: formatNumber(roundTo(kilogramValue, 2),{ decimals: 2, showZero: true }),
          kilogramValue: roundTo(kilogramValue, 2),

          harga: formatIDR(roundTo(hargaValue, 2)),
          hargaValue: roundTo(hargaValue, 2),

          subtotal,
          subtotalFormatted: formatIDR(subtotal),
        };
      });

      setForm({
        type: data.transaction_type?.toLowerCase() === "domestik" ? 1 : 2,
        no_seq: data.no_sc,
        sequence_number: data.no_sc,
        tanggal: data.created_at ? new Date(data.created_at).toISOString().split("T")[0] : "",
        po_cust: data.po_cust ?? "",
        validity_contract: data.validity_contract ? new Date(data.validity_contract).toISOString().split("T")[0] : "",
        customer_id: data.customer_id ?? "",
        currency_id: data.currency_id ?? "",
        kurs: formatNumber(parseFloat(data.kurs) || 0),
        termin: parseInt(data.termin) ?? "",
        ppn_percent: parseFloat(data.ppn_percent) > 0 ? "11.00" : "0.00",
        keterangan: data.keterangan ?? "",
        satuan_unit_id: parseInt(data.satuan_unit_id) ?? "",
        items: normalizedItems,
      });
    } else {
      const today = new Date().toISOString().split("T")[0];
      const lastSeq = await getLastSequence(
        user?.token,
        "sc",
        form().type == 1
          ? "domestik"
          : form().type == 2
          ? "ekspor"
          : "domestik",
        form().ppn
      );

      setForm((prev) => ({
        ...prev,
        tanggal: today,
        sequence_number: lastSeq?.no_sequence + 1 || "",
      }));
    }
    setLoading(false);
  });

  const generateNomorKontrak = async () => {
    const ppnValue = parseFloat(form().ppn_percent) || 0;

    const lastSeq = await getLastSequence(
      user?.token,
      "sc",
      form().type == 1 ? "domestik" : form().type == 2 ? "ekspor" : "domestik",
      ppnValue
    );

    const nextNum = String((lastSeq?.last_sequence || 0) + 1).padStart(5, "0");
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(2);
    const ppnType = ppnValue > 0 ? "P" : "N";
    const type = form().type == 1 ? "D" : form().type == 2 ? "E" : "D";
    const mmyy = `${month}${year}`;
    const nomor = `SC/${type}/${ppnType}/${mmyy}-${nextNum}`;
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
          fabric_id: null, grade_id: "",
          lebar: "", lebarValue: 0,
          gramasi: "", gramasiValue: 0,
          meter: "", meterValue: 0,
          yard: "", yardValue: 0,
          kilogram: "", kilogramValue: 0,
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
      return {
        ...prev,
        items: newItems,
      };
    });
  };

  const totalAll = () => {
    return form().items.reduce((sum, item) => {
      return sum + (item.subtotal || 0); // Gunakan nilai numerik
    }, 0);
  };

  const handleItemChange = (index, field, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      const item = { ...items[index] };
      const satuanId = parseInt(prev.satuan_unit_id);

      if (field === 'fabric_id' || field === 'grade_id') {
        item[field] = value;
      } else if (field === 'lebar') {
        // khusus lebar → integer only
        const intVal = sanitizeInt(value);
        item.lebarValue = intVal;
        item.lebar = formatNumber(intVal, { decimals: 0, showZero: true });
      } else {
        // numeric lain → maksimal 2 desimal
        const numValue = roundTo(parseNumber(value), 2);
        item[`${field}Value`] = numValue;

        if (field === 'harga') {
          item.harga = formatIDR(numValue);
        } else {
          item[field] = formatNumber(numValue, { decimals: 2, showZero: true });
        }

        // konversi otomatis antar satuan (tetap 2 desimal)
        if (satuanId === 1 && field === 'meter') {
          item.yardValue = roundTo((numValue || 0) * 1.093613, 2);
          item.yard = formatNumber(item.yardValue, { decimals: 2, showZero: true });
          item.kilogramValue = 0;
          item.kilogram = formatNumber(0, { decimals: 2, showZero: true });
        } else if (satuanId === 2 && field === 'yard') {
          item.meterValue = roundTo((numValue || 0) * 0.9144, 2);
          item.meter = formatNumber(item.meterValue, { decimals: 2, showZero: true });
          item.kilogramValue = 0;
          item.kilogram = formatNumber(0, { decimals: 2, showZero: true });
        } else if (satuanId === 3 && field === 'kilogram') {
          item.meterValue = 0; item.meter = formatNumber(0, { decimals: 2, showZero: true });
          item.yardValue  = 0; item.yard  = formatNumber(0, { decimals: 2, showZero: true });
        }
      }

      // subtotal
      const hargaValue = item.hargaValue || 0;
      let qtyValue = 0;
      if (satuanId === 1) qtyValue = item.meterValue || 0;
      else if (satuanId === 2) qtyValue = item.yardValue || 0;
      else if (satuanId === 3) qtyValue = item.kilogramValue || 0;

      const subtotal = roundTo(qtyValue * hargaValue, 2);
      item.subtotal = subtotal;
      item.subtotalFormatted = formatIDR(subtotal);

      items[index] = item;
      return { ...prev, items };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const customerTypeObj = customerType().find((ct) => ct.id == form().type);

      const payloadItems = form().items.map((item) => ({
        id: item.id,
        kain_id: item.fabric_id,
        grade_id: item.grade_id,
        lebar: item.lebarValue || 0,
        gramasi: item.gramasiValue || 0,
        meter_total: item.meterValue || 0,
        yard_total: item.yardValue || 0,
        kilogram_total: item.kilogramValue || 0,
        harga: item.hargaValue || 0,
      }));

      const payload = {
        type: customerTypeObj?.jenis.toLowerCase(),
        no_sc: form().no_seq,
        po_cust: form().po_cust,
        validity_contract: form().validity_contract,
        customer_id: parseInt(form().customer_id),
        currency_id: parseInt(form().currency_id),
        kurs: parseNumber(form().kurs),
        termin: parseInt(form().termin),
        ppn_percent: form().ppn_percent,
        keterangan: form().keterangan,
        satuan_unit_id: parseInt(form().satuan_unit_id),
        items: payloadItems,
      };

      if (isEdit) {
        //payload.no_sc = form().no_seq;
        //console.log("Update SC: ", JSON.stringify(payload, null, 2));
        await updateDataSalesContract(user?.token, params.id, payload);
      } else {
        payload.sequence_number = form().no_seq;
        await createSalesContract(user?.token, payload);
      }

      Swal.fire({
        icon: "success",
        title: "Sales Contract berhasil disimpan!",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => {
        navigate("/salescontract");
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Gagal menyimpan Sales Contract",
        text: err?.message || "Terjadi kesalahan.",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
    }
  };

  function handlePrint() {
    const encodedData = encodeURIComponent(JSON.stringify(form()));
    window.open(`/print/salescontract?data=${encodedData}`, "_blank");
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
        {isView ? "Detail" : isEdit ? "Edit" : "Tambah"} Sales Contract
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
        <div class="grid grid-cols-5 gap-4">
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
              value="SC"
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
            <label class="block mb-1 font-medium">Tipe Transaksi</label>
            <select
              class="w-full border p-2 rounded"
              value={form().type || ""}
              onChange={(e) => {
                const customerTypeId = e.target.value;
                const curr = customerType().find((c) => c.id == customerTypeId);
                setForm({
                  ...form(),
                  type: customerTypeId,
                  jenis: curr?.name === "IDR" ? 0 : form().jenis,
                });
              }}
              required
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
            >
              <option value="" disabled>
                Pilih Tipe Customer
              </option>
              {customerType().map((curr) => (
                <option value={curr.id}>{curr.jenis}</option>
              ))}
            </select>
          </div>
          <div>
            <label class="block mb-1 font-medium">Customer</label>
            <SearchableCustomerSelect
              customersList={customersList}
              form={form}
              setForm={setForm}
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">Kontrak Validity</label>
            <input
              type="date"
              class="w-full border p-2 rounded"
              value={form().validity_contract}
              onInput={(e) =>
                setForm({ ...form(), validity_contract: e.target.value })
              }
              disabled={isView || isEdit}
              classList={{ "bg-gray-200": isView || isEdit }}
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
        <div class="grid grid-cols-5 gap-4">
          <div>
            <label class="block mb-1 font-medium">Currency</label>
            <select
              class="w-full border p-2 rounded"
              value={form().currency_id || ""}
              onChange={(e) => {
                const currencyId = e.target.value;
                const curr = currencyList().find((c) => c.id == currencyId);
                setForm({
                  ...form(),
                  currency_id: currencyId,
                  kurs: curr?.name === "IDR" ? 0 : form().kurs,
                });
              }}
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
              required
            >
              <option value="" disabled>
                Pilih Currency
              </option>
              {currencyList().map((curr) => (
                <option value={curr.id}>{curr.name}</option>
              ))}
            </select>
          </div>
          {/* Kurs muncul kalau currency ≠ IDR */}
          {selectedCurrency()?.name !== "IDR" && (
            <div>
              <label class="block mb-1 font-medium">Kurs</label>
              <div class="flex">
                <span class="inline-flex items-center px-3 border border-r-0 border-black bg-gray-50 rounded-l">
                  IDR
                </span>
                <input
                  class="w-full border p-2 rounded rounded-l-none"
                  type="text"
                  value={form().kurs}
                  onInput={(e) =>
                    setForm({ ...form(), kurs: parseIDR(e.target.value) })
                  }
                  onBlur={(e) =>
                    setForm({ ...form(), kurs: formatIDR(form().kurs) })
                  }
                  required
                  disabled={isView}
                  classList={{ "bg-gray-200": isView }}
                />
              </div>
            </div>
          )}
          <div>
            <label class="block mb-1 font-medium">Satuan Unit</label>
            <select
              class="w-full border p-2 rounded"
              value={form().satuan_unit_id}
              onChange={(e) =>
                setForm({ ...form(), satuan_unit_id: e.target.value })
              }
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
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
                    setForm({
                      ...form(),
                      ppn_percent: e.target.checked ? "11.00" : "0.00",
                    })
                  }
                  class="sr-only peer"
                  disabled={isView || isEdit}
                  classList={{ "bg-gray-200": isView || isEdit }}
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
                readOnly={isView}
                classList={{ "bg-gray-200": isView }} 
            ></textarea>
        </div>

        <Show when={isView && form().items && form().items.length > 0}>
          <div class="border p-3 rounded my-4 bg-gray-50">
            <h3 class="text-md font-bold mb-2 text-gray-700">Quantity Kain:</h3>
            <ul class="space-y-1 pl-5">
              <For each={form().items}>
                {(item) => {
                  // tentukan satuan
                  const unit =
                    parseInt(form().satuan_unit_id) === 1
                      ? "Meter"
                      : parseInt(form().satuan_unit_id) === 2
                      ? "Yard"
                      : "Kilogram";

                  // hitung sisa sesuai unit
                  const sisa =
                    unit === "Meter"
                      ? Number(item.meter_total || 0) - Number(item.meter_dalam_proses || 0)
                      : unit === "Yard"
                      ? Number(item.yard_total || 0) - Number(item.yard_dalam_proses || 0)
                      : Number(item.kilogram_total || 0) - Number(item.kilogram_dalam_proses || 0);

                  // nama kain langsung dari item (sesuai data backend)
                  const corak = item.corak_kain || "Kain";
                  const konstruksi = item.konstruksi_kain || "";

                  return (
                    <li class="text-sm list-disc">
                      <span class="font-semibold">
                        {corak} | {konstruksi}
                      </span>{" "}
                      - Quantity:{" "}
                      {sisa > 0 ? (
                        <span class="font-bold text-blue-600">
                          {formatNumberQty(sisa)}{" "}
                          {unit === "Meter" ? "m" : unit === "Yard" ? "yd" : "kg"}
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
              <th class="border p-2">Grade Kain</th>
              <th class="border p-2">Lebar</th>
              <th class="border p-2">Gramasi</th>
              <th class="border p-2">Meter</th>
              <th class="border p-2">Yard</th>
              <th class="border p-2">Kilogram</th>
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
                      classList={{ "bg-gray-200": isView }}
                    />
                  </td>
                  <td class="border p-2">
                    <GradeDropdownSearch
                      grades={gradeOptions}
                      item={item}
                      onChange={(val) => handleItemChange(i(), "grade_id", val)}
                      disabled={isView}
                      classList={{ "bg-gray-200": isView }}
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      inputmode="decimal"
                      class="border p-1 rounded w-full"
                      value={item.lebar}
                      onBlur={(e) => handleItemChange(i(), "lebar", e.target.value)}
                      disabled={isView}
                      classList={{ "bg-gray-200": isView }}
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      inputmode="decimal"
                      class="border p-1 rounded w-full"
                      value={item.gramasi}
                      onBlur={(e) => handleItemChange(i(), "gramasi", e.target.value)}
                      disabled={isView}
                      classList={{ "bg-gray-200": isView }}
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      inputmode="decimal"
                      class={`border p-1 rounded w-full ${parseInt(form().satuan_unit_id) !== 1 ? "bg-gray-200" : ""}`}
                      readOnly={parseInt(form().satuan_unit_id) !== 1}
                      value={item.meter}
                      onBlur={(e) => {
                        // Hanya trigger jika ini adalah input yang aktif
                        if (parseInt(form().satuan_unit_id) === 1) {
                          handleItemChange(i(), "meter", e.target.value);
                        }
                      }}
                      disabled={isView}
                      classList={{ "bg-gray-200": isView }}
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      inputmode="decimal"
                      class={`border p-1 rounded w-full ${parseInt(form().satuan_unit_id) !== 2 ? "bg-gray-200" : ""}`}
                      readOnly={parseInt(form().satuan_unit_id) !== 2}
                      value={item.yard}
                      onBlur={(e) => {
                        // Hanya trigger jika ini adalah input yang aktif
                        if (parseInt(form().satuan_unit_id) === 2) {
                          handleItemChange(i(), "yard", e.target.value);
                        }
                      }}
                      disabled={isView}
                      classList={{ "bg-gray-200": isView }}
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      inputmode="decimal"
                      class={`border p-1 rounded w-full ${parseInt(form().satuan_unit_id) !== 3 ? "bg-gray-200" : ""}`}
                      readOnly={parseInt(form().satuan_unit_id) !== 3}
                      value={item.kilogram}
                      onBlur={(e) => {
                        // Hanya trigger jika ini adalah input yang aktif
                        if (parseInt(form().satuan_unit_id) === 3) {
                          handleItemChange(i(), "kilogram", e.target.value);
                        }
                      }}
                      disabled={isView}
                      classList={{ "bg-gray-200": isView }}
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      inputmode="decimal"
                      class="border p-1 rounded w-full"
                      value={item.harga} // Tampilkan nilai harga yang sudah diformat
                      onBlur={(e) => handleItemChange(i(), "harga", e.target.value)}
                      disabled={isView}
                      classList={{ "bg-gray-200": isView }}
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      class="border p-1 rounded w-full bg-gray-200"
                      value={item.subtotalFormatted ?? ""}
                      readOnly
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
          <tfoot>
            <tr class="font-bold bg-gray-100">
              <td colSpan="9" class="text-right p-2">
                TOTAL
              </td>
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
