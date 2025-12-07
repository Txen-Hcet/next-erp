import { PurchaseAksesorisEkspedisiProcessor } from '../../../helpers/process/PurchaseAksesorisEkspedisiProcessor';
import PurchaseAksesorisEkspedisiService from '../../../services/PurchaseAksesorisEkspedisiService';
import Swal from 'sweetalert2';

export async function printPurchaseAksesorisEkspedisi({ startDate = "", endDate = "", filter = null }) {
  try {
    // Tampilkan loading
    const loadingAlert = Swal.fire({
      title: 'Mempersiapkan Laporan',
      text: 'Sedang menyiapkan data untuk dicetak...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Buat filter params yang akan dikirim ke service
    const filterParams = {};
    
    // Tambahkan filter tanggal utama
    if (startDate || endDate) {
      filterParams.startDate = startDate;
      filterParams.endDate = endDate;
    }
    
    // Tambahkan filter tambahan jika ada
    if (filter) {
      if (filter.supplier) {
        if (typeof filter.supplier === 'object' && filter.supplier.value !== undefined) {
          filterParams.supplier = filter.supplier.value;
        } else {
          filterParams.supplier = filter.supplier;
        }
      }
      
      if (filter.tanggal_sj_start && filter.tanggal_sj_end) {
        filterParams.tanggal_sj_start = filter.tanggal_sj_start;
        filterParams.tanggal_sj_end = filter.tanggal_sj_end;
      }
      
      // Tambahkan filter lainnya sesuai kebutuhan
      Object.keys(filter).forEach(key => {
        if (!['supplier', 'tanggal_sj_start', 'tanggal_sj_end'].includes(key)) {
          filterParams[key] = filter[key];
        }
      });
    }

    // Gunakan method yang mengambil data lengkap dengan items
    const dataWithDetails = await PurchaseAksesorisEkspedisiService.getAllWithDetails(filterParams);
    
    await loadingAlert.close();
    
    if (!Array.isArray(dataWithDetails) || dataWithDetails.length === 0) {
      alert("Tidak ada data untuk dicetak pada rentang tanggal ini.");
      return;
    }

     // Buat label filter untuk tampilan di print
    let filterLabel = "Semua Data";
    const filterParts = [];
    
    if (startDate || endDate) {
      filterParts.push(`${startDate || ''} s/d ${endDate || ''}`);
    }
    
    if (filter) {
      if (filter.supplier) {
        const supplierName = typeof filter.supplier === 'object' 
          ? filter.supplier.label || filter.supplier.value 
          : filter.supplier;
        filterParts.push(`Supplier: ${supplierName}`);
      }
      
      if (filter.tanggal_sj_start && filter.tanggal_sj_end) {
        filterParts.push(`Tanggal SJ: ${filter.tanggal_sj_start} s/d ${filter.tanggal_sj_end}`);
      }
    }
    
    if (filterParts.length > 0) {
      filterLabel = filterParts.join(' | ');
    }

    openPrintWindow(dataWithDetails, filterLabel);

    //console.log('Data untuk print:', dataWithDetails);
  } catch (error) {
    console.error('Error printing data:', error);
    Swal.close();
    alert("Terjadi kesalahan saat mengambil data untuk dicetak.");
  }
}

function openPrintWindow(data, startDate, endDate) {
  const w = window.open("", "", "height=700,width=980");
  const title = "Laporan Purchase Aksesoris Ekspedisi";
  const filterLabel = (!startDate && !endDate) ? "Semua Data" : `${startDate} s/d ${endDate}`;
  
  const style = `<style>
    @page { size: A4; margin: 11mm; }
    body{ font-family: Arial, sans-serif; margin:0; }
    .paper{ width:100%; }
    h1{ margin:0 0 8mm 0; font-size: 18px; }
    .header-info{ margin-bottom: 8mm; font-size: 12px; }
    table{ border-collapse:collapse; width:100%; font-size: 10px; }
    th,td{ border:1px solid #000; padding:4px 6px; word-wrap:break-word; }
    th{ background:#DADBDD; text-align:center; font-weight: bold; }
    thead { display: table-header-group; }
    tfoot { display: table-row-group; }
    .grand-total-row { page-break-inside: avoid; font-weight: bold; background: #f0f0f0; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
  </style>`;

  const header = `
    <h1>${title}</h1>
    <div class="header-info">
      <div>Periode: ${filterLabel}</div>
      <div>Tanggal cetak: ${new Date().toLocaleString('id-ID')}</div>
    </div>
  `;

  const headers = ['No', 'No. Pembelian', 'Tanggal SJ', 'No. SJ Supplier', 'Supplier', 'Tanggal Jatuh Tempo', 'Nama Barang', 'Kuantitas', 'Harga', 'Total Harga'];
  
  const thead = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;

  let grandTotal = 0;
  let tbody = '';
  let currentIndex = 1;

  // Loop melalui data (setiap purchase)
  data.forEach((item) => {
    const groupTotal = parseFloat(item?.summary?.total_harga || 0);
    grandTotal += groupTotal;

    // Pastikan items ada dan merupakan array
    const items = Array.isArray(item.items) ? item.items : [];
    const rowCount = Math.max(1, items.length); // Minimal 1 baris

    if (items.length > 0) {
      // Jika ada items, tampilkan setiap item
      items.forEach((detail, itemIndex) => {
        if (itemIndex === 0) {
          // Baris pertama dengan data utama yang di-merge
          tbody += `
            <tr>
              <td class="text-center" rowspan="${rowCount}">${currentIndex}</td>
              <td rowspan="${rowCount}">${item.no_pembelian || '-'}</td>
              <td rowspan="${rowCount}">${PurchaseAksesorisEkspedisiProcessor.formatTanggalIndo(item.tanggal_sj)}</td>
              <td rowspan="${rowCount}">${item.no_sj_supplier || '-'}</td>
              <td rowspan="${rowCount}">${item.supplier_name || '-'}</td>
              <td rowspan="${rowCount}">${PurchaseAksesorisEkspedisiProcessor.formatTanggalIndo(item.tanggal_jatuh_tempo)}</td>
              <td>${detail.nama || '-'}</td>
              <td class="text-right">${detail.kuantitas ? detail.kuantitas.toLocaleString('id-ID') : '-'}</td>
              <td class="text-right">${detail.harga ? PurchaseAksesorisEkspedisiProcessor.fmtRp(detail.harga) : '-'}</td>
              <td class="text-right">${detail.total_harga ? PurchaseAksesorisEkspedisiProcessor.fmtRp(detail.total_harga) : '-'}</td>
            </tr>
          `;
        } else {
          // Baris tambahan untuk item lainnya, tanpa mengulang data utama
          tbody += `
            <tr>
              <td>${detail.nama || '-'}</td>
              <td class="text-right">${detail.kuantitas ? detail.kuantitas.toLocaleString('id-ID') : '-'}</td>
              <td class="text-right">${detail.harga ? PurchaseAksesorisEkspedisiProcessor.fmtRp(detail.harga) : '-'}</td>
              <td class="text-right">${detail.total_harga ? PurchaseAksesorisEkspedisiProcessor.fmtRp(detail.total_harga) : '-'}</td>
            </tr>
          `;
        }
      });
    } else {
      // Jika tidak ada items, tampilkan baris summary saja
      tbody += `
        <tr>
          <td class="text-center">${currentIndex}</td>
          <td>${item.no_pembelian || '-'}</td>
          <td>${PurchaseAksesorisEkspedisiProcessor.formatTanggalIndo(item.tanggal_sj)}</td>
          <td>${item.no_sj_supplier || '-'}</td>
          <td>${item.supplier_name || '-'}</td>
          <td>${PurchaseAksesorisEkspedisiProcessor.formatTanggalIndo(item.tanggal_jatuh_tempo)}</td>
          <td>-</td>
          <td class="text-right">-</td>
          <td class="text-right">-</td>
          <td class="text-right">${PurchaseAksesorisEkspedisiProcessor.fmtRp(groupTotal)}</td>
        </tr>
      `;
    }
    
    currentIndex++;
  });

  const colspanForLabel = headers.length - 1;
  const tfoot = `
    <tfoot>
      <tr class="grand-total-row">
        <td colspan="${colspanForLabel}" class="text-right">TOTAL AKHIR</td>
        <td class="text-right">${PurchaseAksesorisEkspedisiProcessor.fmtRp(grandTotal)}</td>
      </tr>
    </tfoot>
  `;

  const table = `<table><thead>${thead}</thead><tbody>${tbody}</tbody>${tfoot}</table>`;
  const bodyHtml = `<div class="paper">${header}${table}</div>`;
  
  w.document.write(`<html><head><title>${title}</title>${style}</head><body>${bodyHtml}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
}