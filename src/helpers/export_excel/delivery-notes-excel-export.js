import ExcelJS from 'exceljs';
import Swal from 'sweetalert2';
import { processDeliveryNotesData } from '../process/deliveryNotesProcessor';

function excelColLetter(colNumber) {
  let letters = '';
  while (colNumber > 0) {
    const mod = (colNumber - 1) % 26;
    letters = String.fromCharCode(65 + mod) + letters;
    colNumber = Math.floor((colNumber - 1) / 26);
  }
  return letters;
}

// HELPER: Tentukan format Excel berdasarkan kode mata uang
const getCurrencyFmt = (currencyCode) => {
  if (currencyCode === 'USD') return '"$ "#,##0.00';
  return '"Rp "#,##0.00'; // Default IDR
};

export async function exportDeliveryNotesToExcel({ block, token, startDate, endDate, filterLabel, customer_id = null }) {
  const title = `Laporan - ${block.label}`;
  const isSales = block.mode === "penjualan";
  const isGreige = block.key === "greige";
  const isKainJadi = block.key === "kain_jadi";

  if (block.key !== "sales") {
      customer_id = null;
  }

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

  const rawProcessed = await processDeliveryNotesData({ baseRows, block, token, customer_id });
  if (!rawProcessed || rawProcessed.length === 0) {
    Swal.fire("Error", "Gagal memproses detail data untuk ekspor.", "error");
    return;
  }

  const normalizeToGrouped = (data) => {
    const first = data[0];
    if (first && first.mainData && Array.isArray(first.items)) return data;
    const groups = new Map();
    data.forEach(r => {
      const key = r.row_id ?? r.no_sj ?? `${r.no_ref}_${r.tanggal}`;
      if (!groups.has(key)) {
        groups.set(key, {
          mainData: {
            tanggal: r.tanggal ?? '',
            no_sj: r.no_sj ?? '',
            no_ref: r.no_ref ?? '',
            relasi: r.relasi ?? '',
            // Ambil currency jika ada di data flat (jika backend mendukung)
            currency: r.currency || 'IDR' 
          },
          items: []
        });
      }
      const g = groups.get(key);
      g.items.push({
        kain: r.kain ?? '',
        warna: r.warna ?? '',
        grade: r.grade ?? '',
        meter: Number(r.meter ?? 0),
        yard: Number(r.yard ?? 0),
        kilogram: Number(r.kilogram ?? 0),
        harga1: Number(r.harga1 ?? 0),
        harga2: Number(r.harga2 ?? 0),
        total: Number(r.total ?? 0)
      });
    });
    return Array.from(groups.values());
  };

  const processedData = normalizeToGrouped(rawProcessed);

  processedData.sort((a, b) => {
    const ta = a.mainData?.tanggal ? new Date(a.mainData.tanggal).getTime() : 0;
    const tb = b.mainData?.tanggal ? new Date(b.mainData.tanggal).getTime() : 0;
    return ta - tb;
  });

  // --- DEFINISI KOLOM (Tanpa numFmt statis untuk Harga/Total) ---
  const columnConfig = [
    { header: 'No', key: 'no', width: 5, style: { alignment: { horizontal: 'center' } } },
    { header: 'Tgl', key: 'tanggal', width: 12, style: { alignment: { horizontal: 'center' } } },
    { header: 'No. SJ', key: 'no_sj', width: 27, style: { alignment: { horizontal: 'center' } } },
    { header: 'No. Ref', key: 'no_ref', width: 28, style: { alignment: { horizontal: 'center' } } },
    { header: isSales ? 'Customer' : 'Supplier', key: 'relasi', width: 30, style: { alignment: { horizontal: 'center' } } },
  ];
  if (!isGreige) columnConfig.push({ header: 'Warna', key: 'warna', width: 15, style: { alignment: { horizontal: 'center' } } });
  if (isSales) columnConfig.push({ header: 'Grade', key: 'grade', width: 10, style: { alignment: { horizontal: 'center' } } });
  
  // Qty tetap format angka biasa
  columnConfig.push(
    { header: 'Kain', key: 'kain', width: 15, style: { alignment: { horizontal: 'center' } } },
    { header: 'Total Meter', key: 'meter', width: 12, style: { numFmt: '#,##0.00' } },
    { header: 'Total Yard', key: 'yard', width: 12, style: { numFmt: '#,##0.00' } },
    { header: 'Total Kilogram', key: 'kilogram', width: 15, style: { numFmt: '#,##0.00' } }
  );

  // Harga & Total TIDAK dikasih numFmt di sini, nanti di-set per row
  if (isKainJadi) {
    columnConfig.push(
      { header: 'Harga Greige', key: 'harga1', width: 15 },
      { header: 'Harga Maklun', key: 'harga2', width: 15 }
    );
  } else {
    columnConfig.push({ header: 'Harga', key: 'harga1', width: 15 });
  }
  columnConfig.push({ header: 'Total', key: 'total', width: 20 });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Laporan');

  worksheet.columns = columnConfig;

  const lastColLetter = excelColLetter(columnConfig.length);

  worksheet.mergeCells(`A1:${lastColLetter}1`);
  worksheet.getCell('A1').value = title;
  worksheet.getCell('A1').font = { name: 'Calibri', size: 14, bold: true };
  worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells(`A2:${lastColLetter}2`);
  worksheet.getCell('A2').value = filterLabel === 's/d' ? 'Periode: Semua Data' : `Periode: ${filterLabel}`;
  worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

  const borderStyle = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
  worksheet.getCell('A1').border = borderStyle;
  worksheet.getCell('A2').border = borderStyle;

  worksheet.addRow([]);

  const headerRowValues = columnConfig.map(c => c.header);
  const headerRow = worksheet.addRow(headerRowValues);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = borderStyle;
  });

  // --- LOGIC TOTAL ---
  let grandTotalIDR = 0;
  let grandTotalUSD = 0;

  processedData.forEach((sj, index) => {
    if (!Array.isArray(sj.items) || sj.items.length === 0) return;
    const addedRowNums = [];

    // Ambil Currency per Surat Jalan
    const currentCurrency = sj.mainData.currency || 'IDR';
    const currentFmt = getCurrencyFmt(currentCurrency);

    sj.items.forEach((item, itemIndex) => {
      const subTotal = Number(item.total || 0);
      
      // Akumulasi Total sesuai Mata Uang
      if (currentCurrency === 'USD') {
        grandTotalUSD += subTotal;
      } else {
        grandTotalIDR += subTotal;
      }

      const dateRaw = sj.mainData?.tanggal ?? '';
      let formattedDate = '';
      const dt = new Date(dateRaw);
      if (!Number.isNaN(dt.getTime())) {
        const dd = String(dt.getDate()).padStart(2, '0');
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const yy = dt.getFullYear();
        formattedDate = `${dd}-${mm}-${yy}`;
      } else {
        const dateParts = dateRaw ? (dateRaw.includes(' ') ? dateRaw.split(' ')[0].split('-') : dateRaw.split('-')) : [];
        if (dateParts.length === 3) formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
        else formattedDate = dateRaw;
      }

      const safeRow = {
        no: itemIndex === 0 ? index + 1 : '',
        tanggal: itemIndex === 0 ? formattedDate : '',
        no_sj: itemIndex === 0 ? (sj.mainData.no_sj || '') : '',
        no_ref: itemIndex === 0 ? (sj.mainData.no_ref || '') : '',
        relasi: itemIndex === 0 ? (sj.mainData.relasi || '') : '',
        warna: !isGreige ? (item.warna || '') : undefined,
        grade: (isSales ? (item.grade || '') : undefined),
        kain: item.kain || '',
        meter: Number(item.meter ?? 0),
        yard: Number(item.yard ?? 0),
        kilogram: Number(item.kilogram ?? 0),
        harga1: Number(item.harga1 ?? 0),
        harga2: isKainJadi ? Number(item.harga2 ?? 0) : undefined,
        total: subTotal
      };

      const rowToAdd = columnConfig.map(col => {
        if (col.key === 'warna') return safeRow.warna ?? '';
        if (col.key === 'grade') return safeRow.grade ?? '';
        if (col.key === 'harga2') return safeRow.harga2 ?? '';
        return safeRow[col.key] ?? '';
      });

      const added = worksheet.addRow(rowToAdd);
      added.eachCell((cell) => {
        cell.border = borderStyle;
      });
      addedRowNums.push(added.number);

      // Set NumFmt PER SEL
      const harga1Idx = columnConfig.findIndex(c => c.key === 'harga1') + 1;
      const harga2Idx = columnConfig.findIndex(c => c.key === 'harga2') + 1;
      const totalIdx = columnConfig.length; // Asumsi Total selalu kolom terakhir

      if (harga1Idx > 0) {
        const c = added.getCell(harga1Idx);
        c.numFmt = currentFmt; // Gunakan format dinamis
        c.value = Number(item.harga1 ?? 0);
      }
      if (harga2Idx > 0 && isKainJadi) {
        const c = added.getCell(harga2Idx);
        c.numFmt = currentFmt;
        c.value = Number(item.harga2 ?? 0);
      }
      
      const totalCell = added.getCell(totalIdx);
      totalCell.numFmt = currentFmt;
      totalCell.value = subTotal;
    });

    if (addedRowNums.length > 1) {
      const first = addedRowNums[0];
      const last = addedRowNums[addedRowNums.length - 1];
      const mergeCols = [1,2,3,4,5];
      mergeCols.forEach(colIdx => {
        worksheet.mergeCells(first, colIdx, last, colIdx);
        const cell = worksheet.getCell(first, colIdx);
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = borderStyle;
      });
    }
  });

  worksheet.addRow([]);

  // --- RENDER GRAND TOTAL ---
  
  // Fungsi Helper Render Baris Total
  const renderTotalRow = (label, value, fmt) => {
    const r = worksheet.addRow([]);
    const rowNum = r.number;
    
    // Merge cell untuk label
    worksheet.mergeCells(rowNum, 1, rowNum, columnConfig.length - 1);
    
    const labelCell = r.getCell(1);
    labelCell.value = label;
    labelCell.font = { bold: true };
    labelCell.alignment = { horizontal: 'right' };

    // Styling border semua kolom
    for (let i = 1; i <= columnConfig.length; i++) {
      r.getCell(i).border = borderStyle;
    }

    // Isi value total
    const valCell = r.getCell(columnConfig.length);
    valCell.value = value;
    valCell.font = { bold: true };
    valCell.numFmt = fmt;
  };

  // Render Total IDR (Jika ada atau default)
  if (grandTotalIDR > 0 || grandTotalUSD === 0) {
    renderTotalRow('TOTAL AKHIR (IDR)', grandTotalIDR, '"Rp "#,##0.00');
  }

  // Render Total USD (Hanya jika ada)
  if (grandTotalUSD > 0) {
    renderTotalRow('TOTAL AKHIR (USD)', grandTotalUSD, '"$ "#,##0.00');
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title} - ${filterLabel}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}