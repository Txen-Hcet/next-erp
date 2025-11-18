import {
  getBGDeliveryNotes,
  getOCDeliveryNotes,
  getKJDeliveryNotes,
  getJBDeliveryNotes,
  getDeliveryNotes,
} from "../../utils/auth";
import Swal from "sweetalert2";

const DETAIL_FETCHER_MAP = {
  pembelian: {
    greige: getBGDeliveryNotes,
    oc: getOCDeliveryNotes,
    kain_jadi: getKJDeliveryNotes,
    jual_beli: getJBDeliveryNotes,
  },
  penjualan: {
    sales: getDeliveryNotes,
  },
};

const parseNum = (val) => {
  if (val === undefined || val === null || val === "") return 0;
  const n = Number(String(val).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const pick = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== "");

// NEW: helper lokal untuk mencocokkan baris dengan pilihan customer
// selectedCustomerId bisa berupa number/string id asli ATAU string berformat "name:Nama Customer"
const matchesCustomer = (row, selectedCustomerId) => {
  if (!selectedCustomerId) return true;

  const sel = String(selectedCustomerId);

  const cid =
    row?.customer_id ??
    row?.customer?.id ??
    row?.buyer_id ??
    row?.buyer?.id ??
    null;

  const cname =
    row?.customer_name ??
    row?.customer?.name ??
    row?.customer?.nama ??
    row?.buyer_name ??
    row?.buyer?.nama ??
    null;

  // 1) match id
  if (cid !== null && String(cid) === sel) return true;

  // 2) match name:key "name:Nama"
  if (cname && `name:${cname}` === sel) return true;

  // 3) direct name equality (in case UI passed plain name)
  if (cname && String(cname) === sel) return true;

  return false;
};

export async function processDeliveryNotesData({ baseRows, block, token, customer_id }) {
  // kalau baseRows kosong -> kembalikan array kosong
  if (!baseRows || baseRows.length === 0) return [];

  // === filter baseRows berdasarkan customer_id jika diberikan ===
  const filteredBaseRows = customer_id
    ? (baseRows || []).filter((r) => matchesCustomer(r, customer_id))
    : baseRows;

  // jika setelah filter tidak ada baris, langsung kembalikan []
  if (!filteredBaseRows || filteredBaseRows.length === 0) return [];

  Swal.fire({
    title: "Mempersiapkan Laporan...",
    text: "Mengambil dan memproses data, mohon tunggu.",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  const detailFetcher = DETAIL_FETCHER_MAP[block.mode]?.[block.key];
  if (!detailFetcher) {
    console.error("No detail fetcher found for:", block.mode, block.key);
    Swal.fire("Error", "Konfigurasi laporan tidak valid.", "error");
    return [];
  }

  const results = await Promise.all(
    filteredBaseRows.map(async (row) => {
      try {
        if (!row || !row.id) return null;

        // --- Get detail response ---
        const res = await detailFetcher(row.id, token);
        const data = res?.suratJalan ?? res?.order ?? res ?? {};

        // Jika mode penjualan: gunakan struktur grouped { mainData, items }
        if (block.mode === "penjualan") {
          const itemsFromApi = Array.isArray(data.packing_lists)
            ? data.packing_lists.flatMap((pl) => pl.items || [])
            : Array.isArray(data.items)
            ? data.items
            : [];

          if (!itemsFromApi || itemsFromApi.length === 0) return null;

          const mainData = {
            id: row.id,
            tanggal: row.created_at ?? data.created_at ?? null,
            no_sj: row.no_sj ?? data.no_sj ?? "-",
            relasi:
              data.supplier_name ??
              data.customer_name ??
              row.customer_name ??
              "-",
            no_ref: pick(data.no_po, data.no_pc, data.no_jb, data.no_so, "-"),
            unit: data.satuan_unit_name || data.satuan_unit || "Meter",
          };

          const items = itemsFromApi.map((item) => {
            const isKainJadi = block.key === "kain_jadi";

            const totalMeter = Array.isArray(item.rolls)
              ? item.rolls.reduce((s, r) => s + parseNum(r.meter), 0)
              : parseNum(item.meter_total) || parseNum(item.meter);
            const totalYard = Array.isArray(item.rolls)
              ? item.rolls.reduce((s, r) => s + parseNum(r.yard), 0)
              : parseNum(item.yard_total) || parseNum(item.yard);
            const totalKilogram = Array.isArray(item.rolls)
              ? item.rolls.reduce((s, r) => s + parseNum(r.kilogram), 0)
              : parseNum(item.kilogram_total) || parseNum(item.kilogram);

            const unitLower = String(mainData.unit || "").toLowerCase();
            const quantity = unitLower === "yard" ? totalYard : unitLower === "kilogram" ? totalKilogram : totalMeter;

            let harga1 = isKainJadi ? parseNum(item.harga_greige) : parseNum(item.harga);
            let harga2 = isKainJadi ? parseNum(item.harga_maklun) : null;
            const total = (harga1 + (harga2 || 0)) * quantity;

            return {
              kain: pick(item.corak_kain, item.jenis_kain, "-"),
              warna: pick(item.so_deskripsi_warna, item.kode_warna, item.warna_kode, item.warna, "-"),
              grade: pick(item.grade_name, item.grade, "-"),
              meter: totalMeter,
              yard: totalYard,
              kilogram: totalKilogram,
              harga1,
              harga2,
              total,
              raw_item: item,
            };
          });

          return { mainData, items };
        }

        // --- Jika pembelian fallback ke flat rows per item) ---
        const itemsForPurchase = Array.isArray(data.items) ? data.items : [];
        if (itemsForPurchase.length === 0) return [];

        const mainDataPurchase = {
          id: row.id,
          tanggal: row.created_at ?? data.created_at ?? null,
          no_sj: row.no_sj ?? "-",
          relasi: data.supplier_name ?? data.customer_name ?? "-",
          no_ref: pick(data.no_po, data.no_pc, data.no_jb, data.no_so, "-"),
          unit: data.satuan_unit_name || data.satuan_unit || "Meter",
        };

        const flatRows = itemsForPurchase.map((item, idx) => {
          const isKainJadi = block.key === "kain_jadi";
          const meter = parseNum(item.meter_total ?? item.meter);
          const yard = parseNum(item.yard_total ?? item.yard);
          const kilogram = parseNum(item.kilogram_total ?? item.kilogram);

          const unitLower = String(mainDataPurchase.unit || "").toLowerCase();
          const quantity = unitLower === "yard" ? yard : unitLower === "kilogram" ? kilogram : meter;

          const harga1 = isKainJadi ? parseNum(item.harga_greige) : parseNum(item.harga);
          const harga2 = isKainJadi ? parseNum(item.harga_maklun) : null;
          const total = (harga1 + (harga2 || 0)) * quantity;

          const itemId = item.id ?? item.sj_item_id ?? item.po_item_id ?? `${row.id}_${idx}`;

          return {
            row_id: row.id,
            no_sj: mainDataPurchase.no_sj,
            tanggal: mainDataPurchase.tanggal,
            relasi: mainDataPurchase.relasi,
            no_ref: mainDataPurchase.no_ref,
            unit: mainDataPurchase.unit,
            item_id: itemId,
            line_index: idx,
            kain: pick(item.corak_kain, item.jenis_kain, "-"),
            warna: pick(item.kode_warna, item.warna_kode, item.warna, "-"),
            grade: pick(item.grade_name, item.grade, "-"),
            meter: meter,
            yard: yard,
            kilogram: kilogram,
            quantity: quantity,
            harga1: harga1,
            harga2: harga2,
            total: total,
            raw_item: item,
          };
        });

        return flatRows;
      } catch (error) {
        console.warn(`Gagal memproses detail untuk SJ ID ${row?.id}:`, error);
        return null;
      }
    })
  );

  Swal.close();

  const onlyNonNull = results.filter(Boolean);
  const hasGrouped = onlyNonNull.some((r) => r && r.mainData && Array.isArray(r.items));
  if (hasGrouped) {
    return onlyNonNull.filter((r) => r && r.mainData && Array.isArray(r.items));
  }

  return onlyNonNull.flat();
}
