import { createSignal, createEffect, For, onMount, Show } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  getAllPackingOrders,
  getPackingOrders,
  createDeliveryNote,
  updateDataDeliveryNote,
  getLastDeliveryNote,
  getUser,
  getDeliveryNotes,
} from "../../utils/auth";
import SuratJalanPrint from "../print_function/SuratJalanPrint";

export default function DeliveryNoteForm() {
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const navigate = useNavigate();
  const user = getUser();

  const [packingLists, setPackingLists] = createSignal([]);
  const [selectedPackingList, setSelectedPackingList] = createSignal(null);
  const [selectedPackingListItems, setSelectedPackingListItems] = createSignal(
    []
  );
  const [lastNumberSequence, setLastNumberSequence] = createSignal(null);
  const [showPreview, setShowPreview] = createSignal(false);

  const [form, setForm] = createSignal({
    no_sj: "",
    sequence_number: "",
    packing_list_id: "",
    type: "",
    catatan: "",
    items: [],
  });

  onMount(async () => {
    const pls = await getAllPackingOrders(user?.token);
    setPackingLists(pls || []);

    const lastSeq = await getLastDeliveryNote(user?.token);
    setLastNumberSequence(lastSeq?.last_sequence || 0);

    if (isEdit) {
      const res = await getDeliveryNotes(params.id, user?.token);
      const dn = res?.response;
      if (!dn) return;

      const plDetail = await getPackingOrders(dn.packing_list_id, user?.token);
      setSelectedPackingListItems(plDetail?.response?.sales_order_items || []);

      setForm({
        no_sj: dn.no_sj,
        sequence_number: dn.sequence_number,
        packing_list_id: dn.packing_list_id,
        type: dn.type,
        catatan: dn.catatan,
        items: dn.items.map((it) => ({
          packing_order_item_id: it.packing_order_item_id,
          rolls: it.rolls.map((r) => ({
            meter_total: r.meter_total,
            yard_total: r.yard_total,
          })),
        })),
      });
    }
  });

  const generateSJNumber = (type, sequence) => {
    const typeLetter = type === "Domestik" ? "D" : "E";
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(-2);
    const mmyy = `${month}${year}`;
    const nextNumber = String(sequence).padStart(5, "0");
    return `SJ/${typeLetter}/${mmyy}-${nextNumber}`;
  };

  const handlePackingListChange = async (plId) => {
    if (!plId) return;

    const plDetail = await getPackingOrders(plId, user?.token);
    const pl = plDetail?.response;

    const typeLetter = pl?.no_pl?.split("/")?.[1] || "";
    let typeValue = "";
    if (typeLetter === "D") {
      typeValue = 1;
    } else if (typeLetter === "E") {
      typeValue = 2;
    }

    const nextSeq = (lastNumberSequence() || 0) + 1;
    const noSJ = generateSJNumber(
      typeValue === 1 ? "Domestik" : "Ekspor",
      nextSeq
    );

    // ⬇️ flatten rolls into array
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

    setForm({
      ...form(),
      packing_list_id: plId,
      type: typeValue === 1 ? "Domestik" : "Ekspor",
      no_sj: noSJ,
      sequence_number: nextSeq,
      items: allRolls,
      catatan: "",
    });

    setSelectedPackingList(pl);
  };

  const addItemGroup = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          packing_order_item_id: "",
          rolls: [{ meter_total: "", yard_total: "" }],
        },
      ],
    }));
  };

  const removeItemGroup = (idx) => {
    setForm((prev) => {
      const items = [...prev.items];
      items.splice(idx, 1);
      return { ...prev, items };
    });
  };

  const addRoll = (groupIndex) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[groupIndex].rolls.push({
        meter_total: "",
        yard_total: "",
      });
      return { ...prev, items };
    });
  };

  const removeRoll = (groupIndex, rollIndex) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[groupIndex].rolls.splice(rollIndex, 1);
      return { ...prev, items };
    });
  };

  const handleGroupChange = (groupIndex, field, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[groupIndex][field] = value;
      return { ...prev, items };
    });
  };

  const handleRollChange = (groupIndex, rollIndex, field, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[groupIndex].rolls[rollIndex][field] = value;
      return { ...prev, items };
    });
  };

  const meterToYard = (m) => {
    if (!m || isNaN(m)) return "";
    return (parseFloat(m) * 1.093613).toFixed(2);
  };

  const yardToMeter = (y) => {
    if (!y || isNaN(y)) return "";
    return (parseFloat(y) * 0.9144).toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const selectedItems = form().items.filter((r) => r.checked);

    const payload = {
      no_sj: form().no_sj,
      sequence_number: form().sequence_number,
      packing_list_id: Number(form().packing_list_id),
      type: form().type,
      catatan: form().catatan,
      items: selectedItems.map((r) => ({
        packing_list_roll_id: Number(r.packing_list_roll_id),
        meter: parseFloat(r.meter),
        yard: parseFloat(r.yard),
      })),
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
                items: form().items.filter((r) => r.checked),
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
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-sm mb-1">No Surat Jalan</label>
            <input
              class="bg-gray-200 w-full border p-2 rounded"
              value={form().no_sj}
              readonly
            />
          </div>
          <div>
            <label class="block text-sm mb-1">Packing List</label>
            <select
              class="w-full border p-2 rounded"
              value={form().packing_list_id}
              onInput={(e) => handlePackingListChange(e.target.value)}
              required={!isEdit}
              disabled={isEdit}
            >
              <option value="">Pilih Packing List</option>
              <For each={packingLists()}>
                {(pl) => <option value={pl.id}>{pl.no_pl}</option>}
              </For>
            </select>
          </div>
          <div>
            <label class="block text-sm mb-1">Type</label>
            <input
              type="text"
              class="w-full border p-2 rounded bg-gray-200"
              value={form().type || ""}
              readOnly
            />
          </div>
        </div>

        <div>
          <label class="block text-sm mb-1">Catatan</label>
          <textarea
            class="w-full border p-2 rounded"
            value={form().catatan}
            onInput={(e) => setForm({ ...form(), catatan: e.target.value })}
          ></textarea>
        </div>

        <h2 class="text-lg font-bold mt-6 mb-2">Item Groups</h2>

        {/* <button
          type="button"
          onClick={() => addItemGroup()}
          class="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 mb-4"
        >
          + Tambah Item Group
        </button> */}

        <For each={form().items}>
          {(group, i) => (
            <div class="border p-4 rounded mb-6">
              {/* <div class="flex justify-between mb-2">
                <h3 class="font-semibold">Item Group #{i() + 1}</h3>
                <button
                  type="button"
                  onClick={() => removeItemGroup(i())}
                  class="text-red-600 hover:text-red-800 text-sm"
                >
                  Hapus Group
                </button>
              </div> */}

              {/* <div class="mb-3">
                <label class="block text-sm mb-1">Packing Order Item ID</label>
                <select
                  class="w-full border p-2 rounded"
                  value={group.packing_order_item_id || ""}
                  onInput={(e) =>
                    handleGroupChange(
                      i(),
                      "packing_order_item_id",
                      e.target.value
                    )
                  }
                  required
                >
                  <option value="">Pilih Item</option>
                  <For each={selectedPackingListItems()}>
                    {(item) => (
                      <option value={item.id}>
                        {selectedPackingList()?.no_pl} - {item.konstruksi_kain}
                      </option>
                    )}
                  </For>
                </select>
              </div> */}

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
                  <For each={form().items}>
                    {(roll, i) => (
                      <tr>
                        <td class="border px-2 py-1 text-center">{i() + 1}</td>
                        <td class="border px-2 py-1">{roll.konstruksi_kain}</td>
                        <td class="border px-2 py-1 text-right">
                          {roll.meter}
                        </td>
                        <td class="border px-2 py-1 text-right">{roll.yard}</td>
                        <td class="border px-2 py-1 text-center">
                          <input
                            type="checkbox"
                            checked={roll.checked}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setForm((prev) => {
                                const items = [...prev.items];
                                items[i()].checked = checked;
                                return { ...prev, items };
                              });
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          )}
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
