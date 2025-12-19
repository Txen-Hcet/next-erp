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

        // Filter is_via untuk Sales
        if (isSales) {
            const isViaValue = row.is_via ?? sj.is_via;
            if (isViaValue === 1 || isViaValue === "1" || isViaValue === true) {
                return null;
            }
        }

        const items = sj.itemsWithRolls ?? sj.items ?? (sj.packing_lists?.[0]?.items) ?? [];
        
        if (items.length === 0) return null;

        // === AMBIL CURRENCY ===
        // Prioritas: sj.currency -> sj.currency_id -> 'IDR'
        let currencyCode = sj.currency || "IDR";
        if (!sj.currency && sj.currency_id === 2) currencyCode = "USD";
        if (!sj.currency && sj.currency_id === 1) currencyCode = "IDR";

        const mainData = {
          customer_name: sj.customer_name || row.customer_name || '-',
          supplier_name: isSales ? null : (sj.supplier_name || row.supplier_name || '-'),
          delivered_status: Number(row.delivered_status) === 1,
          currency: currencyCode // Simpan Currency
        };
        
        const processedItems = items.map(item => {
          const unit = sj.satuan_unit || item.satuan_unit_name || 'Meter';
          const qty = unit === 'Yard' ? (+item.yard_total || 0) : unit === 'Kilogram' ? (+item.kilogram_total || 0) : (+item.meter_total || 0);

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