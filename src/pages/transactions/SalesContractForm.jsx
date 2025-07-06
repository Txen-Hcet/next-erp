import { createEffect, createSignal, For, onMount } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  createSalesContract,
  getAllColors,
  getAllCurrenciess,
  getAllCustomers,
  getAllFabrics,
  getSalesContracts,
  getUser,
  updateDataSalesContract,
} from "../../utils/auth";
import SearchableCustomerSelect from "../../components/CustomerDropdownSearch";
import { produce } from "solid-js/store";
import { Trash } from "lucide-solid";
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

  createEffect(async () => {
    const fabrics = await getAllFabrics(user?.token);
    const colors = await getAllColors(user?.token);

    setFabricOptions(
      fabrics?.kain.map((f) => ({
        value: f.id,
        label: f.kode + " | " + f.jenis,
      })) || ["Pilih"]
    );

    setColorOptions(
      colors?.warna.map((c) => ({
        value: c.id,
        label: c.kode + " | " + c.jenis,
      })) || ["Pilih"]
    );
  });

  const [form, setForm] = createSignal({
    no_pesan: "",
    po_cust: "",
    tanggal: "",
    customer_id: "",
    currency_id: "",
    kurs: "",
    termin: "",
    ppn_percent: "",
    catatan: "",
    satuan_unit: "",
    items: [],
  });

  onMount(async () => {
    const getCurrencies = await getAllCurrenciess(user?.token);
    setCurrencyList(getCurrencies.data);

    const getCustomers = await getAllCustomers(user?.token);
    setCustomersList(getCustomers.customers);

    if (isEdit) {
      const res = await getSalesContracts(params.id, user?.token);
      const salesContracts = res.response; // karena dari console lu, response-nya di dalam `response`

      // Safety check
      if (!salesContracts) return;

      // Normalize items
      const normalizedItems = (salesContracts.items || []).map((item, idx) => ({
        id: idx + 1,
        kain_id: item.kain_id ?? null,
        warna_id: item.warna_id ?? null,
        keterangan: item.keterangan ?? "",
        grade: item.grade ?? "",
        lebar: item.lebar ? parseFloat(item.lebar) : null,
        gramasi: item.gramasi ? parseFloat(item.gramasi) : null,
        meter_total: item.meter_total ? parseFloat(item.meter_total) : null,
        yard_total: item.yard_total ? parseFloat(item.yard_total) : null,
        kilogram_total: item.kilogram_total
          ? parseFloat(item.kilogram_total)
          : null,
        harga: item.harga ? parseInt(item.harga) : null,
        status: item.status ?? "",
      }));

      // Set form
      setForm({
        no_pesan: salesContracts.no_pesan ?? "",
        po_cust: salesContracts.po_cust ?? "",
        tanggal: salesContracts.tanggal?.split("T")[0] ?? "",
        customer_id: salesContracts.customer_id ?? "",
        currency_id: salesContracts.currency_id ?? "",
        kurs: parseFloat(salesContracts.kurs) ?? "",
        termin: parseInt(salesContracts.termin) ?? "",
        ppn_percent: parseFloat(salesContracts.ppn_percent) ?? "",
        catatan: salesContracts.catatan ?? "",
        satuan_unit: parseInt(salesContracts.satuan_unit) ?? "",
        items: normalizedItems.length > 0 ? normalizedItems : [],
      });

      // console.log("🚀 FORM DATA:", {
      //   ...salesContracts,
      //   items: normalizedItems,
      // });
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

  const parseIDR = (str) => {
    if (!str) return "";
    const onlyNumbers = str.replace(/[^\d]/g, "");
    return onlyNumbers ? parseInt(onlyNumbers) : "";
  };

  let itemIdCounter = form().items?.length || 0;

  const addItem = () => {
    setForm((prev) => {
      const newItem = {
        id: ++itemIdCounter, // unique id increment
        kain_id: null,
        warna_id: null,
        keterangan: "",
        grade: "",
        lebar: null,
        gramasi: null,
        meter_total: null,
        yard_total: null,
        kilogram_total: null,
        harga: null,
        status: "",
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
    } else if (field === "grade") {
      const uniqueGrades = [
        ...new Set(selectedContractDetail()?.items?.map((itm) => itm.grade)),
      ].filter(Boolean);

      return uniqueGrades.map((grade) => ({
        value: grade,
        label: grade,
      }));
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
      processedValue = value === "" ? null : parseFloat(value);
    }

    setForm(
      produce((f) => {
        f.items[index][field] = processedValue;
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

      const payload = {
        ...form(),
        no_pesan: form().no_pesan,
        po_cust: form().po_cust,
        tanggal: form().tanggal,
        customer_id: parseInt(form().customer_id),
        currency_id: parseInt(form().currency_id),
        kurs: toNum(form().kurs),
        termin: toNum(form().termin),
        ppn_percent: toNum(form().ppn_percent),
        satuan_unit: toNum(form().satuan_unit),
        items: form().items.map((item) => ({
          id: item.id,
          kain_id: toNum(item.kain_id),
          warna_id: toNum(item.warna_id),
          keterangan: item.keterangan || "",
          grade: item.grade || "",
          lebar: toNum(item.lebar),
          gramasi: toNum(item.gramasi),
          meter_total: toNum(item.meter_total),
          yard_total: toNum(item.yard_total),
          kilogram_total: toNum(item.kilogram_total),
          harga: toNum(item.harga),
          status: item.status || "",
        })),
      };

      if (isEdit) {
        await updateDataSalesContract(user?.token, params.id, payload);
      } else {
        await createSalesContract(user?.token, payload);
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

  return (
    <MainLayout>
      <h1 class="text-2xl font-bold mb-4">
        {isEdit ? "Edit" : "Tambah"} Sales Contract
      </h1>

      <form class="flex flex-col space-y-4 " onSubmit={handleSubmit}>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block mb-1 font-medium">No Sales Contract</label>
            <input
              class="w-full border p-2 rounded"
              value={form().no_pesan}
              onInput={(e) => setForm({ ...form(), no_pesan: e.target.value })}
              required
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
            <label class="block mb-1 font-medium">Customer</label>
            <SearchableCustomerSelect
              customersList={customersList}
              form={form}
              setForm={setForm}
            />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-4">
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
        </div>
        <div class="grid grid-cols-3 gap-4">
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
          <div>
            <label class="block mb-1 font-medium">Satuan Unit</label>
            <select
              class="w-full border p-2 rounded"
              value={form().satuan_unit}
              onChange={(e) =>
                setForm({ ...form(), satuan_unit: e.target.value })
              }
              required
            >
              <option value="" disabled hidden={!!form().satuan_unit}>
                Pilih Tipe Customer
              </option>
              <option value="1">Yard</option>
              <option value="2">Meter</option>
              <option value="3">Pcs</option>
              {/* {customerTypes().map((type) => (
                <option value={type.id}>{type.jenis}</option>
              ))} */}
            </select>
          </div>
        </div>
        <div>
          <label class="block mb-1 font-medium">Catatan</label>
          <textarea
            class="w-full border p-2 rounded"
            value={form().catatan}
            onInput={(e) => setForm({ ...form(), catatan: e.target.value })}
            required
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
                { label: "Grade", field: "grade" },
                { label: "Lebar", field: "lebar" },
                { label: "Gramasi", field: "gramasi" },
                { label: "Meter Total", field: "meter_total" },
                { label: "Yard Total", field: "yard_total" },
                { label: "Kilogram Total", field: "kilogram_total" },
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
                  { label: "Grade", field: "grade", type: "text" },
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
                    label: "Meter Total",
                    field: "meter_total",
                    type: "number",
                    step: "0.01",
                  },
                  {
                    label: "Yard Total",
                    field: "yard_total",
                    type: "number",
                    step: "0.01",
                  },
                  {
                    label: "Kilogram Total",
                    field: "kilogram_total",
                    type: "number",
                    step: "0.01",
                  },
                  { label: "Harga", field: "harga", type: "number" },
                ].map(({ label, field, type, step }) => (
                  <td class="border px-2 py-1">
                    {["kain_id", "warna_id", "grade"].includes(field) ? (
                      <select
                        class="border p-1 rounded w-full text-sm"
                        value={item[field] ?? ""}
                        onChange={(e) =>
                          handleItemChange(
                            i,
                            field,
                            field === "grade"
                              ? e.target.value
                              : Number(e.target.value)
                          )
                        }
                        required
                      >
                        <option value="">Pilih Item</option>
                        {getDropdownOptions(field).map((opt) => (
                          <option value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={type}
                        step={step}
                        placeholder={label}
                        class="border p-1 rounded w-full text-sm"
                        value={
                          field === "harga"
                            ? formatIDR(item[field])
                            : item[field] ?? ""
                        }
                        onInput={(e) =>
                          handleItemChange(
                            i,
                            field,
                            field === "harga"
                              ? parseIDR(e.target.value)
                              : e.target.value
                          )
                        }
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

        <div class="flex justify-end mt-4">
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
