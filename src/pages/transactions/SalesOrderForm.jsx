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
  getSalesContracts,
  getAllColors,
  updateDataSalesOrder,
  createSalesOrder,
  getSalesOrders,
} from "../../utils/auth";
import { Printer, Trash2 } from "lucide-solid";
import FabricDropdownSearch from "../../components/FabricDropdownSearch";
import SearchableCustomerSelect from "../../components/CustomerDropdownSearch";
import SearchableSalesContractSelect from "../../components/SalesContractDropdownSearch";
import ColorDropdownSearch from "../../components/ColorDropdownSearch";
import GradeDropdownSearch from "../../components/GradeDropdownSearch";

export default function SalesOrderForm() {
  const navigate = useNavigate();
  const user = getUser();

  const [salesContracts, setSalesContracts] = createSignal([]);
  const [satuanUnitOptions, setSatuanUnitOptions] = createSignal([]);
  const [fabricOptions, setFabricOptions] = createSignal([]);
  const [customerType, setCustomerType] = createSignal([]);
  const [currencyList, setCurrencyList] = createSignal([]);
  const [customersList, setCustomersList] = createSignal([]);
  const [gradeOptions, setGradeOptions] = createSignal([]);
  const [salesOrderNumber, setSalesOrderNumber] = createSignal(0);
  const [colorOptions, setColorOptions] = createSignal([]);
  const [availableSCItems, setAvailableSCItems] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [salesOrderData, setSalesOrderData] = createSignal(null); 
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
    delivery_date: "",
    customer_id: "",
    currency_id: "",
    kurs: "",
    termin: "",
    ppn_percent: "",
    keterangan: "",
    satuan_unit_id: "",
    items: [],
  });

  const selectedCurrency = () =>
    currencyList().find((c) => c.id == form().currency_id);

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
    const onlyNumbers = str.replace(/[^\d]/g, "");
    return onlyNumbers ? parseInt(onlyNumbers) : "";
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
      colors,
    ] = await Promise.all([
      getAllSalesContracts(user?.token),
      getAllSatuanUnits(user?.token),
      getAllFabrics(user?.token),
      getAllCustomerTypes(user?.token),
      getAllCurrenciess(user?.token),
      getAllCustomers(user?.token),
      getAllGrades(user?.token),
      getAllColors(user?.token),
    ]);

    setSalesContracts(contracts.contracts);
    setSatuanUnitOptions(satuanUnits.data || []);
    setFabricOptions(fabrics.kain || []);
    setCustomerType(dataCustomerTypes.data || []);
    setCurrencyList(getCurrencies.data || []);
    setCustomersList(getCustomers.customers || []);
    setGradeOptions(grades?.data || []);
    setColorOptions(colors?.warna || ["Pilih"]);

    if (isEdit) {
      const res = await getSalesOrders(params.id, user?.token);
      const soData = res.order;

      console.log("Data sales order: ", JSON.stringify(soData, null, 2));

      if (!soData) return;

      const fullPrintData = {
        ...soData,
      };
      setSalesOrderData(fullPrintData); 

      const mappedItems = (soData.items || []).map((soItem) => {
          const subtotal = (Number(soItem.meter_total) || Number(soItem.yard_total) || Number(soItem.kilogram_total)) * Number(soItem.harga);

          return {
              meter_total: soItem.meter_total,
              yard_total: soItem.yard_total,
              kilogram_total: soItem.kilogram_total,
              meter_dalam_proses: soItem.meter_dalam_proses,
              yard_dalam_proses: soItem.yard_dalam_proses,
              kilogram_dalam_proses: soItem.kilogram_dalam_proses,
              corak_kain: soItem.corak_kain,
              konstruksi_kain: soItem.konstruksi_kain,

              id: soItem.id,
              sc_item_id: soItem.sc_item_id,
              fabric_id: soItem.kain_id,
              grade_id: soItem.grade_id,
              lebar_greige: soItem.lebar,
              gramasi: soItem.gramasi,
              warna_id: soItem.warna_id ?? null,
              meter: soItem.meter_total ?? "0.00",
              yard: soItem.yard_total ?? "0.00",
              kilogram: soItem.kilogram_total ?? "0.00",
              harga: soItem.harga ?? "0.00",
              subtotal: subtotal,
              subtotalFormatted: subtotal > 0 ? formatIDR(subtotal) : "",
          };
      });

      fetchSalesContractDetail(soData.sc_id);

      setForm((prev) => ({
        ...prev,
        ...soData,
        sales_contract_id: soData.sc_id,
        items: mappedItems,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        tanggal: new Date().toISOString().split("T")[0],
        items: [],
      }));
    }

    setLoading(false);
  });

  const fetchSalesContractDetail = async (id) => {
    if (!id) {
      console.warn("⚠️ fetchSalesContractDetail called with empty id");
      return;
    }

    try {
      const res = await getSalesContracts(id, user.token);

      const custDetail = res.contract || "";
      const existingItems = form().items || [];

      setAvailableSCItems(custDetail.items || []);

      const { huruf, ppn, nomor } = parseNoPesan(custDetail.no_sc);
      const tanggalValue = new Date(custDetail.created_at)
        .toISOString()
        .split("T")[0];

      // --- NEW: Map items from Sales Contract ---
      if (isEdit) {
        const existingItems = form().items || [];
        const satuanId = custDetail.satuan_unit_id;

        const mergedItems = existingItems.map((e) => {
          let qty = 0;
          if (satuanId === 1) qty = e.meter ?? 0;
          else if (satuanId === 2) qty = e.yard ?? 0;
          else if (satuanId === 3) qty = e.kilogram ?? 0;

          const harga = e.harga ? parseFloat(e.harga) : 0;
          const subtotal = qty && harga ? qty * harga : 0;

          return {
            ...e,
            subtotal,
            subtotalFormatted: subtotal > 0 ? formatIDR(subtotal) : "",
          };
        });
        
        handleSalesOrderChange(
          huruf,
          ppn,
          nomor,
          tanggalValue,
          custDetail.customer_name,
          custDetail.currency_name,
          custDetail.kurs,
          Number(custDetail.termin),
          custDetail.ppn_percent,
          form().keterangan,
          custDetail.satuan_unit_id,
          custDetail.validity_contract,
          custDetail.customer_id,
          custDetail.currency_id,
          mergedItems
        );
      } else {
        // simpan semua item SC ke dropdown
        setAvailableSCItems(custDetail.items || []);

        // update form tapi items kosong
        handleSalesOrderChange(
          huruf,
          ppn,
          nomor,
          tanggalValue,
          custDetail.customer_name,
          custDetail.currency_name,
          custDetail.kurs,
          Number(custDetail.termin),
          custDetail.ppn_percent,
          form().keterangan,
          custDetail.satuan_unit_id,
          custDetail.validity_contract,
          custDetail.customer_id,
          custDetail.currency_id,
          [] // kosong dulu
        );
      }

      // Update detail SC
      // setSelectedContractDetail({
      //   data: res.response,
      //   jenis_cust_sc: huruf,
      //   nomor_sc: nomor,
      // });
    } catch (err) {
      console.error("❌ Error fetchSalesContractDetail:", err);
    }
  };

  const parseNoPesan = (no_pesan) => {
    if (!no_pesan) return { huruf: "-", nomor: "" };

    const parts = no_pesan.split("/"); // ["SC", "D", "P" "0625-00099"]

    const huruf = parts[1] || "-";
    const ppn = parts[2] || "-";
    const nomor = parts[3]?.split("-")[1] || "";

    return { huruf, ppn, nomor };
  };

  const handleSalesOrderChange = async (
    transType, // D / E
    ppnType,
    nomorSc,
    tanggal,
    custName,
    currencyName,
    kurs,
    termin,
    ppn_percent,
    keterangan,
    satuanUnitId,
    validityContract,
    customerId,
    currencyId,
    items
  ) => {
    const now = new Date();
    const bulan = String(now.getMonth() + 1).padStart(2, "0");
    const tahun = String(now.getFullYear());

    const getLatestSalesOrderNumber = await getLastSequence(
      user?.token,
      "so",
      transType === "D" ? "domestik" : "ekspor",
      ppnType === "N" ? 0 : 1
    );

    const lastNumber = getLatestSalesOrderNumber?.last_sequence || 0;
    const nextNumber = (lastNumber + 1).toString().padStart(5, "0");

    const noSalesOrder = `SO/${transType}/${ppnType}/${bulan}${tahun.slice(
      2
    )}/${nomorSc}-${nextNumber}`;

    // Pastikan items sudah di-normalisasi biar field kain/grade/lebar langsung ada
    const normalizedItems = items.map((item, idx) => ({
      meter_total: item.meter_total ?? "",
      yard_total: item.yard_total ?? "",
      kilogram_total: item.kilogram_total ?? "",
      meter_dalam_proses: item.meter_dalam_proses,
      yard_dalam_proses: item.yard_dalam_proses,
      kilogram_dalam_proses: item.kilogram_dalam_proses,
      corak_kain: item.corak_kain,
      konstruksi_kain: item.konstruksi_kain,

      id: item.id ?? idx + 1,
      sc_item_id: item.sc_item_id ?? null,
      fabric_id: item.fabric_id ?? null,
      grade_id: item.grade_id ?? "",
      lebar_greige: item.lebar_greige ?? "",
      warna_id: item.warna_id ?? "",
      gramasi: item.gramasi ?? "",
      meter: item.meter ?? 0,
      yard: item.yard ?? 0,
      kilogram: item.kilogram ?? 0,
      harga: item.harga ?? "",
      subtotal: item.subtotal ?? "",
      subtotalFormatted: item.subtotal > 0 ? formatIDR(item.subtotal) : "",
    }));

    setForm({
      ...form(),
      no_so: noSalesOrder,
      no_seq: lastNumber + 1,
      sequence_number: noSalesOrder,
      tanggal: tanggal,
      type: transType === "D" ? 1 : 2,
      customer_id: customerId,
      cust_name: custName,
      validity_contract: validityContract
        ? new Date(validityContract).toISOString().split("T")[0]
        : "",
      currency_id: currencyId,
      currency_name: currencyName,
      kurs: kurs,
      termin: termin,
      ppn_percent: parseFloat(ppn_percent) > 0 ? "11.00" : "0.00",
      keterangan: keterangan ?? "",
      satuan_unit_id: satuanUnitId,
      items: normalizedItems,
    });
  };

  const generateNomorKontrak = async () => {
    const lastSeq = await getLastSequence(
      user?.token,
      "so",
      form().type == 1 ? "domestik" : form().type == 2 ? "ekspor" : "domestik",
      form().ppn
    );

    const nextNum = String((lastSeq?.last_sequence || 0) + 1).padStart(5, "0");
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(2);
    const ppnValue = parseFloat(form().ppn) || 0;
    const ppnType = ppnValue > 0 ? "P" : "N";
    const type = form().type == 1 ? "D" : form().type == 2 ? "E" : "D";
    const mmyy = `${month}${year}`;
    const nomor = `SO/${type}/${ppnType}/${mmyy}/${nextNum}`;
    setForm((prev) => ({
      ...prev,
      sequence_number: nomor,
      no_seq: lastSeq?.last_sequence + 1,
    }));
  };

  const addItem = () => {
    setForm((prev) => {
      const lastItem = prev.items[prev.items.length - 1] || {};

      const newItem = {
        sc_item_id: lastItem.sc_item_id ?? lastItem.id ?? null,
        fabric_id: lastItem.fabric_id ?? null,
        grade_id: lastItem.grade_id ?? "",
        lebar_greige: lastItem.lebar_greige ?? "",
        gramasi: lastItem.gramasi ?? "",
        meter: 0,
        yard: 0,
        kilogram: 0,
        harga: lastItem.harga ?? "",
        // subtotal: "",
        // subtotalFormatted: "",
      };

      return {
        ...prev,
        items: [...prev.items, newItem],
      };
    });
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

  const totalMeter = () =>
    form().items.reduce((sum, item) => sum + (Number(item.meter) || 0), 0);

  const totalYard = () =>
    form().items.reduce((sum, item) => sum + (Number(item.yard) || 0), 0);

  const totalKilogram = () =>
    form().items.reduce((sum, item) => sum + (Number(item.kilogram) || 0), 0);

  const totalAll = () => {
    return form().items.reduce((sum, item) => {
      return sum + (parseFloat(item.subtotal) || 0);
    }, 0);
  };

  const normalizeNumberInput = (s) => {
    if (s === null || s === undefined) return 0;
    s = String(s).trim();
    if (!s) return 0;

    const lastDot = s.lastIndexOf(".");
    const lastComma = s.lastIndexOf(",");

    // Jika keduanya ada, anggap pemisah desimal adalah yang paling kanan
    if (lastComma > lastDot) {
      // Format Indonesia: 1.234,56 -> 1234.56
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // Format Intl/US: 1,234.56 -> 1234.56
      s = s.replace(/,/g, "");
    }

    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };

  const parseNumber = (str) => normalizeNumberInput(str);

  // Selalu tampilkan pemisah ribuan & 2 desimal (id-ID)
  const formatNumber = (num, decimals = 2) => {
    if (num === null || num === undefined || num === "") return "";
    const val = typeof num === "string" ? normalizeNumberInput(num) : Number(num);
    if (!Number.isFinite(val)) return "";
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(val);
  };

  const handleItemChange = (index, field, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      const item = { ...items[index] };

      const satuanId = parseInt(prev.satuan_unit_id);
      const numValue = parseNumber(value);

      if (field === "meter") {
        item.meter = numValue;
        item.yard = +(numValue * 1.093613).toFixed(2);
        item.kilogram = 0;
      } else if (field === "yard") {
        item.yard = numValue;
        item.meter = +(numValue * 0.9144).toFixed(2);
        item.kilogram = 0;
      } else if (field === "kilogram") {
        item.kilogram = numValue;
        item.meter = 0;
        item.yard = 0;
      } else {
        item[field] = value;
      }

      const harga = parseFloat(item.harga) || 0; // harga readonly di UI
      let qty = 0;
      if (satuanId === 1) qty = item.meter || 0;
      else if (satuanId === 2) qty = item.yard || 0;
      else if (satuanId === 3) qty = item.kilogram || 0;

      const subtotal = qty * harga;
      item.subtotal = subtotal;
      item.subtotalFormatted = formatIDR(subtotal);

      items[index] = item;
      return { ...prev, items };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isEdit) {
        // --- UPDATE ---
        const payload = {
          no_so: form().sequence_number,
          sc_id: parseInt(form().sales_contract_id),
          jenis_so_id: parseInt(form().type),
          delivery_date: null,
          komisi: parseFloat(form().komisi) || 0,
          keterangan: form().keterangan || "",
          items: form().items.map((item) => ({
            id: item.id,
            sc_item_id: item.sc_item_id,
            warna_id: parseInt(item.warna_id) || null,
            meter_total: item.meter ? parseFloat(item.meter) : 0,
            yard_total: item.yard ? parseFloat(item.yard) : 0,
            kilogram_total: item.kilogram ? parseFloat(item.kilogram) : 0,
            // warnas: {
            //   id: item.id || null, // id warna di SO, kalau ada = update, kalau null = insert baru
            //   warna_id: parseInt(item.warna_id) || null,
            //   meter: item.meter ? parseFloat(item.meter) : 0,
            //   yard: item.yard ? parseFloat(item.yard) : 0,
            //   kilogram: item.kilogram ? parseFloat(item.kilogram) : 0,
            // },
          })),
        };

        await updateDataSalesOrder(user?.token, params.id, payload);
      } else {
        // --- CREATE ---
        const payload = {
          type: form().type == 1 ? "domestik" : "ekspor",
          sequence_number: form().no_seq, // angka sequence
          sc_id: parseInt(form().sales_contract_id),
          jenis_so_id: parseInt(form().type),
          delivery_date: form().delivery_date,
          komisi: parseFloat(form().komisi) || 0,
          keterangan: form().keterangan || "",
          items: form().items.map((item) => ({
              sc_item_id: item.sc_item_id,
              warna_id: parseInt(item.warna_id) || null,
              meter_total: item.meter ? parseFloat(item.meter) : 0,
              yard_total: item.yard ? parseFloat(item.yard) : 0,
              kilogram_total: item.kilogram ? parseFloat(item.kilogram) : 0,
          })),
        };
        //console.log(payload);
        await createSalesOrder(user?.token, payload);
      }

      Swal.fire({
        icon: "success",
        title: "Sales Order berhasil disimpan!",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => {
        navigate("/salesorder");
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Gagal menyimpan Sales Order",
        text: err?.message || "Terjadi kesalahan.",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
    }
  };

  function handlePrint() {
    if (!salesOrderData()) {
      Swal.fire("Gagal", "Data untuk mencetak tidak tersedia. Pastikan Anda dalam mode Edit/View.", "error");
      return;
    }

    const dataToPrint = {
      ...salesOrderData(),
      //...form(),
    };
    //console.log("📄 Data yang dikirim ke halaman Print:", JSON.stringify(dataToPrint, null, 2));
    const encodedData = encodeURIComponent(JSON.stringify(dataToPrint));
    window.open(`/print/salesorder?data=${encodedData}`, "_blank");
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
        {isView ? "Detail" : isEdit ? "Edit" : "Tambah"} Sales Order
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
        <div>
          <label class="block mb-1 font-medium">Sales Contract</label>
          <SearchableSalesContractSelect
            salesContracts={salesContracts}
            form={form}
            setForm={setForm}
            onChange={(id) => {
              setForm({ ...form(), sales_contract_id: id });
              fetchSalesContractDetail(id);
            }}
            disabled={isView || isEdit}
          />
        </div>
        <div class="grid grid-cols-5 gap-4">
          <div>
            <label class="block mb-1 font-medium">No Order</label>
            <div class="flex gap-2">
              <input
                class="w-full border bg-gray-200 p-2 rounded"
                value={form().sequence_number}
                readOnly
              />
              <button
                type="button"
                onClick={generateNomorKontrak}
                class="bg-gray-300 text-sm px-2 rounded hover:bg-gray-400 hidden"
                hidden={isEdit || !form().sales_contract_id}
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
              value="SO"
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
              class="w-full border p-2 rounded bg-gray-200"
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
              disabled
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
              disabled={true}
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">Kontrak Validity</label>
            <input
              type="date"
              class="w-full border p-2 rounded bg-gray-200"
              value={form().validity_contract}
              onInput={(e) =>
                setForm({ ...form(), validity_contract: e.target.value })
              }
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
        <div class="grid grid-cols-5 gap-4">
          <div hidden>
            <label class="block mb-1 font-medium">Tanggal Pengiriman</label>
            <input
              type="date"
              class="w-full border p-2 rounded"
              value={form().delivery_date}
              onInput={(e) =>
                setForm({ ...form(), delivery_date: e.target.value })
              }
              disabled
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">Currency</label>
            <select
              class="w-full border p-2 rounded bg-gray-200"
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
              required
              disabled
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
                  type="text"
                  class="w-full border p-2 rounded rounded-l-none bg-gray-200"
                  value={formatIDR(form().kurs)}
                  onInput={(e) =>
                    setForm({
                      ...form(),
                      kurs: parseIDR(e.target.value),
                    })
                  }
                  required
                  disabled
                />
              </div>
            </div>
          )}
          <div>
            <label class="block mb-1 font-medium">Satuan Unit</label>
            <select
              class="w-full border p-2 rounded bg-gray-200"
              value={form().satuan_unit_id}
              onChange={(e) =>
                setForm({ ...form(), satuan_unit_id: e.target.value })
              }
              required
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
                  checked={form().ppn_percent === "11.00"}
                  disabled
                  class="sr-only peer"
                />
                <div class="w-24 h-10 bg-gray-200 rounded-full peer-checked:bg-green-600 transition-colors"></div>
                <div class="absolute left-0.5 top-0.5 w-9 h-9 bg-white border border-gray-300 rounded-full shadow-sm peer-checked:translate-x-14 transition-transform"></div>
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
            classList={{ "bg-gray-200" : isView }}
          ></textarea>
        </div>

        <Show when={form().items && form().items.length > 0}>
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

                  return (
                    <li class="text-sm list-disc">
                      <span class="font-semibold">
                        {item.corak_kain} | {item.konstruksi_kain}
                      </span>{" "}
                      - Quantity:{" "}
                      {sisa > 0 ? (
                        <span class="font-bold text-blue-600">
                          {formatNumber(sisa, 2)}{" "}
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

        <div hidden={isView}>
          <label class="block mb-1 font-medium">Tambah Item dari SC</label>
          <select
            class="border p-2 rounded"
            onChange={(e) => {
              const selectedId = parseInt(e.target.value);
              const scItem = availableSCItems().find(
                (si) => si.id === selectedId
              );
              if (scItem) {
                setForm((prev) => ({
                  ...prev,
                  items: [
                    ...prev.items,
                    {
                      corak_kain: scItem.corak_kain,
                      konstruksi_kain: scItem.konstruksi_kain,
                      meter_total: scItem.meter_total,
                      yard_total: scItem.yard_total,
                      kilogram_total: scItem.kilogram_total,
                      meter_dalam_proses: scItem.meter_dalam_proses,
                      yard_dalam_proses: scItem.yard_dalam_proses,
                      kilogram_dalam_proses: scItem.kilogram_dalam_proses,

                      sc_item_id: scItem.id,
                      fabric_id: scItem.kain_id,
                      grade_id: scItem.grade_id,
                      lebar_greige: scItem.lebar,
                      gramasi: scItem.gramasi,
                      harga: scItem.harga,
                      meter: null,
                      yard: null,
                      kilogram: null,
                      warna_id: null,
                      subtotal: 0,
                      subtotalFormatted: "",
                    },
                  ],
                }));
              }
              e.target.value = "";
            }}
          >
            <option value="">Pilih Item</option>
            {availableSCItems().map((si) => (
              <option value={si.id}>
                {`${
                  fabricOptions().find((f) => f.id === si.kain_id)?.corak ||
                  "Kain"
                } - ${
                  fabricOptions().find((g) => g.id === si.kain_id)
                    ?.konstruksi || ""
                }`}
              </option>
            ))}
          </select>
        </div>

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
              <th class="border p-2">Grade Kain</th>
              <th class="border p-2">Lebar Finish</th>
              <th class="border p-2">Warna</th>
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
                      disabled={true}
                    />
                  </td>
                  <td class="border p-2">
                    <GradeDropdownSearch
                      grades={gradeOptions}
                      item={item}
                      onChange={(val) => handleItemChange(i(), "grade_id", val)}
                      disabled={true}
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      class="border p-1 rounded w-full bg-gray-200"
                      value={formatNumber(item.lebar_greige, 2)}
                      readOnly
                    />
                  </td>
                  <td class="border w-72 p-2">
                    <ColorDropdownSearch
                      colors={colorOptions}
                      item={item}
                      onChange={(val) => handleItemChange(i(), "warna_id", val)}
                      disabled={isView}
                      classList={{ "bg-gray-200" : isView }}
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      class="border p-1 rounded w-full bg-gray-200"
                      value={formatNumber(item.gramasi, 2)}
                      readOnly
                    />
                  </td>
                  <td class="border p-2">
                      <input
                          type="text"
                          inputmode="decimal"
                          class={`border p-1 rounded w-full ${parseInt(form().satuan_unit_id) !== 1 ? "bg-gray-200" : ""}`}
                          readOnly={parseInt(form().satuan_unit_id) !== 1}
                          value={formatNumber(item.meter)}
                          onBlur={(e) => {
                              if (parseInt(form().satuan_unit_id) === 1) {
                                  handleItemChange(i(), "meter", e.target.value);
                              }
                          }}
                          disabled={isView}
                          classList={{ "bg-gray-200" : isView }}
                      />
                  </td>
                  <td class="border p-2">
                      <input
                          type="text"
                          inputmode="decimal"
                          class={`border p-1 rounded w-full ${parseInt(form().satuan_unit_id) !== 2 ? "bg-gray-200" : ""}`}
                          readOnly={parseInt(form().satuan_unit_id) !== 2}
                          value={formatNumber(item.yard)}
                          onBlur={(e) => {
                              if (parseInt(form().satuan_unit_id) === 2) {
                                  handleItemChange(i(), "yard", e.target.value);
                              }
                          }}
                          disabled={isView}
                          classList={{ "bg-gray-200" : isView }}
                      />
                  </td>
                  <td class="border p-2">
                      <input
                          type="text"
                          inputmode="decimal"
                          class={`border p-1 rounded w-full ${parseInt(form().satuan_unit_id) !== 3 ? "bg-gray-200" : ""}`}
                          readOnly={parseInt(form().satuan_unit_id) !== 3}
                          value={formatNumber(item.kilogram)}
                          onBlur={(e) => {
                              if (parseInt(form().satuan_unit_id) === 3) {
                                  handleItemChange(i(), "kilogram", e.target.value);
                              }
                          }}
                          disabled={isView}
                          classList={{ "bg-gray-200" : isView }}
                      />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      class="border p-1 rounded w-full bg-gray-200"
                      value={formatIDR(item.harga)}
                      readOnly
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
              <td colSpan="6" class="text-right p-2">TOTAL</td>
              <td class="border p-2">{formatNumber(totalMeter())}</td>
              <td class="border p-2">{formatNumber(totalYard())}</td>
              <td class="border p-2">{formatNumber(totalKilogram())}</td>
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
