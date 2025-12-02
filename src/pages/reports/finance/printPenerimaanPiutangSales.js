import { PenerimaanPiutangSalesProcessor } from '../../../helpers/process/PenerimaanPiutangSalesProcessor';
import PenerimaanPiutangSalesService from '../../../services/PenerimaanPiutangSalesService';
import Swal from 'sweetalert2';

export async function printPenerimaanPiutangSales({ startDate = "", endDate = "" }) {
  try {
    const loadingAlert = Swal.fire({
      title: 'Mempersiapkan Laporan',
      text: 'Sedang menghitung saldo piutang...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Ambil data dengan saldo customer
    const customerSaldo = await PenerimaanPiutangSalesService.calculateCustomerSaldo(startDate, endDate);
    
    await loadingAlert.close();
    
    if (!customerSaldo || Object.keys(customerSaldo).length === 0) {
      alert("Tidak ada data untuk dicetak pada rentang tanggal ini.");
      return;
    }

    // Filter hanya customer yang memiliki penerimaan > 0
    const filteredCustomerSaldo = {};
    Object.keys(customerSaldo).forEach(customerName => {
      const customer = customerSaldo[customerName];
      const totalPenerimaan = customer.items.reduce((sum, item) => sum + parseFloat(item.pembayaran || 0), 0);
      
      if (totalPenerimaan > 0) {
        filteredCustomerSaldo[customerName] = customer;
      }
    });

    if (Object.keys(filteredCustomerSaldo).length === 0) {
      alert("Tidak ada data customer dengan penerimaan untuk dicetak pada rentang tanggal ini.");
      return;
    }

    openPrintWindow(filteredCustomerSaldo, startDate, endDate);
  } catch (error) {
    console.error('Error printing data:', error);
    Swal.close();
    alert("Terjadi kesalahan saat mengambil data untuk dicetak.");
  }
}

function openPrintWindow(customerSaldo, startDate, endDate) {
  const w = window.open("", "", "height=700,width=1200");
  const title = "Laporan Penerimaan Piutang Sales";
  const filterLabel = (!startDate && !endDate) ? "Semua Data" : `${startDate} s/d ${endDate}`;
  
  const style = `<style>
    @page { 
      size: A4 landscape; 
      margin: 10mm; 
    }
    body{ 
      font-family: Arial, sans-serif; 
      margin:0; 
      font-size: 12px; 
    }
    .paper{ 
      width:100%; 
    }
    h1{ 
      margin:0 0 5mm 0; 
      font-size: 16px;
    }
    .header-info{ 
      margin-bottom: 5mm; 
      font-size: 11px; 
      display: flex; 
      flex-direction: column;
      align-items: flex-start;
    }
    table{ 
      border-collapse:collapse; 
      width:100%; 
      font-size: 10px;
    }
    th,td{ 
      border:1px solid #000; 
      padding:3px 4px; 
      word-wrap:break-word;
    }
    th{ 
      background:#DADBDD; 
      text-align:center; 
      font-weight: bold;
    }
    thead { 
      display: table-header-group;
    }
    tfoot { 
      display: table-row-group;
    }
    .summary-row { 
      font-weight: bold; 
      background: #f0f0f0;
    }
    .customer-total-row { 
      font-weight: bold; 
      background: #e8f4fd;
    }
    .grand-total-row { 
      font-weight: bold; 
      background: #d0d0d0;
    }
    .text-right { 
      text-align: right;
    }
    .text-center { 
      text-align: center;
    }
    .customer-group { 
      background: #e8f4fd;
    }
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
    'Customer', 
    'No. Penerimaan', 
    'No. Surat Jalan',
    'Tanggal Penerimaan',
    'Tanggal Jatuh Tempo', 
    'Nominal Invoice', 
    'Saldo Utang', 
    'Penerimaan', 
    'Potongan', 
    'Saldo Akhir',
    'Metode Pembayaran',
    'Bank'
  ];
  
  const thead = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;

  let totalNominalInvoice = 0;
  let totalSaldoUtang = 0;
  let totalPenerimaan = 0;
  let totalPotongan = 0;
  let totalSaldoAkhir = 0;
  let tbody = '';

  // Build table rows berdasarkan grouping customer
  let rowNumber = 1;
  Object.keys(customerSaldo).forEach(customerName => {
    const customer = customerSaldo[customerName];
    
    // Hitung total penerimaan untuk customer ini
    const customerPenerimaan = customer.items.reduce((sum, item) => sum + parseFloat(item.pembayaran || 0), 0);
    
    // Skip customer dengan penerimaan 0 (seharusnya sudah difilter sebelumnya, tapi double check)
    if (customerPenerimaan <= 0) {
      return;
    }
    
    // Customer header row (simplified, hanya nama customer)
    tbody += `
      <tr class="customer-group">
        <td colspan="13" style="font-weight: bold; background: #e8f4fd;">
          ${customerName}
        </td>
      </tr>
    `;

    // Item rows for this customer
    let customerNominalInvoice = 0;
    let customerPenerimaanTotal = 0;
    let customerPotongan = 0;

    customer.items.forEach((item, itemIndex) => {
      const nominalInvoice = parseFloat(item.nominal_invoice || 0);
      const penerimaan = parseFloat(item.pembayaran || 0);
      const potongan = parseFloat(item.potongan || 0);
      
      customerNominalInvoice += nominalInvoice;
      customerPenerimaanTotal += penerimaan;
      customerPotongan += potongan;
      
      tbody += `
        <tr>
          <td class="text-center">${rowNumber++}</td>
          <td>${customerName}</td>
          <td>${item.no_penerimaan || '-'}</td>
          <td>${item.no_sj || '-'}</td>
          <td>${PenerimaanPiutangSalesProcessor.formatTanggalIndo(item.tanggal_pembayaran)}</td>
          <td>${PenerimaanPiutangSalesProcessor.formatTanggalIndo(item.tanggal_jatuh_tempo)}</td>
          <td class="text-right">${PenerimaanPiutangSalesProcessor.fmtRp(nominalInvoice)}</td>
          <td class="text-right">${itemIndex === 0 ? PenerimaanPiutangSalesProcessor.fmtRp(customer.totalUtang) : ''}</td>
          <td class="text-right">${PenerimaanPiutangSalesProcessor.fmtRp(penerimaan)}</td>
          <td class="text-right">${PenerimaanPiutangSalesProcessor.fmtRp(potongan)}</td>
          <td class="text-right">${itemIndex === customer.items.length - 1 ? PenerimaanPiutangSalesProcessor.fmtRp(customer.saldoAkhir) : ''}</td>
          <td>${item.payment_method_name || '-'}</td>
          <td>${item.bank_name || '-'}</td>
        </tr>
      `;
    });

    // Customer total row
    tbody += `
      <tr class="customer-total-row">
        <td colspan="6" class="text-right" style="font-weight: bold;">Total ${customerName}</td>
        <td class="text-right">${PenerimaanPiutangSalesProcessor.fmtRp(customerNominalInvoice)}</td>
        <td class="text-right">${PenerimaanPiutangSalesProcessor.fmtRp(customer.totalUtang)}</td>
        <td class="text-right">${PenerimaanPiutangSalesProcessor.fmtRp(customerPenerimaanTotal)}</td>
        <td class="text-right">${PenerimaanPiutangSalesProcessor.fmtRp(customerPotongan)}</td>
        <td class="text-right">${PenerimaanPiutangSalesProcessor.fmtRp(customer.saldoAkhir)}</td>
        <td colspan="2"></td>
      </tr>
      <tr><td colspan="13" style="border: none; height: 10px;"></td></tr> <!-- Spacer -->
    `;

    // Accumulate grand totals
    totalNominalInvoice += customerNominalInvoice;
    totalSaldoUtang += customer.totalUtang;
    totalPenerimaan += customerPenerimaanTotal;
    totalPotongan += customerPotongan;
    totalSaldoAkhir += customer.saldoAkhir;
  });

  // Grand total rows
  tbody += `
    <tr class="grand-total-row">
      <td colspan="6" class="text-right">GRAND TOTAL</td>
      <td class="text-right">${PenerimaanPiutangSalesProcessor.fmtRp(totalNominalInvoice)}</td>
      <td class="text-right">${PenerimaanPiutangSalesProcessor.fmtRp(totalSaldoUtang)}</td>
      <td class="text-right">${PenerimaanPiutangSalesProcessor.fmtRp(totalPenerimaan)}</td>
      <td class="text-right">${PenerimaanPiutangSalesProcessor.fmtRp(totalPotongan)}</td>
      <td class="text-right">${PenerimaanPiutangSalesProcessor.fmtRp(totalSaldoAkhir)}</td>
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