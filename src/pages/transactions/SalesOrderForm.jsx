import { createSignal, createEffect, For, onMount } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  getAllSOTypes,
  getLastSequence,
  getAllSuppliers,
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
  getAllColors,
} from "../../utils/auth";
import { Printer, Trash2 } from "lucide-solid";
import FabricDropdownSearch from "../../components/FabricDropdownSearch";
import SearchableCustomerSelect from "../../components/CustomerDropdownSearch";
import SearchableSalesContractSelect from "../../components/SalesContractDropdownSearch";
import ColorDropdownSearch from "../../components/ColorDropdownSearch";

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
  const [params] = useSearchParams();
  const isEdit = !!params.id;

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
    ppn_percent: "",
    catatan: "",
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
    setGradeOptions(
      grades?.data.map((g) => ({
        value: g.id,
        label: g.grade,
      })) || ["Pilih Grade"]
    );
    setColorOptions(
      colors?.warna.map((c) => ({
        value: c.id,
        kode: c.kode,
        deskripsi: c.deskripsi,
      })) || ["Pilih"]
    );

    if (isEdit) {
      const res = await getSalesContracts(params.id, user?.token);
      const data = res.contract;
      if (!data) return;

      const normalizedItems = (data.items || []).map((item, idx) => ({
        id: idx + 1,
        fabric_id: item.kain_id ?? null,
        grade_id: item.grade_id ?? "",
        lebar_greige: item.lebar ?? "",
        gramasi: item.gramasi ?? "",
        meter: item.meter_total ?? "",
        yard: item.yard_total ?? "",
        kilogram: item.kilogram_total ?? "",
        harga: item.harga ?? "",
        subtotal: item.subtotal ?? "",
        subtotalFormatted: item.subtotal > 0 ? formatIDR(item.subtotal) : "",
      }));

      setForm((prev) => ({
        ...prev,
        type: data.transaction_type?.toLowerCase() === "domestik" ? 1 : 2,
        no_seq: data.no_sc,
        sequence_number: data.no_sc,
        no_pesan: data.no_sc ?? "",
        tanggal: data.created_at
          ? new Date(data.created_at).toISOString().split("T")[0]
          : "",
        po_cust: data.po_cust ?? "",
        validity_contract: data.validity_contract
          ? new Date(data.validity_contract).toISOString().split("T")[0]
          : "",
        supplier_id: data.supplier_id ?? "",
        customer_id: data.customer_id ?? "",
        currency_id: data.currency_id ?? "",
        kurs: parseFloat(data.kurs) ?? 0,
        termin: parseInt(data.termin) ?? "",
        ppn: parseFloat(data.ppn_percent) ?? "",
        catatan: data.catatan ?? "",
        satuan_unit_id: parseInt(data.satuan_unit_id) ?? "",
        items: normalizedItems,
      }));

      (data.items || []).forEach((item, index) => {
        handleItemChange(index, "meter", item.meter_total);
        handleItemChange(index, "yard", item.yard_total);
        handleItemChange(index, "harga", item.harga);
        handleItemChange(index, "lebar_greige", item.lebar);
      });
    } else {
      const today = new Date().toISOString().split("T")[0];
      const lastSeq = await getLastSequence(
        user?.token,
        "so",
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
  });

  const fetchSalesContractDetail = async (id) => {
    if (!id) {
      console.warn("⚠️ fetchSalesContractDetail called with empty id");
      return;
    }

    try {
      const res = await getSalesContracts(id, user.token);

      const custDetail = res.response || "";

      const { huruf, nomor } = parseNoPesan(res.response?.no_pesan);

      // --- NEW: Map items from Sales Contract ---
      if (isEdit) {
        // Ambil items yang sudah ada (dari form)
        const existingItems = form().items || [];

        handleSalesOrderChange(
          huruf,
          nomor,
          custDetail.customer_name,
          custDetail.currency_name,
          custDetail.kurs,
          Number(custDetail.termin),
          Number(custDetail.ppn_percent),
          custDetail.satuan_unit_id,
          existingItems // <- jangan kosongin lagi, ambil dari form
        );
      } else {
        const scItems = (custDetail.items || []).map((item, index) => ({
          id: item.id ?? null,
          kain_id: item.kain_id ?? null,
          warna_id: item.warna_id ?? null,
          grade_id: item.grade_id ?? "",
          lebar: item.lebar ? parseFloat(item.lebar) : null,
          gramasi: item.gramasi ? parseFloat(item.gramasi) : null,
          meter_total: isMeter() ?? 0,
          yard_total: isYard() ?? 0,
          kilogram_total: isKilogram() ?? 0,
          harga: item.harga ? parseFloat(item.harga) : null,
        }));

        handleSalesOrderChange(
          huruf,
          nomor,
          custDetail.customer_name,
          custDetail.currency_name,
          custDetail.kurs,
          Number(custDetail.termin),
          Number(custDetail.ppn_percent),
          custDetail.satuan_unit_id,
          scItems
        );
      }
      // Update detail SC
      setSelectedContractDetail({
        data: res.response,
        jenis_cust_sc: huruf,
        nomor_sc: nomor,
      });
    } catch (err) {
      console.error("❌ Error fetchSalesContractDetail:", err);
    }
  };

  const parseNoPesan = (no_pesan) => {
    if (!no_pesan) return { huruf: "-", nomor: "" };

    const parts = no_pesan.split("/"); // ["SO", "D", "0625-00099"]

    const huruf = parts[1] || "-";
    const nomor = parts[2]?.split("-")[1] || "";

    return { huruf, nomor };
  };

  const handleSalesOrderChange = async (
    jenisCust,
    nomorSc,
    custName,
    currencyName,
    kurs,
    termin,
    ppn,
    satuanUnitId,
    items = [] // <<< default empty
  ) => {
    const now = new Date();
    const bulan = String(now.getMonth() + 1).padStart(2, "0");
    const tahun = String(now.getFullYear());

    const getLatestDataSalesContract = await getLastSequence(
      user?.token,
      "so",
      jenisCust
    );
    setSalesOrderNumber(getLatestDataSalesContract.last_sequence);

    const lastNumber = salesOrderNumber();
    const nextNumber = (lastNumber + 1).toString().padStart(5, "0");

    const noSalesOrder = `SO/${jenisCust}/${bulan}${tahun.slice(
      2
    )}/${nomorSc}-${nextNumber}`;

    setForm({
      ...form(),
      no_so: noSalesOrder,
      cust_name: custName,
      type: jenisCust,
      sequence_number: parseInt(nextNumber),
      currency_name: currencyName,
      kurs: kurs,
      termin: termin,
      ppn: ppn,
      satuan_unit_id: satuanUnitId,
      items: items.length > 0 ? items : [], // <<< masukkan items ke form
    });
  };

  const selectedSatuan = () => {
    const s = satuanUnitOptions().find((u) => u.id == form().satuan_unit_id);
    return s?.nama_satuan?.toLowerCase() || "";
  };

  const isFieldEditable = (name) =>
    name === "sales_contract_id" ||
    name === "warna_id" ||
    (["meter", "yard", "kilogram"].includes(name) && selectedSatuan() === name);

  const editableAttr = (name) => ({
    readOnly: !isFieldEditable(name),
    disabled: !isFieldEditable(name),
  });

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
      const newItem = {
        fabric_id: null,
        grade_id: "",
        lebar_greige: "",
        gramasi: "",
        meter: "",
        yard: "",
        kilogram: "",
        harga: "",
        subtotal: "",
        subtotalFormatted: "",
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

  const totalAll = () => {
    return form().items.reduce((sum, item) => {
      return sum + (parseFloat(item.subtotal) || 0);
    }, 0);
  };

  const handleItemChange = (index, field, value, options = {}) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index] };

      // always store raw string
      items[index][field] = value;

      const satuanId = parseInt(prev.satuan_unit_id);
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
        if (satuanId === 1) qty = meter;
        else if (satuanId === 2) qty = yard;
        else if (satuanId === 3)
          qty = parseFloat(items[index].kilogram || "") || 0;

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
        if (satuanId === 1) {
          // meter
          meter = parseFloat(value) || 0;
          yard = meter * 1.093613;
          items[index].yard = yard > 0 ? yard.toFixed(4) : "";
          items[index].kilogram = "0";
        } else if (satuanId === 2) {
          // yard
          yard = parseFloat(value) || 0;
          meter = yard * 0.9144;
          items[index].meter = meter > 0 ? meter.toFixed(4) : "";
          items[index].kilogram = "0";
        } else if (satuanId === 3) {
          // kilogram
          items[index].meter = "0";
          items[index].yard = "0";
        }
      }

      if (field === "lebar_greige") {
        items[index].lebar_greige = value;
      }

      const harga = parseFloat(items[index].harga || "") || 0;
      let qty = 0;
      if (satuanId === 1) qty = meter;
      else if (satuanId === 2) qty = yard;
      else if (satuanId === 3)
        qty = parseFloat(items[index].kilogram || "") || 0;

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
      const toNum = (val) =>
        val === "" || val === null || val === undefined
          ? null
          : parseFloat(val);

      const customerTypeObj = customerType().find((ct) => ct.id == form().type);

      if (isEdit) {
        const payload = {
          type: customerTypeObj?.jenis.toLowerCase(),
          no_sc: form().no_seq,
          po_cust: form().po_cust,
          validity_contract: form().validity_contract,
          customer_id: parseInt(form().customer_id),
          currency_id: parseInt(form().currency_id),
          kurs: toNum(form().kurs),
          termin: toNum(form().termin),
          ppn_percent: toNum(form().ppn),
          catatan: form().catatan,
          satuan_unit_id: toNum(form().satuan_unit_id),
          items: form().items.map((item) => ({
            id: item.id,
            kain_id: toNum(item.fabric_id),
            grade_id: parseInt(item.grade_id) || null,
            lebar: toNum(item.lebar_greige),
            gramasi: toNum(item.gramasi),
            meter_total: toNum(item.meter),
            yard_total: toNum(item.yard),
            kilogram_total: toNum(item.kilogram),
            harga: toNum(item.harga),
          })),
        };

        await updateDataSalesContract(user?.token, params.id, payload);
      } else {
        const payload = {
          type: customerTypeObj?.jenis.toLowerCase(),
          sequence_number: form().no_seq,
          po_cust: form().po_cust,
          validity_contract: form().validity_contract,
          customer_id: parseInt(form().customer_id),
          currency_id: parseInt(form().currency_id),
          kurs: toNum(form().kurs),
          termin: toNum(form().termin),
          ppn_percent: toNum(form().ppn),
          catatan: form().catatan,
          satuan_unit_id: toNum(form().satuan_unit_id),
          items: form().items.map((item) => ({
            id: item.id,
            kain_id: toNum(item.fabric_id),
            grade_id: toNum(item.grade_id) || "",
            lebar: toNum(item.lebar_greige),
            gramasi: toNum(item.gramasi),
            meter_total: toNum(item.meter),
            yard_total: toNum(item.yard),
            kilogram_total: toNum(item.kilogram),
            harga: toNum(item.harga),
          })),
        };

        await createSalesContract(user?.token, payload);
      }

      Swal.fire({
        icon: "success",
        title: "Sales Order berhasil disimpan!",
      }).then(() => {
        navigate("/salesorder");
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Gagal menyimpan Sales Order",
        text: err?.message || "Terjadi kesalahan.",
      });
    }
  };

  function handlePrint() {
    const encodedData = encodeURIComponent(JSON.stringify(form()));
    window.open(`/print/salesorder?data=${encodedData}`, "_blank");
  }

  return (
    <MainLayout>
      <h1 class="text-2xl font-bold mb-4">Buat Sales Order Baru</h1>
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
                class="bg-gray-300 text-sm px-2 rounded hover:bg-gray-400"
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
              class="w-full border p-2 rounded bg-gray-200"
              value={form().termin}
              onInput={(e) => setForm({ ...form(), termin: e.target.value })}
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">PPN (%)</label>
            <input
              type="number"
              class="w-full border p-2 rounded bg-gray-200"
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
          class="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 mb-4 "
          onClick={addItem}
        >
          + Tambah Item
        </button>

        <table class="w-full text-sm border border-gray-300 mb-4">
          <thead class="bg-gray-100">
            <tr>
              <th class="border p-2">#</th>
              <th class="border p-2">Jenis Kain</th>
              <th class="border p-2">Grade Kain</th>
              <th class="border p-2">Lebar Greige</th>
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
                    <select
                      class="border p-1 rounded w-full text-sm"
                      value={item.grade_id ?? ""}
                      onChange={(e) =>
                        handleItemChange(i(), "grade_id", e.target.value)
                      }
                      required
                    >
                      <option value="">Pilih Grade</option>
                      {gradeOptions().map((opt) => (
                        <option value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      inputmode="decimal"
                      class="border p-1 rounded w-full bg-gray-200"
                      value={item.lebar_greige}
                      onBlur={(e) =>
                        handleItemChange(i(), "lebar_greige", e.target.value)
                      }
                      readOnly
                    />
                  </td>
                  <td class="border w-72 p-2">
                    <ColorDropdownSearch
                      colors={colorOptions}
                      form={() => item}
                      setForm={(val) => handleItemChange(i, "warna_id", val)}
                      onChange={(val) => handleItemChange(i, "warna_id", val)}
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      inputmode="decimal"
                      class="border p-1 rounded w-full"
                      value={item.gramasi}
                      onBlur={(e) =>
                        handleItemChange(i(), "gramasi", e.target.value)
                      }
                      readOnly
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      {...editableAttr("meter")}
                      type="text"
                      inputmode="decimal"
                      class={`border p-1 rounded w-full ${
                        parseInt(form().satuan_unit_id) !== 1
                          ? "bg-gray-200"
                          : ""
                      }`}
                      readOnly={parseInt(form().satuan_unit_id) !== 1}
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
                      {...editableAttr("yard")}
                      type="text"
                      inputmode="decimal"
                      class={`border p-1 rounded w-full ${
                        parseInt(form().satuan_unit_id) !== 2
                          ? "bg-gray-200"
                          : ""
                      }`}
                      readOnly={parseInt(form().satuan_unit_id) !== 2}
                      value={item.yard}
                      onBlur={(e) =>
                        handleItemChange(i(), "yard", e.target.value, {
                          triggerConversion: true,
                        })
                      }
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      {...editableAttr("kilogram")}
                      type="text"
                      inputmode="decimal"
                      class={`border p-1 rounded w-full ${
                        parseInt(form().satuan_unit_id) !== 3
                          ? "bg-gray-200"
                          : ""
                      }`}
                      readOnly={parseInt(form().satuan_unit_id) !== 3}
                      value={item.kilogram}
                      onBlur={(e) =>
                        handleItemChange(i(), "kilogram", e.target.value, {
                          triggerConversion: true,
                        })
                      }
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      inputmode="decimal"
                      class="border p-1 rounded w-full bg-gray-200"
                      value={formatIDR(item.harga)}
                      // onInput={(e) =>
                      //   handleItemChange(i(), "harga", e.target.value)
                      // }
                      onBlur={(e) =>
                        handleItemChange(i(), "harga", e.target.value, {
                          triggerConversion: true,
                        })
                      }
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
              <td colSpan="10" class="text-right p-2">
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
          >
            Simpan
          </button>
        </div>
      </form>
    </MainLayout>
  );
}
