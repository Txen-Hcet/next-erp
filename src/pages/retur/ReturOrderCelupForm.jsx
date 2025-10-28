import { createSignal, For, onMount, Show, createMemo } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  getUser,
  getOCDeliveryNotes,
  getAllOCDeliveryNotes,
  getLastSequence,
  createCelupRetur,
  getCelupRetur,
  updateDataCelupRetur,
  getAllCelupReturs,
} from "../../utils/auth";

import SuratPenerimaanDropdownSearch from "../../components/SuratPenerimaanDropdownSearch";
import { Printer, Trash2 } from "lucide-solid";

const toNum = (v) => (v === null || v === undefined ? 0 : Number(v)) || 0;

// Hitung sisa per sj_item_id untuk SJ tertentu dengan melihat semua retur celup existing.
// includeCurrent=false artinya saat EDIT, retur yang sedang dibuka tidak ikut dihitung (supaya panel "Available" valid).
async function computeAvailableForSJ(
  sjId, 
  token, 
  { includeCurrent = false, currentReturId = null } = {},
  allRetursData= null,
  sjData = null,
) {
  // 1) Ambil detail SJ → sumber qty awal + label kain
  let sj;
  if(sjData){
    sj = sjData?.suratJalan || sjData?.order || sjData;
  } else{
    const sjRes = await getOCDeliveryNotes(sjId, token);
    sj = sjRes?.suratJalan || sjRes?.order || sjRes;
  }
  const sjItems = (sj?.items || []).filter((it) => !it?.deleted_at);

  // 2) Ambil semua retur celup, pilih yang sj_id sama
  const all = allRetursData
    ? { data: allRetursData }
    : await getAllFinishReturs?.(token);
  const rows = (all && Array.isArray(all.data) && all.data) || [];

  const sameSJ = rows
    .filter((r) => String(r.sj_id) === String(sjId))
    .filter(
      (r) =>
        includeCurrent ||
        !currentReturId ||
        String(r.id) !== String(currentReturId)
    );

  // 3) Akumulasi total retur per sj_item_id
  const returned = new Map(); // sj_item_id -> {meter, yard}
  for (const r of sameSJ) {
    const items = Array.isArray(r.items) ? r.items : [];
    for (const it of items) {
      const key = it.sj_item_id ?? it.id;
      const prev = returned.get(key) || { meter: 0, yard: 0 };
      returned.set(key, {
        meter: prev.meter + toNum(it.meter_total),
        yard:  prev.yard  + toNum(it.yard_total),
      });
    }
  }

  // 4) Bentuk “available” per item SJ + LABEL kainnya (biar gak "N/A")
  const result = sjItems.map(it => {
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
      po_item_id: it.po_item_id ?? null,
      // label kain:
      corak_kain: it.corak_kain ?? "N/A",
      konstruksi_kain: it.konstruksi_kain ?? "",
      deskripsi_warna: it.deskripsi_warna ?? it.keterangan_warna ?? "",
      lebar_greige: Number(it.lebar_greige) || 0,
      lebar_finish: Number(it.lebar_finish) || 0,
      harga: Number(it.harga) || 0,
    };
  });

  return result;
}

// hitung total available (mengikuti satuan SP)
async function annotateWithAvailableTotal(list, allRetursData, token) {
  const enriched = await Promise.all(
    (list || []).map(async (sj) => {
      try {
        const left = await computeAvailableForSJ(sj.id, token, { 
          includeCurrent: true 
        },
          allRetursData,
          sj,
        );
        const unit = sj.satuan_unit_name || sj.satuan_unit || "Meter";
        const total = left.reduce((sum, r) => {
          return sum + (unit === "Meter" ? toNum(r.available_meter) : toNum(r.available_yard));
        }, 0);
        return { ...sj, __available_total__: total };
      } catch (e) {
        console.warn("annotateWithAvailableTotal failed for SJ", sj?.id, e);
        return { ...sj, __available_total__: Infinity }; // fallback: jangan sembunyikan
      }
    })
  );
  return enriched;
}

