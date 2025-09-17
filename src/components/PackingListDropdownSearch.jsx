import {
  createSignal, createMemo, createEffect, onCleanup, For, Show,
} from "solid-js";
import { onClickOutside } from "./OnClickOutside.jsx";

/* ===================== Konstanta tampilan ===================== */
const COLOR_LIMIT = 4; // maksimal warna yang ditampilkan
const LOT_LIMIT = 7;   // maksimal lot yang ditampilkan
const PREFETCH_CONCURRENCY = 6; // batasi paralel request biar halus

/* ===================== Helpers umum ===================== */

// format list + limit + string full
function formatList(values, limit, joiner = ", ") {
  const uniq = Array.from(
    new Set(
      (values || [])
        .map(v => (v == null ? "" : String(v).trim()))
        .filter(Boolean)
    )
  );
  const full = uniq.join(joiner);
  const display =
    limit == null || uniq.length <= limit
      ? (full || "-")
      : `${uniq.slice(0, limit).join(joiner)} (+${uniq.length - limit})`;
  return { list: uniq, full, display: display || "-" };
}

// index Sales Order by id untuk akses cepat
function buildSOIndex(salesOrders) {
  const arr = typeof salesOrders === "function" ? salesOrders() : salesOrders || [];
  const idx = new Map();
  arr.forEach((so) => idx.set(so.id, so));
  return idx;
}

// jalankan Promise dalam batch terkontrol
async function runBatched(promises, batchSize = PREFETCH_CONCURRENCY) {
  for (let i = 0; i < promises.length; i += batchSize) {
    await Promise.allSettled(promises.slice(i, i + batchSize));
  }
}

/* ===================== Ekstraktor konten ===================== */

// warna: ambil dari SO detail (prioritas), fallback PL detail, lalu format
function getColorsFromDetails(soDetail, plDetail, limit = COLOR_LIMIT) {
  const soItems =
    soDetail?.items ||
    soDetail?.sales_order_items ||
    soDetail?.detail_items ||
    soDetail?.details ||
    [];
  const bucket = [];

  for (const it of soItems) {
    if (it?.deskripsi_warna) bucket.push(it.deskripsi_warna);
    if (it?.warna_kain) bucket.push(it.warna_kain);
    if (it?.warna) bucket.push(it.warna);
  }

  if (bucket.length === 0) {
    const plis = plDetail?.items || [];
    for (const it of plis) {
      if (it?.deskripsi_warna) bucket.push(it.deskripsi_warna);
      if (it?.warna_kain) bucket.push(it.warna_kain);
      if (it?.warna) bucket.push(it.warna);
    }
  }

  return formatList(bucket, limit);
}

/**
 * Ambil semua lot dari items[].rolls[].lot
 * - Dedupe
 * - Urutkan asc jika numeric semua
 * - Limit tampilan
 */
function getLotsFromRolls(pl, limit = LOT_LIMIT) {
  const lots = [];
  const items = pl?.items || [];
  for (const it of items) {
    const rolls = it?.rolls || [];
    for (const r of rolls) {
      if (r?.lot == null) continue;
      String(r.lot)
        .split(",")
        .map(s => s.trim())
        .filter(Boolean)
        // opsional: buang nilai tidak relevan
        .filter(v => v !== "0" && v !== "-")
        .forEach(v => lots.push(v));
    }
  }

  let uniq = Array.from(new Set(lots));
  const allNumeric = uniq.every(v => /^-?\d+(\.\d+)?$/.test(v));
  if (allNumeric) uniq = uniq.sort((a, b) => Number(a) - Number(b));

  const full = uniq.join(", ");
  const display =
    limit == null || uniq.length <= limit
      ? (full || "-")
      : `${uniq.slice(0, limit).join(", ")} +${uniq.length - limit} lainnya`;

  return { list: uniq, full, display: display || "-" };
}

/**
 * SMART lot:
 * - Jika ada `summary.lot` atau `pl.lot` → pakai ini (instan, tidak perlu fetch detail)
 * - Jika tidak ada → jatuh ke `rolls`
 */
function getLotsSmart(pl, limit = LOT_LIMIT) {
  const fromSummary = pl?.summary?.lot ?? pl?.lot;
  if (fromSummary) {
    const list = Array.from(
      new Set(
        String(fromSummary)
          .split(",")
          .map(s => s.trim())
          .filter(Boolean)
      )
    );
    const full = list.join(", ");
    const display =
      limit == null || list.length <= limit
        ? (full || "-")
        : `${list.slice(0, limit).join(", ")} (+${list.length - limit})`;
    return { list, full, display: display || "-" };
  }
  return getLotsFromRolls(pl, limit);
}

