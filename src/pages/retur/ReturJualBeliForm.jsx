import { createSignal, For, onMount, Show, createMemo } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  getUser,
  // SP Jual Beli
  getJBDeliveryNotes,
  getAllJBDeliveryNotes,
  // Retur Jual Beli
  getAllJualBeliReturs,
  createJualBeliRetur,
  getJualBeliRetur,
  updateDataJualBeliRetur,
  // Generator nomor
  getLastSequence,
} from "../../utils/auth";

import SuratPenerimaanJualBeliDropdownSearch from "../../components/SuratPenerimaanJualBeliDropdownSearch";
import { Printer, Trash2 } from "lucide-solid";

/* ========================= Helpers ========================= */
const M2Y = 1.093613;
const toNum = (v) => (v === null || v === undefined ? 0 : Number(v)) || 0;

const fmtNum = (n, d = 2) =>
  new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(toNum(n));

const parseNumber = (str) => {
  if (typeof str !== "string" || !str) return 0;
  const cleaned = str.replace(/[^\d,.-]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
};

const isDelivered = (row) => {
  const v =
    row?.delivered_status ?? row?.is_invoiced ?? row?.invoice_issued ?? 0;
  if (typeof v === "string") return v === "1" || v.toLowerCase() === "true";
  if (typeof v === "number") return v === 1;
  return !!v;
};
/* ======================= End Helpers ======================= */

export default function ReturJualBeliForm() {
  const [params] = useSearchParams();
  const isView = params.view === "true";
  const sjId = params.sj_id ? Number(params.sj_id) : null;
  const returId = params.id ? Number(params.id) : null;

  const navigate = useNavigate();
  const user = getUser();

  // Dropdown + pilihan
  const [spOptions, setSpOptions] = createSignal([]);
  const [selectedSJId, setSelectedSJId] = createSignal(null);

  // State
  const [loading, setLoading] = createSignal(true);
  const [deliveryNoteData, setDeliveryNoteData] = createSignal(null);
  const [deletedItems, setDeletedItems] = createSignal([]);

  const [availableItems, setAvailableItems] = createSignal([]);

  // Cache retur signal
  const [allRetursCache, setAllRetursCache] = createSignal([]);

  async function computeAvailableForSJ(
    sjId,
    { includeCurrent = false } = {},
    allRetursData = null, // Menerima data cache retur
	sjData = null,
  ) {
    // Ambil detail SJ (untuk daftar item awal)
    const sjRes = sjData 
      ? { suratJalan: sjData }
      : await getJBDeliveryNotes(sjId, user?.token);
    const sj = sjRes?.suratJalan || sjRes?.order || sjRes;
    const sjItems = (sj?.items || []).filter((it) => !it?.deleted_at);

    // Ambil semua data retur dari cache, fallback jika tidak ada, pilih yang sj_id sama 
    const allReturs =
      allRetursData ??
      (await getAllJualBeliReturs?.(user?.token))?.data ??
      [];

    const sameSJReturs = allReturs.filter((r) => {
      if (String(r.sj_id) !== String(sjId)) return false;
      if (!includeCurrent && returId && String(r.id) === String(returId))
        return false;
      return true;
    });

    // Akumulasi total retur per sj_item_id
    const returnedBySJItem = new Map();
    for (const r of sameSJReturs) {
      const items = Array.isArray(r.items) ? r.items : [];
      for (const it of items) {
        const key = it.sj_item_id ?? it.id;
        const prev = returnedBySJItem.get(key) || { meter: 0, yard: 0 };
        returnedBySJItem.set(key, {
          meter: prev.meter + toNum(it.meter_total),
          yard: prev.yard + toNum(it.yard_total),
        });
      }
    }

    // Hitung available = SJ − total retur
    const result = sjItems.map((it) => {
      const key = it.id;
      const ret = returnedBySJItem.get(key) || { meter: 0, yard: 0 };
      const meterAwal = toNum(it.meter_total);
      const yardAwal = toNum(it.yard_total);
      const available_meter = Math.max(meterAwal - ret.meter, 0);
      const available_yard = Math.max(yardAwal - ret.yard, 0);

      return {
        sj_item_id: key,
        corak_kain: it.corak_kain ?? "N/A",
        konstruksi_kain: it.konstruksi_kain ?? "",
        deskripsi_warna: it.deskripsi_warna ?? it.keterangan_warna ?? "",
        available_meter,
        available_yard,
        meter_awal: meterAwal,
        yard_awal: yardAwal,
      };
    });

    // Hanya tampilkan yang qty-nya masih > 0
    //return result.filter((row) => row.available_meter > 0 || row.available_yard > 0);
    return result;
  }

  /* helper total sisa per SJ (pakai unit SJ) */
  async function computeAvailableTotalForSJ(sjId, allRetursData = null) {
    const sjRes = await getJBDeliveryNotes(sjId, user?.token);
    const sj = sjRes?.suratJalan || sjRes?.order || sjRes;
    if (!sj) return 0;

    const unitName = sj?.satuan_unit_name || sj?.satuan_unit || "Meter";
    const itemsAvail = await computeAvailableForSJ(
      sjId,
      {
        includeCurrent: false,
      },
      allRetursData, // Passing data cahce
	  sj,
    );

    const total = itemsAvail.reduce((sum, row) => {
      const v =
        unitName === "Meter"
          ? toNum(row.available_meter)
          : toNum(row.available_yard);
      return sum + v;
    }, 0);

    return total; // 0 artinya HABIS semua
  }

  async function enrichSPOptions(list, allRetursData = null) {
    const arr = Array.isArray(list) ? list : [];
    const withAvail = await Promise.all(
      arr.map(async (sj) => {
        const total = await computeAvailableTotalForSJ(sj.id, allRetursData);
        return { ...sj, __available_total__: total };
      })
    );
    return withAvail;
  }

  async function addMoreItemsFromSJ() {
    try {
      const sj_id =
        selectedSJId() || deliveryNoteData()?.sj_id || deliveryNoteData()?.id;

      if (!sj_id) {
        await Swal.fire(
          "Tidak bisa",
          "Surat Penerimaan belum dipilih.",
          "warning"
        );
        return;
      }

      // 1) Ambil SJ detail (untuk ambil info lengkap item: lebar, harga, dsb.)
      const sjRes = await getJBDeliveryNotes(sj_id, user?.token);
      const sj = sjRes?.suratJalan || sjRes?.order || sjRes;
      const sjItems = (sj?.items || []).filter((it) => !it?.deleted_at);

      // 2) Hitung item yang masih tersedia (exclude retur yang sedang diedit)
      const available = await computeAvailableForSJ(
        sj_id,
        {
          includeCurrent: false,
        },
        allRetursCache()
      );

      // Buat set sj_item_id yang available > 0
      const availableSet = new Set(
        available
          .map((r) => r.sj_item_id)
          .filter((id) => id !== null && id !== undefined)
      );

      // 3) Ambil sj_item_id yang sudah ada di retur sekarang (hindari duplikasi)
      const existingSet = new Set(
        (form().itemGroups || []).map((g) => g.sj_item_id)
      );

      // 4) Pilih item SJ yang masih available & belum ada di retur ini
      const candidates = sjItems.filter(
        (it) => availableSet.has(it.id) && !existingSet.has(it.id)
      );

      if (candidates.length === 0) {
        await Swal.fire(
          "Info",
          "Tidak ada item tersedia untuk ditambahkan.",
          "info"
        );
        return;
      }

      // 5) Map ke baris tabel kita (qty diset 0 agar user isi manual)
      const newRows = candidates.map((g) => {
        const row = mapToItemGroupFromSJ(g);
        row.meter_total = 0;
        row.yard_total = 0;
        row.gulung = toNum(row.gulung); // amankan
        row.lot = toNum(row.lot);
        return row;
      });

      setForm((prev) => ({
        ...prev,
        itemGroups: [...prev.itemGroups, ...newRows],
      }));
    } catch (err) {
      console.error(err);
      await Swal.fire(
        "Gagal",
        err?.message || "Tidak bisa menambahkan item dari SJ.",
        "error"
      );
    }
  }

  const [form, setForm] = createSignal({
    no_retur: "",
    no_sj_supplier: "",
    tanggal_kirim: "",
    alamat_pengiriman: "",
    unit: "Meter",
    keterangan_retur: "",
    itemGroups: [],
  });

  // Totals
  const totalMeter = createMemo(() =>
    form().itemGroups.reduce((sum, g) => sum + toNum(g.meter_total), 0)
  );
  const totalYard = createMemo(() =>
    form().itemGroups.reduce((sum, g) => sum + toNum(g.yard_total), 0)
  );

  /* ===================== MAPPERS ===================== */
  // Dari SP → baris tabel (CREATE)
  function mapToItemGroupFromSJ(group) {
    return {
      id: group.id,
      sj_item_id: group.id,
      retur_item_id: null,
      purchase_order_item_id:
        group.jb_item_id ?? group.purchase_order_item_id ?? null,
      item_details: {
        corak_kain: group.corak_kain ?? "N/A",
        konstruksi_kain: group.konstruksi_kain ?? "",
        deskripsi_warna: group.deskripsi_warna ?? "",
        lebar_kain: toNum(group.lebar_kain),
        harga: toNum(group.harga),
      },
      meter_total: toNum(group.meter_total),
      yard_total: toNum(group.yard_total),
      gulung: toNum(group.gulung),
      lot: toNum(group.lot),
    };
  }

  // Dari detail retur → baris tabel (EDIT/VIEW)
  function mapToItemGroupFromRetur(it) {
    return {
      id: it.sj_item_id ?? it.id,
      sj_item_id: it.sj_item_id ?? it.id,
      retur_item_id: it.id ?? null,
      purchase_order_item_id:
        it.po_item_id ?? it.purchase_order_item_id ?? null,
      item_details: {
        corak_kain: it.corak_kain ?? "N/A",
        konstruksi_kain: it.konstruksi_kain ?? "",
        deskripsi_warna: it.deskripsi_warna ?? it.keterangan_warna ?? "",
        lebar_kain: toNum(it.lebar_kain),
	      harga: toNum(it.harga),
      },
      meter_total: toNum(it.meter_total),
      yard_total: toNum(it.yard_total),
      gulung: toNum(it.gulung),
      lot: toNum(it.lot),
    };
  }

  /* ===================== PREFILL ===================== */
  async function prefillFromSPId(id) {
    const sjResponse = await getJBDeliveryNotes(id, user?.token);
    const sj = sjResponse?.suratJalan || sjResponse?.order || sjResponse;
    if (!sj) {
      Swal.fire(
        "Error",
        "Data Surat Penerimaan Jual Beli tidak ditemukan.",
        "error"
      );
      return;
    }
	setDeliveryNoteData({ ...sj });

	const unitName = sj?.satuan_unit_name || sj?.satuan_unit || "Meter";
	setForm((prev) => ({
		...prev,
		no_sj_supplier: sj.no_sj_supplier || "",
		alamat_pengiriman: sj.supplier_alamat || sj.alamat_pengiriman || "",
		tanggal_kirim: sj.tanggal_kirim
		  ? new Date(sj.tanggal_kirim).toISOString().split("T")[0]
		  : sj.created_at
		  ? new Date(sj.created_at).toISOString().split("T")[0]
		  : "",
		unit: unitName,
		itemGroups: (sj.items || [])
		  .filter((g) => !g?.deleted_at)
		  .map(mapToItemGroupFromSJ),
	}));
  }

  async function prefillFromReturId(id) {
	const res = await getJualBeliRetur(id, user?.token);

	//console.log("Retur JB per ID: ", JSON.stringify(res, null, 2));

	const detail = Array.isArray(res?.data) ? res.data[0] : res?.data;
	if (!detail) {
	  Swal.fire("Error", "Data Retur Jual Beli tidak ditemukan.", "error");
	  return;
	}
	setDeliveryNoteData({ ...detail });
	setSelectedSJId(detail.sj_id ?? null);

	if (detail.sj_id) {
	  const avail = await computeAvailableForSJ(
	  detail.sj_id,
	  {
		includeCurrent: true,
	  },
	  allRetursCache()
	);
	setAvailableItems(avail);
	} else {
	  setAvailableItems([]);
	}

	setForm((prev) => ({
	  ...prev,
	  no_retur: detail.no_retur || "",
	  no_sj_supplier: detail.no_sj_supplier || detail.no_sj || "",
	  alamat_pengiriman:
		detail.supplier_alamat || detail.alamat_pengiriman || "",
	  tanggal_kirim: detail.tanggal_kirim
		? new Date(detail.tanggal_kirim).toISOString().split("T")[0]
		: "",
	  unit: detail.satuan_unit_name || detail.satuan_unit || "Meter",
	  keterangan_retur: detail.keterangan_retur || "",
	  itemGroups: (detail.items || []).map(mapToItemGroupFromRetur),
	}));
  }

  const filterEligibleSJ = (list, allRetursData) => {
    const arr = Array.isArray(list) ? list : [];

    return arr.filter(sj => {
        // 1. Cek apakah SJ sudah di-invoice (menggunakan isDelivered)
        if (!isDelivered(sj)) {
          return false;
        }

        // 2. Hitung total quantity yang sudah diretur dari cache retur
        const sameSJReturs = allRetursData.filter(r => String(r.sj_id) === String(sj.id));
        let totalReturned = 0;
        const unitName = sj?.satuan_unit_name || sj?.satuan_unit || "Meter";

        sameSJReturs.forEach(retur => {
          const items = Array.isArray(retur.items) ? retur.items : [];
          items.forEach(item => {
              if (unitName === "Meter") {
                totalReturned += toNum(item.meter_total);
              } else {
                totalReturned += toNum(item.yard_total);
              }
          });
        });

        // 3. Ambil total quantity AWAL dari data list SJ
        const totalInitial = unitName === "Meter"
          ? toNum(sj.summary?.total_meter)
          : toNum(sj.summary?.total_yard);

        // PENTING: Tambahkan pengecekan jika summary tidak ada atau invalid
        if (totalInitial === undefined || totalInitial === null || isNaN(totalInitial)) {
             console.warn(`SJ ${sj.id} (${sj.no_sj}) tidak memiliki data summary total untuk ${unitName}. SJ ini akan difilter.`);
             return false; // Filter keluar jika data summary tidak valid
        }

        // 4. Hitung sisa quantity
        const available = totalInitial - totalReturned;

        // 5. Hanya return true jika sisa quantity > 0
        return available > 0;
    });
  };

  // Dropdown pilih SP
  const handleSuratPenerimaanChange = async (sj) => {
	try {
		setSelectedSJId(sj?.id ?? null);
		setForm((prev) => ({ ...prev, no_retur: "" }));
		if (!sj?.id) return;

		await prefillFromSPId(sj.id);
		const avail = await computeAvailableForSJ(
		sj.id,
		{
			includeCurrent: false,
		},
		allRetursCache()
		);
		setAvailableItems(avail);
	} catch (err) {
		console.error(err);
		Swal.fire(
		"Error",
		err?.message || "Gagal memuat detail Surat Penerimaan.",
		"error"
		);
	} finally {
		setLoading(false);
	}
  };

	/* ===================== INIT ===================== */
  onMount(async () => {
	setLoading(true);
	let returDetailForPrefill = null; // Tampung detail retur jika mode edit/view
	try {
		// 1. Get all data retur JB (Cache)
		const returRes = await getAllJualBeliReturs?.(user?.token);
		const allRetursData =
		(returRes && Array.isArray(returRes.data) && returRes.data) || [];
		setAllRetursCache(allRetursData);

		// 2. Ambil daftar SP JB (List Mentah)
		const allSP = await getAllJBDeliveryNotes?.(user?.token);
		const list =
		(allSP && Array.isArray(allSP?.suratJalans) && allSP.suratJalans) ||
		(allSP && Array.isArray(allSP?.data) && allSP.data) ||
		[];

		// 2.a Fetch detail retur jika mode EDIT/VIEW (butuh sj_id)
		if (returId) {
		const res = await getJualBeliRetur(returId, user?.token);
		returDetailForPrefill = Array.isArray(res?.data) ? res.data[0] : res?.data;
		if (!returDetailForPrefill) {
			Swal.fire("Error", "Data Retur Jual Beli tidak ditemukan.", "error");
			setLoading(false);
			return;
		}
		}

		let eligibleSJ = filterEligibleSJ(list, allRetursData);

		if (returId && returDetailForPrefill?.sj_id) {
		const targetSjId = returDetailForPrefill.sj_id;
		const isAlreadyIncluded = eligibleSJ.some((sj) => sj.id === targetSjId);

		if (!isAlreadyIncluded) {
			const missingSJ = list.find((sj) => sj.id === targetSjId);
			if (missingSJ) {
			console.log(
				`Menambahkan kembali SJ ${targetSjId} ke dropdown untuk mode VIEW/EDIT.`
			);
			eligibleSJ = [missingSJ, ...eligibleSJ];
			} else {
			console.warn(
				`SJ ${targetSjId} yang terkait dengan retur ${returId} tidak ditemukan dalam daftar SJ.`
			);
			}
		}
		}

		setSpOptions(eligibleSJ);

		if (returId && returDetailForPrefill) {
		await prefillUsingReturDetail(returDetailForPrefill, allRetursData);
		} else if (sjId) {
		await prefillFromSPId(sjId);
		setSelectedSJId(sjId);
		const avail = await computeAvailableForSJ(
			sjId,
			{ includeCurrent: false },
			allRetursData
		);
		setAvailableItems(avail);
		}
	} catch (err) {
		console.error(err);
		Swal.fire("Error", err?.message || "Gagal memuat data.", "error");
	} finally {
		setLoading(false);
	}
  });

  // Prefill menggunakan detail retur yang sudah ada
  async function prefillUsingReturDetail(detail, allRetursData) {
	if (!detail) return;

	setDeliveryNoteData({ ...detail });
	setSelectedSJId(detail.sj_id ?? null);

	if (detail.sj_id) {
		try {
		const avail = await computeAvailableForSJ(
			detail.sj_id,
			{ includeCurrent: true },
			allRetursData
		);
		setAvailableItems(avail);
		} catch(err) {
			console.error("Gagal menghitung available items saat prefill:", err);
			setAvailableItems([]);
			Swal.fire("Error", "Gagal menghitung item tersedia untuk SJ terkait.", "warning");
		}
	} else {
		setAvailableItems([]);
	}

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

  /* ===================== GENERATE NO RETUR ===================== */
  const handleGenerateNoRetur = async () => {
	try {
	  if (!deliveryNoteData()) {
		await Swal.fire(
		  "Tidak bisa",
		  "Pilih Surat Penerimaan dulu.",
		  "warning"
		);
		return;
	  }

	  // Baca PPN dari data SP (fallback ke 0 kalau tidak ada)
	  const ppnValue =
		Number(
		  deliveryNoteData()?.ppn_percent ??
			deliveryNoteData()?.ppn ??
			deliveryNoteData()?.ppn_persen ??
			0
		) || 0;

	  // Ikuti pola form lain: kode = "jb_r", region "domestik", kirim nilai PPN
	  const seq = await getLastSequence(
		user?.token,
		"jb_r",
		"domestik",
		ppnValue
	  );
	  const nextNum = String((seq?.last_sequence || 0) + 1).padStart(5, "0");

	  const now = new Date();
	  const mm = String(now.getMonth() + 1).padStart(2, "0");
	  const yy = String(now.getFullYear()).slice(2);
	  const flag = ppnValue > 0 ? "P" : "N"; // P = Pajak, N = Non Pajak

	  const nomor = `RT/JB/${flag}/${mm}${yy}-${nextNum}`;
	  setForm((prev) => ({ ...prev, no_retur: nomor }));
	} catch (e) {
	  console.error(e);
	  Swal.fire(
		"Gagal",
		e?.message || "Tidak bisa generate No Retur.",
		"error"
	  );
	}
  };

  /* ===================== EDITABLE FIELDS ===================== */
  const handleQuantityChange = (index, value) => {
	const unit = form().unit;
	const numValue = parseNumber(value);
	setForm((prev) => {
	  const arr = [...prev.itemGroups];
	  const row = { ...arr[index] };
	  if (unit === "Meter") {
		row.meter_total = numValue;
		row.yard_total = numValue * M2Y;
	  } else {
		row.yard_total = numValue;
		row.meter_total = numValue / M2Y;
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

  const removeItem = (index) => {
	setForm((prev) => {
	  const arr = [...prev.itemGroups];
	  const [removed] = arr.splice(index, 1);
	  if (removed?.retur_item_id)
		setDeletedItems((d) => [...d, removed.retur_item_id]);
	  return { ...prev, itemGroups: arr };
	});
  };

  /* ===================== BUILD PAYLOAD ===================== */
  const buildItemsPayload = () =>
	form().itemGroups.map((g) => {
	  const base = {
		sj_item_id: g.sj_item_id,
		gulung: Number(g.gulung) || 0,
		meter_total: toNum(g.meter_total),
		yard_total: toNum(g.yard_total),
	  };
	  // saat edit, backend biasanya butuh id item retur
	  if (g.retur_item_id) return { id: g.retur_item_id, ...base };
	  return base;
 	});

  /* ===================== SUBMIT ===================== */

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
	  (g) => toNum(g.meter_total) > 0 || toNum(g.yard_total) > 0
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
		//console.log("Update Retur JB: ", JSON.stringify(payload,null,2));
		await updateDataJualBeliRetur(user?.token, returId, payload);
		await Swal.fire({
		  icon: "success",
		  title: "Berhasil diubah",
		  text: "Retur Jual Beli berhasil diupdate!",
		  showConfirmButton: false,
		  timer: 1000,
		  timerProgressBar: true,
		});
	  } else {
		//console.log("Create Retur JB: ", JSON.stringify(payload,null,2));
		await createJualBeliRetur(user?.token, payload);
		await Swal.fire({
		  icon: "success",
		  title: "Berhasil disimpan",
		  text: "Retur Jual Beli berhasil disimpan!",
		  showConfirmButton: false,
		  timer: 1000,
		  timerProgressBar: true,
		});
	  }
	  navigate("/retur-jualbeli");
	} catch (err) {
	  console.error(err);
	  Swal.fire({
		icon: "error",
		title: "Gagal",
		text:
		  err?.message ||
		  (returId
			? "Gagal mengubah Retur Jual Beli."
			: "Gagal menyimpan Retur Jual Beli."),
		showConfirmButton: false,
		timer: 1500,
		timerProgressBar: true,
	  });
	}
  };

  /* ===================== CETAK ===================== */
  function handlePrint() {
	if (!deliveryNoteData()) {
	  Swal.fire("Gagal", "Pilih data dulu untuk cetak.", "error");
	  return;
	}
	const dataToPrint = { ...deliveryNoteData() };
	const encodedData = encodeURIComponent(JSON.stringify(dataToPrint));
	window.open(`/print/retur-jualbeli#${encodedData}`, "_blank");
  }

  const pageTitle = () => {
	if (returId && isView) return "Detail Retur Jual Beli";
	if (returId && !isView) return "Edit Retur Jual Beli";
	return "Tambah Retur Jual Beli";
  };

  /* ===================== UI ===================== */
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
				disabled
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
			<label class="block text-sm mb-1">Surat Penerimaan Jual Beli</label>
			<SuratPenerimaanJualBeliDropdownSearch
			  items={spOptions()}
			  value={selectedSJId()}
			  onChange={handleSuratPenerimaanChange}
			  disabled={isView || !!returId}
			  placeholder="Pilih Surat Penerimaan…"
			  requireDelivered
			  excludeZeroAvailable
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

		{/* Row 2 */}
		<div class="grid grid-cols-3 gap-4">
		  <div class="col-span-1">
			<label class="block text-sm mb-1">Alamat Pengiriman</label>
			<input
			  class="w-full border p-2 rounded bg-gray-200"
			  value={form().alamat_pengiriman}
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

		{/* Catatan */}
		<div>
		  <label class="block text-sm mb-1">Catatan Retur</label>
		  <textarea
			class="w-full border p-2 rounded"
			value={form().keterangan_retur}
			onInput={(e) =>
			  setForm({ ...form(), keterangan_retur: e.target.value })
			}
			disabled={isView}
			classList={{ "bg-gray-200": isView }}
			placeholder="Tulis catatan retur"
		  />
		</div>

		{/* Ringkasan quantity dari SP/Retur terpilih */}
		<Show when={deliveryNoteData()}>
		  {() => {
			const unit =
			  deliveryNoteData()?.satuan_unit_name || form().unit || "Meter";
			const items = availableItems();

			if (!items || items.length === 0) {
			  return (
				<div class="border p-3 rounded my-4 bg-gray-50">
				  <h3 class="text-md font-bold mb-2 text-gray-700">
					Quantity Kain pada Surat Penerimaan:
				  </h3>
				  <ul class="space-y-1 pl-5">
					<For each={form().itemGroups}>
					  {(it) => {
						const qty =
						  unit === "Meter" ? it.meter_total : it.yard_total;
						return (
						  <li class="text-sm list-disc">
							<span class="font-semibold">
							  {it.item_details?.corak_kain} |{" "}
							  {it.item_details?.konstruksi_kain}
							</span>{" "}
							- Quantity:{" "}
							<span class="font-bold text-blue-600">
							  {fmtNum(qty)} {unit === "Meter" ? "m" : "yd"}
							</span>
						  </li>
						);
					  }}
					</For>
				  </ul>
				</div>
			  );
			}

			return (
			  <div class="border p-3 rounded my-4 bg-gray-50">
				<h3 class="text-md font-bold mb-2 text-gray-700">
				  Quantity Kain pada Surat Penerimaan (Tersedia):
				</h3>
				<ul class="space-y-1 pl-5">
				  <For each={items}>
					{(row) => {
					  const qty =
						unit === "Meter"
						  ? toNum(row.available_meter ?? row.meter_awal)
						  : toNum(row.available_yard ?? row.yard_awal);

					  const awal =
						unit === "Meter"
						  ? toNum(row.meter_awal)
						  : toNum(row.yard_awal);

					  const satuan = unit === "Meter" ? "m" : "yd";
					  const habis = qty <= 0;

					  return (
						<li class="text-sm list-disc">
						  <span class="font-semibold">
							{row.corak_kain || "N/A"} |{" "}
							{row.konstruksi_kain || ""}
						  </span>{" "}
						  {/* <span class="text-gray-600">
							({row.deskripsi_warna || row.kode_warna || "-"})
						  </span>{" "} */}
						  - Quantity:{" "}
						  {habis ? (
							<span class="font-bold text-red-600">HABIS</span>
						  ) : (
							<span class="font-bold text-blue-600">
							  {returId
								? `${fmtNum(qty)} / ${fmtNum(awal)} ${satuan}`
								: `${fmtNum(qty)} ${satuan}`}
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

		{/* Tabel Items – format TIDAK diubah */}
		<div>
		  <h2 class="text-lg font-bold mt-6 mb-2">Items</h2>
		  {/* Tombol hanya terlihat saat EDIT (returId ada dan bukan view) */}
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
				<th class="border p-2 w-48">Lebar Kain</th>
				<th class="border p-2 w-60">Warna</th>
				<th class="border p-2 w-50">{form().unit}</th>
				<th class="border p-2 w-32">Gulung</th>
				<th class="border p-2 w-32">Lot</th>
				<th hidden class="border p-2 w-48">
				  Harga
				</th>
				<th hidden class="border p-2 w-48">
				  Subtotal
				</th>
				<th class="border p-2 w-48">Aksi</th>
			  </tr>
			</thead>
			<tbody>
			  <Show when={form().itemGroups.length > 0}>
				<For each={form().itemGroups}>
				  {(group, i) => {
					const qty =
					  form().unit === "Meter"
						? group.meter_total
						: group.yard_total;
					const subtotal =
					  toNum(group.item_details?.harga) * toNum(qty);

					return (
					  <tr>
						<td class="border p-2 text-center">{i() + 1}</td>
						<td class="border w-72 p-2">
						  <input
							class="border p-1 rounded w-full bg-gray-200"
							value={`${group.item_details?.corak_kain || ""} | ${
							  group.item_details?.konstruksi_kain || ""
							}`}
							disabled
						  />
						</td>
						<td class="border p-2">
						  <input
							type="number"
							class="border p-1 rounded w-full bg-gray-200"
							value={group.item_details?.lebar_kain}
							disabled
						  />
						</td>
						<td class="border p-2">
						  <input
							class="border p-1 rounded w-full bg-gray-200"
							value={group.item_details?.deskripsi_warna || ""}
							disabled
						  />
						</td>
						<td class="border p-2">
						  <input
							type="text"
							class="w-full border p-2 rounded text-right"
							value={fmtNum(qty)}
							onBlur={(e) =>
							  handleQuantityChange(i(), e.target.value)
							}
							disabled={isView}
							classList={{ "bg-gray-200": isView }}
						  />
						</td>

						{/* Gulung */}
						<td class="border p-2">
						  <input
							type="number"
							placeholder="Banyak gulung…"
							class="w-full border p-2 rounded text-right"
							value={group.gulung ?? 0}
							onBlur={(e) =>
							  handleGulungChange(i(), e.target.value)
							}
							disabled={isView}
							classList={{ "bg-gray-200": isView }}
						  />
						</td>

						{/* Lot */}
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
						  <input
							class="w-full border p-2 rounded text-right"
							value={fmtNum(group.item_details?.harga)}
							disabled
						  />
						</td>
						<td hidden class="border p-2 text-right font-semibold">
						  <input
							class="w-full border p-2 rounded text-right"
							value={fmtNum(subtotal)}
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
				<td colSpan="4" class="text-right p-2 border-t border-gray-300">
				  TOTAL
				</td>
				<td class="border p-2 text-right">
				  {form().unit === "Meter"
					? fmtNum(totalMeter(), 2)
					: fmtNum(totalYard(), 2)}
				</td>
				<td class="border-t border-gray-300" colSpan="3"></td>
			  </tr>
			</tfoot>
		  </table>
		</div>

		<div class="mt-6">
		  <button
			type="submit"
			class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
			hidden={isView}
		  >
			{returId ? "Update" : "Simpan"}
		  </button>
		</div>
	  </form>
	</MainLayout>
  );
}