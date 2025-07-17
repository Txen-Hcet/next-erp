import { createEffect, createSignal, For, onMount } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  createPackingList,
  getPackingLists,
  getAllFabrics,
  getAllColors,
  getAllCustomers,
  updateDataPackingList,
  getUser,
  getAllSalesOrders,
  getLastPackingList,
  getSalesOrders,
} from "../../utils/auth";
import SearchableCustomerSelect from "../../components/CustomerDropdownSearch";
import { RefreshCcw, Trash2, XCircle } from "lucide-solid";
import PackingOrderPrint from "../print_function/PackingOrderPrint";
import SearchableSalesOrderSelect from "../../components/SalesOrderSearch";

export default function PackingListForm() {
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const navigate = useNavigate();
  const user = getUser();

  const [fabricOptions, setFabricOptions] = createSignal([]);
  const [colorOptions, setColorOptions] = createSignal([]);
  const [customersList, setCustomersList] = createSignal([]);
  const [salesOrderList, setSalesOrderList] = createSignal([]);
  const [openStates, setOpenStates] = createSignal([]);
  const [printData, setPrintData] = createSignal(null);
  const [showPreview, setShowPreview] = createSignal(false);
  const [lastNumberSequence, setLastNumberSequence] = createSignal(false);
  const [nextSequenceNumber, setNextSequenceNumber] = createSignal(null);
  const [generatedNoPL, setGeneratedNoPL] = createSignal("");
  const [groupRollCounts, setGroupRollCounts] = createSignal([]);

  const [form, setForm] = createSignal({
    type: "",
    no_pl: "",
    sequence_number: "",
    sales_order_id: "",
    col: "",
    catatan: "",
    itemGroups: [],
    sales_order_items: [],
  });

  // Load dropdowns on mount
  createEffect(async () => {
    const fabrics = await getAllFabrics(user?.token);
    const colors = await getAllColors(user?.token);
    const customers = await getAllCustomers(user?.token);
    const salesOrders = await getAllSalesOrders(user?.token);
    const getPackingOrderNumber = await getLastPackingList(user?.token);
    const currentForm = form();

    setLastNumberSequence(getPackingOrderNumber);

    if (currentForm) {
      localStorage.setItem("packing_order_draft", JSON.stringify(currentForm));
    }

    setFabricOptions(
      fabrics?.kain?.map((f) => ({
        value: f.id,
        label: f.kode + " | " + f.jenis,
      })) || []
    );

    setColorOptions(
      colors?.warna?.map((c) => ({
        value: c.id,
        label: c.kode + " | " + c.jenis,
      })) || []
    );

    setCustomersList(customers?.customers || []);
    setSalesOrderList(salesOrders?.orders || []);

    localStorage.setItem("packing_order_draft", JSON.stringify(form()));
  });

  onMount(async () => {
    const draft = localStorage.getItem("packing_order_draft");
    if (draft && !isEdit) {
      setForm(JSON.parse(draft));
    }

    if (isEdit) {
      const res = await getPackingLists(params.id, user?.token);
      const packingOrder = res?.response;
      if (!packingOrder) return;

      const items = packingOrder.sales_order_items || [];

      setForm((prev) => ({
        ...prev,
        sales_order_items: items,
        sales_order_id: packingOrder.sales_order_id,
        no_pl: packingOrder.no_pl,
        sequence_number: packingOrder.sequence_number,
        type:
          packingOrder.type === "domestik"
            ? 1
            : packingOrder.type === "ekspor"
            ? 2
            : "",
        col: packingOrder.col,
        catatan: packingOrder.catatan,
        itemGroups: (packingOrder.itemGroups || []).map((group) => ({
          sales_order_item_id: group.sales_order_item_id,
          rolls: group.rolls.map((r) => ({
            meter_total: r.meter_total,
            yard_total: r.yard_total,
          })),
        })),
      }));
    }
  });

  const handleSalesOrderChange = async (selectedSO) => {
    if (!selectedSO?.no_so || !lastNumberSequence()?.last_sequence) return;

    const soTypeLetter = selectedSO.no_so.split("/")[1];
    let typeValue = "";
    if (soTypeLetter === "E") {
      typeValue = 2;
    } else if (soTypeLetter === "D") {
      typeValue = 1;
    }

    const nextSequence = (lastNumberSequence()?.last_sequence || 0) + 1;
    const generatedNoPL = generatePackingListNumber(typeValue, nextSequence);

    // ⬇️ Ambil detail sales order by ID
    const res = await getSalesOrders(selectedSO.id, user?.token);
    const selectedOrder = res?.response;
    const salesOrderItems = selectedOrder?.items || [];

    console.log(selectedOrder);

    setForm({
      ...form(),
      sales_order_id: selectedSO.id,
      type: typeValue,
      no_pl: generatedNoPL,
      sequence_number: nextSequence,
      sales_order_items: selectedOrder,
    });
  };

  const generatePackingListNumber = (type, sequence) => {
    if (!type) return "";

    const typeLetter = type == 1 ? "D" : type == 2 ? "E" : "";

    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(-2);

    const mmyy = `${month}${year}`;
    const nextNumber = String(sequence).padStart(5, "0");

    return `PL/${typeLetter}/${mmyy}-${nextNumber}`;
  };

  const meterToYard = (m) => {
    if (!m || isNaN(m)) return "";
    return (parseFloat(m) * 1.093613).toFixed(2);
  };

  const yardToMeter = (y) => {
    if (!y || isNaN(y)) return "";
    return (parseFloat(y) * 0.9144).toFixed(2);
  };

  const toggleGroupOpen = (index) => {
    setOpenStates((prev) => {
      const copy = [...prev];
      copy[index] = !copy[index];
      return copy;
    });
  };

  const addItemGroup = () => {
    setForm((prev) => ({
      ...prev,
      itemGroups: [
        ...prev.itemGroups,
        {
          sales_order_item_id: "",
          rolls: [{ meter_total: "", yard_total: "" }],
        },
      ],
    }));
    setOpenStates((prev) => [...prev, false]);
    setGroupRollCounts((prev) => [...prev, 0]);
  };

  const removeItemGroup = (groupIndex) => {
    setForm((prev) => {
      const copy = [...prev.itemGroups];
      copy.splice(groupIndex, 1);
      return { ...prev, itemGroups: copy };
    });
    setOpenStates((prev) => {
      const copy = [...prev];
      copy.splice(groupIndex, 1);
      return copy;
    });
    setGroupRollCounts((prev) => {
      const copy = [...prev];
      copy.splice(groupIndex, 1);
      return copy;
    });
  };

  const addRoll = (groupIndex) => {
    setForm((prev) => {
      const copy = [...prev.itemGroups];
      const group = copy[groupIndex];
      const lastRoll = group.rolls[group.rolls.length - 1];
      const newRoll = {
        meter_total: lastRoll?.meter_total || "",
        yard_total: lastRoll?.yard_total || "",
      };

      copy[groupIndex] = {
        ...group,
        rolls: [...group.rolls, newRoll],
      };
      return { ...prev, itemGroups: copy };
    });
  };

  const addMultipleRolls = (groupIndex, count) => {
    setForm((prev) => {
      const copy = [...prev.itemGroups];
      const group = copy[groupIndex];
      const lastRoll = group.rolls[group.rolls.length - 1];
      const meter = lastRoll?.meter_total || "";
      const yard = lastRoll?.yard_total || "";

      const newRolls = Array.from({ length: count }, () => ({
        meter_total: meter,
        yard_total: yard,
      }));

      copy[groupIndex] = {
        ...group,
        rolls: [...group.rolls, ...newRolls],
      };
      return { ...prev, itemGroups: copy };
    });
  };

  const removeRoll = (groupIndex, rollIndex) => {
    setForm((prev) => {
      const copy = [...prev.itemGroups];
      const group = copy[groupIndex];
      copy[groupIndex] = {
        ...group,
        rolls: group.rolls.filter((_, idx) => idx !== rollIndex),
      };
      return { ...prev, itemGroups: copy };
    });
  };

  const handleGroupChange = (groupIndex, field, value) => {
    setForm((prev) => {
      const copy = [...prev.itemGroups];
      copy[groupIndex][field] = value;
      return { ...prev, itemGroups: copy };
    });
  };

  const handleRollChange = (groupIndex, rollIndex, field, value) => {
    setForm((prev) => {
      const copy = [...prev.itemGroups];
      const group = copy[groupIndex];
      const newRolls = group.rolls.map((roll, idx) =>
        idx === rollIndex ? { ...roll, [field]: value } : roll
      );
      copy[groupIndex] = {
        ...group,
        rolls: newRolls,
      };
      return { ...prev, itemGroups: copy };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      type: form().type == 1 ? "domestik" : form().type == 2 ? "ekspor" : "",
      sequence_number:
        form().sequence_number === "" || form().sequence_number == null
          ? null
          : Number(form().sequence_number),
      sales_order_id: Number(form().sales_order_id),
      col: Number(form().col),
      catatan: form().catatan,
      itemGroups: form().itemGroups.map((g) => ({
        sales_order_item_id: Number(g.sales_order_item_id),
        rolls: g.rolls.map((r) => ({
          meter_total: parseFloat(r.meter_total),
          yard_total: parseFloat(r.yard_total),
        })),
      })),
    };

    try {
      if (isEdit) {
        await updateDataPackingList(user?.token, params.id, payload);
      } else {
        await createPackingList(user?.token, payload);
      }

      Swal.fire({
        icon: "success",
        title: isEdit ? "Berhasil Update" : "Berhasil Simpan",
      }).then(() => {
        navigate("/packingorder");
        localStorage.removeItem("packing_order_draft");
      });
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error?.message || "Terjadi kesalahan.",
      });
    }
  };

  const handleItemChange = (index, field, value) => {
    let processedValue = value === "" ? 0 : parseFloat(value);

    setForm(
      produce((f) => {
        f.items[index][field] = processedValue;
        f.items = [...f.items]; // trigger reactivity
      })
    );
  };

  const handlePrint = () => {
    const content = document.getElementById("print-section").innerHTML;
    const printWindow = window.open("", "", "width=800,height=600");
    printWindow.document.write(`
    <html>
      <head>
        <title>Packing Order</title>
        <style>
          body { font-family: sans-serif; font-size: 12px; padding: 20px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ccc; padding: 5px; text-align: left; }
          h1 { margin-bottom: 10px; }
        </style>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <MainLayout>
      <h1 class="text-2xl font-bold mb-4">
        {isEdit ? "Edit" : "Tambah"} Packing Order
      </h1>

      <Show when={isEdit}>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview())}
          class="mt-6 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
        >
          {showPreview() ? "Tutup Preview" : "Lihat Preview"}
        </button>
      </Show>
      <Show when={isEdit && showPreview()}>
        <div class="mt-6 border p-4 bg-white shadow">
          <h2 class="text-lg font-semibold mb-2">Preview Cetak</h2>
          <div id="print-section">
            <PackingOrderPrint data={form()} />
          </div>
          <button
            onClick={handlePrint}
            class="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Print
          </button>
        </div>
      </Show>

      <form class="space-y-4" onSubmit={handleSubmit}>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-sm mb-1">No Packing List</label>
            <input
              class="bg-gray-200 w-full border p-2 rounded"
              value={form().no_pl || ""}
              onInput={(e) => setForm({ ...form(), no_pl: e.target.value })}
              readOnly
            />
          </div>
          <div>
            <label class="block text-sm mb-1">Sales Order</label>
            <SearchableSalesOrderSelect
              salesOrders={salesOrderList}
              form={form}
              setForm={setForm}
              onChange={handleSalesOrderChange}
            />
          </div>
          <div hidden>
            <label class="block text-sm mb-1">Type</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={
                form().type === ""
                  ? ""
                  : form().type == 1
                  ? "Domestik"
                  : form().type == 2
                  ? "Ekspor"
                  : ""
              }
              readOnly
            />
          </div>
          <div>
            <label class="block text-sm mb-1">Col</label>
            <input
              class="w-full border p-2 rounded"
              type="number"
              value={form().col}
              onInput={(e) => setForm({ ...form(), col: e.target.value })}
              required
            />
          </div>
        </div>

        <div class="block gap-4">
          <div class="col-span-2">
            <label class="block text-sm mb-1">Catatan</label>
            <textarea
              class="w-full border p-2 rounded"
              value={form().catatan}
              onInput={(e) => setForm({ ...form(), catatan: e.target.value })}
            ></textarea>
          </div>
        </div>

        <div>
          <h2 class="text-lg font-bold mt-6 mb-2">Item Groups</h2>

          <button
            type="button"
            onClick={() => addItemGroup()}
            class="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 mb-4"
          >
            + Tambah Item Group
          </button>

          <For each={form().itemGroups}>
            {(group, i) => (
              <div class="border p-4 rounded mb-6">
                <div
                  class="flex justify-between items-center mb-2 cursor-pointer"
                  // onClick={() => toggleGroupOpen(i())}
                >
                  <h3 class="font-semibold">
                    Sales Order Item Group #{i() + 1}
                  </h3>
                  <div class="flex items-center gap-3">
                    {/* <span class="text-blue-600 text-sm">
                      {openStates()[i()] ? "Tutup" : "Buka"}
                    </span> */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // supaya ga ikut toggle
                        removeItemGroup(i());
                      }}
                      class="text-red-600 hover:text-red-800 text-sm"
                    >
                      <XCircle class="w-10 h-10" />
                    </button>
                  </div>
                </div>

                <Show when={!openStates()[i()]}>
                  <div class="mb-3">
                    <label class="block text-sm mb-1">
                      Sales Order Item ID
                    </label>
                    <select
                      class="w-full border p-2 rounded"
                      value={group.sales_order_item_id || ""}
                      onInput={(e) =>
                        handleGroupChange(
                          i(),
                          "sales_order_item_id",
                          e.target.value
                        )
                      }
                      required
                    >
                      <option value="">Pilih Item</option>
                      <For each={form().sales_order_items?.items || []}>
                        {(item) => (
                          <option value={item.id}>
                            {form().sales_order_items.no_so} -{" "}
                            {item.konstruksi_kain}
                          </option>
                        )}
                      </For>
                    </select>
                  </div>

                  <table class="w-full border border-gray-300 text-sm mb-3">
                    <thead class="bg-gray-100">
                      <tr>
                        <th class="border px-2 py-1">#</th>
                        <th class="border px-2 py-1">Meter Total</th>
                        <th class="border px-2 py-1">Yard Total</th>
                        <th class="border px-2 py-1">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={group.rolls}>
                        {(roll, j) => {
                          const [localMeter, setLocalMeter] = createSignal(
                            roll.meter_total || ""
                          );
                          const [localYard, setLocalYard] = createSignal(
                            roll.yard_total || ""
                          );

                          return (
                            <tr>
                              <td class="border px-2 py-1 text-center">
                                {j() + 1}
                              </td>
                              <td class="border px-2 py-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  class="w-full border p-1 rounded"
                                  value={localMeter()}
                                  onInput={(e) => {
                                    setLocalMeter(e.target.value);
                                  }}
                                  onBlur={(e) => {
                                    const val = e.target.value;
                                    handleRollChange(
                                      i(),
                                      j(),
                                      "meter_total",
                                      val
                                    );
                                    if (val !== "") {
                                      const converted = meterToYard(val);
                                      setLocalYard(converted);
                                      handleRollChange(
                                        i(),
                                        j(),
                                        "yard_total",
                                        converted
                                      );
                                    } else {
                                      setLocalYard("");
                                      handleRollChange(
                                        i(),
                                        j(),
                                        "yard_total",
                                        ""
                                      );
                                    }
                                  }}
                                />
                              </td>
                              <td class="border px-2 py-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  class="w-full border p-1 rounded"
                                  value={localYard()}
                                  onInput={(e) => {
                                    setLocalYard(e.target.value);
                                  }}
                                  onBlur={(e) => {
                                    const val = e.target.value;
                                    handleRollChange(
                                      i(),
                                      j(),
                                      "yard_total",
                                      val
                                    );
                                    if (val !== "") {
                                      const converted = yardToMeter(val);
                                      setLocalMeter(converted);
                                      handleRollChange(
                                        i(),
                                        j(),
                                        "meter_total",
                                        converted
                                      );
                                    } else {
                                      setLocalMeter("");
                                      handleRollChange(
                                        i(),
                                        j(),
                                        "meter_total",
                                        ""
                                      );
                                    }
                                  }}
                                />
                              </td>
                              <td class="border px-2 py-1 text-center">
                                <button
                                  type="button"
                                  class="text-red-600 hover:text-red-800"
                                  onClick={() => removeRoll(i(), j())}
                                >
                                  <Trash2 class="w-5 h-5" />
                                </button>
                              </td>
                            </tr>
                          );
                        }}
                      </For>
                    </tbody>
                  </table>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => addRoll(i())}
                      class="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                    >
                      + Tambah Roll
                    </button>
                  </div>
                  <div class="flex gap-2 items-center mt-2">
                    <input
                      type="number"
                      min="1"
                      class="border p-1 rounded w-24"
                      placeholder="Jumlah"
                      onInput={(e) => {
                        const val = parseInt(e.target.value);
                        setGroupRollCounts((prev) => {
                          const updated = [...prev];
                          updated[i()] = isNaN(val) ? 0 : val;
                          return updated;
                        });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const count = groupRollCounts()[i()] || 1;
                        addMultipleRolls(i(), count);
                      }}
                      class="bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700"
                    >
                      + Tambah Banyak
                    </button>
                  </div>
                </Show>
              </div>
            )}
          </For>
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
