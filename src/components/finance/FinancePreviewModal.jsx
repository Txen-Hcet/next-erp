// src/components/finance/FinancePreviewModal.jsx
import { createSignal, createEffect, For, Show } from "solid-js";

export default function FinancePreviewModal(props) {
  const { show, block, data, finance_filter, onApply, onCancel, applyLoading } = props;

  const [processedData, setProcessedData] = createSignal([]);
  const [internalLoading, setInternalLoading] = createSignal(false);
  const [summary, setSummary] = createSignal({
    totalRecords: 0,
    totalNilai: 0,
    showing: 0,
    totalPurchases: 0
  });

  // Fungsi untuk mengurai data purchase menjadi baris per item
  const flattenPurchaseData = (purchaseData) => {
    const flattened = [];
    
    purchaseData.forEach(purchase => {
      const items = Array.isArray(purchase.items) ? purchase.items : [];
      
      if (items.length > 0) {
        items.forEach((item, itemIndex) => {
          flattened.push({
            // Data header yang sama untuk semua item dalam satu purchase
            no_pembelian: purchase.no_pembelian,
            tanggal_sj: purchase.tanggal_sj,
            no_sj_supplier: purchase.no_sj_supplier,
            supplier_name: purchase.supplier_name,
            tanggal_jatuh_tempo: purchase.tanggal_jatuh_tempo,
            // Data item
            nama: item.nama,
            kuantitas: item.kuantitas,
            harga: item.harga,
            total_harga: item.total_harga,
            // Flag untuk baris pertama dalam group
            isFirstItem: itemIndex === 0,
            // Simpan jumlah item untuk rowspan
            itemCount: items.length,
            // Simpan purchase untuk summary
            purchase: purchase
          });
        });
      } else {
        // Jika tidak ada items, tetap tampilkan baris dengan data summary
        flattened.push({
          no_pembelian: purchase.no_pembelian,
          tanggal_sj: purchase.tanggal_sj,
          no_sj_supplier: purchase.no_sj_supplier,
          supplier_name: purchase.supplier_name,
          tanggal_jatuh_tempo: purchase.tanggal_jatuh_tempo,
          nama: '-',
          kuantitas: '-',
          harga: '-',
          total_harga: purchase.summary?.total_harga || 0,
          isFirstItem: true,
          itemCount: 1,
          purchase: purchase
        });
      }
    });
    
    return flattened;
  };

  createEffect(() => {
    if (show && data) {
      const safeData = Array.isArray(data) ? data : [];
      let flattenedData = [];
      let totalNilai = 0;
      let totalPurchases = 0;

      // Untuk purchase aksesoris ekspedisi
      if (block.key === "purchase_aksesoris_ekspedisi") {
        flattenedData = flattenPurchaseData(safeData);
        totalPurchases = safeData.length;
        totalNilai = safeData.reduce((sum, purchase) => {
          const nilai = parseFloat(purchase.summary?.total_harga || 0);
          return sum + (isNaN(nilai) ? 0 : nilai);
        }, 0);
      } 
      // Untuk penerimaan piutang - PERBAIKAN DI SINI
      else if (block.key.startsWith("penerimaan_piutang")) {
        const customerShown = new Map(); // Untuk melacak customer yang sudah ditampilkan
        
        flattenedData = safeData.map(item => {
          const customerName = item.customer_name || 'Unknown';
          const isFirstForCustomer = !customerShown.has(customerName);
          
          // Jika customer pertama kali muncul, simpan saldo utangnya
          if (isFirstForCustomer) {
            customerShown.set(customerName, item.saldo_utang || item.saldo || 0);
          }
          
          return {
            ...item,
            // Pastikan semua field yang dibutuhkan ada
            nominal_invoice: item.nominal_invoice || item.nominal || 0,
            // Hanya tampilkan saldo utang untuk baris pertama customer
            saldo_utang: isFirstForCustomer ? (item.saldo_utang || item.saldo || 0) : null,
            penerimaan: item.penerimaan || item.pembayaran || 0,
            potongan: item.potongan || 0
          };
        });
        
        totalPurchases = safeData.length;
        totalNilai = safeData.reduce((sum, item) => {
          const nilai = parseFloat(item.penerimaan || item.pembayaran || 0);
          return sum + (isNaN(nilai) ? 0 : nilai);
        }, 0);
      }
      // Untuk payment hutang
      else if (block.key.startsWith("payment_hutang")) {
        flattenedData = safeData;
        totalPurchases = safeData.length;
        totalNilai = safeData.reduce((sum, item) => {
          const nilai = parseFloat(item.pembayaran || 0);
          return sum + (isNaN(nilai) ? 0 : nilai);
        }, 0);
      }
      // Untuk tipe lain
      else {
        flattenedData = safeData;
        totalPurchases = safeData.length;
        totalNilai = safeData.reduce((sum, item) => {
          const nilai = parseFloat(item.summary?.total_harga || item.nominal || item.total || 0);
          return sum + (isNaN(nilai) ? 0 : nilai);
        }, 0);
      }

      const limitedData = flattenedData.slice(0, 50);
      setProcessedData(limitedData);
      
      setSummary({
        totalRecords: flattenedData.length,
        totalNilai: totalNilai,
        showing: limitedData.length,
        totalPurchases: totalPurchases
      });
    }
  });

  // Reset loading ketika modal ditutup
  createEffect(() => {
    if (!show) {
      setInternalLoading(false);
    }
  });

  const handleApply = async () => {
    setInternalLoading(true);
    try {
      await onApply();
    } finally {
      setInternalLoading(false);
    }
  };

  const handleCancel = () => {
    if (!internalLoading()) {
      onCancel();
    }
  };

  const formatCurrency = (value) => {
    // Jika null atau undefined, return "-" atau kosong
    if (value === null || value === undefined || value === '') {
      return "";
    }
    
    const num = parseFloat(value);
    if (isNaN(num)) return "";
    
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("id-ID", {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const formatTanggalIndo = (tanggalString) => {
    if (!tanggalString) return "-";
    try {
      const tanggal = new Date(tanggalString);
      const bulanIndo = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];
      return `${tanggal.getDate()} ${bulanIndo[tanggal.getMonth()]} ${tanggal.getFullYear()}`;
    } catch (e) {
      return tanggalString;
    }
  };

  const formatKuantitas = (value) => {
    if (!value || value === '-') return "-";
    const num = parseFloat(value);
    return isNaN(num) ? value : num.toLocaleString('id-ID', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const getColumns = () => {
    if (block.key === "purchase_aksesoris_ekspedisi") {
      return [
        { key: "no_pembelian", label: "No. Pembelian", width: "120px" },
        { key: "tanggal_sj", label: "Tanggal SJ", formatter: formatTanggalIndo, width: "120px" },
        { key: "no_sj_supplier", label: "No. SJ Supplier", width: "120px" },
        { key: "supplier_name", label: "Supplier", width: "200px" },
        { key: "tanggal_jatuh_tempo", label: "Jatuh Tempo", formatter: formatTanggalIndo, width: "120px" },
        { key: "nama", label: "Nama Barang", width: "250px" },
        { key: "kuantitas", label: "Kuantitas", formatter: formatKuantitas, align: "right", width: "100px" },
        { key: "harga", label: "Harga", formatter: formatCurrency, align: "right", width: "120px" },
        { key: "total_harga", label: "Total", formatter: formatCurrency, align: "right", width: "150px" },
      ];
    } else if (block.key.startsWith("payment_hutang")) {
      return [
        { key: "no_pembayaran", label: "No Pembayaran", width: "120px" },
        { key: "no_pembelian", label: "No Pembelian", width: "120px" },
        { key: "tanggal_jatuh_tempo", label: "Tanggal Jatuh Tempo", formatter: formatTanggalIndo, width: "120px" },
        { key: "no_giro", label: "No Giro", width: "120px" },
        { key: "tanggal_pengambilan_giro", label: "Tanggal Pengambilan Giro", formatter: formatTanggalIndo, width: "120px" },
        { key: "pembayaran", label: "Pembayaran", formatter: formatCurrency, width: "120px" },
        { key: "jenis_potongan_name", label: "Jenis Potongan", width: "120px" },
        { key: "potongan", label: "Potongan", formatter: formatCurrency, width: "120px" },
        { key: "payment_method_name", label: "Metode Pembayaran", width: "120px" },
      ];
    } else if (block.key.startsWith("penerimaan_piutang")) {
      return [
        { key: "customer_name", label: "Customer", width: "200px" },
        { key: "no_penerimaan", label: "No Penerimaan", width: "120px" },
        { key: "no_sj", label: "No SJ", width: "120px" },
        { key: "tanggal_pembayaran", label: "Tanggal Penerimaan", formatter: formatTanggalIndo, width: "120px" },
        { key: "tanggal_jatuh_tempo", label: "Jatuh Tempo", formatter: formatTanggalIndo, width: "120px" },
        { key: "nominal_invoice", label: "Nominal", formatter: formatCurrency, align: "right", width: "150px" },
        { key: "saldo_utang", label: "Saldo Utang", formatter: formatCurrency, align: "right", width: "150px" },
        { key: "penerimaan", label: "Penerimaan", formatter: formatCurrency, align: "right", width: "150px" },
        { key: "potongan", label: "Potongan", formatter: formatCurrency, align: "right", width: "150px" },
        { key: "payment_method_name", label: "Metode Pembayaran", width: "120px" },
        { key: "bank_name", label: "Bank", width: "100px" },
      ];
    }
    return [];
  };

  const getFilterLabel = () => {
    if (!finance_filter) return "Tidak ada filter";
    
    const parts = [];
    
    if (finance_filter.supplier) {
      let supplierLabel = "";
      if (typeof finance_filter.supplier === 'object') {
        // Jika supplier berupa object dengan properti label dan value
        supplierLabel = finance_filter.supplier.label || finance_filter.supplier.value || finance_filter.supplier;
      } else {
        supplierLabel = finance_filter.supplier;
      }
      if (supplierLabel && supplierLabel !== 'undefined') {
        parts.push(`Supplier: ${supplierLabel}`);
      }
    }
    
    if (finance_filter.customer) {
      let customerLabel = "";
      if (typeof finance_filter.customer === 'object') {
        // Jika customer berupa object dengan properti label dan value
        customerLabel = finance_filter.customer.label || finance_filter.customer.value || finance_filter.customer;
      } else {
        customerLabel = finance_filter.customer;
      }
      if (customerLabel && customerLabel !== 'undefined') {
        parts.push(`Customer: ${customerLabel}`);
      }
    }
    
    if (finance_filter.tanggal_sj_start && finance_filter.tanggal_sj_end) {
      parts.push(`Tanggal SJ: ${finance_filter.tanggal_sj_start} s/d ${finance_filter.tanggal_sj_end}`);
    }
    
    if (finance_filter.tanggal_jatuh_tempo_start && finance_filter.tanggal_jatuh_tempo_end) {
      parts.push(`Jatuh Tempo: ${finance_filter.tanggal_jatuh_tempo_start} s/d ${finance_filter.tanggal_jatuh_tempo_end}`);
    }

    if (finance_filter.tanggal_pengambilan_giro_start && finance_filter.tanggal_pengambilan_giro_end) {
      parts.push(`Tanggal Pengambilan Giro: ${finance_filter.tanggal_pengambilan_giro_start} s/d ${finance_filter.tanggal_pengambilan_giro_end}`);
    }

    if (finance_filter.tanggal_pembayaran_start && finance_filter.tanggal_pembayaran_end) {
      parts.push(`Tanggal Penerimaan: ${finance_filter.tanggal_pembayaran_start} s/d ${finance_filter.tanggal_pembayaran_end}`);
    }
    
    if (finance_filter.no_giro) {
      parts.push(`No Giro: ${finance_filter.no_giro}`);
    }
    
    return parts.length > 0 ? parts.join(" | ") : "Semua data";
  };

  const columns = getColumns();

  const getNestedValue = (obj, path) => {
    if (!path || !obj) return null;
    
    // Jika path tidak nested, langsung return value
    if (!path.includes('.')) {
      return obj[path] !== undefined ? obj[path] : null;
    }
    
    // Untuk nested path
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  };

  // Gunakan internalLoading sebagai fallback jika applyLoading undefined
  const isLoading = () => internalLoading() || (applyLoading !== undefined ? applyLoading : false);

  return (
    <Show when={show}>
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div class="sticky top-0 bg-white border-b px-6 py-4">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-xl font-bold text-gray-900">
                  Preview {block?.label}
                </h3>
                <div class="flex flex-wrap gap-4 mt-2">
                  {/* <div class="flex items-center gap-2">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {summary().totalPurchases} Purchase
                    </span>
                    <span class="text-gray-600">Total Purchase</span>
                  </div> */}
                  
                  {/* <div class="flex items-center gap-2">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {formatCurrency(summary().totalNilai)}
                    </span>
                    <span class="text-gray-600">Total Nilai</span>
                  </div> */}
                  
                  <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span class="text-sm text-gray-700">{getFilterLabel()}</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleCancel}
                class="text-gray-400 hover:text-gray-600 p-1"
                disabled={isLoading()}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content */}
          <div class="flex-1 overflow-hidden flex flex-col">
            <div class="p-6 overflow-y-auto flex-1">
              <Show when={processedData().length === 0}>
                <div class="text-center py-12">
                  <svg class="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h4 class="mt-4 text-lg font-medium text-gray-900">Tidak ada data</h4>
                  <p class="mt-2 text-gray-500 max-w-md mx-auto">
                    Tidak ada data yang sesuai dengan filter yang dipilih. Coba ubah filter Anda.
                  </p>
                </div>
              </Show>

              <Show when={processedData().length > 0}>
                <div class="overflow-x-auto border border-gray-200 rounded-lg">
                  <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                      <tr>
                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          No
                        </th>
                        <For each={columns}>
                          {(column) => (
                            <th 
                              scope="col" 
                              class={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.align === 'right' ? 'text-right' : ''}`}
                              style={`width: ${column.width || 'auto'};`}
                            >
                              {column.label}
                            </th>
                          )}
                        </For>
                      </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                      <For each={processedData()}>
                        {(row, index) => (
                          <tr class="hover:bg-gray-50 transition-colors">
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                              {index() + 1}
                            </td>
                            <For each={columns}>
                              {(column) => {
                                let value = getNestedValue(row, column.key);
                                
                                // Apply formatter if exists
                                if (column.formatter) {
                                  value = column.formatter(value);
                                }
                                
                                return (
                                  <td 
                                    class={`px-6 py-4 whitespace-nowrap text-sm ${column.align === 'right' ? 'text-right' : ''}`}
                                    style={`width: ${column.width || 'auto'};`}
                                  >
                                    {value || "-"}
                                  </td>
                                );
                              }}
                            </For>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
                
                {/* Info Pagination */}
                <div class="mt-4 flex items-center justify-between text-sm text-gray-500">
                  {/* <div class="space-y-1">
                    <div>
                      Menampilkan <span class="font-medium">{Math.min(processedData().length, 50)}</span> baris dari <span class="font-medium">{summary().totalRecords}</span> total baris
                    </div>
                    <div>
                      Dari <span class="font-medium">{summary().totalPurchases}</span> purchase
                    </div>
                  </div> */}
                  <Show when={summary().totalRecords > 50}>
                    <div class="flex items-center gap-1">
                      <svg class="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                      </svg>
                      <span>Data ditampilkan terbatas 50 baris pertama</span>
                    </div>
                  </Show>
                </div>
                
                {/* Summary Card */}
                {/* <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <div class="text-sm font-medium text-blue-800">Total Purchase</div>
                    <div class="text-2xl font-bold text-blue-900 mt-1">{summary().totalPurchases}</div>
                    <div class="text-xs text-blue-600 mt-1">Jumlah seluruh purchase</div>
                  </div>
                  
                  <div class="bg-green-50 border border-green-100 rounded-lg p-4">
                    <div class="text-sm font-medium text-green-800">Total Nilai</div>
                    <div class="text-2xl font-bold text-green-900 mt-1">{formatCurrency(summary().totalNilai)}</div>
                    <div class="text-xs text-green-600 mt-1">Nilai keseluruhan purchase</div>
                  </div>
                  
                  <div class="bg-purple-50 border border-purple-100 rounded-lg p-4">
                    <div class="text-sm font-medium text-purple-800">Baris Ditampilkan</div>
                    <div class="text-2xl font-bold text-purple-900 mt-1">{summary().showing}</div>
                    <div class="text-xs text-purple-600 mt-1">Baris yang ditampilkan di preview</div>
                  </div>
                </div> */}
              </Show>
            </div>
          </div>

          {/* Footer */}
          <div class="sticky bottom-0 bg-white border-t px-6 py-4">
            <div class="flex justify-between items-center">
              <div class="text-sm text-gray-500 invisible">
                {/* <Show when={summary().totalRecords > 0}>
                  Filter akan diterapkan ke {summary().totalPurchases} purchase ({summary().totalRecords} baris)
                </Show> */}
              </div>
              
              <div class="flex gap-3 ml-auto">
                <button
                  class="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  onClick={handleCancel}
                  disabled={isLoading()}
                >
                  Batal
                </button>
                <button
                  class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                  onClick={handleApply}
                  disabled={isLoading() || processedData().length === 0}
                >
                  <Show when={isLoading()}>
                    <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </Show>
                  <Show when={!isLoading()}>
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </Show>
                  {isLoading() ? 'Menerapkan...' : 'Terapkan Filter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
}