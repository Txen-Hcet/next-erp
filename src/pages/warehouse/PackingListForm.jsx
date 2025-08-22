import { createEffect, createSignal, For, onMount, Show } from "solid-js";
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
  getLastSequence,
  getSalesOrders,
} from "../../utils/auth";
import SearchableSalesOrderSelect from "../../components/SalesOrderSearch";
import { Printer, Trash2, XCircle } from "lucide-solid";

// (2) Component Start
export default function PackingListForm() {
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const navigate = useNavigate();
  const user = getUser();

  const [salesOrderList, setSalesOrderList] = createSignal([]);
  const [openStates, setOpenStates] = createSignal([]);
  const [groupRollCounts, setGroupRollCounts] = createSignal([]);
  const [loading, setLoading] = createSignal(true);

  const [form, setForm] = createSignal({
    type: "",
    no_pl: "",
    sequence_number: "",
    sales_order_id: "",
    col: "",
    keterangan: "",
    itemGroups: [],
    sales_order_items: [],
  });

  // (3) onMount untuk edit atau new
  onMount(async () => {
    setLoading(true);
    const salesOrders = await getAllSalesOrders(user?.token);
    setSalesOrderList(salesOrders?.orders || []);

    if (isEdit) {
      const res = await getPackingLists(params.id, user?.token);
      const packingList = res?.order;
      if (!packingList) return;

      const MAX_COL_PER_ROW = 5;

      await handleSalesOrderChange(packingList.so_id);

      setForm((prev) => ({
        ...prev,
        sales_order_id: packingList.so_id,
        no_pl: packingList.no_pl,
        sequence_number: packingList.sequence_number,
        type:
          packingList.type === "domestik"
            ? 1
            : packingList.type === "ekspor"
            ? 2
            : "",
        keterangan: packingList.keterangan || "",
        itemGroups: (packingList.items || []).map((group) => {
          const rolls = (group.rolls || []).map((r, idx) => ({
            id: idx + 1,
            row_num: Math.floor(idx / MAX_COL_PER_ROW) + 1,
            col_num: (idx % MAX_COL_PER_ROW) + 1,
            col: r.col || group.col || "",
            item: r.so_item_id || group.so_item_id || "",
            meter: r.meter || "",
            yard: r.yard || ((r.meter || 0) * 1.093613).toFixed(2),
            kilogram: r.kilogram || null,
          }));

          return {
            item: group.so_item_id || [],
            col: group.col || "",
            meter_total: group.meter_total || 0,
            yard_total: group.yard_total || 0,
            kilogram_total: group.kilogram_total || null,
            rolls,
          };
        }),
      }));
    }
    setLoading(false);
  });

  const formatNumber = (num, decimals = 2) => {
    if (num === "" || num === null || num === undefined) return "";

    const numValue = Number(num);
    
    if (isNaN(numValue)) return "";
    
    if (numValue === 0) return "0";

    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(numValue);
  };

  // Fungsi untuk mengubah string format kembali menjadi angka
  const parseNumber = (str) => {
    if (typeof str !== 'string' || !str) return 0;
    const cleaned = str.replace(/[^\d,]/g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  // (4) Saat Sales Order berubah
  const handleSalesOrderChange = async (selectedSO) => {
    if (!selectedSO) return;

    if (isEdit) {
      const res = await getSalesOrders(selectedSO, user?.token);
      const selectedOrder = res?.order;

      setForm({
        ...form(),
        sales_order_items: selectedOrder,
      });
    } else {
      const res = await getSalesOrders(selectedSO.id, user?.token);
      const selectedOrder = res?.order;

      const soTypeLetter = selectedSO.no_so.split("/")[1];
      const typeValue =
        soTypeLetter === "E" ? "E" : soTypeLetter === "D" ? "D" : "";
      const soPpn = selectedSO.no_so.split("/")[2];
      const ppnValue = soPpn === "P" ? 1 : 0;

      const generatedNoPL = await generatePackingListNumber(
        typeValue,
        ppnValue
      );

      setForm({
        ...form(),
        sales_order_id: selectedSO.id,
        type: typeValue,
        no_pl: generatedNoPL,
        sales_order_items: selectedOrder,
      });
    }
  };

  const generatePackingListNumber = async (type, ppn) => {
    const salesType = type === "D" ? "domestik" : type === "E" ? "ekspor" : "";
    const ppnType = ppn === 1 ? "P" : "N";
    const lastSeq = await getLastSequence(user?.token, "pl", salesType, ppn);

    const now = new Date();
    const mmyy = `${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getFullYear()
    ).slice(-2)}`;
    const nextNum = String((lastSeq?.last_sequence || 0) + 1).padStart(5, "0");

    setForm({
      ...form(),
      sequence_number: (lastSeq?.last_sequence || 0) + 1,
    });

    return `PL/${type}/${ppnType}/${mmyy}-${nextNum}`;
  };

  const addItemGroup = () => {
    setForm((prev) => ({
      ...prev,
      itemGroups: [
        ...prev.itemGroups,
        {
          sales_order_item_id: "",
          col: "", // col untuk group
          meter_total: 0,
          yard_total: 0,
          kilogram_total: null,
          rolls: [
            {
              row_num: 1,
              col_num: 1,
              col: "",
              item: "",
              meter: "",
              yard: "",
            },
          ],
        },
      ],
    }));
    setOpenStates((prev) => [...prev, false]);
    setGroupRollCounts((prev) => [...prev, 0]);
  };

  const removeItemGroup = (index) => {
    setForm((prev) => {
      const updated = [...prev.itemGroups];
      updated.splice(index, 1);
      return { ...prev, itemGroups: updated };
    });
    setOpenStates((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
    setGroupRollCounts((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  const reindexRolls = (rolls) => {
    return rolls.map((roll, index) => {
      const meterValue = parseFloat(roll.meter || 0);
      return {
        ...roll,
        row_num: Math.floor(index / 5) + 1,
        col_num: (index % 5) + 1,
        yard: (meterValue * 1.093613).toFixed(2),
        kilogram: roll.kilogram || null,
      };
    });
  };

  const addRoll = (groupIndex) => {
    setForm((prev) => {
      const copy = [...prev.itemGroups];
      const rolls = [
        ...copy[groupIndex].rolls,
        { meter: "", yard: "", kilogram: null },
      ];
      copy[groupIndex].rolls = reindexRolls(rolls);
      copy[groupIndex].meter_total = rolls.reduce(
        (sum, r) => sum + Number(r.meter || 0),
        0
      );
      copy[groupIndex].yard_total = parseFloat(
        (copy[groupIndex].meter_total * 1.093613).toFixed(2)
      );
      return { ...prev, itemGroups: copy };
    });
  };

  const addMultipleRolls = (groupIndex, count) => {
    setForm((prev) => {
      const copy = [...prev.itemGroups];
      const group = copy[groupIndex];

      const lastRoll = group.rolls[group.rolls.length - 1] || {
        col: "",
        item: "",
        meter: "",
        yard: "",
      };

      const newRolls = Array.from({ length: count }, () => ({
        col: lastRoll.col || "",
        item: lastRoll.item || "",
        meter: lastRoll.meter || "",
        yard: lastRoll.yard || "",
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

      if (!group || !Array.isArray(group.rolls)) return prev;

      const updatedRolls = [...group.rolls];
      updatedRolls.splice(rollIndex, 1);

      copy[groupIndex] = { ...group, rolls: updatedRolls };

      return { ...prev, itemGroups: copy };
    });
  };

  // const handleGroupChange = (groupIndex, field, value) => {
  //   setForm((prev) => {
  //     const copy = [...prev.itemGroups];
  //     copy[groupIndex][field] = value;
  //     return { ...prev, itemGroups: copy };
  //   });
  // };

  const handleRollChange = (groupIndex, rollIndex, field, value) => {
    setForm((prev) => {
      const newGroups = [...prev.itemGroups];
      const targetGroup = { ...newGroups[groupIndex] };
      const newRolls = [...targetGroup.rolls];
      const updatedRoll = { ...newRolls[rollIndex] };

      if (field === "meter") {
        const meterValue = parseNumber(value);
        updatedRoll.meter = meterValue;
        updatedRoll.yard = meterValue * 1.093613; 
      } else {
        updatedRoll[field] = value;
      }

      newRolls[rollIndex] = updatedRoll;

      targetGroup.meter_total = newRolls.reduce(
        (sum, r) => sum + Number(r.meter || 0),
        0
      );
      targetGroup.yard_total = targetGroup.meter_total * 1.093613;
      
      targetGroup.rolls = newRolls;
      newGroups[groupIndex] = targetGroup;

      return { ...prev, itemGroups: newGroups };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // {
    //     "type": "domestik",
    //     "sequence_number": 1,
    //     "so_id": 22,
    //     "keterangan": "Init",
    //     "items": [
    //     {
    //         "so_item_id": 17,
    //         "col": 3,
    //         "meter_total": 50,
    //         "yard_total": 60,
    //         "kilogram_total": null,
    //         "rolls" : [
    //         {
    //             "row_num": 1,
    //             "col_num": 1,
    //             "meter": 10,
    //             "yard": 12,
    //             "kilogram": null
    //         },
    //       ]
    //     }
    //   ]
    // }

    const MAX_COL_PER_ROW = 5; // jumlah col per row

    try {
      if (isEdit) {
        const payload = {
          // type: form().type === 1 ? "domestik" : "ekspor",
          // sequence_number: form().sequence_number || null,
          no_pl: form().no_pl,
          so_id: Number(form().sales_order_id),
          keterangan: form().keterangan,
          items: form().itemGroups.map((g) => {
            const rollsWithIndex = g.rolls.map((r, idx) => {
              const row_num = Math.floor(idx / MAX_COL_PER_ROW) + 1;
              const col_num = (idx % MAX_COL_PER_ROW) + 1;

              return {
                id: r.id,
                row_num,
                col_num,
                meter: Number(r.meter) || 0,
                yard: parseFloat(r.yard) || (Number(r.meter) || 0) * 1.093613,
                kilogram: r.kilogram ? Number(r.kilogram) : null,
              };
            });

            const meter_total = rollsWithIndex.reduce(
              (sum, r) => sum + r.meter,
              0
            );
            const yard_total = rollsWithIndex.reduce(
              (sum, r) => sum + r.yard,
              0
            );
            const kilogram_total =
              rollsWithIndex.reduce((sum, r) => sum + (r.kilogram || 0), 0) ||
              null; // biar null kalau totalnya 0

            return {
              so_item_id: Number(g.item || g.rolls[0]?.item || 0),
              col: Number(g.col || g.rolls[0]?.col || 0),
              meter_total,
              yard_total,
              kilogram_total,
              rolls: rollsWithIndex,
            };
          }),
        };

        await updateDataPackingList(user?.token, params.id, payload);
      } else {
        const payload = {
          type:
            form().type === "D"
              ? "domestik"
              : form().type === "E"
              ? "ekspor"
              : "",
          sequence_number: form().sequence_number || null,
          so_id: Number(form().sales_order_id),
          keterangan: form().keterangan,
          items: form().itemGroups.map((g) => {
            const rollsWithIndex = g.rolls.map((r, idx) => {
              const row_num = Math.floor(idx / MAX_COL_PER_ROW) + 1;
              const col_num = (idx % MAX_COL_PER_ROW) + 1;

              return {
                row_num,
                col_num,
                meter: Number(r.meter) || 0,
                yard: parseFloat(r.yard) || (Number(r.meter) || 0) * 1.093613,
                kilogram: r.kilogram ? Number(r.kilogram) : null,
              };
            });

            const meter_total = rollsWithIndex.reduce(
              (sum, r) => sum + r.meter,
              0
            );
            const yard_total = rollsWithIndex.reduce(
              (sum, r) => sum + r.yard,
              0
            );
            const kilogram_total =
              rollsWithIndex.reduce((sum, r) => sum + (r.kilogram || 0), 0) ||
              null; // biar null kalau totalnya 0

            return {
              so_item_id: Number(g.item || g.rolls[0]?.item || 0),
              col: Number(g.col || g.rolls[0]?.col || 0),
              meter_total,
              yard_total,
              kilogram_total,
              rolls: rollsWithIndex,
            };
          }),
        };

        await createPackingList(user?.token, payload);
      }

      Swal.fire({
        icon: "success",
        title: isEdit ? "Berhasil Update" : "Berhasil Simpan",
      }).then(() => {
        navigate("/packinglist");
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error?.message || "Terjadi kesalahan saat menyimpan.",
      });
    }
  };

  const chunkArrayWithIndex = (arr, size) => {
    return arr
      .map((roll, index) => ({ roll, index }))
      .reduce((chunks, current, idx) => {
        const chunkIndex = Math.floor(idx / size);
        if (!chunks[chunkIndex]) chunks[chunkIndex] = [];
        chunks[chunkIndex].push(current);
        return chunks;
      }, []);
  };

  function handlePrint() {
    localStorage.setItem("printData", JSON.stringify(form()));
    window.open("/print/packinglist", "_blank");
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
        {isEdit ? "Edit" : "Tambah"} Packing List
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
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm mb-1">No Packing List</label>
            <div class="flex gap-2">
              <input
                class="w-full border bg-gray-200 p-2 rounded"
                value={form().no_pl}
                readOnly
              />
              {/* <button
                type="button"
                class="bg-gray-300 text-sm px-2 rounded hover:bg-gray-400"
                onClick={generateNomorPL}
                hidden={isEdit}
              >
                Generate
              </button> */}
            </div>
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
          {/* <div>
            <label class="block text-sm mb-1">Col</label>
            <input
              class="w-full border p-2 rounded"
              type="number"
              value={form().col}
              onInput={(e) => setForm({ ...form(), col: e.target.value })}
              required
            />
          </div> */}
        </div>

        <div class="block gap-4">
          <div class="col-span-2">
            <label class="block text-sm mb-1">Keterangan</label>
            <textarea
              class="w-full border p-2 rounded"
              value={form().keterangan}
              onInput={(e) =>
                setForm({ ...form(), keterangan: e.target.value })
              }
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
                    {/* <select
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
                    </select> */}
                  </div>

                  <table class="w-full border text-sm mt-2">
                    <thead class="bg-gray-100">
                      <tr>
                        <th class="border px-2 py-1 w-10">No</th>
                        <th class="border px-2 py-1 w-20">Col</th>
                        <th class="border px-2 py-1 w-32">Item</th>
                        <For each={[1, 2, 3, 4, 5]}>
                          {(n) => (
                            <th class="border px-2 py-1 w-16 text-center">
                              {n}
                            </th>
                          )}
                        </For>
                        <th class="border px-2 py-1 w-14">TTL/PCS</th>
                        <th class="border px-2 py-1 w-24">TTL/MTR</th>
                        <th class="border px-2 py-1 w-24">TTL/YARD</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={chunkArrayWithIndex(group.rolls, 5)}>
                        {(rollChunk, chunkIndex) =>
                          rollChunk.length > 0 && (
                            <tr>
                              <td class="border text-center align-top">
                                {chunkIndex() === 0 ? i() + 1 : ""}
                              </td>
                              <td class="border p-1 align-top">
                                {chunkIndex() === 0 ? (
                                  <input
                                    class="border p-1 rounded w-full"
                                    value={rollChunk[0]?.roll.col || ""}
                                    onInput={(e) =>
                                      handleRollChange(
                                        i(),
                                        rollChunk[0].index,
                                        "col",
                                        e.target.value
                                      )
                                    }
                                  />
                                ) : (
                                  ""
                                )}
                              </td>
                              <td class="border p-1 align-top">
                                {chunkIndex() === 0 ? (
                                  <select
                                    class="w-full border rounded p-1"
                                    value={rollChunk[0]?.roll.item || ""}
                                    onInput={(e) =>
                                      handleRollChange(
                                        i(),
                                        rollChunk[0].index,
                                        "item",
                                        e.target.value
                                      )
                                    }
                                  >
                                    <option value="">Pilih Item</option>
                                    <For
                                      each={
                                        form().sales_order_items?.items || []
                                      }
                                    >
                                      {(item) => (
                                        <option value={item.id}>
                                          {item.corak_kain} |{" "}
                                          {item.konstruksi_kain}
                                        </option>
                                      )}
                                    </For>
                                  </select>
                                ) : (
                                  ""
                                )}
                              </td>

                              <td class="border p-1 align-top" colspan={5}>
                                <div class="grid grid-cols-5 gap-1">
                                  <For each={rollChunk}>
                                    {(r) => (
                                      <div class="flex flex-row">
                                        <input
                                          type="text"
                                          inputmode="decimal"
                                          class="border p-1 text-right text-xs pr-2 w-full"
                                          value={formatNumber(r.roll.meter || "")}
                                          onBlur={(e) =>
                                            handleRollChange(i(), r.index, "meter", e.target.value)
                                          }
                                        />
                                        <button
                                          type="button"
                                          class="top-0 right-0 text-white bg-red-500 border-t border-r border-b border-black rounded-r-sm text-xs px-1"
                                          onClick={() =>
                                            removeRoll(i(), r.index)
                                          }
                                        >
                                          <Trash2 size={15} />
                                        </button>
                                      </div>
                                    )}
                                  </For>
                                </div>
                              </td>

                              <td class="border text-center align-top">
                                {rollChunk.length}
                              </td>
                              <td class="border text-right px-2 align-top">
                                  {formatNumber(rollChunk.reduce((sum, r) => sum + Number(r.roll.meter || 0),0))}
                              </td>
                              <td class="border text-right px-2 align-top">
                                  {formatNumber(rollChunk.reduce((sum, r) => sum + Number(r.roll.meter || 0),0) * 1.093613)}
                              </td>
                            </tr>
                          )
                        }
                      </For>

                      <tr>
                        <td
                          colspan={8}
                          class="border px-2 py-1 font-semibold text-left"
                        >
                          Sub Total
                        </td>
                        <td class="border px-2 py-1 text-right">
                          {group.rolls.length}
                        </td>
                        <td class="border px-2 py-1 text-right">
                          {formatNumber(group.rolls.reduce((sum, r) => sum + Number(r.meter || 0), 0))} m
                        </td>
                        <td class="border px-2 py-1 text-right">
                          {formatNumber(group.rolls.reduce((sum, r) => sum + Number(r.meter || 0), 0) * 1.093613)} yd
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div class="mt-4 flex flex-wrap gap-2 items-center">
                    {/* <button
                      type="button"
                      onClick={() => addRoll(i())}
                      class="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                      disabled={group.rolls.length >= 50}
                    >
                      + Tambah Roll
                    </button> */}

                    <input
                      type="number"
                      min="1"
                      max={50 - group.rolls.length}
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
                      disabled={group.rolls.length >= 50}
                    />

                    <button
                      type="button"
                      onClick={() => {
                        const count = groupRollCounts()[i()] || 1;
                        if (group.rolls.length + count <= 50) {
                          addMultipleRolls(i(), count);
                        } else {
                          Swal.fire("Max 50 roll per group!");
                        }
                      }}
                      class="bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700"
                      disabled={group.rolls.length >= 50}
                    >
                      + Tambah
                    </button>
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>

        <Show when={form().itemGroups.length > 0}>
          <div class="mt-6 border rounded">
            <table class="w-full border text-sm">
              <thead class="bg-gray-200">
                <tr>
                  <th
                    class="border px-2 py-1 text-left"
                    colspan="8"
                    style="width: 68%"
                  >
                    Total
                  </th>
                  <th class="border px-2 py-1 text-right w-16">
                    {form().itemGroups.reduce(
                      (acc, g) => acc + g.rolls.length,
                      0
                    )}
                  </th>
                  <th class="border px-2 py-1 text-right w-24">
                      {formatNumber(form().itemGroups.flatMap(g => g.rolls).reduce((sum, r) => sum + Number(r.meter || 0), 0))} m
                  </th>
                  <th class="border px-2 py-1 text-right w-24">
                      {formatNumber(form().itemGroups.flatMap(g => g.rolls).reduce((sum, r) => sum + Number(r.meter || 0), 0) * 1.093613)} yd
                  </th>
                </tr>
              </thead>
            </table>
          </div>
        </Show>

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
