import { PaymentHutangPurchaseGreigeProcessor } from '../../../helpers/process/PaymentHutangPurchaseGreigeProcessor';
import PaymentHutangPurchaseGreigeService from '../../../services/PaymentHutangPurchaseGreigeService';
import Swal from 'sweetalert2';

export async function printPaymentHutangPurchaseGreige({ startDate = "", endDate = "" }) {
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

    const dataWithDetails = await PaymentHutangPurchaseGreigeService.getAllWithDetails(startDate, endDate);
    
    await loadingAlert.close();
    
    if (!Array.isArray(dataWithDetails) || dataWithDetails.length === 0) {
      alert("Tidak ada data untuk dicetak pada rentang tanggal ini.");
      return;
    }

    openPrintWindow(dataWithDetails, startDate, endDate);
  } catch (error) {
    console.error('Error printing data:', error);
    Swal.close();
    alert("Terjadi kesalahan saat mengambil data untuk dicetak.");
  }
}

function openPrintWindow(data, startDate, endDate) {
  const w = window.open("", "", "height=700,width=980");
  const title = "Laporan Pembayaran Hutang Purchase Greige";
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
    .summary-row { font-weight: bold; background: #f0f0f0; }
    .grand-total-row { font-weight: bold; background: #d0d0d0; }
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

  const headers = [
    'No',
    'No. Pembayaran', 
    'No. Pembelian', 
    'Tanggal Jatuh Tempo', 
    'No. Giro', 
    'Tanggal Pengambilan Giro', 
    'Pembayaran', 
    'Jenis Potongan', 
    'Potongan', 
    //'Subtotal', 
    'Metode Pembayaran'
  ];
  
  const thead = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;

  let totalPembayaran = 0;
  let totalPotongan = 0;
  let grandTotal = 0;
  let tbody = '';

  // Loop melalui data payment hutang
  data.forEach((item, index) => {
    const pembayaranNum = parseFloat(item.pembayaran || 0);
    const potonganNum = parseFloat(item.potongan || 0);
    const subtotal = pembayaranNum + potonganNum;

    totalPembayaran += pembayaranNum;
    totalPotongan += potonganNum;
    grandTotal += subtotal;

    tbody += `
      <tr>
        <td class="text-center">${index + 1}</td>
        <td>${item.no_pembayaran || '-'}</td>
        <td>${item.no_pembelian || '-'}</td>
        <td>${PaymentHutangPurchaseGreigeProcessor.formatTanggalIndo(item.tanggal_jatuh_tempo)}</td>
        <td>${item.no_giro || '-'}</td>
        <td>${PaymentHutangPurchaseGreigeProcessor.formatTanggalIndo(item.tanggal_pengambilan_giro)}</td>
        <td class="text-right">${PaymentHutangPurchaseGreigeProcessor.fmtRp(pembayaranNum)}</td>
        <td>${item.jenis_potongan_name || '-'}</td>
        <td class="text-right">${PaymentHutangPurchaseGreigeProcessor.fmtRp(potonganNum)}</td>
        <td>${item.payment_method_name || '-'}</td>
      </tr>
    `;
  });

   tbody += `
    <tr class="summary-row">
      <td colspan="6" class="text-right">TOTAL PEMBAYARAN</td>
      <td class="text-right">${PaymentHutangPurchaseGreigeProcessor.fmtRp(totalPembayaran)}</td>
      <td colspan="4"></td>
    </tr>
    <tr class="summary-row">
      <td colspan="8" class="text-right">TOTAL POTONGAN</td>
      <td class="text-right">${PaymentHutangPurchaseGreigeProcessor.fmtRp(totalPotongan)}</td>
      <td colspan="2"></td>
    </tr>
  `;

  const table = `<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
  const bodyHtml = `<div class="paper">${header}${table}</div>`;
  
  w.document.write(`<html><head><title>${title}</title>${style}</head><body>${bodyHtml}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
}