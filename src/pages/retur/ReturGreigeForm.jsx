import { createSignal, For, onMount, Show, createMemo } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  getUser,
  getBGDeliveryNotes,        // detail Surat Penerimaan Greige by id
  getAllBGDeliveryNotes,     // list SP Greige untuk dropdown
  getLastSequence,           // generator nomor retur
  createGreigeRetur,         // POST create
  getGreigeRetur,            // GET by id (prefill edit/view)
  updateDataGreigeRetur,     // PUT update
  getAllGreigeReturs,        // ⬅️ tambahkan di utils seperti OC (dipakai hitung sisa)
} from "../../utils/auth";
import SuratPenerimaanDropdownSearch from "../../components/SuratPenerimaanDropdownSearch";
import { Printer, Trash2 } from "lucide-solid";

/* ===== Utils qty & label ===== */
const toNum = (v) => (v === null || v === undefined ? 0 : Number(v)) || 0;

// Lengkapi itemLeft (hasil hitung sisa) dengan label kain dari SJ.items/Retur.items
function enrichLeftWithInfo(leftArr = [], referItems = []) {
  // referItems bisa dari SJ.items (create) atau Retur.items (edit)
  const keyOf = (it) => Number(it?.sj_item_id ?? it?.id);
  const byId = new Map((referItems || []).map((it) => [keyOf(it), it]));
  return (leftArr || []).map((l) => {
    const ref = byId.get(Number(l.sj_item_id));
    return {
      ...l,
      corak_kain: ref?.corak_kain ?? "N/A",
      konstruksi_kain: ref?.konstruksi_kain ?? "",
      lebar_greige: Number(ref?.lebar_greige) || 0,
      harga: Number(ref?.harga) || 0,
    };
  });
}

// Hitung sisa “available” per sj_item_id untuk satu SJ dengan mengakumulasikan semua retur.
// Saat EDIT, retur yang sedang dibuka TIDAK dihitung (supaya “Available” akurat).
async function computeAvailableForSJ(sjId, token, { includeCurrent = false, currentReturId = null } = {}) {
  // 1) Ambil detail SJ → sumber qty awal + label kain
  const sjRes = await getBGDeliveryNotes(sjId, token);
  const sj = sjRes?.suratJalan ?? sjRes?.surat_jalan ?? sjRes?.order ?? sjRes;
  const sjItems = (sj?.items || []).filter((it) => !it?.deleted_at);

  // 2) Ambil SEMUA retur greige utk SJ ini
  const all = await getAllGreigeReturs?.(token);
  const rows = (all && Array.isArray(all.data) && all.data) || [];
  const sameSJ = rows
    .filter((r) => String(r.sj_id) === String(sjId))
    .filter((r) => includeCurrent || !currentReturId || String(r.id) !== String(currentReturId));

  // 3) Akumulasi qty yang sudah diretur per sj_item_id
  const returned = new Map(); // sj_item_id -> {meter, yard}
  for (const r of sameSJ) {
    const items = Array.isArray(r.items) ? r.items : [];
    for (const it of items) {
      const key = Number(it.sj_item_id ?? it.id);
      const prev = returned.get(key) || { meter: 0, yard: 0 };
      returned.set(key, {
        meter: prev.meter + toNum(it.meter_total),
        yard:  prev.yard  + toNum(it.yard_total),
      });
    }
  }

  // 4) Bentuk array sisa + label dari SJ
  return sjItems.map((it) => {
    const key = Number(it.id);
    const ret = returned.get(key) || { meter: 0, yard: 0 };
    const meter_awal = toNum(it.meter_total);
    const yard_awal  = toNum(it.yard_total);
    return {
      sj_item_id: key,
      meter_awal,
      yard_awal,
      available_meter: Math.max(meter_awal - ret.meter, 0),
      available_yard: Math.max(yard_awal  - ret.yard,  0),
      // label:
      corak_kain: it.corak_kain ?? "N/A",
      konstruksi_kain: it.konstruksi_kain ?? "",
      lebar_greige: Number(it.lebar_greige) || 0,
      harga: Number(it.harga) || 0,
    };
  });
}

