import { createSignal, For, onMount, Show } from "solid-js";
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
import ColorDropdownSearch from "../../components/ColorDropdownSearch"; // tetap di-import untuk jaga struktur
import { Printer, Trash2, XCircle } from "lucide-solid";
import { jwtDecode } from "jwt-decode";

// (2) Component Start
export default function PackingListForm() {
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const isView = params.view === 'true';
  const navigate = useNavigate();
  const user = getUser();

  // --- ROLE / STRICT EDIT (staff gudang) ---
  const payload = (() => {
    try { return user?.token ? jwtDecode(user.token) : null; }
    catch { return null; }
  })();

  const [me, setMe] = createSignal(payload);

  // Hanya aktif saat EDIT dan user adalah staff gudang
  const isStrictWarehouseEdit = () => {
    const u = me();
    const rid = Number(u?.role?.id ?? u?.role_id ?? 0);
    const rname = String(u?.role?.name ?? u?.role_name ?? "").toLowerCase();
    return isEdit && (rid === 13 || rname === "staff gudang");
  };

    // --- STRICT helpers (per-roll / per-row) ---
  const isExistingRoll = (roll) => !!roll?.roll_id;

  // Qty input per roll: lock kalau existing & strict edit
  const isQtyDisabled = (roll) => {
    if (isView) return true;
    if (!isEdit) return false;
    if (!isStrictWarehouseEdit()) return false;
    return isExistingRoll(roll);
  };

  // Row-level (BAL/LOT) boleh di-edit pada strict edit
  // hanya jika di baris itu ADA roll BARU (tanpa roll_id)
  const rowHasNewRoll = (chunk /* array of {roll, index} */) =>
    (chunk || []).some((rc) => !isExistingRoll(rc.roll));

  const rowFieldDisabled = (chunk) => {
    if (isView) return true;
    if (!isEdit) return false;
    if (!isStrictWarehouseEdit()) return false;
    return !rowHasNewRoll(chunk); // true => disable
  };

  // Utility untuk menentukan disabled/hide
  // type: 'roll-qty' | 'add-roll' | 'non-roll'
  const isDisabled = (type) => {
    if (isView) return true;           // view selalu terkunci
    if (!isEdit) return false;         // CREATE: bebas edit
    if (!isStrictWarehouseEdit()) return false;  // EDIT non-strict: bebas edit

    // EDIT strict (staff gudang): hanya boleh isi qty roll & tambah roll
    return !(type === "roll-qty" || type === "add-roll");
  };

  const [salesOrderList, setSalesOrderList] = createSignal([]);
  const [openStates, setOpenStates] = createSignal([]);
  const [groupRollCounts, setGroupRollCounts] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [colDraft, setColDraft] = createSignal({}); // key per group
  const colKey = (gIdx) => `g-${gIdx}`;
  const [soColors, setSoColors] = createSignal([]);

  const [form, setForm] = createSignal({
    type: "",
    no_pl: "",
    sequence_number: "",
    sales_order_id: "",
    col: "",
    keterangan: "",
    itemGroups: [],
    sales_order_items: [],
    satuan_unit: "",
  });

  // ===== Helpers untuk qty =====
  const numVal = (v) => Number(v || 0);
  const hasQty = (r) => numVal(r.meter) > 0 || numVal(r.yard) > 0 || numVal(r.kilogram) > 0;

  // (3) onMount untuk edit atau new
  onMount(async () => {
    setLoading(true);
    const salesOrders = await getAllSalesOrders(user?.token);
    setSalesOrderList(salesOrders?.orders || []);

    if (isEdit) {
      const res = await getPackingLists(params.id, user?.token);
      const packingList = res?.order;

      if (!packingList) return;

      const unitFromPL = (() => {
        const id = Number(packingList?.satuan_unit_pl_id);
        if (id === 1) return "Meter";
        if (id === 2) return "Yard";
        if (id === 3) return "Kilogram";
        // fallback kalau backend kirim nama:
        return packingList?.satuan_unit_pl_name || "";
      })();

      const ROWS_PER = packingList?.type === "ekspor" ? 10 : 5;

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
        satuan_unit: unitFromPL,  
        itemGroups: (packingList.items || []).map((group) => {
          const rolls = (group.rolls || []).map((r, idx) => ({
            roll_id: r.id,
            row_num: Math.floor(idx / ROWS_PER) + 1,
            col_num: (idx % ROWS_PER) + 1,
            col: r.col || group.col || "",
            item: r.so_item_id || group.so_item_id || "",
            meter: r.meter || "",
            yard: r.yard ?? (r.meter ? (r.meter * 1.093613) : null),
            //yard: r.yard || ((r.meter || 0) * 1.093613).toFixed(2),
            kilogram: r.kilogram || null,
            // Field Bal & Lot
            lot: r.lot ?? "",
            no_bal: r.no_bal ?? "",
          }));

          return {
            id: group.id, 
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

  // ==== SEGMEN FORMAT ====
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

  const formatNumberQty = (num, decimals = 2) => {
    const n = Number(num ?? 0);
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(isNaN(n) ? 0 : n);
  };

  const formatRollCellValue = (v) => {
    if (v === "" || v === null || v === undefined) return "";
    const n = Number(v);
    return n === 0 ? "" : formatNumber(n);
  };

  // =================================

  // Normalisasi tipe & fallback dari nomor SO
  const isEkspor = () => {
    const t = form()?.type;

    // normalisasi jadi huruf besar string
    const s = (t === undefined || t === null) ? "" : String(t).trim().toUpperCase();

    // true untuk 2 (angka/string), 'E', 'EKSPOR'
    if (s === "2" || s === "E" || s === "EKSPOR") return true;
    if (s === "1" || s === "D" || s === "DOMESTIK") return false;

    // fallback terakhir: baca dari No SO (format: .../E/... atau .../D/...)
    const noSO = form()?.sales_order_items?.no_so || "";
    const kodeSO = (noSO.split("/")[1] || "").toUpperCase();
    return kodeSO === "E";
  };

  // Kolom per baris mengikuti ekspor/domestik
  const MAX_COL_PER_ROW = () => (isEkspor() ? 10 : 5);

  // (4) Saat Sales Order berubah
  const handleSalesOrderChange = async (selectedSO) => {
    if (!selectedSO) return;

    // reset semua group & state pendukung SETIAP kali SO berubah
    setForm(prev => ({ ...prev, itemGroups: [] }));
    setOpenStates([]);          // tutup semua accordion/row state lama
    setGroupRollCounts([]);     // reset input jumlah roll per group
    setSoColors([]);            // akan diisi ulang dari SO baru

    let selectedOrder;

    if (isEdit) {
      // selectedSO = so_id (number) pada mode edit
      const res = await getSalesOrders(selectedSO, user?.token);
      selectedOrder = res?.order;

      setForm(prev => ({
        ...prev,
        sales_order_id: selectedSO,
        sales_order_items: selectedOrder,
        //satuan_unit: selectedOrder?.satuan_unit || "",
      }));
    } else {
      // selectedSO = object SO pada mode create
      const res = await getSalesOrders(selectedSO.id, user?.token);
      selectedOrder = res?.order;

      const soTypeLetter = (selectedSO.no_so || "").split("/")[1];
      const typeValue = soTypeLetter === "E" ? "E" : soTypeLetter === "D" ? "D" : "";
      const soPpn = (selectedSO.no_so || "").split("/")[2];
      const ppnValue = soPpn === "P" ? 1 : 0;

      const generatedNoPL = await generatePackingListNumber(typeValue, ppnValue);

      setForm(prev => ({
        ...prev,
        sales_order_id: selectedSO.id,
        type: typeValue,
        no_pl: generatedNoPL,
        sales_order_items: selectedOrder,
        satuan_unit: selectedOrder?.satuan_unit || "",
        itemGroups: [], // PASTIKAN kosong saat ganti SO
      }));
    }

    // bangun daftar warna dari SO baru
    const items = selectedOrder?.items || [];
    const colorMap = new Map();
    items.forEach((it) => {
      const id =
        it.warna_id ?? it.color_id ?? it.warna?.id ?? it.col_id ?? it.col ?? null;
      const kode =
        it.kode_warna ?? it.warna_kode ?? it.warna?.kode ?? it.col_kode ?? it.col ?? "";
      const deskripsi =
        it.deskripsi_warna ??
        it.warna_deskripsi ??
        it.warna?.deskripsi ??
        it.color_desc ??
        it.warna_kain ??
        "";
      if (id != null) {
        colorMap.set(String(id), { id, kode: String(kode || ""), deskripsi: String(deskripsi || "") });
      }
    });
    setSoColors(Array.from(colorMap.values()));
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

  // ==========================
  // === Perubahan utama:  ====
  // ==========================

  // helpers label (untuk tampil read-only)
  const colorLabel = (id) => {
    if (id == null || id === "") return "";
    const found = (soColors() || []).find(c => String(c.id) === String(id));
    if (!found) return "";
    const code = found.kode ? `${found.kode}` : "";
    const desc = found.deskripsi ? ` | ${found.deskripsi}` : "";
    return `${code}${desc}`.trim();
  };

  const itemLabel = (soItemId) => {
    const it = (form().sales_order_items?.items || []).find(x => String(x.id) === String(soItemId));
    if (!it) return "";
    return `${it.corak_kain} | ${it.konstruksi_kain}`;
  };

  // buat item group dari item SO (col & item terkunci)
  const soItemToGroup = (soItem) => ({
    sales_order_item_id: soItem.id,
    item: soItem.id,
    col: (
      soItem.warna_id ?? soItem.color_id ??
      soItem.warna?.id ?? soItem.col_id ?? soItem.col ?? ""
    ),
    meter_total: 0,
    yard_total: 0,
    kilogram_total: null,
    rolls: [
      {
        row_num: 1,
        col_num: 1,
        col: (
          soItem.warna_id ?? soItem.color_id ??
          soItem.warna?.id ?? soItem.col_id ?? soItem.col ?? ""
        ),
        item: soItem.id,
        meter: "",
        yard: "",
        kilogram: null,
        lot: null,
        no_bal: null,
      },
    ],
  });

  // tombol untuk menambah semua group dari SO
  const addGroupsFromSO = () => {
    const items = form().sales_order_items?.items || [];
    if (!items.length) return;

    setForm(prev => ({
      ...prev,
      itemGroups: [
        ...prev.itemGroups,
        ...items.map(soItem => soItemToGroup(soItem)),
      ],
    }));
  };

  // ==========================

  const addItemGroup = () => {
    // tidak dipakai dari UI, tetap dipertahankan demi struktur
    setForm((prev) => ({
      ...prev,
      itemGroups: [
        ...prev.itemGroups,
        {
          sales_order_item_id: "",
          col: "",
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
              kilogram: null,
              lot: null,
              no_bal: null,
            },
          ],
        },
      ],
    }));
    setOpenStates((prev) => [...prev, false]);
    setGroupRollCounts((prev) => [...prev, null]);
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
        row_num: Math.floor(index / MAX_COL_PER_ROW()) + 1,
        col_num: (index % MAX_COL_PER_ROW()) + 1,
        // yard: (meterValue * 1.093613).toFixed(2),
        // kilogram: roll.kilogram || null,
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
        (sum, r) => sum + (hasQty(r) ? Number(r.meter) : 0),
        0
      );
      copy[groupIndex].yard_total = rolls.reduce(
        (sum, r) => sum + (hasQty(r) ? Number(r.yard) : 0), 0
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
        col: lastRoll.col || group.col || "",
        item: lastRoll.item || group.item || "",
        meter: lastRoll.meter || "",
        yard: lastRoll.yard || "",
        lot: lastRoll.lot ?? null,
        no_bal: lastRoll.no_bal ?? null,
      }));

      copy[groupIndex] = {
        ...group,
        rolls: reindexRolls([...group.rolls, ...newRolls]),
      };

      return { ...prev, itemGroups: copy };
    });
  };

  const removeRoll = (groupIndex, rollIndex) => {
    setForm((prev) => {
      const copy = [...prev.itemGroups];

      // STRICT: kalau target roll existing, batalkan
      const target = copy?.[groupIndex]?.rolls?.[rollIndex];
      if (isEdit && isStrictWarehouseEdit() && target?.roll_id) {
        return prev;
      }

      const group = copy[groupIndex];
      if (!group || !Array.isArray(group.rolls)) return prev;

      const updatedRolls = [...group.rolls];
      updatedRolls.splice(rollIndex, 1);

      const meter_total = updatedRolls.reduce((sum, r) => sum + (hasQty(r) ? Number(r.meter || 0) : 0), 0);
      const yard_total  = updatedRolls.reduce((s, r) => s + (hasQty(r) ? Number(r.yard  || 0) : 0), 0);

      copy[groupIndex] = { ...group, rolls: reindexRolls(updatedRolls), meter_total, yard_total };
      return { ...prev, itemGroups: copy };
    });
  };

  const handleRollChange = (groupIndex, rollIndex, field, value) => {
    if (field === "col" || field === "item") return;

    setForm((prev) => {
      const groups = [...prev.itemGroups];
      const g = { ...groups[groupIndex] };
      let rolls = [...g.rolls];
      const r = { ...rolls[rollIndex] };

      // helper parse angka lokal -> number
      const parseNumeric = (val) => {
        if (typeof val !== "string") return Number(val) || 0;
        const cleaned = val.replace(/[^\d,.\-]/g, "").replace(",", ".");
        return parseFloat(cleaned) || 0;
      };

      if (field === "meter" || field === "yard") {
        const numeric = parseNumeric(value);

        if (!numeric || numeric <= 0) {
          // kosong / 0 -> tidak dihitung PCS
          r.meter = null;
          r.yard  = null;
        } else {
          if (form().satuan_unit === "Yard") {
            r.yard  = numeric;
            r.meter = numeric * 0.9144;
          } else {
            // default Meter
            r.meter = numeric;
            r.yard  = numeric * 1.093613;
          }
        }
        rolls[rollIndex] = r;

      } else if (field === "kilogram") {
        // KG berdiri sendiri (tanpa konversi m/yd)
        const numeric = parseNumeric(value);
        r.kilogram = numeric > 0 ? numeric : null;
        rolls[rollIndex] = r;

      } else if (field === "no_bal") {
        const rowNum = r.row_num ?? Math.floor(rollIndex / MAX_COL_PER_ROW()) + 1;
        const v = value === "" ? null : Number(value);
        rolls = rolls.map((x, idx) => {
          const rn = x.row_num ?? Math.floor(idx / MAX_COL_PER_ROW()) + 1;
          if (rn !== rowNum) return x;
          if (isEdit && isStrictWarehouseEdit() && x.roll_id) return x; // protect existing
          return { ...x, no_bal: v };
        });

      } else if (field === "lot") {
        const rowNum = r.row_num ?? Math.floor(rollIndex / MAX_COL_PER_ROW()) + 1;
        const v = value === "" ? null : Number(value);
        rolls = rolls.map((x, idx) => {
          const rn = x.row_num ?? Math.floor(idx / MAX_COL_PER_ROW()) + 1;
          if (rn !== rowNum) return x;
          if (isEdit && isStrictWarehouseEdit() && x.roll_id) return x; // protect existing
          return { ...x, lot: v };
        });

      } else {
        r[field] = value;
        rolls[rollIndex] = r;
      }

      // subtotal (yang dihitung hanya nilai > 0)
      const meter_total     = rolls.reduce((s, x) => s + ((Number(x?.meter) || 0) > 0 ? Number(x.meter) : 0), 0);
      const yard_total      = rolls.reduce((s, x) => s + ((Number(x?.yard)  || 0) > 0 ? Number(x.yard)  : 0), 0);
      const kilogram_total  = rolls.reduce((s, x) => s + (Number(x?.kilogram) || 0), 0) || null;

      g.rolls           = rolls;
      g.meter_total     = meter_total;
      g.yard_total      = yard_total;
      g.kilogram_total  = kilogram_total; // <<— simpan total KG ke group

      groups[groupIndex] = g;
      return { ...prev, itemGroups: groups };
    });
  };

  const UNIT_ID = { "Meter": 1, "Yard": 2, "Kilogram": 3 };
  const unitId = () => UNIT_ID[form().satuan_unit || "Meter"] || 1;

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isEdit) {
        // EDIT: kirim SEMUA roll, yang kosong -> 0
        const payload = {
          no_pl: form().no_pl,
          so_id: Number(form().sales_order_id),
          keterangan: form().keterangan,
          satuan_unit_pl_id: unitId(),
          items: form().itemGroups.map((g) => {
            const rollsWithIndex = g.rolls.map((r, idx) => {
              const row_num = Math.floor(idx / MAX_COL_PER_ROW()) + 1;
              const col_num = (idx % MAX_COL_PER_ROW()) + 1;

              const meterVal = Number(r.meter) || 0;
              const yardVal  = Number(r.yard)  || (meterVal > 0 ? meterVal * 1.093613 : 0);

              const roll = {
                row_num,
                col_num,
                meter: meterVal,
                yard: yardVal,
                kilogram: r.kilogram ? Number(r.kilogram) : null,
                lot: r.lot !== undefined && r.lot !== "" ? Number(r.lot) : null,
                no_bal: r.no_bal !== undefined && r.no_bal !== "" ? Number(r.no_bal) : null,
              };
              if (r.roll_id) roll.id = r.roll_id;
              return roll;
            });

            const meter_total = rollsWithIndex.reduce((sum, r) => sum + (r.meter > 0 ? r.meter : 0), 0);
            const yard_total  = rollsWithIndex.reduce((sum, r) => sum + (r.yard  > 0 ? r.yard  : 0), 0);
            const kilogram_total =
              rollsWithIndex.reduce((sum, r) => sum + (r.kilogram || 0), 0) || null;

            const first = g.rolls[0] || {};
            return {
              id: g.id,
              so_item_id: Number(g.item || first.item || 0),
              col: Number(g.col || first.col || 0),
              meter_total,
              yard_total,
              kilogram_total,
              rolls: rollsWithIndex,
            };
          }),
        };
        await updateDataPackingList(user?.token, params.id, payload);
      } else {
        // CREATE: juga kirim SEMUA roll, yang kosong -> 0
        const payload = {
          type: form().type === "D" ? "domestik" : form().type === "E" ? "ekspor" : "",
          sequence_number: form().sequence_number || null,
          so_id: Number(form().sales_order_id),
          keterangan: form().keterangan,
          satuan_unit_pl_id: unitId(),
          items: form().itemGroups.map((g) => {
            const rollsWithIndex = g.rolls.map((r, idx) => {
              const row_num = Math.floor(idx / MAX_COL_PER_ROW()) + 1;
              const col_num = (idx % MAX_COL_PER_ROW()) + 1;

              const meterVal = Number(r.meter) || 0;
              const yardVal  = Number(r.yard)  || (meterVal > 0 ? meterVal * 1.093613 : 0);

              return {
                row_num,
                col_num,
                meter: meterVal,
                yard: yardVal,
                kilogram: r.kilogram ? Number(r.kilogram) : null,
                lot: r.lot !== undefined && r.lot !== "" ? Number(r.lot) : null,
                no_bal: r.no_bal !== undefined && r.no_bal !== "" ? Number(r.no_bal) : null,
              };
            });

            const meter_total = rollsWithIndex.reduce((sum, r) => sum + (r.meter > 0 ? r.meter : 0), 0);
            const yard_total  = rollsWithIndex.reduce((sum, r) => sum + (r.yard  > 0 ? r.yard  : 0), 0);
            const kilogram_total =
              rollsWithIndex.reduce((sum, r) => sum + (r.kilogram || 0), 0) || null;

            const first = g.rolls[0] || {};
            return {
              so_item_id: Number(g.item || first.item || 0),
              col: Number(g.col || first.col || 0),
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
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => {
        navigate("/packinglist");
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

  function handlePrintA4() {
    localStorage.setItem("printData", JSON.stringify(form()));
    window.open("/print/packinglist?paper=A4", "_blank");
  }

  function handlePrintContinuous() {
    localStorage.setItem("printData", JSON.stringify(form()));
    window.open("/print/packinglist?paper=CONTINUOUS95", "_blank");
  }

  // ====== KOLOM DINAMIS: colgroup + table-fixed (UPDATED) ======
  const ROLL_COL_PX = () => (isEkspor() ? 66 : 68);   // kolom 1..N
  const BAL_PCT     = () => (isEkspor() ? "8%" : "9%");
  const COL_PCT     = () => (isEkspor() ? "11%" : "12%");
  const ITEM_PCT    = "15%";                           // tetap
  const LOT_PCT     = () => (isEkspor() ? "8%" : "9%");
  const PCS_PX      = () => (isEkspor() ? 80 : 56);    // TTL/PCS lebih lebar saat ekspor
  const TOTAL_PX    = () => (isEkspor() ? 120 : 96);   // TTL/MTR & TTL/YARD lebih lebar saat ekspor

  const renderColGroup = () => {
    const widths = [
      "3%",                 // No
      BAL_PCT(),            // Bal
      COL_PCT(),            // Col
      ITEM_PCT,             // Item
      LOT_PCT(),
      ...Array.from({ length: MAX_COL_PER_ROW() }, () => `${ROLL_COL_PX()}px`),
      `${PCS_PX()}px`,      // TTL/PCS
      `${TOTAL_PX()}px`,    // TTL/MTR
      `${TOTAL_PX()}px`,    // TTL/YARD
    ];

    return (
      <colgroup>
        <For each={widths}>
          {(w) => <col style={`width:${w}`} />}
        </For>
      </colgroup>
    );
  };
  // =============================================================

  return (
    <MainLayout>
      {loading() && (
        <div class="fixed inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-md bg-opacity-40 z-50 gap-10">
          <div class="w-52 h-52 border-[20px] border-white border-t-transparent rounded-full animate-spin"></div>
          <span class="animate-pulse text-[40px] text-white">Loading...</span>
        </div>
      )}
      <h1 class="text-2xl font-bold mb-4">
        {isView ? "Detail" : (isEdit ? "Edit" : "Tambah")} Packing List
      </h1>
      <div class="flex gap-2 mb-4" hidden={!isEdit}>
        <button
          type="button"
          class="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
          onClick={handlePrintA4}
          title="Cetak ke HVS A4"
        >
          <Printer size={20} />
          <span>Print</span>
        </button>

        <button
          type="button"
          class="flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded hover:bg-emerald-700"
          onClick={handlePrintContinuous}
          title={'Cetak ke Continuous 9.5" (rangkap 3)'}   /* <- pakai string literal JS */
        >
          <Printer size={20} />
          <span>Print Dot Matrix (Rangkap 3)</span>          
        </button>
      </div>

      <form class="space-y-4" onSubmit={handleSubmit}>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-sm mb-1">No Packing List</label>
            <div class="flex gap-2">
              <input
                class="w-full border bg-gray-200 p-2 rounded"
                value={form().no_pl}
                readOnly
              />
            </div>
          </div>
          <div>
            <label class="block text-sm mb-1">Sales Order</label>
            <SearchableSalesOrderSelect
              salesOrders={salesOrderList}
              form={form}
              setForm={setForm}
              filterType="packingList"
              onChange={handleSalesOrderChange}
              disabled={isView || isEdit}
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
          {/* NEW: Satuan Unit */}
          <div>
            <label class="block text-sm mb-1">Satuan Unit</label>
            <select
              class="w-full border p-2 rounded"
              value={form().satuan_unit || ""}
              onChange={(e) => setForm({ ...form(), satuan_unit: e.currentTarget.value })}
              disabled={isDisabled('non-roll')}
              classList={{ "bg-gray-200": isDisabled('non-roll') }}
            >
              <option value="" disabled>Pilih Satuan</option>  {/* ← placeholder */}
              <option value="Meter">Meter</option>
              <option value="Yard">Yard</option>
              {/* <option value="Kilogram">Kilogram</option> */}
            </select>
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
              disabled={isDisabled('non-roll')}
              classList={{ "bg-gray-200": isDisabled('non-roll') }}
            ></textarea>
          </div>
        </div>

        <Show when={form().sales_order_items?.items && form().sales_order_items.items.length > 0}>
          <div class="border p-3 rounded my-4 bg-gray-50">
            <h3 class="text-md font-bold mb-2 text-gray-700">Quantity Kain:</h3>
            <ul class="space-y-1 pl-5">
              <For each={form().sales_order_items.items}>
                {(item) => {
                  const meterTotal  = Number(item.meter_total ?? 0);
                  const yardTotal   = Number(item.yard_total  ?? 0);
                  const meterInProc = Number(item.meter_dalam_proses ?? 0);
                  const yardInProc  = Number(item.yard_dalam_proses  ?? 0);

                  const sisaMeter = Math.max(meterTotal - meterInProc, 0);
                  const sisaYard  = Math.max(yardTotal  - yardInProc,  0);
                  const habis     = sisaMeter === 0 && sisaYard === 0;

                  return (
                    <li class="text-sm list-disc">
                      <div class="flex flex-wrap items-baseline gap-x-2">
                        <span class="font-semibold">
                          {item.corak_kain} | {item.konstruksi_kain}
                        </span>
                        <span class="text-gray-500">—</span>
                        <span class="text-gray-700">Quantity:</span>

                        {habis ? (
                          <span class="font-bold text-red-600">HABIS</span>
                        ) : (
                          <>
                            <span class="font-bold text-blue-600 tabular-nums">{formatNumberQty(sisaMeter)} m</span>
                            <span class="text-gray-400">|</span>
                            <span class="font-bold text-blue-600 tabular-nums">{formatNumberQty(sisaYard)} yd</span>
                          </>
                        )}
                      </div>
                    </li>
                  );
                }}
              </For>
            </ul>
          </div>
        </Show>

        {/* Tombol global untuk menyalin SEMUA item dari SO */}
        <div class="mt-3">
          <button
            type="button"
            onClick={addGroupsFromSO}
            class="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700"
            hidden={isView || isStrictWarehouseEdit()}
          >
            + Tambah Item Group
          </button>
        </div>

        <div>
          <h2 class="text-lg font-bold mt-6 mb-2">Item Groups</h2>

          {/* Tombol per-group disembunyikan agar sumber group hanya dari SO */}
          <Show when={form().itemGroups.length === 0 && !isView}>
            <button
              type="button"
              onClick={() => addItemGroup()}
              class="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 mb-4"
              hidden={true}
            >
              + Tambah Item Group
            </button>
          </Show>

          <For each={form().itemGroups}>
            {(group, i) => (
              <div class="border p-4 rounded mb-6">
                <div
                  class="flex justify-between items-center mb-2 cursor-pointer"
                >
                  <h3 class="font-semibold">
                    Sales Order Item Group #{i() + 1}
                  </h3>
                  <div class="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => addItemGroup()}
                      class="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 text-sm"
                      hidden={true} // ⬅️ sembunyikan tombol per-group
                      title="Tambah Item Group"
                    >
                      + Tambah Item Group
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeItemGroup(i()); }}
                      class="text-red-600 hover:text-red-800 text-sm"
                      hidden={isView || isStrictWarehouseEdit()}
                      title="Hapus Group Ini"
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
                  </div>

                  <table class="w-full table-fixed border text-sm mt-2">
                    {renderColGroup()}
                    <thead class="bg-gray-100">
                      <tr>
                        <th class="border px-2 py-1">No</th>
                        <th class="border px-2 py-1">Bal</th>
                        <th class="border px-2 py-1">Col</th>
                        <th class="border px-2 py-1">Item</th>
                        <th class="border px-2 py-1">Lot</th>
                        <For each={Array.from({ length: MAX_COL_PER_ROW() }, (_, i) => i + 1)}>
                          {(n) => (
                            <th class="border px-2 py-1 text-center">{n}</th>
                          )}
                        </For>
                        <th class="border px-3 py-1 whitespace-nowrap">TTL/PCS</th>
                        <th class="border px-3 py-1 whitespace-nowrap" classList={{ "bg-gray-200": form().satuan_unit === "Yard" }}>
                          TTL/MTR
                        </th>
                        <th class="border px-3 py-1 whitespace-nowrap" classList={{ "bg-gray-200": form().satuan_unit === "Meter" }}>
                          TTL/YARD
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={chunkArrayWithIndex(group.rolls, MAX_COL_PER_ROW())}>
                        {(rollChunk, chunkIndex) => {
                          // <-- DI SINI taruh const-nya
                          const disabledRow = rowFieldDisabled(rollChunk);

                          return rollChunk.length > 0 && (
                            <tr>
                              <td class="border text-center align-top">
                                {chunkIndex() === 0 ? i() + 1 : ""}
                              </td>

                              {/* BAL */}
                              <td class="border p-1 align-middle">
                                <input
                                  type="number"
                                  class="border p-1 rounded w-full"
                                  value={rollChunk[0]?.roll.no_bal ?? ""}
                                  onBlur={(e) =>
                                    handleRollChange(i(), rollChunk[0].index, "no_bal", e.currentTarget.value)
                                  }
                                  disabled={disabledRow}
                                  classList={{ "bg-gray-200": disabledRow }}
                                  placeholder="Input Bal..."
                                />
                              </td>

                              {/* Col — read-only label */}
                              <td class="border p-1 align-middle">
                                {chunkIndex() === 0 ? (
                                  <input
                                    type="text"
                                    class="border p-1 rounded w-full bg-gray-200"
                                    value={colorLabel(rollChunk[0]?.roll.col || group.col || "") || "-"}
                                    readOnly
                                    title={colorLabel(rollChunk[0]?.roll.col || group.col || "") || "-"}
                                  />
                                ) : ("")}
                              </td>

                              {/* Item — read-only label */}
                              <td class="border p-1 align-middle">
                                {chunkIndex() === 0 ? (
                                  <input
                                    type="text"
                                    class="border p-1 rounded w-full bg-gray-200"
                                    value={itemLabel(rollChunk[0]?.roll.item || group.item || "") || "-"}
                                    readOnly
                                    title={itemLabel(rollChunk[0]?.roll.item || group.item || "") || "-"}
                                  />
                                ) : ("")}
                              </td>

                              {/* LOT — berlaku untuk seluruh roll pada baris tsb */}
                              <td class="border p-1 align-middle">
                                <input
                                  type="number"
                                  class="border p-1 rounded w-full"
                                  value={rollChunk[0]?.roll.lot ?? ""}
                                  onBlur={(e) => handleRollChange(i(), rollChunk[0].index, "lot", e.currentTarget.value)}
                                  disabled={disabledRow}
                                  classList={{ "bg-gray-200": disabledRow }}
                                  placeholder="Input Lot..."
                                />
                              </td>

                              <td class="border p-1 align-middle" colSpan={MAX_COL_PER_ROW()}>
                                <div class={`grid ${MAX_COL_PER_ROW() === 10 ? 'grid-cols-10' : 'grid-cols-5'} gap-1`}>
                                  <For each={rollChunk}>
                                    {(r) => {
                                      const unit = form().satuan_unit || "Meter";
                                      const { roll } = r;

                                      const value = unit === "Yard"
                                        ? formatRollCellValue(roll.yard)
                                        : unit === "Kilogram"
                                          ? formatRollCellValue(roll.kilogram)
                                          : formatRollCellValue(roll.meter);

                                      const field = unit === "Yard" ? "yard" : unit === "Kilogram" ? "kilogram" : "meter";
                                      const placeholder = unit === "Yard" ? "yd" : unit === "Kilogram" ? "kg" : "m";

                                      return (
                                        <div class="relative">
                                          <input
                                            type="text"
                                            inputmode="decimal"
                                            class="border w-full text-right text-[11px] leading-5 px-1 pr-6 rounded-sm"
                                            value={value}
                                            placeholder={placeholder}
                                            onBlur={(e) =>
                                              handleRollChange(i(), r.index, field, e.currentTarget.value)
                                            }
                                            disabled={isQtyDisabled(roll)}
                                            classList={{ "bg-gray-200": isQtyDisabled(roll) }}
                                          />
                                          <button
                                            type="button"
                                            class="absolute inset-y-0 right-0 px-1 flex items-center justify-center rounded-r-sm bg-red-500 text-white"
                                            onClick={() => removeRoll(i(), r.index)}
                                            hidden={isView || (isEdit && isStrictWarehouseEdit() && !!roll.roll_id)}
                                            title="Hapus roll ini"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      );
                                    }}
                                  </For>
                                </div>
                              </td>

                              <td class="border text-center align-top">
                                {rollChunk.filter((rc) => hasQty(rc.roll)).length}
                              </td>
                              <td class="border text-right px-3 align-top" classList={{ "bg-gray-200": form().satuan_unit === "Yard" }}>
                                {formatNumber(rollChunk.reduce((sum, r) => sum + (hasQty(r.roll) ? Number(r.roll.meter || 0) : 0),0))}
                              </td>
                              <td class="border text-right px-3 align-top" classList={{ "bg-gray-200": form().satuan_unit === "Meter" }}>
                                {formatNumber(rollChunk.reduce((sum, r) => sum + (hasQty(r.roll) ? Number(r.roll.yard  || 0) : 0),0))}
                              </td>
                            </tr>
                          )
                        }}
                      </For>

                      <tr>
                        <td
                          colSpan={5 + MAX_COL_PER_ROW()}
                          class="border px-2 py-1 font-semibold text-left"
                        >
                          Sub Total
                        </td>
                        <td class="border px-3 py-1 text-right">
                          {group.rolls.filter(hasQty).length}
                        </td>
                        <td class="border px-3 py-1 text-right" classList={{ "bg-gray-200": form().satuan_unit === "Yard" }}>
                          {formatNumber(group.rolls.reduce((sum, r) => sum + (hasQty(r) ? Number(r.meter || 0) : 0), 0))} m
                        </td>
                        <td class="border px-3 py-1 text-right" classList={{ "bg-gray-200": form().satuan_unit === "Meter" }}>
                          {formatNumber(group.rolls.reduce((sum, r) => sum + (hasQty(r) ? Number(r.yard  || 0) : 0), 0))} yd
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div class="mt-4 flex flex-wrap gap-2 items-center">
                    <input
                      type="number"
                      min="1"
                      class="border p-1 rounded w-24"
                      placeholder="Jumlah"
                      value={groupRollCounts()[i()] ?? ""}
                      onInput={(e) => {
                        const raw = e.currentTarget.value;
                        const val = raw === "" ? null : Number(raw);
                        setGroupRollCounts((prev) => {
                          const updated = [...prev];
                          updated[i()] = Number.isFinite(val) && val > 0 ? val : null;
                          return updated;
                        });
                      }}
                      hidden={isView}
                      disabled={isDisabled('add-roll')}
                      classList={{ "bg-gray-200": isDisabled('add-roll') }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const cached = groupRollCounts()[i()];
                        const count = cached == null ? 1 : cached;
                        addMultipleRolls(i(), count);
                        setGroupRollCounts((prev) => {
                          const updated = [...prev];
                          updated[i()] = null;
                          return updated;
                        });
                      }}
                      class="bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700"
                      hidden={isView}
                      disabled={isDisabled('add-roll')}
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
            <table class="w-full table-fixed border text-sm">
              {renderColGroup()}
              <thead class="bg-gray-200">
                <tr>
                  <th
                    class="border px-2 py-1 text-left"
                    colSpan={5 + MAX_COL_PER_ROW()}
                  >
                    Total
                  </th>
                  <th class="border px-2 py-1 text-right">
                    {form().itemGroups.reduce(
                      (acc, g) => acc + g.rolls.filter(hasQty).length,
                      0
                    )}
                  </th>
                  <th class="border px-2 py-1 text-right">
                      {formatNumber(form().itemGroups.flatMap(g => g.rolls).reduce((sum, r) => sum + (hasQty(r) ? Number(r.meter || 0) : 0), 0))} m
                  </th>
                  <th class="border px-2 py-1 text-right">
                      {formatNumber(form().itemGroups.flatMap(g => g.rolls).reduce((sum, r) => sum + (hasQty(r) ? Number(r.yard  || 0) : 0), 0))} yd
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
