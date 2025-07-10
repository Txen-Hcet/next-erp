import { createEffect, createSignal, For, onMount } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  createPackingOrder,
  getPackingOrders,
  getAllFabrics,
  getAllColors,
  getAllCustomers,
  updateDataPackingOrder,
  getUser,
  getAllSalesOrders,
  getLastPackingOrder,
} from "../../utils/auth";
import SearchableCustomerSelect from "../../components/CustomerDropdownSearch";
import { Trash2 } from "lucide-solid";

export default function PurchaseOrderForm() {
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const navigate = useNavigate();
  const user = getUser();

  const [fabricOptions, setFabricOptions] = createSignal([]);
  const [colorOptions, setColorOptions] = createSignal([]);
  const [customersList, setCustomersList] = createSignal([]);
  const [salesOrderList, setSalesOrderList] = createSignal([]);
  const [openStates, setOpenStates] = createSignal([]);

  const [form, setForm] = createSignal({
    type: "",
    sequence_number: "",
    sales_order_id: "",
    col: "",
    catatan: "",
    itemGroups: [],
  });

  // Load dropdowns on mount
  createEffect(async () => {
    const fabrics = await getAllFabrics(user?.token);
    const colors = await getAllColors(user?.token);
    const customers = await getAllCustomers(user?.token);
    const salesOrders = await getAllSalesOrders(user?.token);
    const getPackingOrderNumber = getLastPackingOrder(user?.token);
    const currentForm = form();

    console.log(getPackingOrderNumber);

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
    setSalesOrderList(salesOrders?.data || []);

    localStorage.setItem("packing_order_draft", JSON.stringify(form()));
  });

  onMount(async () => {
    const draft = localStorage.getItem("packing_order_draft");
    if (draft && !isEdit) {
      setForm(JSON.parse(draft));
    }

    if (isEdit) {
      const res = await getPackingOrders(params.id, user?.token);
      const packingOrder = res?.response;
      if (!packingOrder) return;

      const normalizedItems = (packingOrder.itemGroups || []).map(
        (group, idx) => ({
          id: idx + 1,
          sales_order_item_id: group.sales_order_item_id,
          rolls: group.rolls.map((r) => ({
            meter_total: r.meter_total,
            yard_total: r.yard_total,
          })),
        })
      );

      setForm({
        type: packingOrder.type,
        sequence_number: packingOrder.sequence_number,
        sales_order_id: packingOrder.sales_order_id,
        col: packingOrder.col,
        catatan: packingOrder.catatan,
        itemGroups: normalizedItems,
      });
    }
  });

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
    setOpenStates((prev) => [...prev, false]); // default closed
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
  };

  const addRoll = (groupIndex) => {
    setForm((prev) => {
      const copy = [...prev.itemGroups];
      const group = copy[groupIndex];
      copy[groupIndex] = {
        ...group,
        rolls: [
          ...group.rolls,
          {
            meter_total: "",
            yard_total: "",
          },
        ],
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
      ...form(),
      sequence_number: Number(form().sequence_number),
      sales_order_id: Number(form().sales_order_id),
      col: Number(form().col),
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
        await updateDataPackingOrder(user?.token, params.id, payload);
      } else {
        await createPackingOrder(user?.token, payload);
      }

      Swal.fire({
        icon: "success",
        title: isEdit ? "Berhasil Update" : "Berhasil Simpan",
      }).then(() => {
        navigate("/packingorders");
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

  return (
    <MainLayout>
      <h1 class="text-2xl font-bold mb-4">
        {isEdit ? "Edit" : "Tambah"} Surat Jalan
      </h1>

      <form class="space-y-4" onSubmit={handleSubmit}>
        <div class="grid grid-cols-4 gap-4">
          <div>
            <label class="block text-sm mb-1">Tipe</label>
            <select
              class="w-full border p-2 rounded"
              value={form().type}
              onChange={(e) => setForm({ ...form(), type: e.target.value })}
              required
            >
              <option value="">Pilih Tipe</option>
              <option value="domestik">Domestik</option>
              <option value="ekspor">Ekspor</option>
            </select>
          </div>
          <div>
            <label class="block text-sm mb-1">Sequence Number</label>
            <input
              class="w-full border p-2 rounded"
              value={form().sequence_number}
              onInput={(e) =>
                setForm({ ...form(), sequence_number: e.target.value })
              }
              required
            />
          </div>
          <div>
            <label class="block text-sm mb-1">Sales Order</label>
            <select
              class="w-full border p-2 rounded"
              value={form().sales_order_id}
              onChange={(e) =>
                setForm({ ...form(), sales_order_id: e.target.value })
              }
              required
            >
              <option value="">Pilih Sales Order</option>
              {salesOrderList().map((so) => (
                <option value={so.id}>{so.no_so}</option>
              ))}
            </select>
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
                      Hapus Group
                    </button>
                  </div>
                </div>

                <Show when={!openStates()[i()]}>
                  <div class="mb-3">
                    <label class="block text-sm mb-1">
                      Sales Order Item ID
                    </label>
                    <input
                      type="number"
                      class="w-full border p-2 rounded"
                      value={group.sales_order_item_id}
                      onInput={(e) =>
                        handleGroupChange(
                          i(),
                          "sales_order_item_id",
                          e.target.value
                        )
                      }
                      required
                    />
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
                        {(roll, j) => (
                          <tr>
                            <td class="border px-2 py-1 text-center">
                              {j() + 1}
                            </td>
                            <td class="border px-2 py-1">
                              <input
                                type="number"
                                step="0.01"
                                class="w-full border p-1 rounded"
                                value={roll.meter_total}
                                onInput={(e) =>
                                  handleRollChange(
                                    i(),
                                    j(),
                                    "meter_total",
                                    e.target.value
                                  )
                                }
                                onBlur={() => {
                                  const meterVal =
                                    form().itemGroups[i()].rolls[j()]
                                      .meter_total;
                                  if (meterVal !== "") {
                                    const converted = meterToYard(meterVal);
                                    handleRollChange(
                                      i(),
                                      j(),
                                      "yard_total",
                                      converted
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
                                value={roll.yard_total}
                                onInput={(e) =>
                                  handleRollChange(
                                    i(),
                                    j(),
                                    "yard_total",
                                    e.target.value
                                  )
                                }
                                onBlur={() => {
                                  const yardVal =
                                    form().itemGroups[i()].rolls[j()]
                                      .yard_total;
                                  if (yardVal !== "") {
                                    const converted = yardToMeter(yardVal);
                                    handleRollChange(
                                      i(),
                                      j(),
                                      "meter_total",
                                      converted
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
                                Hapus
                              </button>
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>

                  <button
                    type="button"
                    onClick={() => addRoll(i())}
                    class="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                  >
                    + Tambah Roll
                  </button>
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