export default function ReturOrderCelupForm() {
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
  const [allRetursCache, setAllRetursCache] = createSignal([]);
  const [allSJsCacheMap, setAllSJsCacheMap] = createSignal(new Map());

  const [availableItems, setAvailableItems] = createSignal([]); // itemLeft khusus SJ terpilih

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
      const harga = Number(g.item_details?.harga) || 0;
      return sum + harga * (Number(qty) || 0);
    }, 0)
  );

  onMount(async () => {
    setLoading(true);
    try {
      const allSP = await getAllOCDeliveryNotes(user?.token);
      const rawList = Array.isArray(allSP?.suratJalans) ? allSP.suratJalans
                    : Array.isArray(allSP?.data)       ? allSP.data
                    : [];
      // ← tambahkan total available
      const allRetursRes = await getAllCelupReturs?.(user?.token);
      const allRetursData =
        (allRetursRes && Array.isArray(allRetursRes.data) && allRetursRes.data) ||
        [];
      setAllRetursCache(allRetursData);

      const sjMap = new Map(rawList.map((sj) => [Number(sj.id), sj]));
      setAllSJsCacheMap(sjMap);      

      const list = await annotateWithAvailableTotal(
        rawList,
        allRetursData,
        user?.token
      ); 
      setSpOptions(list);      

      if (returId) {
        await prefillFromReturId(returId, sjMap);
        return;
      }
      if (sjId) {
        const sjData = sjMap.get(Number(sjId));
        await prefillFromSPId(sjId, allRetursData, sjData);
        setSelectedSJId(sjId);
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", err?.message || "Gagal memuat data.", "error");
    } finally {
      setLoading(false);
    }
  });

  // ============= MAPPERS =============
  function mapToItemGroupFromSJ(group) {
    return {
      id: group.id,
      sj_item_id: group.id,
      retur_item_id: null,
      purchase_order_item_id: group.po_item_id ?? group.purchase_order_item_id ?? null,
      item_details: {
        corak_kain: group.corak_kain ?? "N/A",
        konstruksi_kain: group.konstruksi_kain ?? "",
        deskripsi_warna: group.deskripsi_warna ?? "",
        lebar_greige: Number(group.lebar_greige) || 0,
        lebar_finish: Number(group.lebar_finish) || 0,
        harga: Number(group.harga) || 0, // opsional
      },
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
      purchase_order_item_id: it.po_item_id ?? it.purchase_order_item_id ?? null,
      item_details: {
        corak_kain: it.corak_kain ?? "N/A",
        konstruksi_kain: it.konstruksi_kain ?? "",
        deskripsi_warna: it.deskripsi_warna ?? "",
        lebar_greige: Number(it.lebar_greige) || 0,
        lebar_finish: Number(it.lebar_finish) || 0,
        harga: Number(it.harga) || 0,
      },
      meter_total: Number(it.meter_total) || 0,
      yard_total: Number(it.yard_total) || 0,
      gulung: Number(it.gulung) || 0,
      lot: Number(it.lot) || 0,
    };
  }

  function enrichLeftWithInfo(leftArr = [], sjItems = []) {
    // Kunci harus sj_item_id kalau ada (EDIT/VIEW), kalau tidak ada pakai id (TAMBAH)
    const keyOf = (it) => Number(it?.sj_item_id ?? it?.id);
    const byId = new Map((sjItems || []).map(it => [keyOf(it), it]));

    return (leftArr || []).map(l => {
      const ref = byId.get(Number(l.sj_item_id));   // ← left selalu punya sj_item_id
      return {
        ...l,
        corak_kain: ref?.corak_kain ?? "N/A",
        konstruksi_kain: ref?.konstruksi_kain ?? "",
        deskripsi_warna: ref?.deskripsi_warna ?? ref?.keterangan_warna ?? "",
        lebar_greige: Number(ref?.lebar_greige) || 0,
        lebar_finish: Number(ref?.lebar_finish) || 0,
        harga: Number(ref?.harga) || 0,
      };
    });
  }

  // ============= PREFILL =============
  async function prefillFromSPId(id, allRetursData = null, sjData= null) {
    let sj;
    if(sjData){
      sj = sjData?.suratJalan || sjData?.order || sjData;
    } else{
      const sjResponse = await getOCDeliveryNotes(id, user?.token);
      sj = sjResponse?.suratJalan || sjResponse?.order || sjResponse;
    }

    //console.log("Data SP OC: ", JSON.stringify(sjRes, null, 2));

    if (!sj) {
      Swal.fire("Error", "Data Surat Penerimaan Order Celup tidak ditemukan.", "error");
      return;
    }

    setDeliveryNoteData({ ...sj });

    const retursToUse = allRetursData ?? allRetursCache();

    // Sisa dihitung dari total retur yang sudah ada (tanpa retur saat ini).
    const left = await computeAvailableForSJ(sj.id, user?.token, { 
      includeCurrent: false, 
    },
      retursToUse,
      sj,  
    );
    setAvailableItems(left);

    const unitName = sj.satuan_unit_name || sj.satuan_unit || "Meter";

    // map item SJ → baris tabel, tetapi qty = sisa (available)
    const bySJItemId = new Map(left.map((r) => [Number(r.sj_item_id), r]));
    const rows = (sj.items || [])
      .filter((g) => !g?.deleted_at)
      .map((g) => {
        const sisa = bySJItemId.get(Number(g.id));
        return {
          id: g.id,
          sj_item_id: g.id,
          retur_item_id: null,
          purchase_order_item_id: g.po_item_id ?? g.purchase_order_item_id ?? null,
          item_details: {
            corak_kain: g.corak_kain ?? "N/A",
            konstruksi_kain: g.konstruksi_kain ?? "",
            deskripsi_warna: g.deskripsi_warna ?? "",
            lebar_greige: Number(g.lebar_greige) || 0,
            lebar_finish: Number(g.lebar_finish) || 0,
            harga: Number(g.harga) || 0,
          },
          // QTY TABEL = QTY DARI SJ (biar tidak berubah ke 'available')
          meter_total: toNum(g.meter_total),
          yard_total:  toNum(g.yard_total),
          gulung: Number(g.gulung) || 0,
          lot: Number(g.lot) || 0,
        };
      });

    setForm((prev) => ({
      ...prev,
      no_sj_supplier: sj.no_sj_supplier || "",
      alamat_pengiriman: sj.supplier_alamat || sj.alamat_pengiriman || "",
      tanggal_kirim: sj.tanggal_kirim
        ? new Date(sj.tanggal_kirim).toISOString().split("T")[0]
        : (sj.created_at ? new Date(sj.created_at).toISOString().split("T")[0] : ""),
      unit: unitName,
      itemGroups: rows,
    }));
  }

  async function prefillFromReturId(id) {
    const res = await getCelupRetur(id, user?.token);
    const detail = Array.isArray(res?.data) ? res.data[0] : res?.data;

    //console.log("Retur Celup per ID: ", JSON.stringify(detail, null, 2));

    if (!detail) {
      Swal.fire("Error", "Data Retur Order Celup tidak ditemukan.", "error");
      return;
    }

    setDeliveryNoteData({ ...detail });
    setSelectedSJId(detail.sj_id ?? null);

    // 🔧 Ambil referensi label dari Surat Penerimaan (lengkap), bukan dari retur items.
    let referItems = [];
    try {
      if (detail.sj_id) {
        let sj = sjMap.get(Number(detail.sj_id));
        if(!sj){
          const sjRes = await getOCDeliveryNotes(detail.sj_id, user?.token);
          sj = sjRes?.suratJalan || sjRes?.order || sjRes;
        }
        referItems = (sj?.items || []).filter((it) => !it?.deleted_at);
      }
    } catch (e) {
      console.error("Gagal ambil referensi SJ untuk enrich itemLeft:", e);
    }
    const enrichedLeft = enrichLeftWithInfo(detail.itemLeft || [], detail.items || []);
    setAvailableItems(enrichedLeft);

    setForm((prev) => ({
      ...prev,
      no_retur: detail.no_retur || "",
      no_sj_supplier: detail.no_sj_supplier || detail.no_sj || "",
      alamat_pengiriman: detail.supplier_alamat || detail.alamat_pengiriman || "",
      tanggal_kirim: detail.tanggal_kirim
        ? new Date(detail.tanggal_kirim).toISOString().split("T")[0]
        : "",
      unit: detail.satuan_unit_name || detail.satuan_unit || "Meter",
      keterangan_retur: detail.keterangan_retur || "",
      itemGroups: (detail.items || []).map(mapToItemGroupFromRetur),
    }));
  }

  const handleSuratPenerimaanChange = async (sj) => {
    try {
      setSelectedSJId(sj?.id ?? null);
      setForm((prev) => ({ ...prev, no_retur: "" }));
      if (!sj?.id) return;

      const sjData = allSJsCacheMap().get(Number(sj.id));
      await prefillFromSPId(sj.id, allRetursCache(), sjData);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", err?.message || "Gagal memuat detail Surat Penerimaan.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ============= HELPERS =============
  // Generate RT/OC/{P|N}/{mmyy}-{seq} (seq berdasarkan PPN via getLastSequence "oc_r")
  const handleGenerateNoRetur = async () => {
    try {
      const ppnValue = Number(deliveryNoteData()?.ppn_percent || 0);
      const seq = await getLastSequence(user?.token, "oc_r", "domestik", ppnValue);
      const nextNum = String((seq?.last_sequence || 0) + 1).padStart(5, "0");

      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yy = String(now.getFullYear()).slice(2);
      const flag = ppnValue > 0 ? "P" : "N";
      const nomor = `RT/OC/${flag}/${mm}${yy}-${nextNum}`;
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
      let sj = allSJsCacheMap().get(Number(sj_id));
      if(!sj){
        const sjRes = await getOCDeliveryNotes(sj_id, user?.token);
        sj = sjRes?.suratJalan || sjRes?.order || sjRes;
      }
      const sjItems = (sj?.items || []).filter((it) => !it?.deleted_at);

      // 2) Hitung item yang masih tersedia (exclude retur yang sedang diedit)
      const available = await computeAvailableForSJ(sj_id, user?.token, { 
        includeCurrent: false, 
        currentReturId: returId 
      },
        allRetursCache(),
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

  const handleGulungChange = (index, value) => {
    const numValue = parseNumber(value);
    setForm((prev) => {
      const arr = [...prev.itemGroups];
      arr[index] = { ...arr[index], gulung: numValue };
      return { ...prev, itemGroups: arr };
    });
  };

  const handleLotChange = (index, value) => {
    const numValue = parseNumber(value);
    setForm((prev) => {
      const arr = [...prev.itemGroups];
      arr[index] = { ...arr[index], lot: numValue };
      return { ...prev, itemGroups: arr };
    });
  };

  // Builder payload (qty berubah)
  const buildItemsPayload = () =>
    form().itemGroups.map((g) => {
      const base = {
        sj_item_id: g.sj_item_id,
        gulung: Number(g.gulung) || 0,
        meter_total: Number(g.meter_total) || 0,
        yard_total: Number(g.yard_total) || 0,
      };
      if (g.retur_item_id) return { id: g.retur_item_id, ...base };
      return base;
    });

  // ============= SUBMIT =============

  const handleKeyDown = (e) => {
    const tag = e.target.tagName;
    const type = e.target.type;

    if (
      e.key === "Enter" &&
      tag !== "TEXTAREA" &&
      type !== "submit" &&
      type !== "button"
    ) {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedSJId()) {
      Swal.fire("Gagal", "Pilih Surat Penerimaan terlebih dahulu.", "error");
      return;
    }

    if (!form().no_retur?.trim() && !returId) {
      await handleGenerateNoRetur();
      if (!form().no_retur?.trim()) return;
    }

    if (form().itemGroups.length === 0) {
      Swal.fire("Gagal", "Harap tambahkan minimal satu item.", "error");
      return;
    }

    const hasQty = form().itemGroups.some(
      (g) => Number(g.meter_total) > 0 || Number(g.yard_total) > 0
    );
    if (!hasQty) {
      Swal.fire("Gagal", "Jumlah (meter/yard) masih 0 semua.", "error");
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
        await updateDataCelupRetur(user?.token, returId, payload);
        await Swal.fire({
          icon: "success",
          title: "Berhasil diubah",
          text: "Retur Order Celup berhasil diupdate!",
          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
        });
      } else {
        //console.log("Create RETUR OC: ", JSON.stringify(payload, null, 2));
        await createCelupRetur(user?.token, payload);
        await Swal.fire({
          icon: "success",
          title: "Berhasil disimpan",
          text: "Retur Order Celup berhasil disimpan!",
          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
        });
      }

      navigate("/retur-ordercelup");
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text:
          err?.message ||
          (returId ? "Gagal mengubah Retur Order Celup." : "Gagal menyimpan Retur Order Celup."),
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
      });
    }
  };

  function handlePrint() {
    if (!deliveryNoteData()) {
      Swal.fire("Gagal", "Pilih data dulu untuk cetak.", "error");
      return;
    }
    const dataToPrint = { ...deliveryNoteData() };
    const encodedData = encodeURIComponent(JSON.stringify(dataToPrint));
    window.open(`/print/retur-ordercelup#${encodedData}`, "_blank");
  }

  const pageTitle = () => {
    if (returId && isView) return "Detail Retur Order Celup";
    if (returId && !isView) return "Edit Retur Order Celup";
    return "Tambah Retur Order Celup";
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

      <form class="space-y-4" onSubmit={handleSubmit} onkeydown={handleKeyDown}>
        {/* Row 1 */}
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-sm mb-1">No Retur</label>
            <div class="flex gap-2">
              <input
                class="w-full border p-2 rounded bg-gray-200"
                value={form().no_retur}
                disabled={true}
                // placeholder="RT/OC/…"
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
            <label class="block text-sm mb-1">Surat Penerimaan Order Celup</label>
            <SuratPenerimaanDropdownSearch
              items={spOptions()}
              value={selectedSJId()}
              onChange={handleSuratPenerimaanChange}
              disabled={isView || !!returId}
              placeholder="Pilih Surat Penerimaan…"
              showLots
              excludeZeroAvailable
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

        {/* Preview Quantity */}
        <Show when={deliveryNoteData()}>
          {() => {
            const unit = deliveryNoteData()?.satuan_unit_name || form().unit || "Meter";
            const items = availableItems(); // selalu dari itemLeft (hasil fetch)

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

        {/* Tabel Items (struktur dipertahankan) */}
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
                    const harga = Number(group.item_details?.harga) || 0;
                    const subtotal = harga * (Number(qty) || 0);

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
                          <input class="border p-1 rounded w-full bg-gray-200" value={group.item_details?.deskripsi_warna || ""} disabled />
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
                          <input
                            type="number"
                            placeholder="Banyak gulung…"
                            class="w-full border p-2 rounded text-right"
                            value={group.gulung ?? 0}
                            onBlur={(e) => handleGulungChange(i(), e.target.value)}
                            disabled={isView}
                            classList={{ "bg-gray-200": isView }}
                          />
                        </td>

                        <td class="border p-2">
                          <input
                            type="number"
                            placeholder="Input lot…"
                            class="w-full border p-2 rounded text-right"
                            value={group.lot ?? 0}
                            onBlur={(e) => handleLotChange(i(), e.target.value)}
                            disabled={true}
                            classList={{ "bg-gray-200": true }}
                          />
                        </td>

                        <td hidden class="border p-2 text-right">
                          <input class="w-full border p-2 rounded text-right" value={formatHarga(group.item_details?.harga)} disabled />
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
                <td hidden class="border p-2 text-right">{formatHarga(totalAll())}</td>
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