// Tambahkan __available_total__ untuk filter dropdown (hide jika 0)
async function annotateWithAvailableTotal(list, token) {
  const enriched = await Promise.all(
    (Array.isArray(list) ? list : []).map(async (sj) => {
      try {
        const left = await computeAvailableForSJ(sj.id, token, { includeCurrent: true });
        const unit = sj.satuan_unit_name || sj.satuan_unit || "Meter";
        const total = (left || []).reduce((sum, r) => {
          return sum + (unit === "Meter" ? toNum(r.available_meter) : toNum(r.available_yard));
        }, 0);
        return { ...sj, __available_total__: total };
      } catch {
        // kalau gagal hitung, jangan sembunyikan
        return { ...sj, __available_total__: Infinity };
      }
    })
  );
  return enriched;
}

/* ===== Komponen ===== */
export default function ReturGreigeForm() {
  const [params] = useSearchParams();
  const isView = params.view === "true";
  const sjId = params.sj_id ? Number(params.sj_id) : null;
  const returId = params.id ? Number(params.id) : null;

  const navigate = useNavigate();
  const user = getUser();

  // Dropdown options + pilihan
  const [spOptions, setSpOptions] = createSignal([]);
  const [selectedSJId, setSelectedSJId] = createSignal(null);

  const [loading, setLoading] = createSignal(true);
  const [deliveryNoteData, setDeliveryNoteData] = createSignal(null); // detail SP/Retur
  const [deletedItems, setDeletedItems] = createSignal([]);

  // Sisa (available) khusus SJ terpilih → dipakai untuk panel preview
  const [availableItems, setAvailableItems] = createSignal([]);

  const [form, setForm] = createSignal({
    // header
    no_retur: "",
    // prefill dari SP Greige
    no_sj_supplier: "",
    tanggal_kirim: "",
    supplier_kirim_alamat: "",
    unit: "Meter",
    // catatan retur user
    keterangan_retur: "",
    // tabel items
    itemGroups: [],
  });

  const totalMeter = createMemo(() =>
    form().itemGroups.reduce((sum, g) => sum + (Number(g.meter_total) || 0), 0)
  );
  const totalYard = createMemo(() =>
    form().itemGroups.reduce((sum, g) => sum + (Number(g.yard_total) || 0), 0)
  );

  onMount(async () => {
    setLoading(true);
    try {
      // 1) List semua SP Greige untuk dropdown
      const allSP = await getAllBGDeliveryNotes(user?.token);
      const rawList =
        allSP?.suratJalans ??
        allSP?.surat_jalan_list ??
        allSP?.data ??
        [];
      // tambahkan total available agar dropdown bisa hide yang HABIS
      const list = await annotateWithAvailableTotal(rawList, user?.token);
      setSpOptions(Array.isArray(list) ? list : []);

      if (returId) {
        // MODE EDIT / VIEW
        await prefillFromReturId(returId);
        return;
      }

      // 2) Prefill jika datang dengan sj_id (MODE CREATE dari SP)
      if (sjId) {
        await prefillFromSPId(sjId);
        setSelectedSJId(sjId);
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err?.message || "Gagal memuat data.",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
      });
    } finally {
      setLoading(false);
    }
  });

  // ===================== MAPPERS =====================

  // Dari SJ → item group (untuk CREATE)
  function mapToItemGroupFromSJ(group) {
    return {
      id: group.id,
      sj_item_id: group.id,
      retur_item_id: null,
      purchase_order_item_id: group.po_item_id ?? group.purchase_order_item_id ?? null,
      item_details: {
        corak_kain: group.corak_kain ?? "N/A",
        konstruksi_kain: group.konstruksi_kain ?? "",
        lebar_greige: Number(group.lebar_greige) || 0,
        harga: Number(group.harga) || 0,
      },
      meter_total: Number(group.meter_total) || 0,
      yard_total: Number(group.yard_total) || 0,
    };
  }

  // Dari data Retur → item group (untuk EDIT/VIEW)
  function mapToItemGroupFromRetur(it) {
    return {
      id: it.sj_item_id ?? it.id,
      sj_item_id: it.sj_item_id ?? it.id,
      retur_item_id: it.id ?? null,
      purchase_order_item_id: it.po_item_id ?? it.purchase_order_item_id ?? null,
      item_details: {
        corak_kain: it.corak_kain ?? "N/A",
        konstruksi_kain: it.konstruksi_kain ?? "",
        lebar_greige: Number(it.lebar_greige) || 0,
        harga: Number(it.harga) || 0,
      },
      meter_total: Number(it.meter_total) || 0,
      yard_total: Number(it.yard_total) || 0,
    };
  }

  // ===================== PREFILL =====================

  // Prefill dari SP id (dipanggil saat memilih dropdown / query sj_id)
  async function prefillFromSPId(id) {
    const sjResponse = await getBGDeliveryNotes(id, user?.token);
    const suratJalanData =
      sjResponse?.suratJalan ??
      sjResponse?.surat_jalan ??
      sjResponse?.order ??
      null;

    if (!suratJalanData) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Data Surat Penerimaan Greige tidak ditemukan.",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
      });
      return;
    }

    setDeliveryNoteData({ ...suratJalanData });

    // Hitung “available” (sisa) dari retur-retur sebelumnya
    const left = await computeAvailableForSJ(suratJalanData.id, user?.token, { includeCurrent: false });
    setAvailableItems(left);

    // unit biasanya ikut satuan PO / SP
    const unitName = suratJalanData?.satuan_unit_name || suratJalanData?.satuan_unit || "Meter";

    // TABEL: qty tetap dari SP (bukan sisa)
    setForm((prev) => ({
      ...prev,
      no_sj_supplier: suratJalanData.no_sj_supplier || "",
      supplier_kirim_alamat:
        suratJalanData.supplier_kirim_alamat ||
        suratJalanData.supplier_alamat ||
        "",
      tanggal_kirim: suratJalanData.tanggal_kirim
        ? new Date(suratJalanData.tanggal_kirim).toISOString().split("T")[0]
        : "",
      unit: unitName,
      itemGroups: (suratJalanData.items || []).map((g) => mapToItemGroupFromSJ(g)),
    }));
  }

  // Prefill dari Retur id (EDIT/VIEW)
  async function prefillFromReturId(id) {
    const res = await getGreigeRetur(id, user?.token);
    const detail = Array.isArray(res?.data) ? res.data[0] : res?.data;
    if (!detail) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Data Retur Greige tidak ditemukan.",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
      });
      return;
    }

    setDeliveryNoteData({ ...detail });
    setSelectedSJId(detail.sj_id ?? null);

    // itemLeft dari API → enrich label pakai detail.items (punya sj_item_id)
    let referItems = [];
    try {
      if (detail.sj_id) {
        const sjRes = await getBGDeliveryNotes(detail.sj_id, user?.token);
        const sj = sjRes?.suratJalan || sjRes?.order || sjRes;
        referItems = (sj?.items || []).filter((it) => !it?.deleted_at);
      }
    } catch (e) {
      console.error("Gagal ambil referensi SJ untuk enrich itemLeft:", e);
    }
    const enrichedLeft = enrichLeftWithInfo(detail.itemLeft || [], referItems);
    setAvailableItems(enrichedLeft);

    setForm((prev) => ({
      ...prev,
      no_retur: detail.no_retur || "",
      no_sj_supplier: detail.no_sj_supplier || detail.no_sj || "",
      supplier_kirim_alamat:
        detail.supplier_kirim_alamat ||
        detail.supplier_alamat ||
        "",
      tanggal_kirim: detail.tanggal_kirim
        ? new Date(detail.tanggal_kirim).toISOString().split("T")[0]
        : "",
      unit: detail.satuan_unit_name || detail.satuan_unit || "Meter",
      keterangan_retur: detail.keterangan_retur || "",
      itemGroups: (detail.items || []).map(mapToItemGroupFromRetur),
    }));
  }

  // Pilih dari dropdown
  const handleSuratPenerimaanChange = async (sj) => {
    try {
      setSelectedSJId(sj?.id ?? null);
      if (!sj?.id) return;
      await prefillFromSPId(sj.id);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Gagal memuat detail Surat Penerimaan",
        text: err?.message || "",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // ===================== HELPERS =====================

  // Generate No Retur (Greige) pakai flag P/N dari PPN
  const handleGenerateNoRetur = async () => {
    try {
      const ppnValue = Number(deliveryNoteData()?.ppn_percent || 0);
      const seq = await getLastSequence(user?.token, "bg_r", "domestik", ppnValue);
      const nextNum = String((seq?.last_sequence || 0) + 1).padStart(5, "0");

      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yy = String(now.getFullYear()).slice(2);
      const flag = ppnValue > 0 ? "P" : "N";

      const nomor = `RT/BG/${flag}/${mm}${yy}-${nextNum}`;
      setForm((prev) => ({ ...prev, no_retur: nomor }));
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: "error",
        title: "Tidak bisa generate No Retur",
        text: e?.message || "",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
      });
    }
  };

  async function addMoreItemsFromSJ() {
    try {
      const sj_id =
        selectedSJId() ||
        deliveryNoteData()?.sj_id ||
        deliveryNoteData()?.id;

      if (!sj_id) {
        await Swal.fire("Tidak bisa", "Surat Penerimaan belum dipilih.", "warning");
        return;
      }

      // 1) Detail SJ untuk ambil info lengkap item
      const sjRes = await getBGDeliveryNotes(sj_id, user?.token);
      const sj = sjRes?.suratJalan || sjRes?.order || sjRes;
      const sjItems = (sj?.items || []).filter((it) => !it?.deleted_at);

      // 2) Hitung item yang masih tersedia (exclude retur yang sedang diedit)
      const available = await computeAvailableForSJ(
        sj_id,
        user?.token,
        { includeCurrent: false, currentReturId: returId }
      );

      // Set sj_item_id yang masih punya sisa > 0
      const unit = sj?.satuan_unit_name || sj?.satuan_unit || "Meter";
      const availableSet = new Set(
        available
          .filter((r) =>
            unit === "Meter"
              ? toNum(r.available_meter) > 0
              : toNum(r.available_yard) > 0
          )
          .map((r) => Number(r.sj_item_id))
      );

      // 3) Hindari duplikasi: kumpulkan sj_item_id yang sudah ada di retur sekarang
      const existingSet = new Set((form().itemGroups || []).map((g) => Number(g.sj_item_id)));

      // 4) Kandidat = item SJ yang masih available & belum ada di tabel
      const candidates = sjItems.filter(
        (it) => availableSet.has(Number(it.id)) && !existingSet.has(Number(it.id))
      );

      if (candidates.length === 0) {
        await Swal.fire("Info", "Tidak ada item tersedia untuk ditambahkan.", "info");
        return;
      }

      // 5) Map ke baris tabel (qty awal 0 → user isi manual)
      const newRows = candidates.map((g) => {
        const row = mapToItemGroupFromSJ(g);
        row.meter_total = 0;
        row.yard_total = 0;
        row.gulung = toNum(row.gulung);
        row.lot = toNum(row.lot);
        return row;
      });

      // 6) Tambah ke form
      setForm((prev) => ({
        ...prev,
        itemGroups: [...prev.itemGroups, ...newRows],
      }));
    } catch (err) {
      console.error(err);
      await Swal.fire("Gagal", err?.message || "Tidak bisa menambahkan item dari SJ.", "error");
    }
  }  

  const removeItem = (index) => {
    setForm((prev) => {
      const arr = [...prev.itemGroups];
      const [removed] = arr.splice(index, 1);
      if (removed?.retur_item_id) setDeletedItems((d) => [...d, removed.retur_item_id]);
      return { ...prev, itemGroups: arr };
    });
  };

  const formatNumber = (num, decimals = 2) => {
    if (num === "" || num === null || num === undefined) return "";
    const v = Number(num);
    if (Number.isNaN(v)) return "";
    if (v === 0) return "0";
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(v);
  };

  const parseNumber = (str) => {
    if (typeof str !== "string" || !str) return 0;
    const cleaned = str.replace(/[^\d,.-]/g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  const formatHarga = (val) =>
    val === null || val === ""
      ? ""
      : new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 2,
        }).format(val);

  const handleQuantityChange = (index, value) => {
    const unit = form().unit;
    const numValue = parseNumber(value);
    setForm((prev) => {
      const arr = [...prev.itemGroups];
      const row = { ...arr[index] };
      if (unit === "Meter") {
        row.meter_total = numValue;
        row.yard_total = numValue * 1.093613;
      } else {
        row.yard_total = numValue;
        row.meter_total = numValue / 1.093613;
      }
      arr[index] = row;
      return { ...prev, itemGroups: arr };
    });
  };

  // Builder payload CREATE/UPDATE (hanya QTY yg berubah)
  const buildItemsPayload = () =>
    form().itemGroups.map((g) => {
      const base = {
        sj_item_id: g.sj_item_id,
        meter_total: Number(g.meter_total) || 0,
        yard_total: Number(g.yard_total) || 0,
      };
      if (g.retur_item_id) return { id: g.retur_item_id, ...base };
      return base;
    });

  // ===================== SUBMIT =====================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedSJId()) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Pilih Surat Penerimaan terlebih dahulu.",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
      });
      return;
    }

    // auto-generate bila kosong (hanya create)
    if (!form().no_retur?.trim() && !returId) {
      await handleGenerateNoRetur();
      if (!form().no_retur?.trim()) return;
    }

    if (form().itemGroups.length === 0) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Harap tambahkan minimal satu item.",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
      });
      return;
    }

    const hasQty = form().itemGroups.some(
      (g) => Number(g.meter_total) > 0 || Number(g.yard_total) > 0
    );
    if (!hasQty) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Jumlah (meter/yard) masih 0 semua.",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
      });
      return;
    }

    const payload = {
      no_retur: form().no_retur.trim(),
      sj_id: selectedSJId(),
      keterangan_retur: form().keterangan_retur || "",
      items: buildItemsPayload(),
    };

    try {
      if (returId) {
        await updateDataGreigeRetur(user?.token, returId, payload);
        await Swal.fire({
          icon: "success",
          title: "Berhasil diubah",
          text: "Retur Greige berhasil diupdate!",
          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
        });
      } else {
        await createGreigeRetur(user?.token, payload);
        await Swal.fire({
          icon: "success",
          title: "Berhasil disimpan",
          text: "Retur Greige berhasil disimpan!",
          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
        });
      }

      navigate("/retur-greige");
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: err?.message || (returId ? "Gagal mengubah Retur Greige." : "Gagal menyimpan Retur Greige."),
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
      });
    }
  };

  function handlePrint() {
    if (!deliveryNoteData()) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Pilih data dulu untuk cetak.",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
      });
      return;
    }
    const dataToPrint = { ...deliveryNoteData() };
    const encodedData = encodeURIComponent(JSON.stringify(dataToPrint));
    window.open(`/print/retur-greige#${encodedData}`, "_blank");
  }

  const pageTitle = () => {
    if (returId && isView) return "Detail Retur Greige";
    if (returId && !isView) return "Edit Retur Greige";
    return "Tambah Retur Greige";
  };

  return (
    <MainLayout>
      {loading() && (
        <div class="fixed inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-md bg-opacity-40 z-50 gap-10">
          <div class="w-52 h-52 border-[20px] border-white border-t-transparent rounded-full animate-spin"></div>
          <span class="animate-pulse text-[40px] text-white">Loading...</span>
        </div>
      )}

      <h1 class="text-2xl font-bold mb-4">{pageTitle()}</h1>

      <button
        type="button"
        class="flex gap-2 bg-blue-600 text-white px-3 py-2 mb-4 rounded hover:bg-green-700"
        onClick={handlePrint}
        hidden={!returId}
      >
        <Printer size={20} /> Print
      </button>

      <form class="space-y-4" onSubmit={handleSubmit}>
        {/* === Row 1 === */}
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-sm mb-1">No Retur</label>
            <div class="flex gap-2">
              <input
                class="w-full border p-2 rounded bg-gray-200"
                value={form().no_retur}
                disabled={true}
              />
              <button
                type="button"
                class="bg-gray-300 text-sm px-2 rounded hover:bg-gray-400"
                onClick={handleGenerateNoRetur}
                hidden={isView || !!returId}
                title="Generate nomor retur"
              >
                Generate
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm mb-1">Surat Penerimaan Greige</label>
            <SuratPenerimaanDropdownSearch
              items={spOptions()}
              value={selectedSJId()}
              onChange={handleSuratPenerimaanChange}
              disabled={isView || !!returId}
              placeholder="Pilih Surat Penerimaan…"
              //showLots
              excludeZeroAvailable   // ⬅️ hide SP yang sisa total = 0
            />
          </div>

          <div>
            <label class="block text-sm mb-1">No Surat Jalan Supplier</label>
            <input
              class="w-full border p-2 rounded bg-gray-200"
              value={form().no_sj_supplier}
              disabled
            />
          </div>
        </div>

        {/* === Row 2 === */}
        <div class="grid grid-cols-3 gap-4">
          <div class="col-span-1">
            <label class="block text-sm mb-1">Alamat Pengiriman</label>
            <input
              class="w-full border p-2 rounded bg-gray-200"
              value={form().supplier_kirim_alamat}
              disabled
            />
          </div>

          <div>
            <label class="block text-sm mb-1">Tanggal Pengiriman</label>
            <input
              type="date"
              class="w-full border p-2 rounded bg-gray-200"
              value={form().tanggal_kirim}
              disabled
            />
          </div>
        </div>

        {/* Catatan Retur */}
        <div>
          <label class="block text-sm mb-1">Catatan Retur</label>
          <textarea
            class="w-full border p-2 rounded"
            value={form().keterangan_retur}
            onInput={(e) => setForm({ ...form(), keterangan_retur: e.target.value })}
            disabled={isView}
            classList={{ "bg-gray-200": isView }}
            placeholder="Tulis catatan retur"
          />
        </div>

        {/* === PREVIEW Available === */}
        <Show when={deliveryNoteData()}>
          {() => {
            const unit = deliveryNoteData()?.satuan_unit_name || form().unit || "Meter";
            const items = availableItems();
            return (
              <div class="border p-3 rounded my-4 bg-gray-50">
                <h3 class="text-md font-bold mb-2 text-gray-700">
                  Quantity Kain pada Surat Penerimaan{returId ? " (Tersedia)" : ""}:
                </h3>
                <ul class="space-y-1 pl-5">
                  <For each={items}>
                    {(row) => {
                      const sisa = unit === "Meter"
                        ? toNum(row.available_meter ?? row.meter_awal)
                        : toNum(row.available_yard  ?? row.yard_awal);
                      const awal = unit === "Meter"
                        ? toNum(row.meter_awal)
                        : toNum(row.yard_awal);
                      const satuan = unit === "Meter" ? "m" : "yd";
                      const habis = sisa <= 0;

                      return (
                        <li class="text-sm list-disc">
                          <span class="font-semibold">
                            {(row.corak_kain || "N/A")} | {(row.konstruksi_kain || "")}
                          </span>{" "}
                          - Quantity:{" "}
                          {habis ? (
                            <span class="font-bold text-red-600">HABIS</span>
                          ) : (
                            <span class="font-bold text-blue-600">
                              {returId
                                ? `${formatNumber(sisa)} / ${formatNumber(awal)} ${satuan}`
                                : `${formatNumber(sisa)} ${satuan}`}
                            </span>
                          )}
                        </li>
                      );
                    }}
                  </For>
                </ul>
              </div>
            );
          }}
        </Show>

        {/* === Tabel Items === */}
        <div>
          <h2 class="text-lg font-bold mt-6 mb-2">Items</h2>

          <Show when={returId && !isView}>
            <button
              type="button"
              class="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 mb-4"
              onClick={addMoreItemsFromSJ}
              title="Tambah item dari Surat Penerimaan"
            >
              Tambah Item
            </button>
          </Show>

          <table class="w-full text-sm border border-gray-300 mb-4">
            <thead class="bg-gray-100">
              <tr>
                <th class="border p-2 w-10">#</th>
                <th class="border p-2 w-100">Jenis Kain</th>
                <th class="border p-2 w-48">Lebar Greige</th>
                <th class="border p-2 w-50">{form().unit}</th>
                <th hidden class="border p-2 w-48">Harga</th>
                <th hidden class="border p-2 w-48">Subtotal</th>
                <th class="border p-2 w-48">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <Show when={form().itemGroups.length > 0}>
                <For each={form().itemGroups}>
                  {(group, i) => {
                    const qty = form().unit === "Meter" ? group.meter_total : group.yard_total;
                    const subtotal = (Number(group.item_details?.harga) || 0) * (Number(qty) || 0);

                    return (
                      <tr>
                        <td class="border p-2 text-center">{i() + 1}</td>
                        <td class="border w-72 p-2">
                          <input
                            class="border p-1 rounded w-full bg-gray-200"
                            value={`${group.item_details?.corak_kain || ""} | ${group.item_details?.konstruksi_kain || ""}`}
                            disabled
                          />
                        </td>
                        <td class="border p-2">
                          <input
                            type="number"
                            class="border p-1 rounded w-full bg-gray-200"
                            value={group.item_details?.lebar_greige}
                            disabled
                          />
                        </td>
                        <td class="border p-2">
                          <input
                            type="text"
                            class="w-full border p-2 rounded text-right"
                            value={formatNumber(qty)}
                            onBlur={(e) => handleQuantityChange(i(), e.target.value)}
                            disabled={isView}
                            classList={{ "bg-gray-200": isView }}
                          />
                        </td>
                        <td hidden class="border p-2 text-right">
                          <input
                            class="w-full border p-2 rounded text-right"
                            value={formatHarga(group.item_details?.harga)}
                            disabled
                          />
                        </td>
                        <td hidden class="border p-2 text-right font-semibold">
                          <input
                            class="w-full border p-2 rounded text-right"
                            value={formatHarga(subtotal)}
                            disabled
                          />
                        </td>
                        <td class="border p-2 text-center">
                          <button
                            type="button"
                            class="text-red-600 hover:text-red-800 disabled:cursor-not-allowed"
                            onClick={() => removeItem(i())}
                            disabled={isView || !!returId}
                          >
                            <Trash2 size={20} />
                          </button>
                        </td>
                      </tr>
                    );
                  }}
                </For>
              </Show>
            </tbody>
            <tfoot>
              <tr class="font-bold bg-gray-100">
                <td colSpan="3" class="text-right p-2 border-t border-gray-300">TOTAL</td>
                <td class="border p-2 text-right">
                  {form().unit === "Meter" ? formatNumber(totalMeter(), 2) : formatNumber(totalYard(), 2)}
                </td>
                <td hidden class="border p-2 text-right"></td>
                <td hidden class="border-t border-gray-300"></td>
                <td class="border-t border-gray-300"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="mt-6">
          <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" hidden={isView}>
            {returId ? "Update" : "Simpan"}
          </button>
        </div>
      </form>
    </MainLayout>
  );
}
