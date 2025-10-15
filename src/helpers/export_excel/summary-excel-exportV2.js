import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { getDeliveryNotes, getJBDeliveryNotes } from '../../utils/auth';

const parseNumber = (v) => {
  if (v === undefined || v === null || v === "") return 0;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v).replace(/[^\d\.\-]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const uniqJoin = (arr, sep = ", ") => Array.from(new Set(arr.filter(Boolean))).join(sep);

// Fungsi cerdas untuk mengekstrak total Rupiah dari berbagai struktur data
const extractTotalsFromOrder = (order) => {
  const summary = order?.summary ?? {};
  // Prioritas utama: Ambil dari summary
  const totalAkhir = parseNumber(summary?.total_akhir ?? summary?.subtotal);
  if (totalAkhir > 0) return { totalMoney: totalAkhir };

  // Prioritas kedua: Hitung dari item
  const items = order?.items ?? order?.itemsWithRolls ?? [];
  if (Array.isArray(items) && items.length > 0) {
    let sumFromHargaQty = 0;
    for (const it of items) {
      const harga = parseNumber(it?.harga);
      const qty = parseNumber(it?.meter_total || it?.yard_total || it?.kilogram_total);
      if (harga > 0 && qty > 0) sumFromHargaQty += harga * qty;
    }
    if (sumFromHargaQty > 0) return { totalMoney: sumFromHargaQty };
  }
  return { totalMoney: 0 };
};


export async function exportSummaryToExcel({ kind, data, filterLabel, token }) {
  const isSales = kind === 'sales';
  const title = isSales ? 'Penjualan' : 'Jual Beli';
  const detailFetcher = isSales ? getDeliveryNotes : getJBDeliveryNotes;

  if (!data || data.length === 0) {
    Swal.fire("Info", "Tidak ada data untuk diekspor.", "info");
    return;
  }

  Swal.fire({
    title: 'Mempersiapkan Laporan...',
    text: 'Mengambil data detail untuk harga dan total...',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  // 1. Ambil dan proses semua data detail
  const detailedRows = await Promise.all(data.map(async (row) => {
    try {
      const det = await detailFetcher(row.id, token);
      const sj = det?.order ?? det?.suratJalan ?? det?.data ?? {};
      const items = sj?.items ?? sj?.itemsWithRolls ?? [];
      
      const corak = uniqJoin(items.map((it) => it?.corak_kain)) || "-";
      const { totalMoney } = extractTotalsFromOrder(sj);

      // Logika untuk mendapatkan harga satuan (ambil dari item pertama)
      let hargaPerUnit = 0;
      if (items.length > 0) {
        hargaPerUnit = parseNumber(items[0]?.harga);
      }

      return { ...row, corak_kain: corak, totalMoney, hargaPerUnit };
    } catch (error) {
      console.error(`Gagal mengambil detail untuk SJ ID ${row.id}:`, error);
      return { ...row, corak_kain: '-', totalMoney: 0, hargaPerUnit: 0 };
    }
  }));

  // 2. Kelompokkan data
  const invoicedData = detailedRows.filter(row => Number(row.delivered_status) === 1);
  const pendingData = detailedRows.filter(row => Number(row.delivered_status) !== 1);

  // 3. Siapkan struktur worksheet
  let worksheetData = [];
  worksheetData.push([`Summary ${title}`]);
  worksheetData.push([`Periode: ${filterLabel}`]);
  worksheetData.push([]);

const baseHeaders = ['No', 'Nama Customer'];
  if (!isSales) baseHeaders.push('Supplier'); // Tambah kolom supplier
  const dataHeaders = [...baseHeaders, 'Corak Kain', 'Meter', 'Yard', 'Kilogram', 'Harga', 'Total'];
  
  // Fungsi untuk mem-build grup tabel (DRY principle)
  const buildGroup = (groupTitle, groupData) => {
    if (groupData.length === 0) return;
    
    worksheetData.push([groupTitle]);
    worksheetData.push(dataHeaders);
    
    groupData.forEach((row, index) => {
      const dataRow = [
        index + 1,
        row.customer_name,
      ];
      if (!isSales) dataRow.push(row.supplier_name);
      dataRow.push(
        row.corak_kain,
        parseNumber(row.summary?.total_meter),
        parseNumber(row.summary?.total_yard),
        parseNumber(row.summary?.total_kilogram),
        row.hargaPerUnit,
        row.totalMoney
      );
      worksheetData.push(dataRow);
    });

    const groupTotal = groupData.reduce((acc, row) => {
      acc.meter += parseNumber(row.summary?.total_meter);
      acc.yard += parseNumber(row.summary?.total_yard);
      acc.kg += parseNumber(row.summary?.total_kilogram);
      acc.totalAmount += row.totalMoney;
      return acc;
    }, { meter: 0, yard: 0, kg: 0, totalAmount: 0 });
    
    const totalRow = ['', isSales ? '' : '', '', 'Grand Total', groupTotal.meter, groupTotal.yard, groupTotal.kg, '', groupTotal.totalAmount];
    if (isSales) totalRow.splice(2, 1); // Hapus 1 elemen dari indeks ke-2 jika ini sales
    worksheetData.push(totalRow);
    worksheetData.push([]);
  };

  buildGroup('Sudah Terbit Invoice', invoicedData);
  buildGroup('Belum Terbit Invoice', pendingData);
  
  // 4. Konversi ke worksheet dan tambahkan styling dinamis
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  
  const finalColIndex = isSales ? 7 : 8; // Kolom H atau I
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: finalColIndex } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: finalColIndex } },
  ];
  
  ws['!cols'] = isSales 
    ? [ { wch: 5 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 } ]
    : [ { wch: 5 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 } ];

  Object.keys(ws).forEach(cellAddress => {
    const cell = ws[cellAddress];
    if (cell && typeof cell.v === 'number' && cellAddress[0] !== 'A') {
      cell.t = 'n';
      const col = cellAddress.replace(/[0-9]/g, '');
      if (['D', 'E', 'F', 'G'].includes(col) && !isSales) { // Jual Beli quantity cols
         cell.z = '#,##0.00';
      } else if (['D', 'E', 'F'].includes(col) && isSales) { // Sales quantity cols
         cell.z = '#,##0.00';
      } else if ((col === 'I' && !isSales) || (col === 'H' && isSales)) { // Total col
         cell.z = '"Rp" #,##0.00';
      } else if ((col === 'H' && !isSales) || (col === 'G' && isSales)) { // Harga col
         cell.z = '"Rp" #,##0.00';
      }
    }
  });

  Swal.close();
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
  const fileName = `Laporan Summary ${title} - ${filterLabel}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
