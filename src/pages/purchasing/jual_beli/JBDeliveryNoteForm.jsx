import { createSignal, createEffect, For, onMount, Show } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  getJualBelis,
  createJBDeliveryNote,
  updateDataJBDeliveryNote,
  getJBDeliveryNotes,
  getUser,
  getAllJualBelis,
  getLastSequence,
} from "../../../utils/auth";
import SuratJalanPrint from "../../print_function/sell/SuratJalanPrint";
import JualBeliSearch from "../../../components/JualBeliDropdownSearch";
import { Printer, Trash2, XCircle } from "lucide-solid";

export default function JBDeliveryNoteForm() {
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const isView = params.view === 'true';
  const navigate = useNavigate();
  const user = getUser();

  const [jualBeliList, setJualBeliList] = createSignal([]);
  const [openStates, setOpenStates] = createSignal([]);
  const [groupRollCounts, setGroupRollCounts] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [deliveryNoteData, setDeliveryNoteData] = createSignal(null); 

  const [form, setForm] = createSignal({
    sequence_number: "",
    jb_id: "",
    keterangan: "",
    purchase_order_id: null,
    purchase_order_items: null,
    no_sj_supplier: "",
    unit: "Meter", 
    itemGroups: [],
  });

  onMount(async () => {
    setLoading(true);
    // 1. Ambil SEMUA purchase order untuk dropdown pencarian
    const poListResponse = await getAllJualBelis(user?.token);
    //console.log("Response dari API get All Jual Beli:", JSON.stringify(poListResponse, null, 2));
    setJualBeliList(poListResponse.mainRows || []);

    if (isEdit) {
      // 2. Jika mode edit, ambil data DETAIL surat jalan
      const sjResponse = await getJBDeliveryNotes(params.id, user?.token);
      const suratJalanData = sjResponse?.suratJalan; // Gunakan key 'suratJalan'

      if (!suratJalanData) {
        setLoading(false);
        Swal.fire("Error", "Data Surat Jalan tidak ditemukan.", "error");
        return;
      }

      // 3. Ambil juga data DETAIL purchase order yang terkait
      const poDetailResponse = await getJualBelis(suratJalanData.jb_id, user?.token);
      const poData = poDetailResponse?.mainRow;

      const fullPrintData = {
        ...suratJalanData,
        //purchase_order_detail: poData
      };
      setDeliveryNoteData(fullPrintData); 

      const MAX_COL_PER_ROW = 5;

      // 4. Isi state form dengan SEMUA data yang sudah terkumpul
      setForm({
        ...form(),
        jb_id: suratJalanData.no_sj,
        no_sj_supplier: suratJalanData.no_sj_supplier,
        purchase_order_id: suratJalanData.jb_id,
        purchase_order_items: poData, // Data PO untuk dropdown item
        sequence_number: suratJalanData.sequence_number,
        keterangan: suratJalanData.keterangan || "",
        unit: poData?.satuan_unit_name || "Meter",
        itemGroups: (suratJalanData.items || []).map((group) => ({
          purchase_order_item_id: group.jb_item_id,
          meter_total: group.meter_total || 0,
          yard_total: group.yard_total || 0,
          rolls: (group.rolls || []).map((r, idx) => ({
            id: r.id,
            row_num: r.row_num || Math.floor(idx / MAX_COL_PER_ROW) + 1,
            col_num: r.col_num || (idx % MAX_COL_PER_ROW) + 1,
            meter: r.meter || "",
            yard: r.yard || ((r.meter || 0) * 1.093613).toFixed(2),
          })),
        })),
      });
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
  
  const parseNumber = (str) => {
    if (typeof str !== 'string' || !str) return 0;
    const cleaned = str.replace(/[^\d,]/g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };
  
  const handleSuratJalanChange = async (selectedPO) => {
      if (!selectedPO) return;
  
      // Hanya jalankan logika untuk mode "Tambah Baru"
      const res = await getJualBelis(selectedPO.id, user?.token);
      //console.log("PO yang Dipilih dari Dropdown:", JSON.stringify(selectedPO, null, 2));
      const selectedOCData = res?.mainRow; 
  
      const poTypeLetter = selectedPO.no_jb.split("/")[1];
      const poPPN = selectedPO.no_jb.split("/")[2];
      const ppnValue = poPPN === "P" ? 1 : 0;
  
      const { newSJNumber, newSequenceNumber } = await generateSJNumber(
        poTypeLetter,
        ppnValue
      );
  
      setForm({
        ...form(),
        purchase_order_id: selectedPO.id,
        purchase_order_items: selectedOCData,
        jb_id: newSJNumber,
        sequence_number: newSequenceNumber,
        unit: selectedOCData.satuan_unit_name, 
      });
    };

  const generateSJNumber = async (salesType, ppn) => {
    const lastSeq = await getLastSequence(
      user?.token,
      "jb_sj",
      salesType,
      ppn
    );

    const nextNum = String((lastSeq?.last_sequence || 0) + 1).padStart(5, "0");
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(2);
    const ppnValue = parseFloat(ppn) || 0;
    const type = ppnValue > 0 ? "P" : "N";
    const mmyy = `${month}${year}`;
    const nomor = `SJ/JB/${type}/${mmyy}-${nextNum}`;

    return {
      newSJNumber: nomor,
      newSequenceNumber: (lastSeq?.last_sequence || 0) + 1,
    };
  };

  const addItemGroup = () => {
    setForm((prev) => ({
      ...prev,
      itemGroups: [
        ...prev.itemGroups,
        {
          purchase_order_item_id: "",
          meter_total: 0,
          yard_total: 0,
          rolls: [
            {
              row_num: 1,
              col_num: 1,
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
      };
    });
  };

  const addRoll = (groupIndex) => {
    setForm((prev) => {
      const copy = [...prev.itemGroups];
      const rolls = [
        ...copy[groupIndex].rolls,
        { meter: "", yard: ""},
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
      const group = { ...copy[groupIndex] };

      const lastRoll = group.rolls[group.rolls.length - 1] || {
        item: "",
        meter: "",
        yard: "",
      };

      const newRolls = Array.from({ length: count }, () => ({
        item: lastRoll.item || "",
        meter: lastRoll.meter || "",
        yard: lastRoll.yard || "",
      }));
      
      const combinedRolls = [...group.rolls, ...newRolls];

      group.rolls = reindexRolls(combinedRolls);
      group.meter_total = group.rolls.reduce((sum, r) => sum + Number(r.meter || 0), 0);
      group.yard_total = group.meter_total * 1.093613;

      copy[groupIndex] = group;

      return { ...prev, itemGroups: copy };
    });
  };

  const removeRoll = (groupIndex, rollIndex) => {
    setForm((prev) => {
      const copy = [...prev.itemGroups];
      const group = { ...copy[groupIndex] };

      if (!group || !Array.isArray(group.rolls)) return prev;

      const updatedRolls = [...group.rolls];
      updatedRolls.splice(rollIndex, 1);

      group.rolls = reindexRolls(updatedRolls);
      group.meter_total = group.rolls.reduce((sum, r) => sum + Number(r.meter || 0), 0);
      group.yard_total = group.meter_total * 1.093613;

      copy[groupIndex] = group;

      return { ...prev, itemGroups: copy };
    });
  };

  const handleRollChange = (groupIndex, rollIndex, value) => {
    setForm((prev) => {
      const newGroups = [...prev.itemGroups];
      const targetGroup = { ...newGroups[groupIndex] };
      const newRolls = [...targetGroup.rolls];
      const updatedRoll = { ...newRolls[rollIndex] };
      
      const inputValue = parseNumber(value);

      if (form().unit === 'Yard') {
        updatedRoll.yard = inputValue;
        updatedRoll.meter = inputValue * 0.9144; 
      } else {
        updatedRoll.meter = inputValue;
        updatedRoll.yard = inputValue * 1.093613;
      }

      newRolls[rollIndex] = updatedRoll;

      targetGroup.rolls = newRolls;
      
      // Recalculate totals
      targetGroup.meter_total = newRolls.reduce((sum, r) => sum + Number(r.meter || 0), 0);
      // Hitung yard_total dari meter_total untuk akurasi
      targetGroup.yard_total = targetGroup.meter_total * 1.093613; 
      
      newGroups[groupIndex] = targetGroup;

      return { ...prev, itemGroups: newGroups };
    });
  }

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

    if (!form().purchase_order_id) {
      Swal.fire("Gagal", "Harap pilih Purchase Order terlebih dahulu.", "error");
      return;
    }
    if (!form().no_sj_supplier.trim()) {
      Swal.fire("Gagal", "Harap isi No Surat Jalan Supplier.", "error");
      return;
    }
    if (form().itemGroups.length === 0) {
      Swal.fire("Gagal", "Harap tambahkan minimal satu item group.", "error");
      return;
    }
    for (const group of form().itemGroups) {
      if (!group.purchase_order_item_id) {
        Swal.fire("Gagal", "Harap pilih 'Item' untuk setiap group.", "error");
        return;
      }
    }

    const MAX_COL_PER_ROW = 5;

    try {
      if (isEdit) {
        const payload = {
          no_sj: form().no_sj,
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

            return {
              po_item_id: Number(g.item || g.rolls[0]?.item || 0),
              meter_total,
              yard_total,
              rolls: rollsWithIndex,
            };
          }),
        };

        await updateDataJBDeliveryNote(user?.token, params.id, payload);
      } else {
        const payload = {
          sequence_number: form().sequence_number,
          jb_id: form().purchase_order_id,
          keterangan: form().keterangan,
          no_sj_supplier: form().no_sj_supplier.trim(),
          items: form().itemGroups.map((g) => {
            const rollsWithIndex = g.rolls.map((r, idx) => ({
              row_num: Math.floor(idx / MAX_COL_PER_ROW) + 1,
              col_num: (idx % MAX_COL_PER_ROW) + 1,
              meter: Number(r.meter) || 0,
              yard: parseFloat(r.yard) || (Number(r.meter) || 0) * 1.093613,
            }));

            const meter_total = rollsWithIndex.reduce((sum, r) => sum + r.meter, 0);
            const yard_total = meter_total * 1.093613;

            return {
              jb_item_id: Number(g.purchase_order_item_id),
              meter_total,
              yard_total,
              rolls: rollsWithIndex.filter(r => r.meter > 0), // Hanya kirim roll yang terisi
            };
          }),
        };
        //console.log("Response create SJ JB:", JSON.stringify(payload, null, 2));
        await createJBDeliveryNote(user?.token, payload);
      }

      Swal.fire({
        icon: "success",
        title: isEdit ? "Berhasil Update" : "Berhasil Simpan",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => {
        navigate("/jualbeli-deliverynote");
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error?.message || "Terjadi kesalahan saat menyimpan.",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
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
    if (!deliveryNoteData()) {
      Swal.fire("Gagal", "Data untuk mencetak tidak tersedia. Pastikan Anda dalam mode Edit/View.", "error");
      return;
    }

    const dataToPrint = {
      ...deliveryNoteData(),
      //...form(),
    };
    //console.log("Data print: ", JSON.stringify(dataToPrint, null, 2));  
    const encodedData = encodeURIComponent(JSON.stringify(dataToPrint));
    window.open(`/print/jualbeli/suratjalan?data=${encodedData}`, "_blank");
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
        {isView ? "Detail" : isEdit ? "Edit" : "Tambah"} Surat Jalan Jual Beli
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
            <label class="block text-sm mb-1">No Surat Jalan</label>
            <div class="flex gap-2">
              <input
                class="w-full border bg-gray-200 p-2 rounded"
                value={form().jb_id}
                readOnly
              />
            </div>
          </div>
          <div>
            <label class="block text-sm mb-1">No Surat Jalan Supplier</label>
            <input
              class="w-full border p-2 rounded"
              value={form().no_sj_supplier}
              onInput={(e) => setForm({ ...form(), no_sj_supplier: e.target.value })}
              required
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
            />
          </div>
          <div>
            <label class="block text-sm mb-1">Purchase Order</label>
              <JualBeliSearch
                items={jualBeliList()}
                value={form().purchase_order_id} 
                form={form}
                setForm={setForm}
                onChange={handleSuratJalanChange}
                disabled={isView}
              />
          </div>
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
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
            ></textarea>
          </div>
        </div>

        <div>
          <h2 class="text-lg font-bold mt-6 mb-2">Item Groups</h2>

          <button
            type="button"
            onClick={() => addItemGroup()}
            class="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 mb-4"
            hidden={isView}
          >
            + Tambah Item Group
          </button>

          <For each={form().itemGroups}>
            {(group, i) => (
              <div class="border p-4 rounded mb-6">
                <div
                  class="flex justify-between items-center mb-2 cursor-pointer"
                >
                  <h3 class="font-semibold">
                    Purchase Order Item Group #{i() + 1}
                  </h3>
                  <div class="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItemGroup(i());
                      }}
                      class="text-red-600 hover:text-red-800 text-sm"
                      hidden={isView}
                    >
                      <XCircle class="w-10 h-10" />
                    </button>
                  </div>
                </div>

                <Show when={!openStates()[i()]}>
                  <div class="mb-3">
                    <label class="block text-sm mb-1">
                      Purchase Order Item ID
                    </label>
                  </div>

                  <table class="w-full border text-sm mt-2">
                    <thead class="bg-gray-100">
                      <tr>
                        <th class="border px-2 py-1 w-10">No</th>
                        <th class="border px-2 py-1 w-32">Item</th>
                        <th class="border px-2 py-1 w-32">Warna</th>
                        <For each={[1, 2, 3, 4, 5]}>
                          {(n) => (
                            <th class="border px-2 py-1 w-16 text-center">
                              {n}
                            </th>
                          )}
                        </For>
                        <th class="border px-2 py-1 w-14">TTL/PCS</th>
                        <th class="border px-2 py-1 w-24" classList={{ 'bg-gray-200': form().unit === 'Yard' }}>
                          TTL/MTR
                        </th>
                        <th class="border px-2 py-1 w-24" classList={{ 'bg-gray-200': form().unit !== 'Yard' }}>
                          TTL/YARD
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                    {/* Loop per baris (setiap baris berisi maksimal 5 roll) */}
                    <For each={chunkArrayWithIndex(group.rolls, 5)}>
                      {(rollChunk, chunkIndex) => (
                        <tr>
                          {/* Kolom No. */}
                          <td class="border text-center align-top p-1">
                            {chunkIndex() === 0 ? i() + 1 : ""}
                          </td>

                          {/* Kolom Item (hanya tampil di baris pertama per group) */}
                          <td class="border p-1 align-top">
                            {chunkIndex() === 0 ? (
                              <select
                                class="w-full border rounded p-1"
                                value={group.purchase_order_item_id || ""}
                                onInput={(e) => {
                                  // Logika untuk mengubah item ID group
                                  const newGroups = [...form().itemGroups];
                                  newGroups[i()].purchase_order_item_id = e.target.value;
                                  setForm({ ...form(), itemGroups: newGroups });
                                }}
                                disabled={isView}
                                classList={{ "bg-gray-200": isView }}
                              >
                                <option value="">Pilih Item</option>
                                  <For each={form().purchase_order_items?.items || []}>
                                    {(item) => (
                                      <option value={item.id}>
                                        {/* FIX: Akses properti langsung dari 'item' */}
                                        {item.corak_kain} | {item.konstruksi_kain}
                                      </option>
                                    )}
                                  </For>
                              </select>
                            ) : null}
                          </td>

                          <td class="border p-1 align-top">
                            {chunkIndex() === 0 ? (
                              <select
                                class="w-full border rounded p-1"
                                value={group.purchase_order_item_id || ""}
                                onInput={(e) => {
                                  // Logika untuk mengubah item ID group
                                  const newGroups = [...form().itemGroups];
                                  newGroups[i()].purchase_order_item_id = e.target.value;
                                  setForm({ ...form(), itemGroups: newGroups });
                                }}
                                disabled={isView}
                                classList={{ "bg-gray-200": isView }}
                              >
                                <option value="">Pilih Warna</option>
                                  <For each={form().purchase_order_items?.items || []}>
                                    {(item) => (
                                      <option value={item.id}>
                                        {/* FIX: Akses properti langsung dari 'item' */}
                                        {item.kode_warna} | {item.deskripsi_warna}
                                      </option>
                                    )}
                                  </For>
                              </select>
                            ) : null}
                          </td>

                          {/* Kolom untuk 5 roll */}
                          <For each={rollChunk}>
                              {(r) => (
                                <td class="border p-1 align-top">
                                  <div class="flex flex-row">
                                    <input
                                      type="text"
                                      inputmode="decimal"
                                      class="border p-1 text-right text-xs pr-2 w-full"
                                      value={formatNumber(form().unit === 'Yard' ? r.roll.yard : r.roll.meter, 2)}
                                      onBlur={(e) =>
                                        handleRollChange(i(), r.index, e.target.value)
                                      }
                                      disabled={isView}
                                      classList={{ "bg-gray-200": isView }}
                                    />
                                    <button
                                      type="button"
                                      class="text-white bg-red-500 rounded-r-sm text-xs px-1"
                                      onClick={() => removeRoll(i(), r.index)}
                                      hidden={isView}
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </For>

                          {/* Tambahkan sel kosong jika roll kurang dari 5 */}
                          <For each={Array(5 - rollChunk.length)}>
                            {() => <td class="border p-1 bg-gray-50"></td>}
                          </For>

                          {/* Kolom Total per Baris */}
                          <td class="border text-center align-top p-1">{rollChunk.length}</td>
                            <td class="border text-right px-2 align-top p-1" classList={{ 'bg-gray-200 ': form().unit === 'Yard' }}>
                                {formatNumber(rollChunk.reduce((sum, r) => sum + Number(r.roll.meter || 0), 0))}
                            </td>
                            <td class="border text-right px-2 align-top p-1" classList={{ 'bg-gray-200 ': form().unit !== 'Yard' }}>
                                {formatNumber(rollChunk.reduce((sum, r) => sum + Number(r.roll.yard || 0), 0))}
                            </td>
                        </tr>
                      )}
                    </For>

                    {/* Baris Sub Total */}
                    <tr>
                      <td colSpan={8} class="border px-2 py-1 font-semibold text-left">
                        Sub Total
                      </td>
                      <td class="border px-2 py-1 text-center font-semibold">
                        {group.rolls.length}
                      </td>
                      <td class="border px-2 py-1 text-right font-semibold" classList={{ 'bg-gray-200 ': form().unit === 'Yard' }}>
                        {formatNumber(group.meter_total)} m
                      </td>
                      <td class="border px-2 py-1 text-right font-semibold" classList={{ 'bg-gray-200 ': form().unit !== 'Yard' }}>
                        {formatNumber(group.yard_total)} yd
                      </td>
                    </tr>
                  </tbody>
                  </table>

                  <div class="mt-4 flex flex-wrap gap-2 items-center">
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
                      hidden={isView}
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
                      hidden={isView}
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
                    style="width: 70%"
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
            hidden={isView}
          >
            Simpan
          </button>
        </div>
      </form>      
    </MainLayout>
  );
}
