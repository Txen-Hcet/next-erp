import {
  getBGDeliveryNotes,
  getOCDeliveryNotes,
  getKJDeliveryNotes,
  getJBDeliveryNotes,
  getSalesOrders,
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
    sales: getSalesOrders,
  },
};

const parseNum = (val) => {
  if (val === undefined || val === null || val === "") return 0;
  const n = Number(String(val).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const pick = (...vals) => vals.find(v => v !== undefined && v !== null && v !== "");

export async function processDeliveryNotesData({ baseRows, block, token }) {
  if (!baseRows || baseRows.length === 0) {
    return [];
  }

  Swal.fire({
    title: 'Mempersiapkan Laporan...',
    text: 'Mengambil dan memproses data, mohon tunggu.',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  const detailFetcher = DETAIL_FETCHER_MAP[block.mode]?.[block.key];
  if (!detailFetcher) {
    console.error("No detail fetcher found for:", block.mode, block.key);
    Swal.fire("Error", "Konfigurasi laporan tidak valid.", "error");
    return [];
  }

  const processedData = await Promise.all(
    baseRows.map(async (row) => {
      try {
        const fetcherId = block.mode === 'penjualan' ? (row.so_id ?? row.soId) : row.id;
        if (!fetcherId) return null;

        const res = await detailFetcher(fetcherId, token);
        const data = res?.suratJalan ?? res?.order ?? res;
        if (!data || !Array.isArray(data.items)) return null;

        const mainData = {
          id: row.id,
          tanggal: row.created_at,
          no_sj: row.no_sj ?? '-',
          relasi: data.supplier_name ?? data.customer_name ?? '-',
          no_ref: pick(data.no_po, data.no_pc, data.no_jb, data.no_so, '-'),
          unit: data.satuan_unit_name || 'Meter' // Simpan satuan unit utama
        };

        const items = data.items.map(item => {
          const isKainJadi = block.key === 'kain_jadi';
          
          const meter = parseNum(item.meter_total);
          const yard = parseNum(item.yard_total);

          // ==== BAGIAN KRITIS ====
          // Tentukan kuantitas untuk kalkulasi berdasarkan satuan unit dari data utama.
          // Jika 'Yard', gunakan nilai yard. Jika tidak (atau null), default ke meter.
          const quantity = mainData.unit === 'Yard' ? yard : meter;

          let harga1, harga2, total;
          
          if (isKainJadi) {
            harga1 = parseNum(item.harga_greige);
            harga2 = parseNum(item.harga_maklun);
            total = (harga1 + harga2) * quantity;
          } else {
            harga1 = parseNum(item.harga);
            harga2 = null;
            total = harga1 * quantity;
          }

          return {
            kain: pick(item.corak_kain, '-'),
            warna: pick(item.kode_warna, item.warna_kode, item.warna, '-'),
            grade: pick(item.grade_name, '-'),
            meter: meter,
            yard: yard,
            harga1: harga1,
            harga2: harga2,
            total: total,
          };
        });

        return { mainData, items };

      } catch (error) {
        console.warn(`Gagal memproses detail untuk SJ ID ${row.id}:`, error);
        return null;
      }
    })
  );

  Swal.close();
  return processedData.filter(Boolean);
}