import { createEffect, createSignal, For, onMount } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  createSalesContract,
  getAllColors,
  getAllCurrenciess,
  getAllCustomers,
  getAllCustomerTypes,
  getAllFabrics,
  getAllGrades,
  getAllSatuanUnits,
  getLastSequence,
  getLatestSalesContractNumber,
  getSalesContracts,
  getUser,
  updateDataSalesContract,
} from "../../utils/auth";
import SearchableCustomerSelect from "../../components/CustomerDropdownSearch";
import { produce } from "solid-js/store";
import { Printer, RefreshCcw, Trash } from "lucide-solid";
import FabricDropdownSearch from "../../components/FabricDropdownSearch";
import SalesContractPrint from "../print_function/sell/SalesContractPrint";
// import { createSC, updateSC, getSC } from "../../utils/auth";
// --> ganti sesuai endpoint lu

export default function SalesContractForm() {
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const navigate = useNavigate();
  const user = getUser();
  const [currencyList, setCurrencyList] = createSignal([]);
  const [customersList, setCustomersList] = createSignal([]);
  const selectedCurrency = () =>
    currencyList().find((c) => c.id == form().currency_id);
  const [selectedContractDetail, setSelectedContractDetail] = createSignal([]);
  const [fabricOptions, setFabricOptions] = createSignal([]);
  const [colorOptions, setColorOptions] = createSignal([]);
  const [gradeOptions, setGradeOptions] = createSignal([]);
  const [customerType, setCustomerType] = createSignal([]);
  const [unitsType, setUnitsType] = createSignal([]);
  const [salesContractNumber, setSalesContractNumber] = createSignal(0);

  createEffect(async () => {
    const fabrics = await getAllFabrics(user?.token);
    const colors = await getAllColors(user?.token);
    const grades = await getAllGrades(user?.token);

    console.log(fabrics);
    setFabricOptions(
      fabrics?.kain.map((f) => ({
        value: f.id,
        label: f.corak + " | " + f.konstruksi,
      })) || ["Pilih"]
    );

    setColorOptions(
      colors?.warna.map((c) => ({
        value: c.id,
        label: c.kode + " | " + c.deskripsi,
      })) || ["Pilih"]
    );

    setGradeOptions(
      grades?.data.map((g) => ({
        value: g.id,
        label: g.grade,
      })) || ["Pilih"]
    );
  });

  const [form, setForm] = createSignal({
    no_pesan: "",
    po_cust: "-",
    validity_contract: "",
    customer_id: "",
    type: "",
    sequence_number: "",
    currency_id: "",
    kurs: "",
    termin: "",
    ppn_percent: "",
    catatan: "",
    satuan_unit_id: "",
    items: [],
  });

  onMount(async () => {
    const getCurrencies = await getAllCurrenciess(user?.token);
    setCurrencyList(getCurrencies.data);

    const getCustomers = await getAllCustomers(user?.token);
    setCustomersList(getCustomers.customers);

    const getDataCustomerTypes = await getAllCustomerTypes(user?.token);
    setCustomerType(getDataCustomerTypes.data);

    const getDataUnitTypes = await getAllSatuanUnits(user?.token);
    setUnitsType(getDataUnitTypes.data);

    console.log(customerType());
    if (isEdit) {
      const res = await getSalesContracts(params.id, user?.token);
      const salesContracts = res.response; // karena dari console lu, response-nya di dalam `response`

      let sequenceNumber = 0;

      if (salesContracts.no_pesan) {
        // contoh: SC/D/0725-00044
        const parts = salesContracts.no_pesan.split("/");
        const lastPart = parts[parts.length - 1]; // "0725-00044"
        const dashParts = lastPart.split("-");
        if (dashParts.length === 2) {
          const seqStr = dashParts[1]; // "00044"
          sequenceNumber = parseInt(seqStr, 10);
        }
      }

      // Safety check
      if (!salesContracts) return;

      // Normalize items
      const normalizedItems = (salesContracts.items || []).map((item, idx) => ({
        id: idx + 1,
        kain_id: item.kain_id ?? null,
        grade_id: item.grade_id ?? "",
        lebar: item.lebar != null ? parseFloat(item.lebar) : null,
        gramasi: item.gramasi != null ? parseFloat(item.gramasi) : null,
        meter_total:
          item.meter_total != null ? parseFloat(item.meter_total) : null,
        yard_total:
          item.yard_total != null ? parseFloat(item.yard_total) : null,
        kilogram_total:
          item.kilogram_total != null ? parseFloat(item.kilogram_total) : null,
        harga:
          item.harga !== undefined && item.harga !== null
            ? parseFloat(item.harga)
            : null,
      }));

      // Set form
      setForm({
        type:
          parseInt(salesContracts.transaction_type == "domestik" ? 1 : 2) ?? "",
        no_pesan: salesContracts.no_pesan ?? "",
        po_cust: salesContracts.po_cust ?? "",
        validity_contract: salesContracts.validity_contract ?? "",
        customer_id: salesContracts.customer_id ?? "",
        currency_id: salesContracts.currency_id ?? "",
        kurs: parseFloat(salesContracts.kurs) ?? "",
        termin: parseInt(salesContracts.termin) ?? "",
        ppn_percent: parseFloat(salesContracts.ppn_percent) ?? "",
        catatan: salesContracts.catatan ?? "",
        satuan_unit_id: parseInt(salesContracts.satuan_unit_id) ?? "",
        sequence_number: sequenceNumber ?? 0,
        items: normalizedItems.length > 0 ? normalizedItems : [],
      });
      // validity_contract: salesContracts.validity_contract
      //   ? new Date(salesContracts.validity_contract).toISOString().split("T")[0]
      //   : "",
      // console.log("🚀 FORM DATA:", {
      //   ...salesContracts,
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

  const isFieldEditable = (field) => {
    if (field === "meter_total") return isMeter();
    if (field === "yard_total") return isYard();
    if (field === "kilogram_total") return isKilogram();
    return true;
  };

  const handleCustomerTypeChange = async (customerTypeId) => {
    let huruf = "-";
    if (customerTypeId === 1) huruf = "D";
    else if (customerTypeId === 2) huruf = "E";

    let noSalesContract = "";

    const getLatestDataSalesContract = await getLastSequence(
      user?.token,
      "sc",
      form().type
    );

    setSalesContractNumber(getLatestDataSalesContract.last_sequence);

    if (isEdit) {
      // Ambil no_pesan lama
      const oldNoPesan = form().no_pesan;

      if (oldNoPesan) {
        const parts = oldNoPesan.split("/");
        // contoh: SC/D/0725/00099 → ["SC","D","0725","00099"]

        parts[1] = huruf; // hanya ubah huruf D/E

        noSalesContract = parts.join("/");
      } else {
        // fallback kalau no_pesan lama kosong
        noSalesContract = `SC/${huruf}/-/-`;
      }
    } else {
      // BUAT BARU
      const now = new Date();
      const bulan = String(now.getMonth() + 1).padStart(2, "0");
      const tahun = String(now.getFullYear());
      const bulanTahun = `${bulan}${tahun.slice(2)}`;

      const lastNumber = salesContractNumber();
      const nextNumber = (lastNumber + 1).toString().padStart(5, "0");

      noSalesContract = `SC/${huruf}/${bulanTahun}/${nextNumber}`;
    }

    setForm({
      ...form(),
      type: customerTypeId,
      no_pesan: noSalesContract,
      sequence_number: salesContractNumber() + 1,
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
    const onlyNumbers = str.replace(/[^\d]/g, "");
    return onlyNumbers ? parseInt(onlyNumbers) : "";
  };

  let itemIdCounter = form().items?.length || 0;

  const addItem = () => {
    setForm((prev) => {
      const newItem = {
        id: ++itemIdCounter,
        kain_id: null,
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
    // const numericFields = [
    //   "kain_id",
    //   "lebar",
    //   "gramasi",
    //   "meter_total",
    //   "yard_total",
    //   "kilogram_total",
    //   "harga",
    // ];

    let processedValue = value;

    processedValue = value === "" ? 0 : parseFloat(value);

    setForm(
      produce((f) => {
        f.items[index][field] = processedValue;

        if (field === "meter_total" && isMeter()) {
          // Tambahin !isNaN(processedValue) biar pasti angka
          f.items[index].yard_total =
            processedValue != null && !isNaN(processedValue)
              ? meterToYard(processedValue)
              : 0;
        } else if (field === "yard_total" && isYard()) {
          // Tambahin !isNaN(processedValue) biar pasti angka
          f.items[index].meter_total =
            processedValue != null && !isNaN(processedValue)
              ? yardToMeter(processedValue)
              : 0;
        }

        f.items = [...f.items];
      })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const toNum = (val) =>
        val === "" || val === null || val === undefined
          ? null
          : parseFloat(val);

      const customerTypeObj = customerType().find((ct) => ct.id == form().type);

      const payload = {
        ...form(),
        sequence_number: form().sequence_number,
        po_cust: form().po_cust,
        validity_contract: form().validity_contract,
        customer_id: parseInt(form().customer_id),
        type: customerTypeObj?.jenis,
        sequence_number: form().sequence_number,
        currency_id: parseInt(form().currency_id),
        kurs: toNum(form().kurs),
        termin: toNum(form().termin),
        ppn_percent: toNum(form().ppn_percent),
        satuan_unit_id: toNum(form().satuan_unit_id),
        items: form().items.map((item) => ({
          id: item.id,
          kain_id: toNum(item.kain_id),
          grade_id: item.grade_id || "",
          lebar: toNum(item.lebar),
          gramasi: toNum(item.gramasi),
          meter_total: toNum(item.meter_total),
          yard_total: toNum(item.yard_total),
          kilogram_total: toNum(item.kilogram_total),
          harga: toNum(item.harga),
        })),
      };

      if (isEdit) {
        console.log(params.id, payload);
        await updateDataSalesContract(user?.token, params.id, payload);
      } else {
        await createSalesContract(user?.token, payload);
        // console.log(payload);
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: isEdit
          ? "Berhasil mengupdate Sales Contract"
          : "Berhasil membuat Sales Contract baru",
        confirmButtonColor: "#6496df",
      }).then(() => navigate("/salescontract"));
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: isEdit
          ? "Gagal mengupdate Sales Contract"
          : "Gagal membuat Sales Contract baru",
        confirmButtonColor: "#6496df",
      });
    }
  };

  function handlePrint() {
    const encodedData = encodeURIComponent(JSON.stringify(form()));
    window.open(`/print/salescontract?data=${encodedData}`, "_blank");
  }

  return (
    <MainLayout>
      <h1 class="text-2xl font-bold mb-4">
        {isEdit ? "Edit" : "Tambah"} Sales Contract
      </h1>

      <button
        type="button"
        class="flex gap-2 bg-blue-600 text-white px-3 py-2 rounded hover:bg-green-700"
        onClick={handlePrint}
        hidden={!isEdit}
      >
        <Printer size={20} />
        Print
      </button>

      <form class="flex flex-col space-y-4 " onSubmit={handleSubmit}>
        <div class="grid grid-cols-4 gap-4">
          <div>
            <label class="block mb-1 font-medium">No Sales Contract</label>
            <input
              class="w-full border p-2 rounded"
              value={form().no_pesan}
              onInput={(e) => setForm({ ...form(), no_pesan: e.target.value })}
              readOnly
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">PO Customer</label>
            <input
              class="w-full border p-2 rounded"
              value={form().po_cust}
              onInput={(e) => setForm({ ...form(), po_cust: e.target.value })}
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">Tipe Transaksi</label>
            <select
              class="w-full border p-2 rounded"
              value={form().type}
              onChange={(e) => {
                const customerTypeId = e.target.value;
                const curr = customerType().find((c) => c.id == customerTypeId);
                setForm({
                  ...form(),
                  type: customerTypeId,
                  jenis: curr?.name === "IDR" ? 0 : form().jenis,
                });
                handleCustomerTypeChange(Number(e.target.value));
              }}
              required
            >
              <option value="" disabled hidden={!!form().type}>
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
            />
          </div>
        </div>
        <div class="grid grid-cols-4 gap-4">
          <div>
            <label class="block mb-1 font-medium">Currency</label>
            <select
              class="w-full border p-2 rounded"
              value={form().currency_id}
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
              <option value="" disabled hidden={!!form().currency_id}>
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
                  class="w-full border p-2 rounded rounded-l-none"
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
            <label class="block mb-1 font-medium">Termin</label>
            <div class="flex">
              <input
                type="number"
                class="w-full border p-2 rounded rounded-r-none"
                value={form().termin}
                onInput={(e) => setForm({ ...form(), termin: e.target.value })}
                required
              />
              <span class="inline-flex items-center px-3 border border-l-0 border-black bg-gray-50 rounded-r">
                /Hari
              </span>
            </div>
          </div>
          <div>
            <label class="block mb-1 font-medium">PPN (%)</label>
            <input
              type="number"
              step="0.01"
              class="w-full border p-2 rounded"
              value={form().ppn_percent}
              onInput={(e) =>
                setForm({ ...form(), ppn_percent: e.target.value })
              }
              required
            />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-medium">Satuan Unit</label>
            <select
              class="w-full border p-2 rounded"
              value={form().satuan_unit_id}
              onChange={(e) => {
                const satuan_unit_id = parseInt(e.target.value);

                setForm(
                  produce((f) => {
                    f.satuan_unit_id = satuan_unit_id;

                    f.items.forEach((itm) => {
                      if (satuan_unit_id === 1) {
                        // Meter
                        itm.meter_total = 0;
                        itm.yard_total = meterToYard(0);
                        itm.kilogram_total = 0;
                      } else if (satuan_unit_id === 2) {
                        // Yard
                        itm.yard_total = 0;
                        itm.meter_total = yardToMeter(0);
                        itm.kilogram_total = 0;
                      } else if (satuan_unit_id === 3) {
                        // Kilogram
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
          <div>
            <label class="block mb-1 font-medium">Validity Contract</label>
            <input
              type="date"
              class="w-full border p-2 rounded"
              value={form().validity_contract}
              onInput={(e) =>
                setForm({ ...form(), validity_contract: e.target.value })
              }
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

        {/* ITEMS */}
        <h2 class="text-lg font-bold mt-6 mb-2">Items</h2>

        <table class="min-w-full border border-gray-300">
          <thead class="bg-gray-100">
            <tr>
              {[
                { label: "Kain", field: "kain_id" },
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
                    {field === "kain_id" ? (
                      <FabricDropdownSearch
                        fabrics={fabricOptions}
                        item={item}
                        value={item.fabric_id}
                        onChange={(val) => handleItemChange(i, "kain_id", val)}
                        // disabled={isEdit}
                      />
                    ) : field === "grade_id" ? (
                      <select
                        class="border p-1 rounded w-full text-sm"
                        value={item[field] ?? ""}
                        onChange={(e) =>
                          handleItemChange(i, field, e.target.value)
                        }
                        required
                      >
                        <option value="">Pilih Grade</option>
                        {getDropdownOptions(field).map((opt) => (
                          <option value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field === "harga" ? "text" : type}
                        step={step}
                        placeholder={label}
                        class={`border p-1 rounded w-full text-sm ${
                          !isFieldEditable(field)
                            ? "bg-gray-200 text-gray-500"
                            : ""
                        }`}
                        // Ubah value: Pastikan harga di-format, dan konversi meter/yard ke 0 jika null/undefined
                        value={
                          [
                            "meter_total",
                            "yard_total",
                            "kilogram_total",
                          ].includes(field)
                            ? item[field] ?? 0 // Jika null/undefined, tampilkan 0
                            : field === "harga"
                            ? formatIDR(item[field]) // Selalu format harga
                            : item[field] ?? "" // Untuk yang lain, jika null/undefined, tampilkan string kosong
                        }
                        readOnly={!isFieldEditable(field)}
                        // Ubah onInput: Pastikan harga di-parse, yang lain langsung value
                        onInput={(e) => {
                          if (isFieldEditable(field)) {
                            handleItemChange(
                              i,
                              field,
                              field === "harga"
                                ? parseIDR(e.target.value)
                                : e.target.value // PENTING: PARSEIDR DI SINI
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
