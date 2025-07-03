import { createSignal, For, onMount } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  getAllCurrenciess,
  getAllCustomers,
  getCustomer,
  getSalesContracts,
  getUser,
} from "../../utils/auth";
import SearchableCustomerSelect from "../../components/CustomerDropdownSearch";
import { produce } from "solid-js/store";
import { Trash2 } from "lucide-solid";
// import { createSC, updateSC, getSC } from "../../utils/auth";
// --> ganti sesuai endpoint lu

export default function SalesContractForm() {
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const navigate = useNavigate();
  const user = getUser();
  const [currencyList, setCurrencyList] = createSignal([]);
  const [customersList, setCustomersList] = createSignal([]);

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

      console.log("🚀 FORM DATA:", {
        ...salesContracts,
        items: normalizedItems,
      });
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

  const reindexItems = (items) =>
    items.map((item, i) => ({
      ...item,
      id: i + 1,
    }));

  const addItem = () => {
    setForm((prev) => {
      const newItems = [
        ...prev.items,
        {
          id: 0, // temporary
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
        },
      ];

      return {
        ...prev,
        items: reindexItems(newItems),
      };
    });
  };

  const removeItem = (index) => {
    setForm((prev) => {
      const newItems = [...prev.items];
      newItems.splice(index, 1);
      return {
        ...prev,
        items: reindexItems(newItems),
      };
    });
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

      console.log("Payload:", payload);

      if (isEdit) {
        // await updateSC(params.id, payload);
      } else {
        // await createSC(payload);
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: isEdit
          ? "Berhasil mengupdate Sales Contract"
          : "Berhasil membuat Sales Contract baru",
        confirmButtonColor: "#6496df",
      }).then(() => navigate("/sales-contract"));
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
            <label class="block mb-1 font-medium">No Pesan</label>
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
              required
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">Tanggal</label>
            <input
              type="date"
              class="w-full border p-2 rounded"
              value={form().tanggal}
              onInput={(e) => setForm({ ...form(), tanggal: e.target.value })}
              required
            />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block mb-1 font-medium">Customer ID</label>
            <SearchableCustomerSelect
              customersList={customersList}
              form={form}
              setForm={setForm}
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">Currency ID</label>
            <select
              class="w-full border p-2 rounded"
              value={form().currency_id}
              onChange={(e) =>
                setForm({ ...form(), currency_id: e.target.value })
              }
              required
            >
              <option value="">Pilih Currency</option>
              {currencyList().map((curr) => (
                <option value={curr.id}>{curr.name}</option>
              ))}
            </select>
          </div>
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
        </div>
        <div class="grid grid-cols-3 gap-4">
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
          <div>
            <label class="block mb-1 font-medium">Satuan Unit</label>
            <input
              type="number"
              class="w-full border p-2 rounded"
              value={form().satuan_unit}
              onInput={(e) =>
                setForm({ ...form(), satuan_unit: e.target.value })
              }
              required
            />
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
        <For each={form().items}>
          {(item, index) => {
            const i = index(); // pastikan index dipanggil sebagai function

            return (
              <div class="border p-4 rounded mb-4 bg-gray-200" key={item.id}>
                <div class="flex justify-between mb-2">
                  <span class="font-semibold">Item {i + 1}</span>
                  <button
                    type="button"
                    class="text-red-600 hover:text-red-800 text-sm"
                    onClick={() => removeItem(i)}
                  >
                    <Trash2 size={22} />
                  </button>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  {[
                    { label: "Kain ID", field: "kain_id", type: "number" },
                    { label: "Warna ID", field: "warna_id", type: "number" },
                    { label: "Keterangan", field: "keterangan", type: "text" },
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
                    { label: "Status", field: "status", type: "text" },
                  ].map(({ label, field, type, step }) => (
                    <div>
                      <label
                        class="block mb-1 text-sm text-gray-700"
                        for={`item-${item.id}-${field}`}
                      >
                        {label}
                      </label>
                      <input
                        placeholder={label}
                        type="text"
                        step={step}
                        class="border p-2 rounded w-full"
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
                        name={`item-${item.id}-${field}`}
                        id={`item-${item.id}-${field}`}
                        required={
                          ["keterangan", "status", "grade"].includes(field) ||
                          type === "number"
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          }}
        </For>

        <button
          type="button"
          class="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700"
          onClick={addItem}
        >
          + Tambah Item
        </button>

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
