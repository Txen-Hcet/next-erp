import Swal from 'sweetalert2';
import { getDeliveryNotes, getJBDeliveryNotes } from '../../utils/auth';

// Helper
const isFiniteNumber = (v) => v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v));
async function safeDetailCall(fn, id, token) {
  try { return await fn(id, token); } catch { try { return await fn(token, id); } catch { return null; } }
}

export async function processSummaryData({ kind, data: baseRows, token }) {
  Swal.fire({
    title: 'Mempersiapkan Laporan...',
    text: 'Mengambil data detail untuk setiap transaksi...',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  const isSales = kind === 'sales';
  const detailFetcher = isSales ? getDeliveryNotes : getJBDeliveryNotes;

  const processedSJs = await Promise.all(
    baseRows.map(async (row) => {
      try {
        const det = await detailFetcher(row.id, token);
        const sj = det?.order ?? det?.suratJalan ?? det?.data ?? {};

        // ============================================================
        // LOGIC BARU: Filter is_via
        // Hanya terapkan jika ini adalah Sales (Penjualan)
        // Jika is_via = 1, "1", atau true, kembalikan null (skip data)
        // ============================================================
        if (isSales) {
            const isViaValue = row.is_via ?? sj.is_via;
            if (isViaValue === 1 || isViaValue === "1" || isViaValue === true) {
                return null;
            }
        }

        // ==== Mencari lokasi array 'items' pada response JSON endpoint ====
        // Untuk Penjualan, item ada di 'itemsWithRolls' atau di dalam 'packing_lists'.
        const items = sj.itemsWithRolls ?? sj.items ?? (sj.packing_lists?.[0]?.items) ?? [];
        
        if (items.length === 0) return null;

        const mainData = {
          customer_name: sj.customer_name || row.customer_name || '-',
          supplier_name: isSales ? null : (sj.supplier_name || row.supplier_name || '-'),
          delivered_status: Number(row.delivered_status) === 1,
        };
        
        const processedItems = items.map(item => {
          // Untuk Penjualan, unit ada di level atas. Untuk Jual Beli, bisa di level atas atau item.
          const unit = sj.satuan_unit || item.satuan_unit_name || 'Meter';
          const qty = unit === 'Yard' ? (+item.yard_total || 0) : (+item.meter_total || 0);
          const harga = isFiniteNumber(item.harga) ? +item.harga : 0;
          
          return {
            corak: item.corak_kain || '-',
            meter: +item.meter_total || 0,
            yard: +item.yard_total || 0,
            kg: +item.kilogram_total || 0,
            harga_satuan: harga,
            subtotal: harga * qty,
          };
        });

        return { mainData, items: processedItems };
      } catch (error) {
        console.warn(`Gagal memproses detail untuk ID ${row.id}:`, error);
        return null;
      }
    })
  );

  const groupedData = { invoiced: [], pending: [] };
  // processedSJs.filter(Boolean) akan otomatis membuang yang return null (termasuk yang kena filter is_via)
  processedSJs.filter(Boolean).forEach(sj => {
    if (sj.mainData.delivered_status) {
      groupedData.invoiced.push(sj);
    } else {
      groupedData.pending.push(sj);
    }
  });

  Swal.close();
  return groupedData;
}