import { createSignal, For, onMount, Show, createMemo } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  getUser,
  getKJDeliveryNotes,
  getAllKJDeliveryNotes,
  createFinishRetur,
  getFinishRetur,
  getLastSequence,
  updateDataFinishRetur,
  getAllFinishReturs, // ⬅️ tambahkan di utils/auth
} from "../../utils/auth";

import SuratPenerimaanDropdownSearch from "../../components/SuratPenerimaanDropdownSearch";
import { Printer, Trash2 } from "lucide-solid";

/* ===== Helpers qty/label ===== */
const toNum = (v) => (v === null || v === undefined ? 0 : Number(v)) || 0;

// Lengkapi itemLeft (hasil sisa) dengan label kain dari referensi (SJ.items / Retur.items)
function enrichLeftWithInfo(leftArr = [], referItems = []) {
  const keyOf = (it) => Number(it?.sj_item_id ?? it?.id);
  const byId = new Map((referItems || []).map((it) => [keyOf(it), it]));
  return (leftArr || []).map((l) => {
    const ref = byId.get(Number(l.sj_item_id));
    return {
      ...l,
      corak_kain: ref?.corak_kain ?? "N/A",
      konstruksi_kain: ref?.konstruksi_kain ?? "",
      deskripsi_warna: ref?.deskripsi_warna ?? ref?.keterangan_warna ?? "",
      lebar_greige: Number(ref?.lebar_greige) || 0,
      lebar_finish: Number(ref?.lebar_finish) || 0,
      harga_greige: Number(ref?.harga_greige) || 0,
      harga_maklun: Number(ref?.harga_maklun) || 0,
    };
  });
}

// Hitung sisa per sj_item_id untuk SJ tertentu berdasarkan semua retur KJ yang ada.
// Saat EDIT, retur yang sedang dibuka tidak ikut dihitung (includeCurrent=false).
async function computeAvailableForSJ(sjId, token, { includeCurrent = false, currentReturId = null } = {}) {
  // 1) Detail SJ → qty awal + label
  const sjRes = await getKJDeliveryNotes(sjId, token);
  const sj = sjRes?.suratJalan || sjRes?.order || sjRes;
  const sjItems = (sj?.items || []).filter((it) => !it?.deleted_at);

  // 2) Ambil semua retur KJ untuk SJ ini
  const all = await getAllFinishReturs?.(token);
  const rows = (all && Array.isArray(all.data) && all.data) || [];
  const sameSJ = rows
    .filter((r) => String(r.sj_id) === String(sjId))
    .filter((r) => includeCurrent || !currentReturId || String(r.id) !== String(currentReturId));

  // 3) Akumulasi qty retur per sj_item_id
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

  // 4) Bentuk “available” + label kain dari SJ
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
      deskripsi_warna: it.deskripsi_warna ?? it.keterangan_warna ?? "",
      lebar_greige: Number(it.lebar_greige) || 0,
      lebar_finish: Number(it.lebar_finish) || 0,
      harga_greige: Number(it.harga_greige) || 0,
      harga_maklun: Number(it.harga_maklun) || 0,
    };
  });
}

// Tambahkan __available_total__ ke item dropdown agar bisa hide SP yang sisa=0
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
        return { ...sj, __available_total__: Infinity };
      }
    })
  );
  return enriched;
}

