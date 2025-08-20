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
      if (!soData) return;

      const mappedItems = (soData.items || []).map((soItem) => ({
        id: soItem.id,
        sc_item_id: soItem.sc_item_id,
        fabric_id: soItem.kain_id,
        grade_id: soItem.grade_id,
        lebar_greige: soItem.lebar,
        gramasi: soItem.gramasi,
        warna_id: soItem.warna_id ?? null,
        meter: soItem.meter_total ?? "",
        yard: soItem.yard_total ?? "",
        kilogram: soItem.kilogram_total ?? "",
        harga: soItem.harga ?? "",
        subtotalFormatted: soItem.total > 0 ? formatIDR(soItem.total) : "",
      }));

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
          Number(custDetail.ppn_percent),
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
          Number(custDetail.ppn_percent),
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
    ppn,
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
      id: item.id ?? idx + 1,
      sc_item_id: item.sc_item_id ?? null,
      fabric_id: item.fabric_id ?? null,
      grade_id: item.grade_id ?? "",
      lebar_greige: item.lebar_greige ?? "",
      warna_id: item.warna_id ?? "",
      gramasi: item.gramasi ?? "",
      meter: item.meter ?? 0,
      meter_total: item.meter_total ?? "",
      yard: item.yard ?? 0,
      yard_total: item.yard_total ?? "",
      kilogram: item.kilogram ?? 0,
      kilogram_total: item.kilogram_total ?? "",
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
      ppn: ppn,
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
    form().items.reduce(
      (sum, item) => sum + (parseFloat(parseNumber(item.meter)) || 0),
      0
    );

  const totalYard = () =>
    form().items.reduce(
      (sum, item) => sum + (parseFloat(parseNumber(item.yard)) || 0),
      0
    );

  const totalKilogram = () =>
    form().items.reduce(
      (sum, item) => sum + (parseFloat(parseNumber(item.kilogram)) || 0),
      0
    );

  const totalAll = () => {
    return form().items.reduce((sum, item) => {
      return sum + (parseFloat(item.subtotal) || 0);
    }, 0);
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
      if (
        [
          "lebar_greige",
          "gramasi",
          "meter",
          "yard",
          "kilogram",
          "harga",
        ].includes(field)
      ) {
        const numberValue = parseNumber(value);
        items[index][field] = formatNumber(numberValue);
      } else {
        items[index][field] = value;
      }

      const satuanId = parseInt(prev.satuan_unit_id);
      const satuan = satuanUnitOptions()
        .find((u) => u.id == satuanId)
        ?.satuan?.toLowerCase();

      let meter = parseFloat(items[index].meter_total || "") || 0;
      let yard = parseFloat(items[index].yard_total || "") || 0;

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
          items[index].yard = yard > 0 ? formatNumber(yard.toFixed(4)) : "";
          items[index].kilogram = "0";
        } else if (satuanId === 2) {
          // yard
          yard = parseFloat(value) || 0;
          meter = yard * 0.9144;
          items[index].meter = meter > 0 ? formatNumber(meter.toFixed(4)) : "";
          items[index].kilogram = "0";
        } else if (satuanId === 3) {
          // kilogram
          items[index].meter = "0";
          items[index].yard = "0";
        }
      }

      // if (field === "lebar_greige") {
      //   items[index].lebar_greige = value;
      // }

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
            meter_total: item.meter ? parseFloat(parseNumber(item.meter)) : 0,
            yard_total: item.yard ? parseFloat(parseNumber(item.yard)) : 0,
            kilogram_total: item.kilogram
              ? parseFloat(parseNumber(item.kilogram))
              : 0,
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
          items: Object.values(
            form().items.reduce((acc, item) => {
              const scItemId = item.sc_item_id || item.id;

              if (!acc[scItemId]) {
                acc[scItemId] = {
                  sc_item_id: scItemId,
                  warnas: [],
                };
              }

              acc[scItemId].warnas.push({
                warna_id: parseInt(item.warna_id) || null,
                meter: item.meter ? parseFloat(parseNumber(item.meter)) : 0,
                yard: item.yard ? parseFloat(parseNumber(item.yard)) : 0,
                kilogram: item.kilogram
                  ? parseFloat(parseNumber(item.kilogram))
                  : 0,
              });

              return acc;
            }, {})
          ),
        };

        await createSalesOrder(user?.token, payload);
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
      {loading() && (
        <div class="fixed inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-md bg-opacity-40 z-50 gap-10">
          <div class="w-52 h-52 border-[20px] border-white border-t-transparent rounded-full animate-spin"></div>
          <span class="animate-pulse text-[40px] text-white">Loading...</span>
        </div>
      )}
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
            disabled={isView}
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
                  checked={form().ppn === "11.00"}
                  disabled
                  class="sr-only peer"
                />
                <div class="w-24 h-10 bg-gray-200 rounded-full peer-checked:bg-green-600 transition-colors"></div>
                <div class="absolute left-0.5 top-0.5 w-9 h-9 bg-white border border-gray-300 rounded-full shadow-sm peer-checked:translate-x-14 transition-transform"></div>
              </div>
              <span class="text-lg text-gray-700">
                {form().ppn === "11.00" ? "11%" : "0%"}
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
          ></textarea>
        </div>

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
                      sc_item_id: scItem.id,
                      fabric_id: scItem.kain_id,
                      grade_id: scItem.grade_id,
                      lebar_greige: scItem.lebar,
                      gramasi: scItem.gramasi,
                      harga: scItem.harga,
                      meter: 0,
                      yard: 0,
                      kilogram: 0,
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
                      item={item}
                      onChange={(val) => handleItemChange(i(), "warna_id", val)}
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      inputmode="decimal"
                      class="border p-1 rounded w-full bg-gray-200"
                      value={item.gramasi}
                      onBlur={(e) =>
                        handleItemChange(i(), "gramasi", e.target.value)
                      }
                      readOnly
                    />
                  </td>
                  <td class="border p-2">
                    <input
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
              <td colSpan="6" class="text-right p-2">
                TOTAL
              </td>
              <td class="border p-2">
                {formatNumber(totalMeter().toFixed(2))}
              </td>
              <td class="border p-2">{formatNumber(totalYard().toFixed(2))}</td>
              <td class="border p-2">
                {formatNumber(totalKilogram().toFixed(2))}
              </td>
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
