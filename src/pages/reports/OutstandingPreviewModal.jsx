import { createSignal, createEffect, For, Show } from "solid-js";
import { processPOStatusData } from "../../helpers/process/poStatusProcessor";

// Helper formatting
const formatNum = (n) => new Intl.NumberFormat("id-ID", { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
}).format(+n || 0);
const formatDatePrint = (d) => {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "-";
  return `${String(x.getDate()).padStart(2, "0")}-${String(x.getMonth() + 1).padStart(2, "0")}-${x.getFullYear()}`;
};
const formatCurrency = (n) => {
  if (n === null || n === undefined) return "-";
  return new Intl.NumberFormat("id-ID", { 
    style: "currency", 
    currency: "IDR", 
    minimumFractionDigits: 2 
 }).format(+n);
};

export default function OutstandingPreviewModal(props) {
  const [activeTab, setActiveTab] = createSignal("done");
  const [processedData, setProcessedData] = createSignal([]);
  const [loading, setLoading] = createSignal(false);
  const [grandTotal, setGrandTotal] = createSignal(0);

  const isSales = props.block?.mode === "penjualan";
  const isGreige = props.block?.key === "greige";
  const isKainJadi = props.block?.key === "kain_jadi";
  const relasiHeader = isSales ? "Customer" : "Supplier";
  const refHeader = isSales ? "No. SO" : (props.block?.key === 'jual_beli' ? 'No. JB' : "No. PO");

  // Load data ketika modal dibuka atau tab berubah
  createEffect(async () => {
    if (props.show) {
      await loadData();
    }
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await processPOStatusData({
        poRows: props.poRows,
        status: activeTab(),
        block: props.block,
        token: props.token,
        PO_DETAIL_FETCHER: props.PO_DETAIL_FETCHER,
        customer_id: props.customer_id,
        outstanding_filter: props.outstanding_filter
      });

      setProcessedData(data);
      
      // Hitung grand total
      const total = data.reduce((sum, po) => {
        return sum + (po.items?.reduce((itemSum, item) => itemSum + (item.subtotal || 0), 0) || 0);
      }, 0);
      setGrandTotal(total);
    } catch (error) {
      console.error("Error loading preview data:", error);
      setProcessedData([]);
      setGrandTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    props.onApply();
  };

  const handleCancel = () => {
    props.onCancel();
  };

  const headers = ['No', refHeader, `Nama ${relasiHeader}`, 'Tanggal', 'Corak Kain'];
  if (!isGreige) headers.push('Warna', 'Ket. Warna');
  headers.push('QTY PO', 'QTY Masuk', 'Sisa PO');
  if (isKainJadi) {
    headers.push('Harga Greige', 'Harga Maklun');
  } else {
    headers.push('Harga');
  }
  headers.push('Total');

  return (
    <Show when={props.show}>
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-lg w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div class="p-6 border-b bg-white">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-xl font-bold">
                  Preview {props.block?.label} - {activeTab() === "done" ? "Selesai" : "Belum Selesai"}
                </h3>
                <p class="text-gray-600 mt-1">Periode: {props.filterLabel}</p>
                <Show when={props.customer_id && props.masterData?.customers}>
                  <p class="text-sm text-green-600 mt-1">
                    Filter Customer: {
                      props.masterData.customers.find(c => c.id == props.customer_id)?.nama || 
                      'Customer tidak diketahui'
                    }
                  </p>
                </Show>
                <Show when={props.outstanding_filter}>
                  <p class="text-sm text-blue-600 mt-1">
                    Filter Outstanding: {formatOutstandingFilter(props.outstanding_filter, props.masterData)}
                  </p>
                </Show>
              </div>
              <div class="flex gap-2">
                {/* Tab Navigation */}
                <div class="flex border rounded-lg">
                  <button
                    class={`px-4 py-2 rounded-l-lg ${
                      activeTab() === "done" 
                        ? "bg-blue-600 text-white" 
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => setActiveTab("done")}
                  >
                    Selesai
                  </button>
                  <button
                    class={`px-4 py-2 rounded-r-lg ${
                      activeTab() === "not_done" 
                        ? "bg-blue-600 text-white" 
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => setActiveTab("not_done")}
                  >
                    Belum Selesai
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div class="flex-1 overflow-auto p-6">
            <Show when={loading()}>
              <div class="flex justify-center items-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            </Show>

            <Show when={!loading() && processedData().length === 0}>
              <div class="text-center py-8 text-gray-500">
                Tidak ada data untuk ditampilkan
              </div>
            </Show>

            <Show when={!loading() && processedData().length > 0}>
              <div class="overflow-x-auto">
                <table class="min-w-full border-collapse border border-gray-300 text-sm">
                  <thead class="bg-gray-50">
                    <tr>
                      <For each={headers}>
                        {(header) => (
                          <th class="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">
                            {header}
                          </th>
                        )}
                      </For>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={processedData()}>
                      {(po, index) => {
                        const { mainData, items } = po;
                        if (items.length === 0) return null;
                        
                        const unitLabel = mainData.unit || 'Meter';
                        
                        return (
                          <For each={items}>
                            {(item, itemIndex) => {
                              const isFirstItem = itemIndex() === 0;
                              const qtyPO = Number(item.totalPO ?? item.total ?? mainData.totalPO ?? 0);
                              const masukPO = Number(item.masukPO ?? item.masukPO ?? mainData.masukPO ?? 0);
                              const sisaPO = Number(item.sisaPO ?? Math.max(0, (qtyPO - masukPO)));

                              return (
                                <tr class="hover:bg-gray-50">
                                  {isFirstItem && (
                                    <>
                                      <td class="border border-gray-300 px-3 py-2 text-center" rowspan={items.length}>
                                        {index() + 1}
                                      </td>
                                      <td class="border border-gray-300 px-3 py-2" rowspan={items.length}>
                                        {mainData.ref}
                                      </td>
                                      <td class="border border-gray-300 px-3 py-2" rowspan={items.length}>
                                        {mainData.relasi}
                                      </td>
                                      <td class="border border-gray-300 px-3 py-2 text-center" rowspan={items.length}>
                                        {formatDatePrint(mainData.tanggal)}
                                      </td>
                                    </>
                                  )}
                                  <td class="border border-gray-300 px-3 py-2">{item.corak}</td>
                                  {!isGreige && (
                                    <>
                                      <td class="border border-gray-300 px-3 py-2">{item.warna}</td>
                                      <td class="border border-gray-300 px-3 py-2">{item.ketWarna}</td>
                                    </>
                                  )}
                                  <td class="border border-gray-300 px-3 py-2 text-right">
                                    {formatNum(qtyPO)} {unitLabel}
                                  </td>
                                  <td class="border border-gray-300 px-3 py-2 text-right">
                                    {formatNum(masukPO)} {unitLabel}
                                  </td>
                                  <td class="border border-gray-300 px-3 py-2 text-right">
                                    {formatNum(sisaPO)} {unitLabel}
                                  </td>
                                  {isKainJadi ? (
                                    <>
                                      <td class="border border-gray-300 px-3 py-2 text-right">
                                        {formatCurrency(item.harga_greige)}
                                      </td>
                                      <td class="border border-gray-300 px-3 py-2 text-right">
                                        {formatCurrency(item.harga_maklun)}
                                      </td>
                                    </>
                                  ) : (
                                    <td class="border border-gray-300 px-3 py-2 text-right">
                                      {formatCurrency(item.harga_satuan)}
                                    </td>
                                  )}
                                  <td class="border border-gray-300 px-3 py-2 text-right">
                                    {formatCurrency(item.subtotal)}
                                  </td>
                                </tr>
                              );
                            }}
                          </For>
                        );
                      }}
                    </For>
                  </tbody>
                  <tfoot class="bg-gray-100">
                    <tr>
                      <td 
                        class="border border-gray-300 px-3 py-2 text-right font-bold" 
                        colspan={headers.length - 1}
                      >
                        TOTAL AKHIR
                      </td>
                      <td class="border border-gray-300 px-3 py-2 text-right font-bold">
                        {formatCurrency(grandTotal())}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              <div class="mt-4 text-sm text-gray-600">
                <p>Total Data: {processedData().length} PO</p>
                <p>Grand Total: {formatCurrency(grandTotal())}</p>
              </div>
            </Show>
          </div>

          {/* Footer */}
          <div class="p-4 border-t bg-gray-50 flex justify-end gap-3">
            <button
              class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              onClick={handleCancel}
              disabled={loading()}
            >
              Cancel
            </button>
            <button
            class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            onClick={props.onApply}
            disabled={props.applyLoading || loading()}
            >
            <Show when={props.applyLoading}>
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </Show>
            {props.applyLoading ? 'Menerapkan Filter...' : 'Apply Filter'}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}

// Helper function untuk format filter outstanding
function formatOutstandingFilter(filter, masterData) {
  if (!filter) return "";
  
  const parts = [];
  
  // Format tanggal
  if (filter.start_date && filter.end_date) {
    parts.push(`Tanggal: ${filter.start_date} s/d ${filter.end_date}`);
  } else if (filter.start_date) {
    parts.push(`Tanggal mulai: ${filter.start_date}`);
  } else if (filter.end_date) {
    parts.push(`Tanggal akhir: ${filter.end_date}`);
  }
  
  // Format supplier
  if (filter.supplier_id) {
    const supplier = masterData.suppliers.find(s => s.id == filter.supplier_id);
    if (supplier) {
      parts.push(`Supplier: ${supplier.nama || supplier.name}`);
    } else {
      parts.push(`Supplier ID: ${filter.supplier_id}`);
    }
  }

  if (filter.customer_id) {
    const customer = masterData.customers.find(c => c.id == filter.customer_id);
    if (customer) {
      parts.push(`Customer: ${customer.nama || customer.name}`);
    } else {
      parts.push(`Customer ID: ${filter.customer_id}`);
    }
  }
  
  // Format warna
  if (filter.color_id) {
    const color = masterData.colors.find(c => c.id == filter.color_id);
    if (color) {
      const colorName = color.kode_warna || color.kode || color.nama;
      parts.push(`Warna: ${colorName}`);
    } else {
      parts.push(`Warna ID: ${filter.color_id}`);
    }
  }
  
  // Format kain
  if (filter.fabric_id) {
    const fabric = masterData.fabrics.find(f => f.id == filter.fabric_id);
    if (fabric) {
      const fabricName = fabric.corak_kain || fabric.corak || fabric.nama;
      parts.push(`Kain: ${fabricName}`);
    } else {
      parts.push(`Kain ID: ${filter.fabric_id}`);
    }
  }
  
  return parts.length > 0 ? parts.join(", ") : "Tidak ada filter";
}