/* ===== Component ===== */
export default function ReturKainJadiForm() {
  const [params] = useSearchParams();
  const isView = params.view === "true";
  const sjId = params.sj_id ? Number(params.sj_id) : null;
  const returId = params.id ? Number(params.id) : null;
  const navigate = useNavigate();
  const user = getUser();

  const [spOptions, setSpOptions] = createSignal([]);
  const [selectedSJId, setSelectedSJId] = createSignal(null);

  const [loading, setLoading] = createSignal(true);
  const [deliveryNoteData, setDeliveryNoteData] = createSignal(null);
  const [deletedItems, setDeletedItems] = createSignal([]);

  // Sisa (available) untuk SJ terpilih → panel preview
  const [availableItems, setAvailableItems] = createSignal([]);

  const [form, setForm] = createSignal({
    no_retur: "",
    no_sj_supplier: "",
    tanggal_kirim: "",
    alamat_pengiriman: "",
    unit: "Meter",
    keterangan_retur: "",
    itemGroups: [],
  });

  const totalMeter = createMemo(() =>
    form().itemGroups.reduce((sum, g) => sum + (Number(g.meter_total) || 0), 0)
  );
  const totalYard = createMemo(() =>
    form().itemGroups.reduce((sum, g) => sum + (Number(g.yard_total) || 0), 0)
  );
  const totalAll = createMemo(() =>
    form().itemGroups.reduce((sum, g) => {
      const qty = form().unit === "Meter" ? g.meter_total : g.yard_total;
      const hg = Number(g.item_details?.harga_greige) || 0;
      const hm = Number(g.item_details?.harga_maklun) || 0;
      return sum + (hg + hm) * (Number(qty) || 0);
    }, 0)
  );

  onMount(async () => {
    setLoading(true);
    try {
      const allSP = await getAllKJDeliveryNotes(user?.token);
      const rawList = Array.isArray(allSP?.suratJalans) ? allSP.suratJalans : [];
      const list = await annotateWithAvailableTotal(rawList, user?.token); // ⬅️ untuk hide HABIS
      setSpOptions(list);

      if (returId) {
        await prefillFromReturId(returId);
        return;
      }
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

  /* ===== Mappers ===== */
  function mapToItemGroupFromSJ(group) {
    return {
      id: group.id,
      sj_item_id: group.id,
      retur_item_id: null,
      purchase_order_item_id: group.po_item_id,
      item_details: {
        corak_kain: group.corak_kain ?? "N/A",
        konstruksi_kain: group.konstruksi_kain ?? "",
        deskripsi_warna: group.deskripsi_warna ?? group.keterangan_warna ?? "",
        lebar_greige: Number(group.lebar_greige) || 0,
        lebar_finish: Number(group.lebar_finish) || 0,
        harga_greige: Number(group.harga_greige) || 0,
        harga_maklun: Number(group.harga_maklun) || 0,
      },
      // TABEL saat CREATE → qty dari SJ (bukan sisa)
      meter_total: Number(group.meter_total) || 0,
      yard_total: Number(group.yard_total) || 0,
      gulung: Number(group.gulung) || 0,
      lot: Number(group.lot) || 0,
    };
  }

  function mapToItemGroupFromRetur(it) {
    return {
      id: it.sj_item_id ?? it.id,
      sj_item_id: it.sj_item_id ?? it.id,
      retur_item_id: it.id ?? null,
      purchase_order_item_id: it.po_item_id,
      item_details: {
        corak_kain: it.corak_kain ?? "N/A",
        konstruksi_kain: it.konstruksi_kain ?? "",
        deskripsi_warna: it.deskripsi_warna ?? it.keterangan_warna ?? "",
        lebar_greige: Number(it.lebar_greige) || 0,
        lebar_finish: Number(it.lebar_finish) || 0,
        harga_greige: Number(it.harga_greige) || 0,
        harga_maklun: Number(it.harga_maklun) || 0,
      },
      meter_total: Number(it.meter_total) || 0,
      yard_total: Number(it.yard_total) || 0,
      gulung: Number(it.gulung) || 0,
      lot: Number(it.lot) || 0,
    };
  }

  /* ===== Prefill ===== */
  async function prefillFromSPId(id) {
    const sjResponse = await getKJDeliveryNotes(id, user?.token);
    const sj = sjResponse?.suratJalan;
    if (!sj) {
      Swal.fire({ icon: "error", title: "Error", text: "Data Surat Penerimaan tidak ditemukan.", showConfirmButton: false, timer: 1500, timerProgressBar: true });
      return;
    }
    setDeliveryNoteData({ ...sj });

    // Hitung sisa dari retur-retur sebelumnya (tanpa retur saat ini)
    const left = await computeAvailableForSJ(sj.id, user?.token, { includeCurrent: false });
    setAvailableItems(left);

    setForm((prev) => ({
      ...prev,
      no_sj_supplier: sj.no_sj_supplier || "",
      alamat_pengiriman: sj.supplier_alamat || "",
      tanggal_kirim: sj.tanggal_kirim ? new Date(sj.tanggal_kirim).toISOString().split("T")[0] : "",
      unit: sj.satuan_unit_name || sj.satuan_unit || "Meter",
      itemGroups: (sj.items || []).map(mapToItemGroupFromSJ),
    }));
  }

  async function prefillFromReturId(id) {
    const res = await getFinishRetur(id, user?.token);
    const detail = Array.isArray(res?.data) ? res.data[0] : res?.data;
    if (!detail) {
      Swal.fire({ icon: "error", title: "Error", text: "Data Retur tidak ditemukan.", showConfirmButton: false, timer: 1500, timerProgressBar: true });
      return;
    }

    setDeliveryNoteData({ ...detail });
    setSelectedSJId(detail.sj_id ?? null);

    // itemLeft dari API → lengkapi label pakai detail.items
    // 🔧 Ambil referensi label dari Surat Penerimaan (lengkap), bukan dari retur items.
    let referItems = [];
    try {
      if (detail.sj_id) {
        const sjRes = await getKJDeliveryNotes(detail.sj_id, user?.token);
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
      no_sj_supplier: detail.no_sj_supplier || "",
      alamat_pengiriman: detail.supplier_alamat || "",
      tanggal_kirim: detail.tanggal_kirim ? new Date(detail.tanggal_kirim).toISOString().split("T")[0] : "",
      unit: detail.satuan_unit_name || detail.satuan_unit || "Meter",
      keterangan_retur: detail.keterangan_retur || "",
      itemGroups: (detail.items || []).map(mapToItemGroupFromRetur),
    }));
  }

  const handleSuratPenerimaanChange = async (sj) => {
    try {
      setSelectedSJId(sj?.id ?? null);
      if (!sj?.id) return;
      await prefillFromSPId(sj.id);
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Gagal memuat detail Surat Penerimaan", text: err?.message || "", showConfirmButton: false, timer: 1500, timerProgressBar: true });
    } finally {
      setLoading(false);
    }
  };

  /* ===== Helpers ===== */
  const handleGenerateNoRetur = async () => {
    try {
      const ppnValue = Number(deliveryNoteData()?.ppn_percent || 0);
      const seq = await getLastSequence(user?.token, "kj_r", "domestik", ppnValue);
      const nextNum = String((seq?.last_sequence || 0) + 1).padStart(5, "0");
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yy = String(now.getFullYear()).slice(2);
      const flag = ppnValue > 0 ? "P" : "N";
      setForm((prev) => ({ ...prev, no_retur: `RT/KJ/${flag}/${mm}${yy}-${nextNum}` }));
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: "error", title: "Tidak bisa generate No Retur", text: e?.message || "", showConfirmButton: false, timer: 1500, timerProgressBar: true });
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
      const sjRes = await getKJDeliveryNotes(sj_id, user?.token);
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
    return new Intl.NumberFormat("id-ID", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(v);
  };
  const parseNumber = (str) => {
    if (typeof str !== "string" || !str) return 0;
    const cleaned = str.replace(/[^\d,.-]/g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };
  const formatHarga = (val) =>
    val === null || val === ""
      ? ""
      : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 2 }).format(val);

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

  const buildItemsPayload = () =>
    form().itemGroups.map((g) => {
      const base = {
        sj_item_id: g.sj_item_id,
        gulung: Number(g.gulung) || 0,
        meter_total: Number(g.meter_total) || 0,
        yard_total: Number(g.yard_total) || 0,
      };
      return g.retur_item_id ? { id: g.retur_item_id, ...base } : base;
    });

  /* ===== Submit ===== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSJId()) {
      Swal.fire({ icon: "error", title: "Gagal", text: "Pilih Surat Penerimaan terlebih dahulu.", showConfirmButton: false, timer: 1500, timerProgressBar: true });
      return;
    }
    if (!form().no_retur?.trim() && !returId) {
      await handleGenerateNoRetur();
      if (!form().no_retur?.trim()) return;
    }
    if (form().itemGroups.length === 0) {
      Swal.fire({ icon: "error", title: "Gagal", text: "Harap tambahkan minimal satu item.", showConfirmButton: false, timer: 1500, timerProgressBar: true });
      return;
    }
    const hasQty = form().itemGroups.some((g) => Number(g.meter_total) > 0 || Number(g.yard_total) > 0);
    if (!hasQty) {
      Swal.fire({ icon: "error", title: "Gagal", text: "Jumlah (meter/yard) masih 0 semua.", showConfirmButton: false, timer: 1500, timerProgressBar: true });
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
        await updateDataFinishRetur(user?.token, returId, payload);
        await Swal.fire({ icon: "success", title: "Berhasil diubah", text: "Retur Kain Jadi berhasil diupdate!", showConfirmButton: false, timer: 1000, timerProgressBar: true });
      } else {
        await createFinishRetur(user?.token, payload);
        await Swal.fire({ icon: "success", title: "Berhasil disimpan", text: "Retur Kain Jadi berhasil disimpan!", showConfirmButton: false, timer: 1000, timerProgressBar: true });
      }
      navigate("/retur-kainjadi");
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Gagal", text: err?.message || (returId ? "Gagal mengubah Retur Kain Jadi." : "Gagal menyimpan Retur Kain Jadi."), showConfirmButton: false, timer: 1500, timerProgressBar: true });
    }
  };

  function handlePrint() {
    if (!deliveryNoteData()) {
      Swal.fire({ icon: "error", title: "Gagal", text: "Pilih data dulu untuk cetak.", showConfirmButton: false, timer: 1500, timerProgressBar: true });
      return;
    }
    const dataToPrint = { ...deliveryNoteData() };
    const encodedData = encodeURIComponent(JSON.stringify(dataToPrint));
    window.open(`/print/retur-kainjadi#${encodedData}`, "_blank");
  }

  const pageTitle = () => {
    if (returId && isView) return "Detail Retur Kain Jadi";
    if (returId && !isView) return "Edit Retur Kain Jadi";
    return "Tambah Retur Kain Jadi";
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
        {/* Row 1 */}
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-sm mb-1">No Retur</label>
            <div class="flex gap-2">
              <input class="w-full border p-2 rounded bg-gray-200" value={form().no_retur} disabled />
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
            <label class="block text-sm mb-1">Surat Penerimaan Kain Jadi</label>
            <SuratPenerimaanDropdownSearch
              items={spOptions()}
              value={selectedSJId()}
              onChange={handleSuratPenerimaanChange}
              showLots
              disabled={isView || !!returId}
              placeholder="Pilih Surat Penerimaan…"
              excludeZeroAvailable   // ⬅️ hide SP yang total available = 0
            />
          </div>

          <div>
            <label class="block text-sm mb-1">No Surat Jalan Supplier</label>
            <input class="w-full border p-2 rounded bg-gray-200" value={form().no_sj_supplier} disabled />
          </div>
        </div>

        {/* Row 2 */}
        <div class="grid grid-cols-3 gap-4">
          <div class="col-span-1">
            <label class="block text-sm mb-1">Alamat Pengiriman</label>
            <input class="w-full border p-2 rounded bg-gray-200" value={form().alamat_pengiriman} disabled />
          </div>
          <div>
            <label class="block text-sm mb-1">Tanggal Pengiriman</label>
            <input type="date" class="w-full border p-2 rounded bg-gray-200" value={form().tanggal_kirim} disabled />
          </div>
        </div>

        {/* Catatan */}
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

        {/* PREVIEW Available */}
        <Show when={deliveryNoteData()}>
          {() => {
            const unit = deliveryNoteData()?.satuan_unit_name || form().unit || "Meter";
            const items = availableItems();
            return (
              <div class="border p-3 rounded my-4 bg-gray-50">
                <h3 class="text-md font-bold mb-2 text-gray-700">
                  Quantity Kain pada Surat Penerimaan{returId ? " (Available)" : ""}:
                </h3>
                <ul class="space-y-1 pl-5">
                  <For each={items}>
                    {(row) => {
                      const sisa = unit === "Meter" ? toNum(row.available_meter ?? row.meter_awal) : toNum(row.available_yard ?? row.yard_awal);
                      const awal = unit === "Meter" ? toNum(row.meter_awal) : toNum(row.yard_awal);
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
                              {returId ? `${formatNumber(sisa)} / ${formatNumber(awal)} ${satuan}` : `${formatNumber(sisa)} ${satuan}`}
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

        {/* TABLE */}
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
                <th class="border p-2">Warna</th>
                <th class="border p-2 w-48">Lebar Greige</th>
                <th class="border p-2 w-48">Lebar Finish</th>
                <th class="border p-2 w-50">{form().unit}</th>
                <th class="border p-2 w-32">Gulung</th>
                <th class="border p-2 w-32">Lot</th>
                <th hidden class="border p-2 w-48">Harga Greige</th>
                <th hidden class="border p-2 w-48">Harga Celup</th>
                <th hidden class="border p-2 w-48">Subtotal</th>
                <th class="border p-2 w-48">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <Show when={form().itemGroups.length > 0}>
                <For each={form().itemGroups}>
                  {(group, i) => {
                    const qty = form().unit === "Meter" ? group.meter_total : group.yard_total;
                    const hg = Number(group.item_details?.harga_greige) || 0;
                    const hm = Number(group.item_details?.harga_maklun) || 0;
                    const subtotal = (hg + hm) * (Number(qty) || 0);

                    return (
                      <tr>
                        <td class="border p-2 text-center">{i() + 1}</td>
                        <td class="border w-72 p-2">
                          <input class="border p-1 rounded w-full bg-gray-200" value={`${group.item_details?.corak_kain || ""} | ${group.item_details?.konstruksi_kain || ""}`} disabled />
                        </td>
                        <td class="border p-2">
                          <input class="border p-1 rounded w-full bg-gray-200" value={group.item_details?.deskripsi_warna} disabled />
                        </td>
                        <td class="border p-2">
                          <input type="number" class="border p-1 rounded w-full bg-gray-200" value={group.item_details?.lebar_greige} disabled />
                        </td>
                        <td class="border p-2">
                          <input type="number" class="border p-1 rounded w-full bg-gray-200" value={group.item_details?.lebar_finish} disabled />
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
                        <td class="border p-2">
                          <input type="number" class="w-full border p-2 rounded text-right bg-gray-200" value={group.gulung ?? 0} disabled />
                        </td>
                        <td class="border p-2">
                          <input type="number" class="w-full border p-2 rounded text-right bg-gray-200" value={group.lot ?? 0} disabled />
                        </td>
                        <td hidden class="border p-2 text-right">
                          <input class="w-full border p-2 rounded text-right" value={formatHarga(group.item_details?.harga_greige)} disabled />
                        </td>
                        <td hidden class="border p-2 text-right">
                          <input class="w-full border p-2 rounded text-right" value={formatHarga(group.item_details?.harga_maklun)} disabled />
                        </td>
                        <td hidden class="border p-2 text-right font-semibold">
                          <input class="w-full border p-2 rounded text-right" value={formatHarga(subtotal)} disabled />
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
                <td colSpan="5" class="text-right p-2 border-t border-gray-300">TOTAL</td>
                <td class="border p-2 text-right">
                  {form().unit === "Meter" ? formatNumber(totalMeter(), 2) : formatNumber(totalYard(), 2)}
                </td>
                <td hidden class="border p-2 text-right">{/* {formatHarga(totalAll())} */}</td>
                <td hidden class="border-t border-gray-300"></td>
                <td class="border-t border-gray-300" colSpan="3"></td>
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
