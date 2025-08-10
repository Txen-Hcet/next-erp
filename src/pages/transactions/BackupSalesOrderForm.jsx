import { createEffect, createSignal, For, onMount } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  createSalesOrder,
  getAllColors,
  getAllFabrics,
  getAllGrades,
  getAllSalesContracts,
  getAllSatuanUnits,
  getAllSOTypes,
  getLastSequence,
  getSalesContracts,
  getSalesOrders,
  getUser,
  updateDataSalesOrder,
} from "../../utils/auth";
import SearchableSalesContractSelect from "../../components/SalesContractDropdownSearch";
import ColorDropdownSearch from "../../components/ColorDropdownSearch";
import { produce } from "solid-js/store";
import { Printer, RefreshCcw, Trash, Trash2 } from "lucide-solid";
// import { createSC, updateSC, getSC } from "../../utils/auth";
// --> ganti sesuai endpoint lu

export default function SalesOrderFormBackup() {
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const navigate = useNavigate();
  const user = getUser();
  const [salesContracts, setSalesContracts] = createSignal([]);
  const [jenisSoList, setJenisSoList] = createSignal([]);
  const [selectedContractDetail, setSelectedContractDetail] = createSignal([]);
  const [salesOrderNumber, setSalesOrderNumber] = createSignal(0);
  const [fabricOptions, setFabricOptions] = createSignal([]);
  const [colorOptions, setColorOptions] = createSignal([]);
  const [gradeOptions, setGradeOptions] = createSignal([]);
  const [unitsType, setUnitsType] = createSignal([]);
  const todayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const [form, setForm] = createSignal({
    no_so: "",
    sales_contract_id: "",
    tanggal: todayDate(),
    cust_name: "",
    currency_name: "",
    kurs: "",
    termin: "",
    ppn: "",
    satuan_unit_id: "",
    delivery_date: "",
    komisi: "",
    catatan: "",
    type: "",
    sequence_number: "",
    items: [],
  });

  createEffect(async () => {
    const fabrics = await getAllFabrics(user?.token);
    const colors = await getAllColors(user?.token);
    const grades = await getAllGrades(user?.token);

    setFabricOptions(
      fabrics?.kain.map((f) => ({
        value: f.id,
        label: f.corak + " | " + f.konstruksi,
      })) || ["Pilih"]
    );

    setColorOptions(
      colors?.warna.map((c) => ({
        value: c.id,
        kode: c.kode,
        deskripsi: c.deskripsi,
      })) || ["Pilih"]
    );

    setGradeOptions(
      grades?.data.map((g) => ({
        value: g.id,
        label: g.grade,
      })) || ["Pilih"]
    );
  });

  onMount(async () => {
    const getSalesContracts = await getAllSalesContracts(user?.token);
    setSalesContracts(getSalesContracts.contracts);

    const getJenisSO = await getAllSOTypes(user?.token);
    setJenisSoList(getJenisSO.data);

    const getDataUnitTypes = await getAllSatuanUnits(user?.token);
    setUnitsType(getDataUnitTypes.data);

    if (isEdit) {
      const res = await getSalesOrders(params.id, user?.token);
      const salesOrders = res.response; // karena dari console lu, response-nya di dalam `response`

      // Safety check
      if (!salesOrders) return;

      // Normalize items
      const normalizedItems = (salesOrders.items || []).map((item, idx) => ({
        id: item.id ?? null,
        kain_id: item.kain_id ?? "",
        warna_id: item.warna_id ?? "",
        grade_id: item.grade_id ?? "",
        lebar: item.lebar != null ? parseFloat(item.lebar) : null,
        gramasi: item.gramasi != null ? parseFloat(item.gramasi) : null,
        meter_total:
          item.meter_total != null ? parseFloat(item.meter_total) : 0,
        yard_total: item.yard_total != null ? parseFloat(item.yard_total) : 0,
        kilogram_total:
          item.kilogram_total != null ? parseFloat(item.kilogram_total) : 0,
        harga: item.harga != null ? parseFloat(item.harga) : null,
      }));

      // Set form
      setForm({
        no_so: salesOrders.no_so ?? "",
        sales_contract_id: salesOrders.sales_contract_id ?? "",
        tanggal:
          salesOrders.tanggal && salesOrders.tanggal !== ""
            ? salesOrders.tanggal.split("T")[0]
            : todayDate(),
        cust_name: salesOrders.cust_name ?? "",
        currency_name: salesOrders.currency_name ?? "",
        type: salesOrders.type ?? "",
        sequence_number: salesOrders.sequence_number ?? "",
        jenis_so_id: salesOrders.jenis_so_id ?? "",
        kurs: salesOrders.kurs ?? "",
        termin: salesOrders.termin ?? "",
        ppn: salesOrders.ppn ?? "",
        satuan_unit_id: salesOrders.satuan_unit_id ?? "",
        delivery_date: salesOrders.delivery_date?.split("T")[0] ?? "",
        komisi: parseFloat(salesOrders.komisi) ?? "",
        catatan: "",
        items: normalizedItems.length > 0 ? normalizedItems : [],
      });

      fetchSalesContractDetail(salesOrders.sales_contract_id);

      // console.log("🚀 FORM DATA:", {
      //   ...salesOrders,
      //   items: normalizedItems,
      // });
    }
  });

  const METER_TO_YARD = 1.09361;

  const meterToYard = (m) => {
    if (m == null || m === "") return 0;
    return parseFloat((m * METER_TO_YARD).toFixed(4));
  };

  const yardToMeter = (y) => {
    if (y == null || y === "") return 0;
    return parseFloat((y / METER_TO_YARD).toFixed(4));
  };

  const selectedUnitId = () => parseInt(form().satuan_unit_id);

  const isMeter = () => selectedUnitId() === 1;
  const isYard = () => selectedUnitId() === 2;
  const isKilogram = () => selectedUnitId() === 3;

  const isItemFieldEditable = (field) => {
    if (field === "warna_id") return true;

    if (field === "meter_total" && isMeter()) return true;
    if (field === "yard_total" && isYard()) return true;
    if (field === "kilogram_total" && isKilogram()) return true;

    return false;
  };

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

  const parseNoPesan = (no_pesan) => {
    if (!no_pesan) return { huruf: "-", nomor: "" };

    const parts = no_pesan.split("/"); // ["SC", "D", "0625-00099"]

    const huruf = parts[1] || "-";
    const nomor = parts[2]?.split("-")[1] || "";

    return { huruf, nomor };
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
    const onlyNumbers = str.replace(/[^\d]/g, "");
    return onlyNumbers ? parseInt(onlyNumbers) : "";
  };

  const addItem = () => {
    setForm((prev) => {
      const newItem = {
        id: null,
        kain_id: null,
        warna_id: null,
        grade_id: "",
        lebar: null,
        gramasi: null,
        meter_total: isMeter() ? 0 : 0,
        yard_total: isYard() ? 0 : 0,
        kilogram_total: isKilogram() ? 0 : 0,
        harga: null,
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

  const getDropdownOptions = (field) => {
    if (field === "kain_id") {
      return fabricOptions();
    } else if (field === "warna_id") {
      return colorOptions();
    } else if (field === "grade_id") {
      return gradeOptions();
      // const uniqueGrades = [
      //   ...new Set(selectedContractDetail()?.items?.map((itm) => itm.grade)),
      // ].filter(Boolean);

      // return uniqueGrades.map((grade) => ({
      //   value: grade,
      //   label: grade,
      // }));
    } else {
      return [];
    }
  };

  const handleItemChange = (index, field, value) => {
    const numericFields = [
      "kain_id",
      "warna_id",
      "lebar",
      "gramasi",
      "meter_total",
      "yard_total",
      "kilogram_total",
      "harga",
    ];

    let processedValue = value;

    if (numericFields.includes(field)) {
      if (value === "" || value == null || isNaN(value)) {
        processedValue = 0;
      } else {
        processedValue = parseFloat(value);
      }
    }

    setForm(
      produce((f) => {
        f.items[index][field] = processedValue;

        if (field === "meter_total" && isMeter()) {
          f.items[index].yard_total =
            processedValue != null ? meterToYard(processedValue) : 0;
        } else if (field === "yard_total" && isYard()) {
          f.items[index].meter_total =
            processedValue != null ? yardToMeter(processedValue) : 0;
        }

        f.items = [...f.items]; // <<< ini bikin auto refresh
      })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const toNum = (val) =>
        val === "" || val === null || val === undefined ? 0 : parseFloat(val);

      const payload = {
        ...form(),
        no_so: form().no_so,
        sales_contract_id: parseInt(form().sales_contract_id),
        jenis_so_id: parseInt(form().jenis_so_id),
        tanggal: form().tanggal,
        cust_name: form().cust_name,
        currency_name: form().currency_name,
        type: form().type,
        sequence_number: form().sequence_number,
        kurs: form().kurs,
        termin: form().termin,
        ppn: form().ppn,
        satuan_unit_id: form().satuan_unit_id,
        delivery_date: form().delivery_date,
        komisi: toNum(form().komisi),
        catatan: form().catatan,
        items: form().items.map((item) => ({
          sales_contract_item_id: item.id,
          kain_id: toNum(item.kain_id),
          warna_id: toNum(item.warna_id),
          grade_id: item.grade_id || "",
          lebar: toNum(item.lebar),
          gramasi: toNum(item.gramasi),
          meter_total: toNum(item.meter_total),
          yard_total: toNum(item.yard_total),
          kilogram_total:
            item.kilogram_total != null ? Number(item.kilogram_total) : 0,
          harga: toNum(item.harga),
        })),
      };

      if (isEdit) {
        await updateDataSalesOrder(user?.token, params.id, payload);
      } else {
        await createSalesOrder(user?.token, payload);
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: isEdit
          ? "Berhasil mengupdate Sales Order"
          : "Berhasil membuat Sales Order baru",
        confirmButtonColor: "#6496df",
      }).then(() => navigate("/salesorder"));
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: isEdit
          ? "Gagal mengupdate Sales Order"
          : "Gagal membuat Sales Order baru",
        confirmButtonColor: "#6496df",
      });
    }
  };

  function handlePrint() {
    Swal.fire({
      title: "Pilih jenis print",
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: "Print Sales Order",
      denyButtonText: "Print Packing Order",
      cancelButtonText: "Cancel",
    }).then((result) => {
      const encodedData = encodeURIComponent(JSON.stringify(form()));

      if (result.isConfirmed) {
        window.open(`/print/salesorder?data=${encodedData}`, "_blank");
      } else if (result.isDenied) {
        window.open(`/print/packingorder?data=${encodedData}`, "_blank");
      }
      // if cancel: do nothing
    });
  }

  return (
    <MainLayout>
      <h1 class="text-2xl font-bold mb-4">
        {isEdit ? "Edit" : "Tambah"} Sales Order & Packing Order
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

      <form class="flex flex-col space-y-4 " onSubmit={handleSubmit}>
        <div class="grid grid-cols-4 gap-4">
          <div>
            <label class="block mb-1 font-medium">No Sales Order</label>
            <input
              class="w-full border p-2 rounded bg-gray-300"
              value={form().no_so}
              onInput={(e) => setForm({ ...form(), no_so: e.target.value })}
              readonly
            />
          </div>
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
          <div>
            <label class="block mb-1 font-medium">Jenis Sales Order</label>
            <select
              class="w-full border p-2 rounded"
              value={form().jenis_so_id ?? ""}
              onChange={(e) =>
                setForm({ ...form(), jenis_so_id: e.target.value })
              }
              required
            >
              <option value="" disabled hidden={!!form().id}>
                Pilih Jenis Sales Order
              </option>
              {jenisSoList().map((curr) => (
                <option value={curr.id}>{curr.jenis}</option>
              ))}
            </select>
          </div>
          <div>
            <label class="block mb-1 font-medium">Customer</label>
            <input
              type="text"
              class="w-full border p-2 rounded bg-gray-300"
              value={form().cust_name}
              onInput={(e) => setForm({ ...form(), cust_name: e.target.value })}
              readonly
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">Mata Uang</label>
            <div className="flex">
              <input
                type="text"
                class="w-full border p-2 rounded bg-gray-300"
                value={form().currency_name}
                onInput={(e) =>
                  setForm({ ...form(), currency_name: e.target.value })
                }
                readonly
              />
            </div>
          </div>
          <div>
            <label class="block mb-1 font-medium">Kurs</label>
            <div className="flex">
              <span class="inline-flex items-center px-3 border border-r-0 border-black bg-gray-50 rounded-l">
                IDR
              </span>
              <input
                type="text"
                class="w-full border p-2 rounded bg-gray-300"
                value={form().kurs}
                onInput={(e) => setForm({ ...form(), kurs: e.target.value })}
                readonly
              />
            </div>
          </div>
          <div>
            <label class="block mb-1 font-medium">Tanggal</label>
            <input
              type="date"
              class="w-full border p-2 rounded bg-gray-300"
              value={form().tanggal}
              onInput={(e) => setForm({ ...form(), tanggal: e.target.value })}
              readonly
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">Tanggal Pengiriman</label>
            <input
              type="date"
              class="w-full border p-2 rounded"
              value={form().delivery_date}
              onInput={(e) =>
                setForm({ ...form(), delivery_date: e.target.value })
              }
            />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block mb-1 font-medium">Termin</label>
            <div class="flex">
              <input
                type="text"
                class="w-full border p-2 rounded rounded-r-none bg-gray-300"
                value={form().termin}
                onInput={(e) =>
                  setForm({
                    ...form(),
                    termin: parseIDR(e.target.value),
                  })
                }
                required
              />
              <span class="inline-flex items-center px-3 border border-l-0 border-black bg-gray-50 rounded-r">
                /Hari
              </span>
            </div>
          </div>
          <div>
            <label class="block mb-1 font-medium">PPN</label>
            <div class="flex">
              <input
                type="text"
                class="w-full border p-2 rounded rounded-r-none bg-gray-300"
                value={form().ppn}
                onInput={(e) =>
                  setForm({
                    ...form(),
                    ppn: parseIDR(e.target.value),
                  })
                }
                required
              />
              <span class="inline-flex items-center px-3 border border-l-0 border-black bg-gray-50 rounded-r">
                %
              </span>
            </div>
          </div>
          <div>
            <label class="block mb-1 font-medium">
              Satuan Unit {String(form().satuan_unit_id)}
            </label>
            <select
              class="w-full border p-2 rounded bg-gray-300"
              value={String(form().satuan_unit_id)}
              onChange={(e) => {
                const satuan_unit_id = parseInt(e.target.value);

                setForm(
                  produce((f) => {
                    f.satuan_unit_id = satuan_unit_id;

                    f.items.forEach((itm) => {
                      if (satuan_unit_id === 1) {
                        itm.meter_total = 0;
                        itm.yard_total = 0;
                        itm.kilogram_total = 0;
                      } else if (satuan_unit_id === 2) {
                        itm.yard_total = 0;
                        itm.meter_total = 0;
                        itm.kilogram_total = 0;
                      } else if (satuan_unit_id === 3) {
                        itm.kilogram_total = 0;
                        itm.meter_total = 0;
                        itm.yard_total = 0;
                      }
                    });
                  })
                );
              }}
              required
            >
              <option value="" disabled hidden={!!form().satuan_unit_id}>
                Pilih Satuan Unit
              </option>
              {unitsType().map((type) => (
                <option value={type.id}>{type.satuan}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label class="block mb-1 font-medium">Catatan (Packing Order)</label>
          <textarea
            class="w-full border p-2 rounded"
            value={form().catatan}
            onInput={(e) => setForm({ ...form(), catatan: e.target.value })}
          ></textarea>
        </div>

        {/* ITEMS */}
        <h2 class="text-lg font-bold mt-6 mb-2">Items</h2>

        <table class="min-w-full border border-gray-300">
          <thead class="bg-gray-100">
            <tr>
              {[
                { label: "Kain", field: "kain_id" },
                { label: "Warna", field: "warna_id" },
                { label: "Grade", field: "grade_id" },
                { label: "Lebar", field: "lebar" },
                { label: "Gramasi", field: "gramasi" },
                { label: "Meter", field: "meter_total" },
                { label: "Yard", field: "yard_total" },
                { label: "Kilogram", field: "kilogram_total" },
                { label: "Harga", field: "harga" },
              ].map(({ label }) => (
                <th class="border px-2 py-1 text-sm text-gray-700 text-left">
                  {label}
                </th>
              ))}
              <th class="border px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {form().items.map((item, i) => (
              <tr key={item.id}>
                {[
                  { label: "Kain", field: "kain_id", type: "number" },
                  { label: "Warna", field: "warna_id", type: "number" },
                  { label: "Grade", field: "grade_id", type: "text" },
                  {
                    label: "Lebar",
                    field: "lebar",
                    type: "number",
                    step: "0.01",
                  },
                  {
                    label: "Gramasi",
                    field: "gramasi",
                    type: "number",
                    step: "0.01",
                  },
                  {
                    label: "Meter",
                    field: "meter_total",
                    type: "number",
                    step: "0.01",
                  },
                  {
                    label: "Yard",
                    field: "yard_total",
                    type: "number",
                    step: "0.01",
                  },
                  {
                    label: "Kilogram",
                    field: "kilogram_total",
                    type: "number",
                    step: "0.01",
                  },
                  { label: "Harga", field: "harga", type: "text" },
                ].map(({ label, field, type, step }) => (
                  <td class="border px-2 py-1">
                    {field === "warna_id" ? (
                      <div>
                        <ColorDropdownSearch
                          colors={colorOptions}
                          form={() => item}
                          setForm={(val) =>
                            handleItemChange(i, "warna_id", val)
                          }
                          onChange={(val) =>
                            handleItemChange(i, "warna_id", val)
                          }
                        />

                        {!isItemFieldEditable(field) && (
                          <input
                            type="hidden"
                            name={`items[${i}][${field}]`}
                            value={item[field] ?? ""}
                          />
                        )}
                      </div>
                    ) : field === "kain_id" || field === "grade_id" ? (
                      <div>
                        <select
                          class={`border p-1 rounded w-full text-sm ${
                            !isItemFieldEditable(field)
                              ? "bg-gray-200 text-gray-500"
                              : ""
                          }`}
                          value={item[field] ?? ""}
                          onChange={(e) =>
                            handleItemChange(
                              i,
                              field,
                              field === "grade_id"
                                ? e.target.value
                                : Number(e.target.value)
                            )
                          }
                          required
                          disabled={!isItemFieldEditable(field)}
                        >
                          <option value="">Pilih Item</option>
                          {getDropdownOptions(field).map((opt) => (
                            <option value={opt.value}>{opt.label}</option>
                          ))}
                        </select>

                        {!isItemFieldEditable(field) && (
                          <input
                            type="hidden"
                            name={`items[${i}][${field}]`}
                            value={item[field] ?? ""}
                          />
                        )}
                      </div>
                    ) : (
                      <input
                        type={type}
                        step={step}
                        placeholder={label}
                        class={`border p-1 rounded w-full text-sm ${
                          !isItemFieldEditable(field)
                            ? "bg-gray-200 text-gray-500"
                            : ""
                        }`}
                        value={
                          [
                            "meter_total",
                            "yard_total",
                            "kilogram_total",
                          ].includes(field)
                            ? item[field] ?? 0
                            : field === "harga"
                            ? formatIDR(item[field])
                            : item[field] ?? ""
                        }
                        readOnly={!isItemFieldEditable(field)}
                        onInput={(e) => {
                          if (isItemFieldEditable(field)) {
                            handleItemChange(
                              i,
                              field,
                              field === "harga"
                                ? parseIDR(e.target.value)
                                : e.target.value
                            );
                          }
                        }}
                      />
                    )}
                  </td>
                ))}
                <td class="border px-2 py-1">
                  <button
                    type="button"
                    class="text-red-600 hover:text-red-800 text-xs"
                    onClick={() => removeItem(i)}
                  >
                    <Trash size={25} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div class="flex justify-end mt-4 gap-2">
          <button
            type="button"
            class="bg-blue-600 text-white px-3 py-2 rounded hover:bg-green-700"
            onClick={() => setForm({ ...form() })}
          >
            <RefreshCcw size={20} />
          </button>
          <button
            type="button"
            class="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700"
            onClick={addItem}
          >
            + Tambah Item
          </button>
        </div>

        <div class="mt-6">
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
