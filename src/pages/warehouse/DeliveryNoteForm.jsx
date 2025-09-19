import { createSignal, For, onMount, Show } from "solid-js";
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
  getSalesOrders,
} from "../../utils/auth";
import SearchableSalesOrderSelect from "../../components/SalesOrderSearch";
import PackingListDropdownSearch from "../../components/PackingListDropdownSearch";
import IndeterminateCheckbox from "../../components/Indeterminate";
import { Printer, Trash2 } from "lucide-solid";

export default function DeliveryNoteForm() {
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const isView = params.view === "true";
  const navigate = useNavigate();
  const user = getUser();

  const [packingLists, setPackingLists] = createSignal([]);
  const [salesOrders, setSalesOrders] = createSignal([]);
  const [deliveryNoteData, setDeliveryNoteData] = createSignal(null);

  // maps yang dipakai SAAT EDIT
  let sjItemIdByPlItemId = new Map();     // pl_item_id -> sj_item_id
  let sjRollIdByPliRollId = new Map();    // pli_roll_id -> sj_roll_id

  const [form, setForm] = createSignal({
    no_sj: "",
    sequence_number: "",
    no_surat_jalan_supplier: "",
    tanggal_surat_jalan: new Date().toISOString().split("T")[0],
    keterangan: "",
    itemGroups: [], // [{ packing_list_id, no_pl, type, items: [rolls…] }]
    no_mobil: "",
    sopir: "",
    delivered_status: 0,
    type: null,
    ppn: 0,
    sales_order_id: null,
    so_no: null,
  });

  onMount(async () => {
    const pls = await getAllPackingLists(user?.token);
    const dataSalesOrders = await getAllSalesOrders(user?.token);

    const soIdsWithPL = new Set((pls?.packing_lists || []).map((pl) => String(pl.so_id)));
    const onlySOWithPL =
      (dataSalesOrders.orders || []).filter((so) => soIdsWithPL.has(String(so.id))) || [];
    setSalesOrders(onlySOWithPL);

    if (isEdit) {
      const res = await getDeliveryNotes(params.id, user?.token);
      if (!res || !res.order) return;

      setDeliveryNoteData(res.order);
      const deliveryNote = res.order;

      // siapkan map sj_item_id & sj_roll_id agar bisa dipakai saat rebuild PL
      sjItemIdByPlItemId = new Map();
      sjRollIdByPliRollId = new Map();

      // struktur: deliveryNote.packing_lists[].items[].rolls[]
      // item di SJ biasanya punya pl_item_id, id (sj_item_id)
      // roll di SJ biasanya punya pli_roll_id, id (sj_roll_id)
      (deliveryNote.packing_lists || []).forEach((pl) => {
        (pl.items || []).forEach((it) => {
          if (it.pl_item_id && it.id) {
            sjItemIdByPlItemId.set(Number(it.pl_item_id), Number(it.id));
          }
          (it.rolls || []).forEach((r) => {
            if (r.pli_roll_id && r.id) {
              sjRollIdByPliRollId.set(Number(r.pli_roll_id), Number(r.id));
            }
          });
        });
      });

      const selectedSO = dataSalesOrders.orders?.find((so) => so.no_so === deliveryNote.no_so);
      if (selectedSO) {
        const relatedPackingLists = pls?.packing_lists?.filter((pl) => pl.so_id === selectedSO.id);
        setPackingLists(relatedPackingLists || []);
      }

      // set roll yang ada di SJ ini (by pli_roll_id)
      const deliveredRollsSet = new Set();
      (deliveryNote.packing_lists || []).forEach((pl) => {
        (pl.items || []).forEach((it) => {
          (it.rolls || []).forEach((r) => deliveredRollsSet.add(Number(r.pli_roll_id)));
        });
      });

      // bangun itemGroups dari data SJ (mengambil data PL penuh agar semua roll tampil)
      const itemGroups = await Promise.all(
        (deliveryNote.packing_lists || []).map(async (pl) => {
          const plDetail = await getPackingLists(pl.id, user?.token);
          const fullPl = plDetail?.order;

          let items = (fullPl.items || []).flatMap((item) =>
            (item.rolls || []).flatMap((roll) => {
              const meterVal = parseFloat(roll.meter ?? 0);
              const yardVal = parseFloat(roll.yard ?? 0);
              if ((isNaN(meterVal) || meterVal === 0) && (isNaN(yardVal) || yardVal === 0)) {
                return []; // sembunyikan roll qty 0
              }

              const pliRollId = Number(roll.id); // id roll di PL
              const isInThisSJ = deliveredRollsSet.has(pliRollId);

              return [{
                // identitas PL roll
                packing_list_roll_id: pliRollId,
                packing_list_item_id: Number(item.id),

                // info display
                no_bal: roll.no_bal,
                lot: roll.lot,
                kode_warna: item.kode_warna,
                deskripsi_warna: item.deskripsi_warna,
                corak_kain: item.corak_kain,
                konstruksi_kain: item.konstruksi_kain,
                row_num: roll.row_num,
                col_num: roll.col_num,
                meter: roll.meter,
                yard: roll.yard,
                kilogram: roll.kilogram,

                // FLAG UI
                checked: isInThisSJ,

                // kunci untuk EDIT diff:
                sj_item_id: sjItemIdByPlItemId.get(Number(item.id)) || null,
                sj_roll_id: isInThisSJ ? (sjRollIdByPliRollId.get(pliRollId) || null) : null,
              }];
            })
          );

          if (isView) items = items.filter((r) => r.checked);

          const typeLetter = fullPl?.no_pl?.split("/")?.[1] || "";
          const typeValue = typeLetter === "E" ? "Ekspor" : "Domestik";

          return {
            packing_list_id: fullPl.id,
            no_pl: fullPl.no_pl,
            type: typeValue,
            items,
          };
        })
      );

      setForm({
        no_sj: deliveryNote.no_sj,
        sequence_number: deliveryNote.no_sj,
        no_surat_jalan_supplier: deliveryNote.no_surat_jalan_supplier || "",
        tanggal_surat_jalan: new Date(deliveryNote.created_at).toISOString().split("T")[0],
        keterangan: deliveryNote.keterangan,
        itemGroups,
        ppn: selectedSO?.ppn_percent ?? 0,
        sales_order_id: selectedSO?.id ?? null,
        so_no: selectedSO?.no_so ?? null,
        type: (String(selectedSO?.no_so || "").split("/")[1] === "E") ? 2 : 1,
        no_mobil: deliveryNote.no_mobil,
        sopir: deliveryNote.sopir,
        delivered_status: deliveryNote.delivered_status,
      });
    } else {
      setPackingLists(pls?.packing_lists || []);
    }
  });

  /* ---------------- helpers ---------------- */

  const groupSOItems = (group) => {
    const map = new Map();
    (group?.items || []).forEach((r) => {
      const k = r.packing_list_item_id;
      let g = map.get(k);
      if (!g) {
        g = {
          pl_item_id: k,
          corak_kain: r.corak_kain || "",
          kode_warna: r.kode_warna || "",
          deskripsi_warna: r.deskripsi_warna || "",
          rolls: [],
          // untuk payload EDIT: simpan sj_item_id bila ada
          sj_item_id: r.sj_item_id || null,
        };
        map.set(k, g);
      }
      // jika salah satu roll punya sj_item_id, simpan di group
      if (r.sj_item_id && !g.sj_item_id) g.sj_item_id = r.sj_item_id;
      g.rolls.push(r);
    });
    return Array.from(map.values());
  };

  const norm = (v) => (v == null ? "" : String(v).trim());

  function buildSoColorMaps(soDetail) {
    const byColCode = new Map();
    const byColDesc = new Map();
    const bySoIdCode = new Map();
    const bySoIdDesc = new Map();

    const items =
      soDetail?.items ||
      soDetail?.sales_order_items ||
      soDetail?.detail_items ||
      soDetail?.details ||
      [];

    for (const it of items) {
      const code =
        norm(it.kode_warna) ||
        norm(it.color_code) ||
        norm(it.kode) ||
        "";

      const desc =
        norm(it.deskripsi_warna) ||
        norm(it.warna_kain) ||
        norm(it.warna) ||
        norm(it.color_name) ||
        "";

      const colKey = norm(it.col) || norm(it.colour) || norm(it.color) || "";
      const soItemId = it.id ?? it.so_item_id;

      if (colKey) {
        if (code) byColCode.set(colKey, code);
        if (desc) byColDesc.set(colKey, desc);
      }
      if (soItemId != null) {
        if (code) bySoIdCode.set(Number(soItemId), code);
        if (desc) bySoIdDesc.set(Number(soItemId), desc);
      }
    }

    return { byColCode, byColDesc, bySoIdCode, bySoIdDesc };
  }

  /** Ambil pasangan {code, desc} yg benar utk item PL */
  function pickColorsForPlItem(plItem, soMaps) {
    const colKey = norm(plItem.col);

    const code =
      (colKey && soMaps.byColCode.get(colKey)) ||
      (plItem.so_item_id != null && soMaps.bySoIdCode.get(Number(plItem.so_item_id))) ||
      norm(plItem.kode_warna);

    const desc =
      (colKey && soMaps.byColDesc.get(colKey)) ||
      (plItem.so_item_id != null && soMaps.bySoIdDesc.get(Number(plItem.so_item_id))) ||
      norm(plItem.deskripsi_warna);

    return {
      code: code || "-",
      desc: desc || "-",
    };
  }

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

  const generateNomorKontrak = async () => {
    let typeLetter;
    if (typeof form().type === "number") {
      typeLetter = form().type === 2 ? "E" : "D";
    } else if (form().itemGroups?.[0]?.type) {
      typeLetter = form().itemGroups[0].type.startsWith("Eks") ? "E" : "D";
    } else if (form().so_no) {
      typeLetter = String(form().so_no).split("/")[1] || "D";
    } else {
      typeLetter = "D";
    }

    const jenisStr = typeLetter === "E" ? "ekspor" : "domestik";
    const ppnValue = Number(form().ppn ?? 0);
    const ppnType = ppnValue > 0 ? "P" : "N";

    const lastSeq = await getLastSequence(user?.token, "s_sj", jenisStr, ppnValue);
    const nextNum = String((lastSeq?.last_sequence || 0) + 1).padStart(5, "0");
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(2);
    const mmyy = `${month}${year}`;
    const nomor = `SJ/${typeLetter}/${ppnType}/${mmyy}/${nextNum}`;

    setForm((prev) => ({
      ...prev,
      sequence_number: nomor,
      no_seq: (lastSeq?.last_sequence || 0) + 1,
      type: typeLetter === "E" ? 2 : 1,
    }));
  };

  const removePackingListGroup = (groupIndex) => {
    setForm((prev) => {
      const groups = [...prev.itemGroups];
      groups.splice(groupIndex, 1);
      return { ...prev, itemGroups: groups };
    });
  };

  const handleSelectAll = (groupIndex, checked) => {
    setForm((prev) => {
      const groups = [...prev.itemGroups];
      const g = { ...groups[groupIndex] };
      g.items = g.items.map((item) => ({ ...item, checked }));
      groups[groupIndex] = g;
      return { ...prev, itemGroups: groups };
    });
  };

  const handleSelectAllInSOGroup = (groupIndex, plItemId, checked) => {
    setForm((prev) => {
      const groups = [...prev.itemGroups];
      const g = { ...groups[groupIndex] };
      g.items = g.items.map((item) =>
        item.packing_list_item_id === plItemId ? { ...item, checked } : item
      );
      groups[groupIndex] = g;
      return { ...prev, itemGroups: groups };
    });
  };

  const handlePackingListChange = async (groupIndex, plId) => {
    if (!plId) return;

    // ambil PL detail
    const plDetail = await getPackingLists(plId, user?.token);
    const pl = plDetail?.order;

    // siapkan numeric type berdasarkan PL
    const typeLetter = pl?.no_pl?.split("/")?.[1] || "";
    const typeValue = typeLetter === "E" ? "Ekspor" : "Domestik";
    const typeNumeric = typeLetter === "E" ? 2 : 1;

    // ambil SO detail → peta warna
    let soMaps = { byColCode: new Map(), byColDesc: new Map(), bySoIdCode: new Map(), bySoIdDesc: new Map() };
    try {
      const soDetailResp = await getSalesOrders(pl.so_id, user?.token);
      const soDetail = soDetailResp?.order || soDetailResp;
      soMaps = buildSoColorMaps(soDetail);
    } catch (_) {}

    const allRolls = [];

    (pl?.items || []).forEach((item) => {
      // warna final utk item ini (dipakai oleh semua roll item tsb)
      const fixed = pickColorsForPlItem(item, soMaps);

      (item.rolls || []).forEach((roll) => {
        const meterVal = parseFloat(roll.meter ?? 0);
        const yardVal = parseFloat(roll.yard ?? 0);
        if ((isNaN(meterVal) || meterVal === 0) && (isNaN(yardVal) || yardVal === 0)) return;

        const pliRollId   = Number(roll.id);
        const wasInThisSJ = sjRollIdByPliRollId.has(pliRollId);
        const isSelectableNow = roll.selected_status === 0;
        const shouldShow = isEdit ? true : isSelectableNow;
        if (!shouldShow) return;

        const sjItemIdGuess = sjItemIdByPlItemId.get(Number(item.id)) || null;

        allRolls.push({
          packing_list_roll_id: pliRollId,
          packing_list_item_id: Number(item.id),

          // ✨ warna sudah dipisah (kode & deskripsi)
          kode_warna: fixed.code,
          deskripsi_warna: fixed.desc,

          no_bal: roll.no_bal,
          lot: roll.lot,
          corak_kain: item.corak_kain,
          konstruksi_kain: item.konstruksi_kain,
          row_num: roll.row_num,
          col_num: roll.col_num,
          meter: roll.meter,
          yard: roll.yard,
          kilogram: roll.kilogram,

          checked: wasInThisSJ,
          sj_item_id: sjItemIdGuess,
          sj_roll_id: wasInThisSJ ? (sjRollIdByPliRollId.get(pliRollId) || null) : null,
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
      return { ...prev, itemGroups: groups, type: prev.type ?? typeNumeric };
    });
  };

  const handleRollCheckedChange = (groupIndex, rollIndex, checked) => {
    setForm((prev) => {
      const groups = [...prev.itemGroups];
      const g = { ...groups[groupIndex] };
      const items = [...g.items];
      items[rollIndex] = { ...items[rollIndex], checked };
      g.items = items;
      groups[groupIndex] = g;
      return { ...prev, itemGroups: groups };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Roll tercentang => isi SJ
    const selectedRolls = form().itemGroups.flatMap((group) =>
      (group.items || []).filter((it) => it.checked)
    );

    // Grouping per pl_item_id + siapkan id item SJ bila ada
    const grouped = {}; // pl_item_id -> group

    for (const roll of selectedRolls) {
      const gid = roll.packing_list_item_id;
      if (!grouped[gid]) {
        grouped[gid] = {
          id: roll.sj_item_id || undefined,  // <-- penting untuk EDIT (biar update, bukan insert baru)
          pl_item_id: gid,
          meter_total: 0,
          yard_total: 0,
          kilogram_total: 0,
          rolls: [],
          _lots: new Set(),
        };
      }

      grouped[gid].rolls.push({
        id: roll.sj_roll_id || undefined,    // <-- penting untuk EDIT (roll lama tetap dipertahankan)
        pli_roll_id: roll.packing_list_roll_id,
        row_num: roll.row_num,
        col_num: roll.col_num,
        meter: roll.meter || 0,
        yard: roll.yard || 0,
        kilogram: roll.kilogram ?? null,
      });

      grouped[gid].meter_total += parseFloat(roll.meter || 0);
      grouped[gid].yard_total += parseFloat(roll.yard || 0);
      grouped[gid].kilogram_total =
        (grouped[gid].kilogram_total || 0) + parseFloat(roll.kilogram || 0);
      if (roll.lot != null) grouped[gid]._lots.add(String(roll.lot));
    }

    const itemsPayload = Object.values(grouped).map((g) => {
      if (g.kilogram_total === 0) g.kilogram_total = null;
      g.meter_total = parseFloat(g.meter_total.toFixed(2));
      g.yard_total = parseFloat(g.yard_total.toFixed(2));
      g.lot = Array.from(g._lots).filter(Boolean).join(",");
      delete g._lots;
      return g;
    });

    const plIds = form().itemGroups.map((g) => Number(g.packing_list_id));

    const payload = isEdit
      ? {
          no_sj: form().no_sj,
          pl_ids: plIds,
          no_mobil: form().no_mobil || null,
          sopir: form().sopir || null,
          keterangan: form().keterangan,
          items: itemsPayload,
        }
      : {
          type: form().itemGroups[0]?.type?.toLowerCase() || "domestik",
          sequence_number: form().no_seq || 1,
          pl_ids: plIds,
          no_mobil: form().no_mobil || null,
          sopir: form().sopir || null,
          keterangan: form().keterangan,
          items: itemsPayload,
        };

    try {
      if (isEdit) {
        //console.log("UPDATE SJ payload:", JSON.stringify(payload, null, 2));
        await updateDataDeliveryNote(user?.token, params.id, payload);
      } else {
        //console.log("CREATE SJ payload:", JSON.stringify(payload, null, 2));
        await createDeliveryNote(user?.token, payload);
      }

      Swal.fire({
        icon: "success",
        title: isEdit ? "Berhasil Update" : "Berhasil Simpan",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => navigate("/deliverynote"));
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err?.message || "Terjadi kesalahan.",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
    }
  };

  function handlePrint() {
    if (!deliveryNoteData()) {
      Swal.fire("Gagal", "Data untuk mencetak tidak tersedia. Pastikan Anda dalam mode Edit/View.", "error");
      return;
    }
    const dataToPrint = { ...deliveryNoteData() };
    const encodedData = encodeURIComponent(JSON.stringify(dataToPrint));
    window.open(`/print/suratjalan#${encodedData}`, "_blank");
  }

  /* ---------------- UI ---------------- */

  return (
    <MainLayout>
      <h1 class="text-2xl font-bold mb-4">
        {isView ? "Detail" : isEdit ? "Edit" : "Tambah"} Surat Jalan Packing List
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

      <form onSubmit={handleSubmit} class="space-y-4">
        <SearchableSalesOrderSelect
          salesOrders={salesOrders}
          form={form}
          setForm={setForm}
          disabled={isView || isEdit}
          classList={{ "bg-gray-200": isView || isEdit }}
          onChange={(so) => {
            const ppnNum = Number(so.ppn_percent ?? so.ppn ?? 0);
            const typeLetterFromSO = String(so.no_so || "").split("/")[1] || "D";
            const typeNumeric = typeLetterFromSO === "E" ? 2 : 1;

            setPackingLists([]);

            setForm((prev) => ({
              ...prev,
              ppn: ppnNum,
              sales_order_id: so.id,
              so_no: so.no_so,
              type: typeNumeric,
              itemGroups: [],
              sequence_number: "",
              no_seq: undefined,
              no_mobil: "",
              sopir: "",
              keterangan: "",
            }));

            getAllPackingLists(user?.token).then((pls) => {
              const filtered = pls?.packing_lists?.filter((pl) => pl.so_id === so.id) ?? [];
              setPackingLists(filtered);

              if (filtered.length === 0) {
                Swal.fire({
                  icon: "info",
                  title: "Tidak ada packing list",
                  text: "Sales order ini belum memiliki packing list.",
                });
              }
            });
          }}
        />

        {form().sales_order_id && (
          <>
            <div class="w-full grid grid-cols-3 gap-4">
              <div class="w-full mt-4">
                <label class="text-sm font-medium">No. Surat Jalan</label>
                <div class="flex gap-2">
                  <input
                    type="text"
                    value={form().sequence_number || ""}
                    class="w-full border p-2 rounded bg-gray-100"
                    disabled={true}
                    classList={{ "bg-gray-200" : true}}
                  />
                  <button
                    type="button"
                    class="bg-gray-300 text-sm px-2 rounded hover:bg-gray-400"
                    onClick={generateNomorKontrak}
                    hidden={isEdit}
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div class="w-full mt-4">
                <label class="text-sm font-medium">Tanggal Surat Jalan</label>
                <input
                  type="date"
                  class="w-full border p-2 rounded bg-gray-100"
                  value={form().tanggal_surat_jalan}
                  disabled={isView}
                  classList={{ "bg-gray-200" : isView }}
                />
              </div>

              <div class="w-full mt-4">
                <label class="text-sm font-medium">No. Mobil</label>
                <input
                  type="text"
                  class="w-full border p-2 rounded"
                  value={form().no_mobil || ""}
                  onInput={(e) => setForm({ ...form(), no_mobil: e.target.value })}
                  disabled={isView}
                  classList={{ "bg-gray-200": isView }}
                />
              </div>

              <div class="w-full mt-4">
                <label class="text-sm font-medium">Sopir</label>
                <input
                  type="text"
                  class="w-full border p-2 rounded"
                  value={form().sopir || ""}
                  onInput={(e) => setForm({ ...form(), sopir: e.target.value })}
                  disabled={isView}
                  classList={{ "bg-gray-200": isView }}
                />
              </div>
            </div>

            <div class="w-full mt-2">
              <label class="text-sm font-medium">Keterangan</label>
              <textarea
                class="w-full border p-2 rounded"
                rows="3"
                value={form().keterangan || ""}
                onInput={(e) => setForm({ ...form(), keterangan: e.target.value })}
                disabled={isView}
                classList={{ "bg-gray-200": isView }}
              />
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => addPackingListGroup()}
          class="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 mb-4"
          disabled={!form().sales_order_id}
          hidden={isView}
        >
          + Tambah Packing List
        </button>

        <For each={form().itemGroups}>
          {(_, groupIndex) => {
            const currentGroup = () => form().itemGroups[groupIndex()];
            const soGroups = () => groupSOItems(currentGroup());

            const allCheckedInPL = () => {
              const g = currentGroup();
              return g.items.length > 0 && g.items.every((i) => i.checked);
            };
            const someCheckedInPL = () => {
              const g = currentGroup();
              return g.items.some((i) => i.checked) && !allCheckedInPL();
            };

            return (
              <div class="border p-4 mb-4 rounded">
                <div class="mb-2 flex justify-between items-center">
                  <h3 class="font-semibold text-lg">
                    {currentGroup().no_pl || `Packing List #${groupIndex() + 1}`}
                  </h3>
                  <button
                    type="button"
                    class="text-red-600 hover:text-red-800 text-sm"
                    onClick={() => removePackingListGroup(groupIndex())}
                    hidden={isView}
                  >
                    <Trash2 size={25} />
                  </button>
                </div>

                <PackingListDropdownSearch
                  class="mb-3"
                  packingLists={packingLists}
                  salesOrders={salesOrders}
                  value={currentGroup().packing_list_id}
                  disabled={isView}
                  onChange={(pl) => handlePackingListChange(groupIndex(), pl.id)}
                  fetchPLDetail={(plId) => getPackingLists(plId, user?.token)}
                  fetchSODetail={(soId) => getSalesOrders(soId, user?.token)}
                />

                {!isView && (
                  <div class="flex items-center justify-end mb-2 gap-2">
                    <span class="text-sm text-gray-600">Pilih Semua Packing List Ini</span>
                    <IndeterminateCheckbox
                      checked={allCheckedInPL()}
                      indeterminate={someCheckedInPL()}
                      onChange={(e) => handleSelectAll(groupIndex(), e.currentTarget.checked)}
                    />
                  </div>
                )}

                <For each={soGroups()}>
                  {(sg, sgIndex) => {
                    const allChecked = () => sg.rolls.length > 0 && sg.rolls.every((r) => r.checked);
                    const someChecked = () => sg.rolls.some((r) => r.checked) && !allChecked();

                    const subPcs = () => sg.rolls.filter((r) => r.checked).length;
                    const subMtr = () =>
                      sg.rolls.reduce((s, r) => s + (r.checked ? parseFloat(r.meter || 0) : 0), 0).toFixed(2);
                    const subYard = () =>
                      sg.rolls.reduce((s, r) => s + (r.checked ? parseFloat(r.yard || 0) : 0), 0).toFixed(2);

                    return (
                      <div class="border rounded mb-4">
                        <div class="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
                          <div class="font-semibold">Sales Order Item Group #{sgIndex() + 1}</div>
                          {!isView && (
                            <div class="flex items-center gap-2">
                              <span class="text-sm text-gray-600">Pilih Semua Group Ini</span>
                              <IndeterminateCheckbox
                                checked={allChecked()}
                                indeterminate={someChecked()}
                                onChange={(e) =>
                                  handleSelectAllInSOGroup(
                                    groupIndex(),
                                    sg.pl_item_id,
                                    e.currentTarget.checked
                                  )
                                }
                              />
                            </div>
                          )}
                        </div>

                        <table class="w-full border border-gray-300 text-sm">
                          <thead class="bg-gray-100">
                            <tr>
                              <th class="border px-2 py-1 w-[4%]">#</th>
                              <th class="border px-2 py-1 w-[6%]">Bal</th>
                              <th class="border px-2 py-1 w-[15%]">Col</th>
                              <th class="border px-2 py-1 w-[15%]">Corak Kain</th>
                              <th class="border px-2 py-1 w-[6%]">Lot</th>
                              <th class="border px-2 py-1 w-[8%]">Meter</th>
                              <th class="border px-2 py-1 w-[8%]">Yard</th>
                              <th class="border px-2 py-1 text-center w-[20%]">{isView ? "Status" : "Pilih"}</th>
                            </tr>
                          </thead>
                          <tbody>
                            <For each={sg.rolls}>
                              {(roll, rollIndex) => (
                                <tr>
                                  <td class="border px-2 py-1 text-center">{rollIndex() + 1}</td>
                                  <td class="border px-2 py-1 text-center">{roll.no_bal}</td>
                                  <td class="border px-2 py-1">
                                    {(roll.kode_warna || "-") + " | " + (roll.deskripsi_warna || "-")}
                                  </td>
                                  <td class="border px-2 py-1">{roll.corak_kain}</td>
                                  <td class="border px-2 py-1 text-center">{roll.lot}</td>
                                  <td class="border px-2 py-1 text-right">{roll.meter}</td>
                                  <td class="border px-2 py-1 text-right">{roll.yard}</td>
                                  <td class="border px-2 py-1 text-center">
                                    <Show
                                      when={!isView}
                                      fallback={
                                        <span
                                          classList={{
                                            "font-semibold": true,
                                            "text-green-600": form().delivered_status === 1,
                                            "text-gray-500": form().delivered_status !== 1,
                                          }}
                                        >
                                          {form().delivered_status === 1 ? "Terkirim" : "Belum Terkirim"}
                                        </span>
                                      }
                                    >
                                      <input
                                        type="checkbox"
                                        checked={roll.checked}
                                        onChange={(e) =>
                                          handleRollCheckedChange(
                                            groupIndex(),
                                            currentGroup().items.findIndex(
                                              (x) => x.packing_list_roll_id === roll.packing_list_roll_id
                                            ),
                                            e.target.checked
                                          )
                                        }
                                      />
                                    </Show>
                                  </td>
                                </tr>
                              )}
                            </For>

                            <tr class="bg-gray-50 font-semibold">
                              <td class="border px-2 py-1 text-right" colSpan={5}>
                                Sub Total
                              </td>
                              <td class="border px-2 py-1 text-right">{subMtr()}</td>
                              <td class="border px-2 py-1 text-right">{subYard()}</td>
                              <td class="border px-2 py-1 text-center">TTL/PCS: {subPcs()}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  }}
                </For>

                <div class="border-t pt-3">
                  <div class="text-right font-semibold text-sm">Total Keseluruhan:</div>
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
                          {currentGroup()
                            ?.items?.reduce(
                              (s, r) => s + (r.checked ? parseFloat(r.meter || 0) : 0),
                              0
                            )
                            ?.toFixed(2)}
                        </td>
                        <td class="px-4 py-2 border text-right">
                          {currentGroup()
                            ?.items?.reduce(
                              (s, r) => s + (r.checked ? parseFloat(r.yard || 0) : 0),
                              0
                            )
                            ?.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          }}
        </For>

        <div class="border-t pt-4 mt-4">
          <div class="text-right font-semibold text-sm">Total Keseluruhan:</div>
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
                    .itemGroups?.reduce(
                      (sum, group) =>
                        sum +
                        group.items?.reduce(
                          (s, item) => s + (item.checked ? parseFloat(item.meter || 0) : 0),
                          0
                        ),
                      0
                    )
                    ?.toFixed(2)}
                </td>
                <td class="px-4 py-2 border text-right">
                  {form()
                    .itemGroups?.reduce(
                      (sum, group) =>
                        sum +
                        group.items?.reduce(
                          (s, item) => s + (item.checked ? parseFloat(item.yard || 0) : 0),
                          0
                        ),
                      0
                    )
                    ?.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

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
