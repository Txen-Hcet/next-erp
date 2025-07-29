import {
  createSignal,
  createEffect,
  For,
  onMount,
  Show,
  createMemo,
} from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  getAllPackingLists,
  getPackingLists,
  createDeliveryNote,
  updateDataDeliveryNote,
  getUser,
  getDeliveryNotes,
  getLastSequence,
  getAllSalesOrders,
} from "../../utils/auth";
import SuratJalanPrint from "../print_function/sell/SuratJalanPrint";
import SearchableSalesOrderSelect from "../../components/SalesOrderSearch";
import { Trash2 } from "lucide-solid";

export default function DeliveryNoteForm() {
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const navigate = useNavigate();
  const user = getUser();

  const [packingLists, setPackingLists] = createSignal([]);
  const [lastNumberSequence, setLastNumberSequence] = createSignal(null);
  const [showPreview, setShowPreview] = createSignal(false);
  const [salesOrders, setSalesOrders] = createSignal([]);
  const [todayDate] = createSignal(new Date().toISOString().slice(0, 10));

  const [form, setForm] = createSignal({
    no_sj: "",
    sequence_number: "",
    no_surat_jalan_supplier: "",
    tanggal_surat_jalan: new Date().toISOString().split("T")[0],
    catatan: "",
    itemGroups: [],
  });

  onMount(async () => {
    const pls = await getAllPackingLists(user?.token);
    setPackingLists(pls || []);

    const dataSalesOrders = await getAllSalesOrders(user?.token);
    setSalesOrders(dataSalesOrders.orders || []);

    if (isEdit) {
      const res = await getDeliveryNotes(params.id, user?.token);
      const dn = res?.response;
      if (!dn) return;

      const itemGroups = [];

      // Group items by packing_list_id
      const plGroups = {};
      (dn.items || []).forEach((it) => {
        (it.rolls || []).forEach((r) => {
          const plId = dn.packing_list_id;
          if (!plGroups[plId]) plGroups[plId] = [];
          plGroups[plId].push({
            packing_list_roll_id: r.packing_list_roll_id,
            meter: r.meter_total,
            yard: r.yard_total,
            sales_order_item_id: it.sales_order_item_id,
            konstruksi_kain: r.konstruksi_kain || "",
            checked: true,
          });
        });
      });

      for (const [plId, items] of Object.entries(plGroups)) {
        const plDetail = await getPackingLists(plId, user?.token);
        const pl = plDetail?.response;

        const typeLetter = pl?.no_pl?.split("/")?.[1] || "";
        let typeValue = "";
        if (typeLetter === "D") typeValue = "Domestik";
        else if (typeLetter === "E") typeValue = "Ekspor";

        itemGroups.push({
          packing_list_id: plId,
          no_pl: pl?.no_pl,
          type: typeValue,
          items,
        });
      }

      setForm({
        no_sj: dn.no_sj,
        sequence_number: dn.sequence_number,
        catatan: dn.catatan,
        itemGroups,
      });
    }
  });

  // const generateSJNumber = (type, sequence) => {
  //   const typeLetter = type === "Domestik" ? "D" : "E";
  //   const now = new Date();
  //   const month = String(now.getMonth() + 1).padStart(2, "0");
  //   const year = String(now.getFullYear()).slice(-2);
  //   const mmyy = `${month}${year}`;
  //   const nextNumber = String(sequence).padStart(5, "0");
  //   return `SJ/${typeLetter}/${mmyy}-${nextNumber}`;
  // };

  const generateNomorKontrak = async () => {
    const lastSeq = await getLastSequence(
      user?.token,
      "sj",
      "domestik",
      form().ppn // pastikan ini sudah ada dari salesOrder
    );

    const nextNum = String((lastSeq?.last_sequence || 0) + 1).padStart(5, "0");
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(2);
    const ppnValue = parseFloat(form().ppn) || 0;
    const type = ppnValue > 0 ? "P" : "N";
    const mmyy = `${month}${year}`;
    const nomor = `SJ/PJ/${type}/${mmyy}/${nextNum}`;
    setForm((prev) => ({
      ...prev,
      sequence_number: nomor,
      no_seq: lastSeq?.last_sequence + 1,
    }));
  };

  const addPackingListGroup = () => {
    setForm((prev) => ({
      ...prev,
      itemGroups: [
        ...prev.itemGroups,
        {
          packing_list_id: "",
          no_pl: "",
          type: "",
          items: [],
        },
      ],
    }));
  };

  const removePackingListGroup = (groupIndex) => {
    setForm((prev) => {
      const groups = [...prev.itemGroups];
      groups.splice(groupIndex, 1);
      return { ...prev, itemGroups: groups };
    });
  };

  const handlePackingListChange = async (groupIndex, plId) => {
    if (!plId) return;

    const plDetail = await getPackingLists(plId, user?.token);
    const pl = plDetail?.response;

    const typeLetter = pl?.no_pl?.split("/")?.[1] || "";
    let typeValue = "";
    if (typeLetter === "D") typeValue = "Domestik";
    else if (typeLetter === "E") typeValue = "Ekspor";

    const allRolls = [];
    (pl?.itemGroups || []).forEach((item) => {
      (item.rolls || []).forEach((roll) => {
        allRolls.push({
          packing_list_roll_id: roll.id,
          meter: roll.meter_total,
          yard: roll.yard_total,
          sales_order_item_id: item.sales_order_item_id,
          konstruksi_kain: item.konstruksi_kain,
          checked: false,
        });
      });
    });

    setForm((prev) => {
      const groups = [...prev.itemGroups];
      groups[groupIndex] = {
        packing_list_id: plId,
        no_pl: pl?.no_pl,
        type: typeValue,
        items: allRolls,
      };
      return {
        ...prev,
        itemGroups: groups,
      };
    });
  };

  const handleRollCheckedChange = (groupIndex, rollIndex, checked) => {
    setForm((prev) => {
      const groups = [...prev.itemGroups];
      groups[groupIndex].items[rollIndex].checked = checked;
      return {
        ...prev,
        itemGroups: groups,
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const allSelectedItems = [];
    for (const group of form().itemGroups) {
      for (const item of group.items) {
        if (item.checked) {
          allSelectedItems.push({
            packing_list_roll_id: Number(item.packing_list_roll_id),
            meter: parseFloat(item.meter),
            yard: parseFloat(item.yard),
          });
        }
      }
    }

    const payload = {
      no_sj: form().no_sj,
      sequence_number: form().sequence_number,
      type: form().itemGroups[0]?.type || "",
      catatan: form().catatan,
      items: allSelectedItems,
    };

    try {
      if (isEdit) {
        await updateDataDeliveryNote(user?.token, params.id, payload);
      } else {
        console.log(payload);
        await createDeliveryNote(user?.token, payload);
      }
      Swal.fire({
        icon: "success",
        title: isEdit ? "Berhasil Update" : "Berhasil Simpan",
      }).then(() => navigate("/deliverynote"));
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

      <Show when={isEdit}>
        <button
          onClick={() => setShowPreview(!showPreview())}
          class="mb-4 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
        >
          {showPreview() ? "Tutup Preview" : "Lihat Preview"}
        </button>
      </Show>

      <Show when={isEdit && showPreview()}>
        <div class="border p-4 bg-white shadow mb-4">
          <h2 class="text-lg font-semibold mb-2">Preview Cetak</h2>
          <div id="print-section">
            <SuratJalanPrint
              data={{
                ...form(),
                items: form().itemGroups.flatMap((g) =>
                  g.items.filter((r) => r.checked)
                ),
              }}
            />
          </div>
          <button
            onClick={() => {
              const content =
                document.getElementById("print-section").innerHTML;
              const printWindow = window.open("", "", "width=800,height=600");
              printWindow.document.write(`
                <html>
                  <head>
                    <title>Surat Jalan</title>
                    <style>
                      body { font-family: sans-serif; font-size: 12px; padding: 20px; }
                      table { border-collapse: collapse; width: 100%; }
                      th, td { border: 1px solid #ccc; padding: 5px; text-align: left; }
                    </style>
                  </head>
                  <body>${content}</body>
                </html>
              `);
              printWindow.document.close();
              printWindow.focus();
              printWindow.print();
              printWindow.close();
            }}
            class="mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Print
          </button>
        </div>
      </Show>

      <form onSubmit={handleSubmit} class="space-y-4">
        <SearchableSalesOrderSelect
          salesOrders={salesOrders}
          form={form}
          setForm={setForm}
          onChange={(so) => {
            // Isi nilai PPN dari Sales Order yang dipilih ke form
            setForm((prev) => ({
              ...prev,
              ppn: so.ppn, // pastikan Sales Order punya property `ppn`
            }));
            getAllPackingLists(user?.token).then((pls) => {
              const filtered = pls?.filter((pl) => pl.sales_order_id === so.id);
              setPackingLists(filtered || []);
              if (!filtered || filtered.length === 0) {
                Swal.fire({
                  icon: "info",
                  title: "Tidak ada packing list",
                  text: "Sales order ini belum memiliki packing list.",
                });
              }
            });
          }}
        />

        {form().sales_contract_id && (
          <div class="w-full grid grid-cols-3 gap-4">
            <div class="w-full mt-4">
              <label class="text-sm font-medium">No. Surat Jalan</label>
              <div class="flex gap-2">
                <input
                  type="text"
                  value={form().sequence_number || ""}
                  class="w-full border p-2 rounded bg-gray-100"
                  readonly
                />
                <button
                  type="button"
                  class="bg-gray-300 text-sm px-2 rounded hover:bg-gray-400"
                  onClick={generateNomorKontrak}
                >
                  Generate
                </button>
              </div>
            </div>

            <div class="w-full mt-4">
              <label class="text-sm font-medium">
                No. Surat Jalan Supplier
              </label>
              <input
                type="text"
                class="w-full border p-2 rounded"
                value={form().no_surat_jalan_supplier || ""}
                onInput={(e) =>
                  setForm({
                    ...form(),
                    no_surat_jalan_supplier: e.target.value,
                  })
                }
              />
            </div>

            <div class="w-full mt-4">
              <label class="text-sm font-medium">Tanggal Surat Jalan</label>
              <input
                type="date"
                class="w-full border p-2 rounded bg-gray-100"
                value={new Date().toISOString().split("T")[0]}
                disabled
              />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => addPackingListGroup()}
          class="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 mb-4"
          disabled={!form().sales_contract_id}
        >
          + Tambah Packing List
        </button>

        <For each={form().itemGroups}>
          {(group, groupIndex) => {
            return (
              <div class="border p-4 mb-4 rounded">
                <div class="mb-2 flex justify-between items-center">
                  <h3 class="font-semibold text-lg">
                    {group.no_pl || `Packing List #${groupIndex() + 1}`}
                  </h3>
                  <button
                    type="button"
                    class="text-red-600 hover:text-red-800 text-sm"
                    onClick={() => removePackingListGroup(groupIndex())}
                  >
                    <Trash2 size={25} />
                  </button>
                </div>

                <select
                  class="w-full border p-2 rounded mb-4"
                  value={group.packing_list_id}
                  onInput={(e) =>
                    handlePackingListChange(groupIndex(), e.target.value)
                  }
                  disabled={isEdit}
                >
                  <option value="">Pilih Packing List</option>
                  <For each={packingLists()}>
                    {(pl) => <option value={pl.id}>{pl.no_pl}</option>}
                  </For>
                </select>

                <Show when={group.items?.length}>
                  <table class="w-full border border-gray-300 text-sm mb-3">
                    <thead class="bg-gray-100">
                      <tr>
                        <th class="border px-2 py-1">#</th>
                        <th class="border px-2 py-1">Konstruksi Kain</th>
                        <th class="border px-2 py-1">Meter</th>
                        <th class="border px-2 py-1">Yard</th>
                        <th class="border px-2 py-1">Pilih</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={group.items}>
                        {(roll, rollIndex) => (
                          <tr>
                            <td class="border px-2 py-1 text-center">
                              {rollIndex() + 1}
                            </td>
                            <td class="border px-2 py-1">
                              {roll.konstruksi_kain}
                            </td>
                            <td class="border px-2 py-1 text-right">
                              {roll.meter}
                            </td>
                            <td class="border px-2 py-1 text-right">
                              {roll.yard}
                            </td>
                            <td class="border px-2 py-1 text-center">
                              <input
                                type="checkbox"
                                checked={roll.checked}
                                onChange={(e) =>
                                  handleRollCheckedChange(
                                    groupIndex(),
                                    rollIndex(),
                                    e.target.checked
                                  )
                                }
                              />
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>

                  {/* TOTAL */}
                  <div class="border-t pt-4 mt-4">
                    <div class="text-right font-semibold text-sm">
                      Total Keseluruhan:
                    </div>
                    <table class="ml-auto text-sm mt-1 border border-gray-300">
                      <thead class="bg-gray-100">
                        <tr>
                          <th class="px-4 py-2 border">Total Meter</th>
                          <th class="px-4 py-2 border">Total Yard</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td class="px-4 py-2 border text-right">
                            {form()
                              .itemGroups?.reduce((sum, group) => {
                                return (
                                  sum +
                                  group.items?.reduce((s, item) => {
                                    return (
                                      s +
                                      (item.checked
                                        ? parseFloat(item.meter || 0)
                                        : 0)
                                    );
                                  }, 0)
                                );
                              }, 0)
                              ?.toFixed(2)}
                          </td>
                          <td class="px-4 py-2 border text-right">
                            {form()
                              .itemGroups?.reduce((sum, group) => {
                                return (
                                  sum +
                                  group.items?.reduce((s, item) => {
                                    return (
                                      s +
                                      (item.checked
                                        ? parseFloat(item.yard || 0)
                                        : 0)
                                    );
                                  }, 0)
                                );
                              }, 0)
                              ?.toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Show>
              </div>
            );
          }}
        </For>

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
