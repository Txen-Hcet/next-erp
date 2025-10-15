import Swal from 'sweetalert2';

// ===== Helpers Umum (Tidak Berubah) =====
const isFiniteNumber = (v) => v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v));
async function safeDetailCall(fn, id, token) {
  try { return await fn(id, token); } catch { try { return await fn(token, id); } catch { return null; } }
}

// ===== Helpers Spesifik untuk PO Status =====
const unitName = (po) => po?.satuan_unit_name || "Meter";
const totalsByUnit = (po) => {
  const u = unitName(po);
  const s = po?.summary || {};
  if (u === "Meter")    return { unit: "Meter",    total: +(+s.total_meter || 0),    masuk: +(+s.total_meter_dalam_proses || 0) };
  if (u === "Yard")     return { unit: "Yard",     total: +(+s.total_yard || 0),     masuk: +(+s.total_yard_dalam_proses || 0) };
  if (u === "Kilogram") return { unit: "Kilogram", total: +(+s.total_kilogram || 0), masuk: +(+s.total_kilogram_dalam_proses || 0) };
  return { unit: "Meter", total: 0, masuk: 0 };
};

// ==== BAGIAN KRITIS: Kembalikan logika isDone seperti di Dashboard.jsx ====
const isDone = (po, isGreige) => {
  const { total, masuk } = totalsByUnit(po);
  const sisa = total - masuk;
  if (total <= 0) return false;
  
  // Logika ini sama untuk SEMUA modul, termasuk Jual Beli.
  if (isGreige) {
    // Greige: toleransi ±10%
    return sisa <= total * 0.1 + 1e-9;
  }
  // Lainnya (termasuk Jual Beli): selesai jika sisa <= 0
  return sisa <= 0 + 1e-9;
};

export async function processPOStatusData({ poRows, status, block, token, PO_DETAIL_FETCHER }) {
  Swal.fire({
    title: 'Mempersiapkan Laporan...',
    text: 'Mengambil data detail, mohon tunggu.',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  const isGreige = block.key === "greige";
  const isKainJadi = block.key === "kain_jadi";

  // Filter menggunakan fungsi isDone yang sudah disamakan
  const filteredPOs = poRows.filter(po => (status === "done" ? isDone(po, isGreige) : !isDone(po, isGreige)));

  if (filteredPOs.length === 0) {
    Swal.close();
    return [];
  }
  
  const processedData = await Promise.all(
    filteredPOs.map(async (po) => {
      try {
        const poDetailFetcher = PO_DETAIL_FETCHER?.[block.key];
        let dres = null;
        if (poDetailFetcher) {
          dres = await safeDetailCall(poDetailFetcher, po.id, token);
        }
        const order = dres?.order || dres?.data || dres?.mainRow || dres || po;

        const sourceForTotals = order.summary ? order : po;

        if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
          return null;
        }

        const { unit, total, masuk } = totalsByUnit(sourceForTotals);

        const refKey = block.key === 'jual_beli' ? 'no_jb' : (block.mode === 'penjualan' ? 'no_so' : 'no_po');

        const mainData = {
          ref: (order[refKey] || po[refKey]) || '-',
          tanggal: order.created_at || po.created_at,
          relasi:
            block.key === 'jual_beli'
              ? (order.customer_name || po.customer_name || '-')
              : (block.mode === 'penjualan'
                  ? (order.customer_name || po.customer_name || '-')
                  : (order.supplier_name || po.supplier_name || '-')),
          unit,
          totalPO: total,
          masukPO: masuk,
          sisaPO: Math.max(0, +(total - masuk).toFixed(4)),
        };

        const items = order.items.map(item => {
          const itemQty = unit === 'Yard' ? +(item.yard_total || 0) : +(item.meter_total || 0);
          let harga_satuan = null, harga_greige = null, harga_maklun = null, subtotal = 0;

          if (isKainJadi) {
            harga_greige = isFiniteNumber(item.harga_greige) ? +item.harga_greige : 0;
            harga_maklun = isFiniteNumber(item.harga_maklun) ? +item.harga_maklun : 0;
            subtotal = (harga_greige + harga_maklun) * itemQty;
          } else {
            harga_satuan = isFiniteNumber(item.harga) ? +item.harga : 0;
            subtotal = harga_satuan * itemQty;
          }

          return {
            corak: item.corak_kain || '-',
            warna: isGreige ? "" : (item.kode_warna || item.warna || '-'),
            ketWarna: isGreige ? "" : (item.keterangan_warna || item.keterangan_warna || ''),
            harga_satuan,
            harga_greige,
            harga_maklun,
            subtotal,
          };
        });

        return { mainData, items };

      } catch (error) {
        console.warn(`Gagal memproses detail untuk ID ${po.id}:`, error);
        return null;
      }
    })
  );
  
  Swal.close();
  return processedData.filter(Boolean).sort((a, b) => new Date(a.mainData.tanggal) - new Date(b.mainData.tanggal));
}