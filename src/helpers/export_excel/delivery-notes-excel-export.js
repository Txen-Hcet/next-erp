import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { processDeliveryNotesData } from '../process/deliveryNotesProcessor';

export async function exportDeliveryNotesToExcel({ block, token, startDate, endDate, filterLabel }) {
  const title = `Laporan - ${block.label}`;
  const isSales = block.mode === "penjualan";
  const isGreige = block.key === "greige";
  const isKainJadi = block.key === "kain_jadi";

  // Fungsi helper tidak berubah
  const normalizeDate = (d) => {
      if (!d) return null; const x = new Date(d); if (Number.isNaN(x.getTime())) return null;
      return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  };
  const filterByDate = (rows) => {
      const s = normalizeDate(startDate); const e = normalizeDate(endDate); if (!s && !e) return rows;
      return rows.filter((r) => { const d = normalizeDate(r.created_at); if (d === null) return false; if (s && d < s) return false; if (e && d > e) return false; return true; });
  };
  const rowsFromResponse = (res) => res?.suratJalans ?? res?.surat_jalan_list ?? res?.data ?? [];

  const res = await block.rawFetcher(token);
  const baseRows = filterByDate(rowsFromResponse(res));
  
  if (baseRows.length === 0) {
    Swal.fire("Info", "Tidak ada data untuk diekspor pada rentang tanggal ini.", "info");
    return;
  }
  const processedData = await processDeliveryNotesData({ baseRows, block, token });
  if (processedData.length === 0) {
    Swal.fire("Error", "Gagal memproses detail data untuk ekspor.", "error");
    return;
  }

  processedData.sort((a, b) => {
    const dateA = new Date(a.mainData.tanggal);
    const dateB = new Date(b.mainData.tanggal);
    return dateA - dateB;
  });

  // ==== BAGIAN KRITIS 1: KONFIGURASI KOLOM ====
  // Definisikan header, format, dan lebar kolom di sini agar mudah diubah
  const columnConfig = [
    { header: 'No', width: 5 },
    { header: 'Tgl', width: 12 },
    { header: 'No. SJ', width: 22 },
    { header: 'No. Ref', width: 22 },
    { header: isSales ? 'Customer' : 'Supplier', width: 25 },
  ];
  if (!isGreige) columnConfig.push({ header: 'Warna', width: 15 });
  if (isSales) columnConfig.push({ header: 'Grade', width: 10 });
  columnConfig.push(
    { header: 'Kain', width: 15 },
    { header: 'Total Meter', width: 12, format: '#,##0.00' },
    { header: 'Total Yard', width: 12, format: '#,##0.00' }
  );
  if (isKainJadi) {
    columnConfig.push(
      { header: 'Harga Greige', width: 15, format: 'Rp #,##0.00' },
      { header: 'Harga Maklun', width: 15, format: 'Rp #,##0.00' }
    );
  } else {
    columnConfig.push({ header: 'Harga', width: 15, format: 'Rp #,##0.00' });
  }
  columnConfig.push({ header: 'Total', width: 18, format: 'Rp #,##0.00' });

  const headers = columnConfig.map(c => c.header);
  
  let worksheetData = [
    [title], [`Periode: ${filterLabel}`], [], headers
  ];
  
  let grandTotal = 0;
  processedData.forEach((sj, index) => {
    if (!sj.items.length) return;
    sj.items.forEach((item, itemIndex) => {
      grandTotal += item.total;
      
      const mainInfo = itemIndex === 0
        ? [ index + 1, sj.mainData.tanggal.split(' ')[0], sj.mainData.no_sj, sj.mainData.no_ref, sj.mainData.relasi ]
        : ['', '', '', '', ''];
        
      const row = [...mainInfo];
      
      if (!isGreige) row.push(item.warna);
      if (isSales) row.push(item.grade);
      row.push(item.kain, item.meter, item.yard);

      if (isKainJadi) {
        row.push(item.harga1, item.harga2);
      } else {
        row.push(item.harga1);
      }
      row.push(item.total);
      worksheetData.push(row);
    });
  });

  const totalRow = new Array(headers.length).fill('');
  totalRow[headers.length - 2] = 'TOTAL AKHIR';
  totalRow[headers.length - 1] = grandTotal;
  worksheetData.push(totalRow);

  // ==== BAGIAN KRITIS 2: PEMBUATAN WORKSHEET DENGAN FORMAT ====
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Terapkan format angka ke setiap sel yang membutuhkan
  worksheetData.forEach((rowData, rowIndex) => {
    // Lewati baris header dan judul
    if (rowIndex < 3) return; 
    rowData.forEach((cellData, colIndex) => {
      const config = columnConfig[colIndex];
      if (config && config.format && typeof cellData === 'number') {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
        if (!ws[cellAddress]) ws[cellAddress] = {};
        ws[cellAddress].t = 'n'; // 'n' untuk tipe number
        ws[cellAddress].z = config.format; // Terapkan format string
      }
    });
  });

  // Terapkan lebar kolom dari konfigurasi
  ws['!cols'] = columnConfig.map(c => ({ wch: c.width }));
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
  const fileName = `Laporan ${block.label} - ${filterLabel}.xlsx`;
  XLSX.writeFile(wb, fileName);
}