// kompat lama bila dipakai di tempat lain
function extractLotsFromPL(pl) {
  return getLotsSmart(pl, null).full;
}

/**
 * Hitung sisa vs total berdasarkan satuan, dengan guard jika summary belum ada.
 * - Jika total = 0 → "-"
 * - Jika sisa <= 0 → "SELESAI"
 * - Selain itu → "{sisa} / {total}"
 */
function qtyCounterbySystem(pl, satuanUnit) {
  let total = 0, terkirim = 0;
  const s = pl?.summary || {};
  switch (satuanUnit) {
    case "Meter":
      total = +(s.total_meter ?? 0);
      terkirim = +(s.total_meter_dalam_proses ?? 0);
      break;
    case "Yard":
      total = +(s.total_yard ?? 0);
      terkirim = +(s.total_yard_dalam_proses ?? 0);
      break;
    case "Kilogram":
      total = +(s.total_kilogram ?? 0);
      terkirim = +(s.total_kilogram_dalam_proses ?? 0);
      break;
    default:
      return "-";
  }
  if (!total) return "-";
  const sisa = total - terkirim;
  return sisa <= 0 ? "SELESAI" : `${sisa.toLocaleString("id-ID")} / ${total.toLocaleString("id-ID")}`;
}

/* ===================== Komponen ===================== */
export default function PackingListDropdownSearch({
  packingLists,
  salesOrders,
  value,
  onChange,
  disabled = false,
  hideFinished = true,
  placeholder = "Pilih Packing List",
  fetchPLDetail,            // async (plId) => {order: {...}} | {...}
  fetchSODetail,            // async (soId) => {order: {...}} | {...}
  class: rootClass = "",
}) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");
  let ref;

  const lists = createMemo(() => (typeof packingLists === "function" ? packingLists() : packingLists) || []);
  const soIndex = createMemo(() => buildSOIndex(salesOrders));

  // cache reaktif
  const [plCache, setPlCache] = createSignal({}); // { [plId]: detail }
  const [soCache, setSoCache] = createSignal({}); // { [soId]: detail }
  const putPl = (id, d) => setPlCache(prev => ({ ...prev, [id]: d }));
  const putSo = (id, d) => setSoCache(prev => ({ ...prev, [id]: d }));

  // tutup ketika klik di luar
  createEffect(() => {
    if (!ref) return;
    const stop = onClickOutside(ref, () => setIsOpen(false));
    onCleanup(stop);
  });

  const selected = createMemo(() =>
    (lists() || []).find((pl) => String(pl.id) === String(value))
  );

  const getSODetail = (pl) => soCache()[pl.so_id] || soIndex().get(pl.so_id) || null;
  const getPLDetail = (pl) => plCache()[pl.id] || pl;

  // label ringkas untuk tampilan
  function makeLabel(pl) {
    const soDetail = getSODetail(pl);
    const plDetail = getPLDetail(pl);

    const cust =
      soDetail?.customer_name ||
      soDetail?.customer?.name ||
      pl.customer_name ||
      "-";

    const warnaFmt = getColorsFromDetails(soDetail, plDetail, COLOR_LIMIT);
    const lotFmt = getLotsSmart(plDetail, LOT_LIMIT);

    const no = pl?.no_pl || "-";
    return `${no} | ${cust} | ${warnaFmt.display} | Lot ${lotFmt.display}`;
  }

  // key pencarian: gunakan FULL warna & FULL lot agar yang tersembunyi tetap bisa dicari
  function makeSearchKey(pl) {
    const soDetail = getSODetail(pl);
    const plDetail = getPLDetail(pl);

    const cust =
      soDetail?.customer_name ||
      soDetail?.customer?.name ||
      pl.customer_name ||
      "-";

    const warnaFull = getColorsFromDetails(soDetail, plDetail, null).full;
    const lotFull = getLotsSmart(plDetail, null).full;
    const no = pl?.no_pl || "-";
    return `${no} | ${cust} | ${warnaFull} | Lot ${lotFull}`;
  }

  /* ---------- Prefetch 1: SO detail (paralel + batch) ---------- */
  createEffect(async () => {
    const lst = lists();
    if (!fetchSODetail || !lst.length) return;
    const uniqSo = Array.from(new Set(lst.map(pl => pl.so_id).filter(Boolean))).slice(0, 3);

    const tasks = [];
    const nextSo = {};
    for (const soId of uniqSo) {
      if (!soCache()[soId]) {
        tasks.push(
          fetchSODetail(soId)
            .then(r => {
              const d = r?.order || r?.orders?.find?.(o => String(o.id) === String(soId)) || r;
              if (d) nextSo[soId] = d;
            })
            .catch(() => {})
        );
      }
    }
    await runBatched(tasks, PREFETCH_CONCURRENCY);
    if (Object.keys(nextSo).length) setSoCache(prev => ({ ...prev, ...nextSo }));
  });

  /* ---------- Prefetch 2: begitu ada selected, fetch PL detail ---------- */
  createEffect(async () => {
    const sel = selected();
    if (!sel || !fetchPLDetail || plCache()[sel.id]) return;
    try {
      const r = await fetchPLDetail(sel.id);
      const d = r?.order || r;
      if (d) putPl(sel.id, d);
    } catch {}
  });

  /* ---------- Prefetch 3: saat dropdown dibuka, enrich item terlihat (paralel + batch) ---------- */
  createEffect(async () => {
    if (!isOpen()) return;
    const source = filtered().slice(0, 20);

    const tasks = [];
    const nextPl = {};
    const nextSo = {};

    for (const pl of source) {
      if (fetchPLDetail && !plCache()[pl.id]) {
        tasks.push(
          fetchPLDetail(pl.id)
            .then(r => {
              const d = r?.order || r;
              if (d) nextPl[pl.id] = d;
            })
            .catch(() => {})
        );
      }
      const soId = pl.so_id;
      if (fetchSODetail && soId && !soCache()[soId]) {
        tasks.push(
          fetchSODetail(soId)
            .then(r => {
              const d = r?.order || r?.orders?.find?.(o => String(o.id) === String(soId)) || r;
              if (d) nextSo[soId] = d;
            })
            .catch(() => {})
        );
      }
    }

    await runBatched(tasks, PREFETCH_CONCURRENCY);
    if (Object.keys(nextPl).length) setPlCache(prev => ({ ...prev, ...nextPl }));
    if (Object.keys(nextSo).length) setSoCache(prev => ({ ...prev, ...nextSo }));
  });

  // filter: gunakan search key (full) + opsi sembunyikan selesai
  const filtered = createMemo(() => {
    const q = search().toLowerCase();
    // depend pada cache supaya rerender saat detail datang
    plCache(); soCache();
    return (lists() || []).filter((pl) => {
      if (hideFinished && qtyCounterbySystem(pl, pl.satuan_unit) === "SELESAI") return false;
      return makeSearchKey(pl).toLowerCase().includes(q);
    });
  });

  const choose = (pl) => {
    if (disabled) return;
    onChange?.(pl);
    setSearch("");
    setIsOpen(false);
  };

  // tooltip gabungan warna + lot (full) saat hover
  function getTooltip(pl) {
    const soDetail = getSODetail(pl);
    const plDetail = getPLDetail(pl);
    const warnaFull = getColorsFromDetails(soDetail, plDetail, null).full || "-";
    const lotFull = getLotsSmart(plDetail, null).full || "-";
    return `Warna: ${warnaFull}\nLot: ${lotFull}`;
  }

  return (
    <div class={`relative w-full ${rootClass}`} ref={ref}>
      <button
        type="button"
        class="w-full border p-2 rounded text-left disabled:bg-gray-200"
        onClick={() => !disabled && setIsOpen(v => !v)}
        disabled={disabled}
        title={selected() ? getTooltip(selected()) : ""}
      >
        <div class="whitespace-nowrap overflow-hidden text-ellipsis">
          {selected() ? makeLabel(selected()) : placeholder}
        </div>
      </button>

      <Show when={isOpen() && !disabled}>
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow max-h-72 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari No PL / Customer / Warna / Lot…"
            class="w-full p-2 border-b focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            autofocus
          />
          <Show when={filtered().length > 0} fallback={<div class="p-2 text-gray-400">Packing List tidak ditemukan</div>}>
            <For each={filtered()}>
              {(pl) => (
                <button
                  type="button"
                  class="w-full text-left p-2 hover:bg-blue-50"
                  onClick={() => choose(pl)}
                  title={getTooltip(pl)}
                >
                  <div class="whitespace-nowrap overflow-hidden text-ellipsis">
                    {makeLabel(pl)}
                  </div>
                </button>
              )}
            </For>
          </Show>
        </div>
      </Show>
    </div>
  );
}
