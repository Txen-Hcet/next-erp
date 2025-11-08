// src/pages/retur/ReturSalesForm.jsx
import {
  createSignal,
  createMemo,
  For,
  Show,
  onMount,
  createEffect,
} from "solid-js";
import { useSearchParams, useNavigate } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  getAllDeliveryNotes,
  getDeliveryNotes,
  getLastSequence,
  getUser,
  createSalesRetur,
  updateDataSalesRetur,
  getSalesRetur,
  hasAnyPermission,
} from "../../utils/auth";
import SuratJalanDropdownSearch from "../../components/SuratJalanDropdownSearch";
import { Printer } from "lucide-solid";

/**
 * Skema perilaku:
 * - CREATE  : roll yang dipilih -> kirim sj_roll_selected_status = 1
 * - VIEW    : tampilkan roll dengan sj_roll_selected_status = 1 (milik retur ini)
 * - EDIT    : pre-check roll milik retur ini yang sj_roll_selected_status = 1
 * - Roll milik retur LAIN yang sudah dipilih (sj_roll_selected_status = 1) disembunyikan di CREATE/EDIT.
 * - Jika SEMUA roll di SJ sudah sj_roll_selected_status = 1 -> SJ disembunyikan dari dropdown.
 */

export default function ReturSalesForm() {
  const [params] = useSearchParams();
  const isView = params.view === "true";
  const returId = Number(params.id);
  const isEdit = Number.isFinite(returId) && !isView;
  const navigate = useNavigate();
  const user = getUser();

  const [sjOptions, setSjOptions] = createSignal([]);
  const [selectedSJId, setSelectedSJId] = createSignal(null);

  const [loading, setLoading] = createSignal(true);
  const [sjDetail, setSjDetail] = createSignal(null);
  const [returData, setReturData] = createSignal(null);
  const [showFinance, setShowFinance] = createSignal(false);

  // Map<sji_roll_id, boolean> — true = dicentang (akan DIRETUR)
  const [returChecked, setReturChecked] = createSignal(new Map());

  // data bantu saat EDIT
  const [returExistingRollIds, setReturExistingRollIds] = createSignal(
    new Set()
  ); // Set<number>
  const [returExistingByItem, setReturExistingByItem] = createSignal(new Map()); // Map<sj_item_id, Set<roll_id>>
  const [returItemIdBySjItemId, setReturItemIdBySjItemId] = createSignal(
    new Map()
  ); // Map<sj_item_id, sr_item_id>
  const [returSrRollIdBySjiRollId, setReturSrRollIdBySjiRollId] = createSignal(
    new Map()
  ); // Map<sji_roll_id, sr_roll_id>
  const [returnedByOthers, setReturnedByOthers] = createSignal(new Set()); // Set<sji_roll_id>

  const [form, setForm] = createSignal({
    no_retur: "",
    tanggal_surat_jalan: "",
    customer_name: "",
    no_mobil: "",
    sopir: "",
    keterangan: "",
  });

  const hasId = Number.isFinite(returId);

  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const getNoSJ = (obj) =>
    obj?.no_sj ?? obj?.noSuratJalan ?? obj?.nomor_sj ?? obj?.nomor ?? obj?.no;

  const normNo = (v) =>
    (v == null ? "" : String(v))
      .replace(/\s+/g, "")
      .replace(/[-–—]/g, "-")
      .toUpperCase();

  // Ganti fungsi formatIDR dengan yang menampilkan 2 desimal
  const formatIDR = (amount) => {
    if (!amount && amount !== 0) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Perbaiki fungsi calculateGroupSubtotal
  const calculateGroupSubtotal = (group) => {
    if (!group || !group.harga) return 0;
    
    // Ambil satuan dari data retur, default ke "Meter"
    const satuan = returData()?.satuan_unit || "Meter";
    let totalQuantity = 0;
    
    // Hitung total quantity dari semua roll dalam group
    group.rolls.forEach(roll => {
      if (satuan.toLowerCase() === "meter") {
        totalQuantity += parseFloat(roll.meter) || 0;
      } else {
        totalQuantity += parseFloat(roll.yard) || 0;
      }
    });
    
    const harga = parseFloat(group.harga) || 0;
    return harga * totalQuantity;
  };

  // Perbaiki fungsi calculateTotalSubtotal
  const calculateTotalSubtotal = () => {
    const returDataValue = returData();
    if (!returDataValue || !returDataValue.items) return 0;
    
    // Ambil satuan dari data retur, default ke "Meter"
    const satuan = returDataValue.satuan_unit || "Meter";
    let total = 0;
    
    returDataValue.items.forEach(item => {
      let quantity = 0;
      
      if (satuan.toLowerCase() === "meter") {
        quantity = parseFloat(item.meter_total) || 0;
      } else {
        quantity = parseFloat(item.yard_total) || 0;
      }
      
      const harga = parseFloat(item.harga) || 0;
      total += harga * quantity;
    });
    
    return total;
  };

  const calculateTotalReturFromDisplay = () => {
    const detail = sjDetail();
    if (!detail) return 0;
    
    let total = 0;
    const pls = detail?.packing_lists || [];
    
    pls.forEach(pl => {
      const groups = groupBySOItemFiltered(pl);
      groups.forEach(group => {
        total += calculateGroupSubtotal(group);
      });
    });
    
    return total;
  };  

  function normalizeReturResponse(resp) {
    if (resp && Array.isArray(resp.data)) return resp.data[0] || null;
    if (resp && resp.data && typeof resp.data === "object") return resp.data;
    return resp;
  }

  const isSelected = (x) => Number(x?.sj_roll_selected_status ?? 0) === 1;

  // ==== helper: cek apakah SEMUA roll di SJ sudah returned (sj_roll_selected_status == 1) ====
  async function isSJFullyReturned(sjId) {
    try {
      const res = await getDeliveryNotes(sjId, user?.token);
      const detail = res?.order || res?.suratJalan || res?.surat_jalan || res;
      if (!detail) return false;

      const pls = Array.isArray(detail.packing_lists)
        ? detail.packing_lists
        : [];
      let total = 0;
      let selected = 0;

      for (const pl of pls) {
        for (const it of pl.items || []) {
          for (const r of it.rolls || []) {
            const hasId = r?.id != null;
            if (!hasId) continue;
            total += 1;
            if (Number(r?.sj_roll_selected_status ?? 0) === 1) selected += 1;
          }
        }
      }

      if (total === 0) return false; // tidak ada roll -> jangan disembunyikan
      return selected === total; // semua roll sudah dipilih di retur
    } catch {
      return false;
    }
  }

  // ==== enrich list SJ agar dropdown bisa menyembunyikan yang fully returned ====
  async function enrichSJOptions(list) {
    const arr = Array.isArray(list) ? list : [];
    const withFlags = await Promise.all(
      arr.map(async (sj) => {
        const fully = await isSJFullyReturned(sj.id);
        return { ...sj, __fully_returned__: fully };
      })
    );
    return withFlags;
  }

  // onMount(async () => {
  //   try {
  //     setLoading(true);

  //     // 1) Ambil semua SJ (yang delivered saja) untuk dropdown
  //     const res = await getAllDeliveryNotes(user?.token);
  //     const list = Array.isArray(res?.surat_jalan_list)
  //       ? res.surat_jalan_list
  //       : Array.isArray(res?.suratJalans)
  //       ? res.suratJalans
  //       : Array.isArray(res?.data)
  //       ? res.data
  //       : [];

  //     const delivered = list.filter(
  //       (sj) => Number(sj.delivered_status ?? 0) === 1
  //     );
  //     const enriched = await enrichSJOptions(delivered); // ← hitung full returned via sj_roll_selected_status
  //     setSjOptions(enriched);

  //     // 2) Jika buka View/Edit (punya ?id=...), load data retur
  //     if (hasId) {
  //       const rRaw = await getSalesRetur(returId, user?.token);

  //       //console.log("Data Sales Retur per ID: ", JSON.stringify(rRaw, null, 2));

  //       const r = normalizeReturResponse(rRaw);
  //       if (!r) throw new Error("Data retur kosong.");;

  //       const rollsSet = new Set();
  //       const mapByItem = new Map();
  //       const itemIdBySj = new Map();
  //       const srRollIdBySji = new Map();

  //       (r?.items || []).forEach((it) => {
  //         const sjItemId = toNum(it?.sj_item_id);
  //         const srItemId = toNum(it?.id);
  //         if (sjItemId && srItemId) itemIdBySj.set(sjItemId, srItemId);

  //         const s = mapByItem.get(sjItemId) || new Set();
  //         (it?.rolls || []).forEach((rr) => {
  //           const sji = toNum(rr?.sji_roll_id);
  //           const sr = toNum(rr?.id);
  //           if (sji && isSelected(rr)) {
  //             rollsSet.add(sji);
  //             s.add(sji);
  //             if (sr) srRollIdBySji.set(sji, sr);
  //           }
  //         });
  //         if (sjItemId) mapByItem.set(sjItemId, s);
  //       });

  //       setReturExistingRollIds(rollsSet);
  //       setReturExistingByItem(mapByItem);
  //       setReturItemIdBySjItemId(itemIdBySj);
  //       setReturSrRollIdBySjiRollId(srRollIdBySji);

  //       // pre-check checkbox di EDIT
  //       setReturChecked(() => {
  //         const m = new Map();
  //         rollsSet.forEach((rid) => m.set(rid, true));
  //         return m;
  //       });

  //       // === Cari SJ ID ===
  //       let sjId =
  //         toNum(r?.sj_id) ??
  //         toNum(r?.surat_jalan_id) ??
  //         toNum(r?.delivery_note_id) ??
  //         toNum(r?.surat_jalan?.id) ??
  //         toNum(r?.delivery_note?.id);

  //       if (!sjId) {
  //         const noFromRetur =
  //           getNoSJ(r) ??
  //           getNoSJ(r?.surat_jalan) ??
  //           getNoSJ(r?.delivery_note) ??
  //           r?.no_surat_jalan ??
  //           r?.surat_jalan_no ??
  //           r?.delivery_note_no;

  //         if (noFromRetur) {
  //           const target = normNo(noFromRetur);
  //           const found = (delivered || []).find(
  //             (sj) => normNo(getNoSJ(sj)) === target
  //           );
  //           sjId = toNum(found?.id);
  //         }
  //       }

  //       if (sjId) {
  //         setSelectedSJId(sjId);
  //         await loadSJDetailById(sjId);

  //         if (isEdit && returId && sjDetail()) {
  //           const mapChecked = buildCheckedFromSJDetailForThisRetur(
  //             sjDetail(),
  //             returId
  //           );
  //           setReturChecked(mapChecked);
  //         }
  //       }

  //       // header form dari data retur
  //       setForm((p) => ({
  //         ...p,
  //         no_retur: r?.no_retur || "",
  //         tanggal_surat_jalan:
  //           r?.tanggal_surat_jalan || r?.tanggal || p.tanggal_surat_jalan || "",
  //         customer_name:
  //           r?.customer_name || r?.customer || p.customer_name || "",
  //         no_mobil: r?.no_mobil || p.no_mobil || "",
  //         sopir: r?.sopir || p.sopir || "",
  //         keterangan: r?.keterangan_retur || r?.keterangan || "",
  //       }));
  //     }
  //   } catch (err) {
  //     console.error(err);
  //     Swal.fire("Error", err?.message || "Gagal memuat data.", "error");
  //   } finally {
  //     setLoading(false);
  //   }
  // });

  onMount(async () => {
    try {
      setLoading(true);

      // Set permission finance terlebih dahulu
      const canAccessFinance = hasAnyPermission([
        "view_bank",
        "view_payment_methods",
        "view_jenis_potongan",
        "view_jenis_hutang",
      ]);
      setShowFinance(canAccessFinance);

      // 2) Jika buka View/Edit (punya ?id=...), load data retur saja
      if (hasId) {
        const rRaw = await getSalesRetur(returId, user?.token);
        const r = normalizeReturResponse(rRaw);
        if (!r) throw new Error("Data retur kosong.");

        setReturData(r);

        const rollsSet = new Set();
        const mapByItem = new Map();
        const itemIdBySj = new Map();
        const srRollIdBySji = new Map();

        (r?.items || []).forEach((it) => {
          const sjItemId = toNum(it?.sj_item_id);
          const srItemId = toNum(it?.id);
          if (sjItemId && srItemId) itemIdBySj.set(sjItemId, srItemId);

          const s = mapByItem.get(sjItemId) || new Set();
          (it?.rolls || []).forEach((rr) => {
            const sji = toNum(rr?.sji_roll_id);
            const sr = toNum(rr?.id);
            if (sji && isSelected(rr)) {
              rollsSet.add(sji);
              s.add(sji);
              if (sr) srRollIdBySji.set(sji, sr);
            }
          });
          if (sjItemId) mapByItem.set(sjItemId, s);
        });

        setReturExistingRollIds(rollsSet);
        setReturExistingByItem(mapByItem);
        setReturItemIdBySjItemId(itemIdBySj);
        setReturSrRollIdBySjiRollId(srRollIdBySji);

        // pre-check checkbox di EDIT
        if (isEdit) {
          setReturChecked(() => {
            const m = new Map();
            rollsSet.forEach((rid) => m.set(rid, true));
            return m;
          });
        }

        // === Cari SJ ID ===
        let sjId =
          toNum(r?.sj_id) ??
          toNum(r?.surat_jalan_id) ??
          toNum(r?.delivery_note_id) ??
          toNum(r?.surat_jalan?.id) ??
          toNum(r?.delivery_note?.id);

        if (!sjId) {
          const noFromRetur =
            getNoSJ(r) ??
            getNoSJ(r?.surat_jalan) ??
            getNoSJ(r?.delivery_note) ??
            r?.no_surat_jalan ??
            r?.surat_jalan_no ??
            r?.delivery_note_no;

          if (noFromRetur) {
            // Untuk VIEW/EDIT, kita hanya perlu memuat SJ yang spesifik, tidak semua
            const target = normNo(noFromRetur);
            // Coba cari dari cache dulu, jika tidak ada baru fetch
            const found = await findSJByNo(target);
            sjId = toNum(found?.id);
          }
        }

        if (sjId) {
          setSelectedSJId(sjId);
          await loadSJDetailById(sjId);
        }

        // header form dari data retur
        setForm((p) => ({
          ...p,
          no_retur: r?.no_retur || "",
          tanggal_surat_jalan:
            r?.tanggal_surat_jalan || r?.tanggal || p.tanggal_surat_jalan || "",
          customer_name:
            r?.customer_name || r?.customer || p.customer_name || "",
          no_mobil: r?.no_mobil || p.no_mobil || "",
          sopir: r?.sopir || p.sopir || "",
          keterangan: r?.keterangan_retur || r?.keterangan || "",
        }));
      } else {
        // CREATE mode - hanya load SJ yang delivered
        const res = await getAllDeliveryNotes(user?.token);
        const list = Array.isArray(res?.surat_jalan_list)
          ? res.surat_jalan_list
          : Array.isArray(res?.suratJalans)
          ? res.suratJalans
          : Array.isArray(res?.data)
          ? res.data
          : [];

        const delivered = list.filter(
          (sj) => Number(sj.delivered_status ?? 0) === 1
        );
        const enriched = await enrichSJOptions(delivered);
        setSjOptions(enriched);
      }

    } catch (err) {
      console.error(err);
      Swal.fire("Error", err?.message || "Gagal memuat data.", "error");
    } finally {
      setLoading(false);
    }
  });

  // Tambahkan fungsi helper untuk mencari SJ by nomor
  async function findSJByNo(noSJ) {
    // Coba cari di cache dulu
    const cached = sjOptions().find(sj => normNo(getNoSJ(sj)) === normNo(noSJ));
    if (cached) return cached;
    
    // Jika tidak ada di cache, fetch dari API
    try {
      const res = await getAllDeliveryNotes(user?.token);
      const list = Array.isArray(res?.surat_jalan_list)
        ? res.surat_jalan_list
        : Array.isArray(res?.suratJalans)
        ? res.suratJalans
        : Array.isArray(res?.data)
        ? res.data
        : [];

      const delivered = list.filter(
        (sj) => Number(sj.delivered_status ?? 0) === 1
      );
      
      // Update cache
      setSjOptions(delivered);
      
      return delivered.find(sj => normNo(getNoSJ(sj)) === normNo(noSJ));
    } catch (error) {
      console.error("Gagal fetch SJ:", error);
      return null;
    }
  }

  /* ================== Numbering helpers ================== */
  const getPPNFromSJ = (sj) =>
    Number(sj?.ppn_percent ?? sj?.ppn ?? sj?.ppn_persen ?? 0) || 0;

  const deriveFlagsFromNoSJ = (no_sj) => {
    if (!no_sj || typeof no_sj !== "string") return null;
    const parts = no_sj.split("/");
    let regionFlag = null,
      pajakFlag = null;
    for (const seg of parts) {
      const s = seg.toUpperCase();
      if (!regionFlag && (s === "D" || s === "E")) regionFlag = s;
      if (!pajakFlag && (s === "P" || s === "N")) pajakFlag = s;
    }
    if (!regionFlag && !pajakFlag) return null;
    return { regionFlag, pajakFlag };
  };

  const getRegionFromSJ = (sj) => {
    const raw =
      sj?.region ??
      sj?.jenis ??
      sj?.tipe_penjualan ??
      sj?.type ??
      sj?.sales_type ??
      "";
    const isExp =
      sj?.is_export ?? sj?.ekspor ?? sj?.isEkspor ?? sj?.is_exported ?? null;
    const txt = String(raw ?? "")
      .trim()
      .toUpperCase();
    const yes = (v) =>
      String(v).trim().toLowerCase() === "true" || Number(v) === 1;

    if (isExp !== null && isExp !== undefined) {
      return yes(isExp)
        ? { regionFlag: "E", regionName: "ekspor" }
        : { regionFlag: "D", regionName: "domestik" };
    }
    if (["E", "EKSPOR", "EXPORT"].includes(txt))
      return { regionFlag: "E", regionName: "ekspor" };
    if (["D", "DOMESTIK", "DOMESTIC"].includes(txt))
      return { regionFlag: "D", regionName: "domestik" };
    return { regionFlag: "D", regionName: "domestik" };
  };

  const getFlagFromNomor = (nomor) => {
    if (!nomor) return { regionFlag: null, pajakFlag: null };
    const regionFlag = nomor.includes("/E/")
      ? "E"
      : nomor.includes("/D/")
      ? "D"
      : null;
    const pajakFlag = nomor.includes("/P/")
      ? "P"
      : nomor.includes("/N/")
      ? "N"
      : null;
    return { regionFlag, pajakFlag };
  };

  const handleGenerateNoRetur = async () => {
    try {
      const detail = sjDetail();
      if (!detail) {
        await Swal.fire("Tidak bisa", "Pilih Surat Jalan dulu.", "warning");
        return;
      }

      const ppnVal = getPPNFromSJ(detail);
      const fromNo = deriveFlagsFromNoSJ(detail?.no_sj);
      let regionFlag, regionName, pajakFlag;
      if (fromNo?.regionFlag) {
        regionFlag = fromNo.regionFlag;
        regionName = regionFlag === "E" ? "ekspor" : "domestik";
      } else {
        ({ regionFlag, regionName } = getRegionFromSJ(detail));
      }
      pajakFlag = fromNo?.pajakFlag ? fromNo.pajakFlag : ppnVal > 0 ? "P" : "N";

      const seq = await getLastSequence(user?.token, "s_r", regionName, ppnVal);
      const nextNum = String((seq?.last_sequence || 0) + 1).padStart(5, "0");

      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yy = String(now.getFullYear()).slice(2);

      const nomor = `RT/S/${regionFlag}/${pajakFlag}/${mm}${yy}-${nextNum}`;
      setForm((p) => ({ ...p, no_retur: nomor }));
    } catch (e) {
      console.error(e);
      Swal.fire(
        "Gagal",
        e?.message || "Tidak bisa generate No Retur.",
        "error"
      );
    }
  };

  const autoGenerateNoReturIfNeeded = async (sj) => {
    if (isView || isEdit) return;
    const ppn = getPPNFromSJ(sj);
    const fromNo = deriveFlagsFromNoSJ(sj?.no_sj);
    const pajakNew = fromNo?.pajakFlag ?? (ppn > 0 ? "P" : "N");

    let regionNew;
    if (fromNo?.regionFlag) {
      regionNew = fromNo.regionFlag;
    } else {
      ({ regionFlag: regionNew } = getRegionFromSJ(sj));
    }

    const cur = form().no_retur || "";
    const { regionFlag: regionOld, pajakFlag: pajakOld } =
      getFlagFromNomor(cur);
    if (!cur || regionOld !== regionNew || pajakOld !== pajakNew) {
      await handleGenerateNoRetur();
    }
  };

  /* ============== LOAD SJ DETAIL ============== */
  async function loadSJDetailById(sjId) {
    const res = await getDeliveryNotes(sjId, user?.token);

    //console.log("Data Surat Jalan: ", JSON.stringify(res, null, 2));

    const detail = res?.order || res?.suratJalan || res?.surat_jalan || res;
    if (!detail) throw new Error("Data Surat Jalan tidak ditemukan.");
    setSjDetail(detail);
    setReturChecked(new Map()); // reset

    // Daftar roll yang sudah pernah diretur
    setReturnedByOthers(
      collectReturnedRollsFromSJ(detail, isEdit ? returId : null)
    );

    setForm((p) => ({
      ...p,
      tanggal_surat_jalan: detail.created_at
        ? new Date(detail.created_at).toISOString().split("T")[0]
        : "",
      customer_name: detail.customer_name || detail.customer || "",
      no_mobil: detail.no_mobil || "",
      sopir: detail.sopir || "",
    }));

    await autoGenerateNoReturIfNeeded(detail);
  }

  // const handleSJChange = async (sj) => {
  //   try {
  //     setSelectedSJId(sj?.id ?? null);
  //     if (!sj?.id) {
  //       setSjDetail(null);
  //       setReturChecked(new Map());
  //       setReturExistingRollIds(new Set());
  //       setReturExistingByItem(new Map());
  //       return;
  //     }
  //     setLoading(false);
  //     await loadSJDetailById(sj.id);
  //   } catch (err) {
  //     console.error(err);
  //     Swal.fire(
  //       "Error",
  //       err?.message || "Gagal memuat detail Surat Jalan.",
  //       "error"
  //     );
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleSJChange = async (sj) => {
    try {
      setSelectedSJId(sj?.id ?? null);
      if (!sj?.id) {
        setSjDetail(null);
        setReturChecked(new Map());
        setReturExistingRollIds(new Set());
        setReturExistingByItem(new Map());
        return;
      }
      
      // Untuk CREATE mode, load detail SJ
      if (!hasId) {
        setLoading(false);
        await loadSJDetailById(sj.id);
      }
      // Untuk VIEW/EDIT, kita sudah punya data dari retur
    } catch (err) {
      console.error(err);
      Swal.fire(
        "Error",
        err?.message || "Gagal memuat detail Surat Jalan.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ============== UI HELPERS ============== */
  const formatNumber = (num) =>
    (Number(num) || 0).toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const COLOR_LIMIT = 4;
  const LOT_LIMIT = 7;

  function formatList(values, limit, joiner = ", ") {
    const uniq = Array.from(
      new Set(
        (values || [])
          .map((v) => (v == null ? "" : String(v).trim()))
          .filter(Boolean)
      )
    );
    const full = uniq.join(joiner);
    const display =
      limit == null || uniq.length <= limit
        ? full || "-"
        : `${uniq.slice(0, limit).join(joiner)} (+${uniq.length - limit})`;
    return { list: uniq, full, display: display || "-" };
  }

  const pickColorCode = (it) =>
    it.so_kode_warna ?? it.kode_warna ?? it.pl_kode_warna ?? "";

  function getColorCodesOnlyFromPL(pl, limit = COLOR_LIMIT) {
    const codes = [];
    for (const it of pl?.items || []) {
      const c = pickColorCode(it);
      if (c) codes.push(c);
    }
    return formatList(codes, limit);
  }

  function getLotsFromPL(pl, limit = LOT_LIMIT) {
    const lots = [];
    for (const it of pl?.items || []) {
      for (const r of it?.rolls || []) {
        const v = r?.lot ?? "";
        if (!v) continue;
        String(v)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((x) => lots.push(x));
      }
    }
    let uniq = Array.from(new Set(lots));
    if (uniq.every((v) => /^-?\d+(\.\d+)?$/.test(v)))
      uniq.sort((a, b) => Number(a) - Number(b));
    return formatList(uniq, limit);
  }

  // hide roll yang sudah dipilih (sj_roll_selected_status = 1)
  // KECUALI: saat EDIT, kalau roll itu milik retur ini, tetap tampil.
  function isReturnedRoll(r) {
    const rid = Number(r?.id);
    if (!Number.isFinite(rid)) return false;

    const alreadySelected =
      Number(r?.sj_roll_selected_status ?? r?.selected_status ?? 0) === 1;

    if (!alreadySelected) return false; // boleh tampil

    // Saat EDIT: izinkan roll yang memang milik retur ini
    if (isEdit && returExistingRollIds().has(rid)) return false;

    // CREATE atau roll milik retur lain → sembunyikan dari pilihan
    return true;
  }

  function sjItemIdFromItem(it) {
    const direct = toNum(it?.sj_item_id ?? it?.id_sj ?? it?.sji_id);
    if (direct) return direct;

    const retMap = returExistingByItem();
    for (const [sjId, set] of retMap.entries()) {
      if ((it?.rolls || []).some((r) => set.has(toNum(r?.id)))) return sjId;
    }
    for (const r of it?.rolls || []) {
      const viaRoll = toNum(r?.sj_item_id ?? r?.sji_item_id ?? r?.sjItemId);
      if (viaRoll) return viaRoll;
    }
    return null;
  }

  // function groupBySOItemFiltered(pl) {
  //   const map = new Map();

  //   for (const it of pl?.items || []) {
  //     const key = it.pl_item_id ?? it.id;
  //     if (!map.has(key)) {
  //       map.set(key, {
  //         pl_item_id: key,
  //         sj_item_id: sjItemIdFromItem(it),
  //         kode_warna:
  //           it.so_kode_warna ?? it.kode_warna ?? it.pl_kode_warna ?? "",
  //         deskripsi_warna:
  //           it.so_deskripsi_warna ??
  //           it.deskripsi_warna ??
  //           it.pl_deskripsi_warna ??
  //           it.keterangan_warna ??
  //           "",
  //         corak_kain: it.corak_kain ?? "",
  //         rolls: [],
  //       });
  //     }
  //     const g = map.get(key);

  //     for (const r of it.rolls || []) {
  //       const rid = Number(r?.id);

  //       if (isView) {
  //         // VIEW: tampilkan hanya roll yang memang milik retur ini (flag 1 di getSalesRetur)
  //         if (!returExistingRollIds().has(rid)) continue;
  //       } else {
  //         // CREATE/EDIT: sembunyikan roll yang sudah diretur
  //         if (isReturnedRoll(r)) continue;
  //       }

  //       g.rolls.push({
  //         id: r.id,
  //         pli_roll_id: r.pli_roll_id,
  //         row_num: r.row_num,
  //         col_num: r.col_num,
  //         no_bal: r.no_bal,
  //         lot: r.lot ?? it.lot ?? "-",
  //         meter: Number(r.meter || 0),
  //         yard: Number(r.yard || 0),
  //         kilogram: Number(r.kilogram || 0),
  //       });
  //     }
  //   }

  //   return Array.from(map.values()).filter((g) => g.rolls.length > 0);
  // }

  function groupBySOItemFiltered(pl) {
    const map = new Map();

    for (const it of pl?.items || []) {
      const key = it.pl_item_id ?? it.id;
      if (!map.has(key)) {
        // Cari harga dari data retur jika ada
        let harga = 0;
        if (returData() && returData().items) {
          const returItem = returData().items.find(
            retItem => Number(retItem.sj_item_id) === Number(sjItemIdFromItem(it))
          );
          harga = returItem ? parseFloat(returItem.harga) || 0 : 0;
        }
        map.set(key, {
          pl_item_id: key,
          sj_item_id: sjItemIdFromItem(it),
          kode_warna:
            it.so_kode_warna ?? it.kode_warna ?? it.pl_kode_warna ?? "",
          deskripsi_warna:
            it.so_deskripsi_warna ??
            it.deskripsi_warna ??
            it.pl_deskripsi_warna ??
            it.keterangan_warna ??
            "",
          corak_kain: it.corak_kain ?? "",
          // Tambahkan harga dari item retur
          harga: it.harga ? parseFloat(it.harga) : 0,
          rolls: [],
        });
      }
      const g = map.get(key);

      for (const r of it.rolls || []) {
        const rid = Number(r?.id);

        if (isView) {
          // VIEW: tampilkan hanya roll yang memang milik retur ini (flag 1 di getSalesRetur)
          if (!returExistingRollIds().has(rid)) continue;
        } else {
          // CREATE/EDIT: sembunyikan roll yang sudah diretur
          if (isReturnedRoll(r)) continue;
        }

        g.rolls.push({
          id: r.id,
          pli_roll_id: r.pli_roll_id,
          row_num: r.row_num,
          col_num: r.col_num,
          no_bal: r.no_bal,
          lot: r.lot ?? it.lot ?? "-",
          meter: Number(r.meter || 0),
          yard: Number(r.yard || 0),
          kilogram: Number(r.kilogram || 0),
        });
      }
    }

    return Array.from(map.values()).filter((g) => g.rolls.length > 0);
  }

  // subtotal yang dicentang
  function calcGroupSelected(g) {
    if (isView) {
      let pcs = g.rolls.length,
        m = 0,
        y = 0;
      for (const r of g.rolls) {
        m += r.meter;
        y += r.yard;
      }
      return { pcs, m, y };
    }
    returChecked();
    let pcs = 0,
      m = 0,
      y = 0;
    for (const r of g.rolls) {
      if (returChecked().get(r.id)) {
        pcs += 1;
        m += r.meter;
        y += r.yard;
      }
    }
    return { pcs, m, y };
  }

  function calcPLSelected(groups) {
    returChecked();
    return groups.reduce(
      (acc, g) => {
        const t = calcGroupSelected(g);
        acc.pcs += t.pcs;
        acc.m += t.m;
        acc.y += t.y;
        return acc;
      },
      { pcs: 0, m: 0, y: 0 }
    );
  }
  function calcAllSelected(detail) {
    returChecked();
    const pls = detail?.packing_lists || [];
    return pls.reduce(
      (acc, pl) => {
        const t = calcPLSelected(groupBySOItemFiltered(pl));
        acc.pcs += t.pcs;
        acc.m += t.m;
        acc.y += t.y;
        return acc;
      },
      { pcs: 0, m: 0, y: 0 }
    );
  }

  /* ============== Checkbox helpers ============== */
  const isRollChecked = (rollId) => returChecked().get(rollId) === true;
  const setRollChecked = (rollId, val) =>
    setReturChecked((prev) => {
      const m = new Map(prev);
      m.set(rollId, !!val);
      return m;
    });
  const toggleGroup = (group, val) => {
    setReturChecked((prev) => {
      const m = new Map(prev);
      group.rolls.forEach((r) => m.set(r.id, !!val));
      return m;
    });
  };
  const togglePL = (pl, val) => {
    setReturChecked((prev) => {
      const m = new Map(prev);
      (groupBySOItemFiltered(pl) || []).forEach((g) =>
        g.rolls.forEach((r) => m.set(r.id, !!val))
      );
      return m;
    });
  };

  /* ================== Utils ================== */
  function stripUndefined(x) {
    if (Array.isArray(x)) return x.map(stripUndefined);
    if (x && typeof x === "object") {
      const o = {};
      for (const [k, v] of Object.entries(x)) {
        if (v !== undefined) o[k] = stripUndefined(v);
      }
      return o;
    }
    return x;
  }

  // Pre-check untuk EDIT: ambil roll milik retur ini yang flag-nya = 1
  function buildCheckedFromSJDetailForThisRetur() {
    const m = new Map();
    returExistingRollIds().forEach((rid) => m.set(Number(rid), true));
    return m;
  }

  function collectReturnedRollsFromSJ(detail, currentReturId) {
    const s = new Set();
    for (const pl of detail?.packing_lists || []) {
      for (const it of pl?.items || []) {
        for (const r of it?.rolls || []) {
          const rid = Number(r?.id);
          if (!Number.isFinite(rid)) continue;

          const selectedFlag = Number(r?.sj_roll_selected_status ?? 0) === 1;
          const returIdFlag =
            Number.isFinite(currentReturId) &&
            Number(r?.retur_id) === Number(currentReturId);
          const usedByOther = r?.retur_id && !returIdFlag;
          const returnedAt = !!r?.returned_at;
          const isReturned = r?.is_returned === true;

          if (selectedFlag || usedByOther || returnedAt || isReturned) {
            s.add(rid);
          }
        }
      }
    }
    return s;
  }

  /* ================== Build payload ================== */
  // CREATE: hanya kirim roll yang dicentang -> sj_roll_selected_status = 1
  function buildItemsPayloadCreate(detail) {
    const items = [];
    for (const pl of detail?.packing_lists || []) {
      for (const it of pl.items || []) {
        const sj_item_id = sjItemIdFromItem(it);
        if (!sj_item_id) continue;

        const visibleRolls = (it.rolls || []).filter((r) => !isReturnedRoll(r));
        const selectedRolls = visibleRolls.filter((r) =>
          returChecked().get(r.id)
        );
        if (selectedRolls.length === 0) continue;

        const meter_total = selectedRolls.reduce(
          (s, r) => s + Number(r.meter || 0),
          0
        );
        const yard_total = selectedRolls.reduce(
          (s, r) => s + Number(r.yard || 0),
          0
        );
        const kilogram_total = selectedRolls.reduce(
          (s, r) => s + Number(r.kilogram || 0),
          0
        );

        const rolls = selectedRolls.map((r) => ({
          sji_roll_id: Number(r.id),
          row_num: Number(r.row_num ?? 0),
          col_num: Number(r.col_num ?? 0),
          meter_roll: Number(r.meter || 0),
          yard_roll: Number(r.yard || 0),
          kilogram_roll: Number(r.kilogram || 0),
          sj_roll_selected_status: 1, // <== penting
        }));

        items.push({
          sj_item_id: Number(sj_item_id),
          gulung: selectedRolls.length,
          meter_total: Number(meter_total.toFixed(2)),
          yard_total: Number(yard_total.toFixed(2)),
          kilogram_total: Number(kilogram_total.toFixed(2)),
          rolls,
        });
      }
    }
    return items;
  }

  // UPDATE (replace-all): roll terpilih -> 1, roll existing yang di-uncheck -> 0
  function buildItemsPayloadReplaceAll(detail) {
    // index semua roll di SJ by sji_roll_id -> nilai asli
    const rollIndex = new Map();
    for (const pl of detail?.packing_lists || []) {
      for (const it of pl.items || []) {
        for (const r of it.rolls || []) {
          rollIndex.set(Number(r.id), {
            row_num: Number(r.row_num ?? 0),
            col_num: Number(r.col_num ?? 0),
            meter_roll: Number(r.meter || 0),
            yard_roll: Number(r.yard || 0),
            kilogram_roll: Number(r.kilogram || 0),
          });
        }
      }
    }

    const selectedBySj = new Map();

    // kumpulkan roll yang saat ini dicentang
    for (const pl of detail?.packing_lists || []) {
      for (const it of pl.items || []) {
        const sj_item_id = sjItemIdFromItem(it);
        if (!sj_item_id) continue;

        const visibleRolls = (it.rolls || []).filter((r) => !isReturnedRoll(r));
        const selectedRolls = visibleRolls.filter((r) =>
          returChecked().get(r.id)
        );
        if (selectedRolls.length === 0) continue;

        const meter_total = selectedRolls.reduce(
          (s, r) => s + Number(r.meter || 0),
          0
        );
        const yard_total = selectedRolls.reduce(
          (s, r) => s + Number(r.yard || 0),
          0
        );
        const kilogram_total = selectedRolls.reduce(
          (s, r) => s + Number(r.kilogram || 0),
          0
        );

        const rolls = selectedRolls.map((r) => {
          const sji_roll_id = Number(r.id);
          const sr_roll_id = returSrRollIdBySjiRollId().get(sji_roll_id);
          return stripUndefined({
            ...(sr_roll_id ? { id: Number(sr_roll_id) } : undefined),
            sji_roll_id,
            row_num: Number(r.row_num ?? 0),
            col_num: Number(r.col_num ?? 0),
            meter_roll: Number(r.meter || 0),
            yard_roll: Number(r.yard || 0),
            kilogram_roll: Number(r.kilogram || 0),
            sj_roll_selected_status: 1,
          });
        });

        selectedBySj.set(Number(sj_item_id), {
          gulung: selectedRolls.length,
          meter_total: Number(meter_total.toFixed(2)),
          yard_total: Number(yard_total.toFixed(2)),
          kilogram_total: Number(kilogram_total.toFixed(2)),
          rolls,
          selectedSet: new Set(selectedRolls.map((r) => Number(r.id))),
        });
      }
    }

    const items = [];

    // item yang terpilih sekarang: tambah roll yang dicabut (status 0, tanpa id, nilai asli)
    for (const [sj_item_id, val] of selectedBySj.entries()) {
      const sr_item_id = returItemIdBySjItemId().get(sj_item_id);
      const existingSet = returExistingByItem().get(sj_item_id) || new Set();
      const removedSji = [...existingSet].filter(
        (sji) => !val.selectedSet.has(Number(sji))
      );

      const removedRollStubs = removedSji.map((sji) => {
        const base = rollIndex.get(Number(sji)) || {};
        return {
          //sji_roll_id: Number(sji),
          row_num: base.row_num ?? 0,
          col_num: base.col_num ?? 0,
          meter_roll: base.meter_roll ?? 0,
          yard_roll: base.yard_roll ?? 0,
          kilogram_roll: base.kilogram_roll ?? 0,
          sj_roll_selected_status: 0,
        };
      });

      items.push(
        stripUndefined({
          ...(sr_item_id ? { id: Number(sr_item_id) } : undefined),
          sj_item_id: Number(sj_item_id),
          gulung: Number(val.gulung),
          meter_total: Number(val.meter_total),
          yard_total: Number(val.yard_total),
          kilogram_total: Number(val.kilogram_total),
          rolls: val.rolls,
        })
      );
    }

    // item yang dulu ada tapi sekarang tidak ada satupun yang dipilih
    for (const [sj_item_id, sr_item_id] of returItemIdBySjItemId().entries()) {
      if (!selectedBySj.has(Number(sj_item_id))) {
        const existingSet =
          returExistingByItem().get(Number(sj_item_id)) || new Set();

        const allRemovedRollStubs = [...existingSet].map((sji) => {
          const base = rollIndex.get(Number(sji)) || {};
          return {
            //sji_roll_id: Number(sji),
            row_num: base.row_num ?? 0,
            col_num: base.col_num ?? 0,
            meter_roll: base.meter_roll ?? 0,
            yard_roll: base.yard_roll ?? 0,
            kilogram_roll: base.kilogram_roll ?? 0,
            sj_roll_selected_status: 0,
          };
        });

        items.push({
          id: Number(sr_item_id),
          sj_item_id: Number(sj_item_id),
          gulung: 0,
          meter_total: 0,
          yard_total: 0,
          kilogram_total: 0,
          rolls: [],
        });
      }
    }

    return items;
  }

  /* ============== Actions ============== */
  async function handlePrint() {
    if (!isEdit && !isView) return;
    if (!returId) return Swal.fire("Gagal", "Retur tidak ditemukan.", "error");

    try {
      setLoading(false);
      const rRaw = await getSalesRetur(returId, user?.token);
      const returObj = normalizeReturResponse(rRaw);
      if (!returObj) throw new Error("Data retur kosong.");
      const encoded = encodeURIComponent(JSON.stringify(returObj));
      window.open(`/print/retur-sales#${encoded}`, "_blank");
    } catch (e) {
      console.error(e);
      Swal.fire(
        "Gagal",
        e?.message || "Tidak bisa membuka halaman print.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

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
      await Swal.fire("Gagal", "Pilih Surat Jalan terlebih dahulu.", "error");
      return;
    }

    if (!form().no_retur?.trim()) {
      await handleGenerateNoRetur();
      if (!form().no_retur?.trim()) return;
    }

    const detail = sjDetail();
    if (!detail) {
      await Swal.fire("Gagal", "Detail Surat Jalan belum termuat.", "error");
      return;
    }

    try {
      setLoading(false);

      if (isEdit && returId) {
        const items = buildItemsPayloadReplaceAll(detail);
        const payload = stripUndefined({
          no_retur: String(form().no_retur).trim(),
          sj_id: Number(selectedSJId()),
          keterangan_retur: (form().keterangan ?? "").trim(),
          items,
        });

        //console.log("Update RETUR SALES Payload: ", JSON.stringify(payload, null, 2));

        await updateDataSalesRetur(user?.token, Number(returId), payload);
        await Swal.fire({
          icon: "success",
          title: "Berhasil diubah",
          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
        });
        navigate("/retur-sales");
        return;
      }

      // CREATE
      const createItems = buildItemsPayloadCreate(detail);
      if (createItems.length === 0) {
        await Swal.fire(
          "Gagal",
          "Belum ada roll yang dipilih untuk diretur.",
          "error"
        );
        return;
      }
      const createPayload = stripUndefined({
        no_retur: String(form().no_retur).trim(),
        sj_id: Number(selectedSJId()),
        keterangan_retur: (form().keterangan ?? "").trim(),
        items: createItems,
      });

      //console.log("Create RETUR SALES Payload: ", JSON.stringify(createPayload, null, 2));

      await createSalesRetur(user?.token, createPayload);
      await Swal.fire({
        icon: "success",
        title: "Berhasil disimpan",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
      navigate("/retur-sales");
    } catch (err) {
      console.error(err);
      await Swal.fire(
        "Gagal",
        err?.message ||
          (isEdit ? "Gagal mengubah retur." : "Gagal menyimpan retur."),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ============== UI ============== */
  return (
    <MainLayout>
      {loading() && (
        <div class="fixed inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-md bg-opacity-40 z-50 gap-10">
          <div class="w-52 h-52 border-[20px] border-white border-t-transparent rounded-full animate-spin"></div>
          <span class="animate-pulse text-[40px] text-white">Loading...</span>
        </div>
      )}

      <h1 class="text-2xl font-bold mb-4">
        {isView ? "Detail" : isEdit ? "Edit" : "Tambah"} Retur Sales
      </h1>

      <Show when={isEdit || isView}>
        <button
          type="button"
          class="flex gap-2 bg-blue-600 text-white px-3 py-2 mb-4 rounded hover:bg-green-700"
          onClick={handlePrint}
          disabled={!selectedSJId()}
          title="Print Surat Jalan"
        >
          <Printer size={20} /> Print
        </button>
      </Show>

      <form class="space-y-4" onSubmit={handleSubmit} onkeydown={handleKeyDown}>
        {/* Header form */}
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-sm mb-1">No Retur</label>
            <div class="flex gap-2">
              <input
                class="w-full border p-2 rounded bg-gray-200"
                value={form().no_retur}
                disabled
              />
              <Show when={!isView && !isEdit}>
                <button
                  type="button"
                  class="bg-gray-300 text-sm px-2 rounded hover:bg-gray-400"
                  onClick={handleGenerateNoRetur}
                  title="Generate nomor retur"
                >
                  Generate
                </button>
              </Show>
            </div>
          </div>

          <div>
            <label class="block text-sm mb-1">Surat Jalan</label>
            <SuratJalanDropdownSearch
              items={sjOptions()}
              value={selectedSJId()}
              onChange={handleSJChange}
              disabled={isView || isEdit}
              placeholder="Pilih Surat Jalan…"
              excludeFullyReturned
            />
          </div>

          <div>
            <label class="block text-sm mb-1">Tanggal Surat Jalan</label>
            <input
              class="w-full border p-2 rounded bg-gray-200"
              value={form().tanggal_surat_jalan}
              disabled
            />
          </div>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-sm mb-1">Customer</label>
            <input
              class="w-full border p-2 rounded bg-gray-200"
              value={form().customer_name}
              disabled
            />
          </div>
          <div>
            <label class="block text-sm mb-1">No. Mobil</label>
            <input
              class="w-full border p-2 rounded bg-gray-200"
              value={form().no_mobil}
              disabled
            />
          </div>
          <div>
            <label class="block text-sm mb-1">Sopir</label>
            <input
              class="w-full border p-2 rounded bg-gray-200"
              value={form().sopir}
              disabled
            />
          </div>
        </div>

        <div>
          <label class="block text-sm mb-1">Catatan Retur</label>
          <textarea
            class="w-full border p-2 rounded"
            value={form().keterangan}
            onInput={(e) => setForm({ ...form(), keterangan: e.target.value })}
            disabled={isView}
            classList={{ "bg-gray-200": isView }}
            placeholder="Tulis catatan retur"
          />
        </div>

        {/* === LIST per PL === */}
        <Show when={sjDetail()}>
          <For each={sjDetail()?.packing_lists || []}>
            {(pl) => {
              const colorCodes = getColorCodesOnlyFromPL(pl);
              const lots = getLotsFromPL(pl);
              const groups = groupBySOItemFiltered(pl);
              if (groups.length === 0) return null;

              const allRollsInPL = groups.flatMap((g) => g.rolls);
              const plAllChecked = createMemo(
                () =>
                  allRollsInPL.length > 0 &&
                  allRollsInPL.every((r) => isRollChecked(r.id))
              );
              const plSomeChecked = createMemo(
                () =>
                  allRollsInPL.some((r) => isRollChecked(r.id)) &&
                  !plAllChecked()
              );
              let plCheckboxRef;
              createEffect(() => {
                if (plCheckboxRef)
                  plCheckboxRef.indeterminate = plSomeChecked();
              });

              return (
                <div class="border p-4 mb-4 rounded">
                  <div class="mb-2 flex items-center justify-between">
                    <h3 class="font-semibold text-lg">
                      {pl.no_pl} |{" "}
                      {form().customer_name || sjDetail()?.customer_name || "-"}{" "}
                      | {colorCodes.display} | Lot {lots.display}
                    </h3>

                    <Show when={!isView && allRollsInPL.length > 0}>
                      <label class="text-sm flex items-center gap-2">
                        <input
                          ref={plCheckboxRef}
                          type="checkbox"
                          checked={plAllChecked()}
                          onChange={(e) =>
                            togglePL(pl, e.currentTarget.checked)
                          }
                        />
                        Pilih semua (PL ini)
                      </label>
                    </Show>
                  </div>

                  <For each={groups}>
                    {(g, gi) => {
                      const subSel = createMemo(() => calcGroupSelected(g));
                      const groupAll = createMemo(
                        () =>
                          g.rolls.length > 0 &&
                          g.rolls.every((r) => isRollChecked(r.id))
                      );
                      const groupSome = createMemo(
                        () =>
                          g.rolls.some((r) => isRollChecked(r.id)) &&
                          !groupAll()
                      );
                      let groupCbRef;
                      createEffect(() => {
                        if (groupCbRef) groupCbRef.indeterminate = groupSome();
                      });

                      return (
                        <div class="border rounded mb-4">
                          <div class="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
                            <div class="font-semibold">
                              Sales Order Item Group #{gi() + 1}
                            </div>
                            <Show when={!isView && g.rolls.length > 0}>
                              <label class="text-sm flex items-center gap-2">
                                <input
                                  ref={groupCbRef}
                                  type="checkbox"
                                  checked={groupAll()}
                                  onChange={(e) =>
                                    toggleGroup(g, e.currentTarget.checked)
                                  }
                                />
                                Pilih semua (group)
                              </label>
                            </Show>
                          </div>

                          <table class="w-full border border-gray-300 text-sm">
                          <thead class="bg-gray-100">
                            <tr>
                              <th class="border px-2 py-1 w-[5%]">#</th>
                              <th class="border px-2 py-1 w-[7%]">Bal</th>
                              <th class="border px-2 py-1 w-[15%]">Col</th>
                              <th class="border px-2 py-1 w-[15%]">Corak Kain</th>
                              <th class="border px-2 py-1 w-[8%]">Lot</th>
                              <th class="border px-2 py-1 w-[8%]">Meter</th>
                              <th class="border px-2 py-1 w-[8%]">Yard</th>
                              {/* Hanya tampilkan kolom Retur untuk CREATE/EDIT, dan Status untuk VIEW */}
                              <Show when={!isView}>
                                <th class="border px-2 py-1 w-[8%]">Retur</th>
                              </Show>
                              <Show when={isView}>
                                <th class="border px-2 py-1 w-[10%]">Status</th>
                              </Show>
                              {/* Kolom harga hanya untuk VIEW dengan finance */}
                              <Show when={isView && showFinance()}>
                                <th class="border px-2 py-1 w-[12%]">Harga</th>
                                <th class="border px-2 py-1 w-[12%]">Subtotal</th>
                              </Show>
                            </tr>
                          </thead>
                            <tbody>
                              <For each={g.rolls}>
                                {(r, i) => (
                                  <tr>
                                    <td class="border px-2 py-1 text-center">
                                      {i() + 1}
                                    </td>
                                    <td class="border px-2 py-1 text-center">
                                      {r.no_bal ?? "-"}
                                    </td>
                                    <td class="border px-2 py-1">
                                      {(g.kode_warna || "") +
                                        " | " +
                                        (g.deskripsi_warna || "")}
                                    </td>
                                    <td class="border px-2 py-1">
                                      {g.corak_kain || ""}
                                    </td>
                                    <td class="border px-2 py-1 text-center">
                                      {r.lot || "-"}
                                    </td>
                                    <td class="border px-2 py-1 text-right">
                                      {formatNumber(r.meter)}
                                    </td>
                                    <td class="border px-2 py-1 text-right">
                                      {formatNumber(r.yard)}
                                    </td>

                                    <Show when={!isView}>
                                      <td class="border px-2 py-1 text-center">
                                        <input
                                          type="checkbox"
                                          checked={isRollChecked(r.id)}
                                          onChange={(e) =>
                                            setRollChecked(
                                              r.id,
                                              e.currentTarget.checked
                                            )
                                          }
                                        />
                                      </td>
                                    </Show>
                                    <Show when={isView}>
                                      <td class="border px-2 py-1 text-center text-gray-500">
                                        Retur
                                      </td>
                                    </Show>
                                    <Show when={isView && showFinance()}>
                                      {/* Hanya tampilkan di baris pertama setiap group */}
                                      <Show when={i() === 0}>
                                        <td class="border px-2 py-1 text-right" rowSpan={g.rolls.length}>
                                          {formatIDR(g.harga)}
                                        </td>
                                        <td class="border px-2 py-1 text-right" rowSpan={g.rolls.length}>
                                          {formatIDR(calculateGroupSubtotal(g))}
                                        </td>
                                      </Show>
                                    </Show>
                                  </tr>
                                )}
                              </For>

                              <tr class="bg-gray-50 font-semibold">
                                <td
                                  class="border px-2 py-1 text-right"
                                  colSpan={5}
                                >
                                  Sub Total
                                </td>
                                <td class="border px-2 py-1 text-right">
                                  {formatNumber(subSel().m)}
                                </td>
                                <td class="border px-2 py-1 text-right">
                                  {formatNumber(subSel().y)}
                                </td>
                                <td class="border px-2 py-1 text-center">
                                  TTL/PCS: {subSel().pcs}
                                </td>

                              </tr>
                            </tbody>
                          </table>
                        </div>
                      );
                    }}
                  </For>
                </div>
              );
            }}
          </For>

          <div class="border-t pt-4 mt-4">
            <div class="text-right font-semibold text-sm">
              Total Keseluruhan:
            </div>
            <table class="ml-auto text-sm mt-1 border border-gray-300">
              <thead class="bg-gray-100">
                <tr>
                  <th class="px-4 py-2 border">Total Meter</th>
                  <th class="px-4 py-2 border">Total Yard</th>
                  <Show when={isView && showFinance()}>
                    <th class="px-4 py-2 border">Total Harga Retur</th>
                  </Show>
                </tr>
              </thead>
              <tbody>
                <tr>
                  {(() => {
                    const t = calcAllSelected(sjDetail());
                    const totalHarga = calculateTotalReturFromDisplay();

                    return (
                      <>
                        <td class="px-4 py-2 border text-right">
                          {formatNumber(t.m)}
                        </td>
                        <td class="px-4 py-2 border text-right">
                          {formatNumber(t.y)}
                        </td>
                        <Show when={isView && showFinance()}>
                          <td class="px-4 py-2 border text-right">
                            {formatIDR(totalHarga)}
                          </td>
                        </Show>
                      </>
                    );
                  })()}
                </tr>
              </tbody>
            </table>
          </div>
        </Show>

        <div class="mt-6">
          <button
            type="submit"
            class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            hidden={isView}
          >
            {isEdit ? "Update" : "Simpan"}
          </button>
        </div>
      </form>
    </MainLayout>
  );
}
