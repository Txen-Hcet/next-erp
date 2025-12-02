import { createSignal, createEffect, For, Show } from "solid-js";

export default function FinancePreviewModal(props) {
  const { show, block, data, finance_filter, onApply, onCancel, applyLoading } = props;

  const [processedData, setProcessedData] = createSignal([]);

  createEffect(() => {
    if (show && data) {
      setProcessedData(data.slice(0, 50)); // Batasi preview ke 50 data pertama
    }
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID");
  };

  const getColumns = () => {
    if (block.key === "purchase_aksesoris_ekspedisi") {
      return [
        { key: "no_sj", label: "No SJ" },
        { key: "tanggal_sj", label: "Tanggal SJ" },
        { key: "supplier", label: "Supplier" },
        { key: "nominal", label: "Nominal" },
      ];
    } else if (block.key.startsWith("payment_hutang")) {
      return [
        { key: "no_pembayaran", label: "No Pembayaran" },
        { key: "tanggal_jatuh_tempo", label: "Tanggal Jatuh Tempo" },
        { key: "tanggal_pengambilan_giro", label: "Tanggal Pengambilan Giro" },
        { key: "no_giro", label: "No Giro" },
        { key: "nominal", label: "Nominal" },
      ];
    } else if (block.key.startsWith("penerimaan_piutang")) {
      return [
        { key: "no_penerimaan", label: "No Penerimaan" },
        { key: "tanggal_penerimaan", label: "Tanggal Penerimaan" },
        { key: "tanggal_jatuh_tempo", label: "Tanggal Jatuh Tempo" },
        { key: "customer", label: "Customer" },
        { key: "nominal", label: "Nominal" },
      ];
    }
    return [];
  };

  const columns = getColumns();

  const getFinanceFilterLabel = () => {
    if (!finance_filter) return "Tidak ada filter";
    
    const parts = [];
    const filterConfig = block.filterConfig;

    if (filterConfig.type === "purchase") {
      if (finance_filter.tanggal_sj_start && finance_filter.tanggal_sj_end) {
        parts.push(`Tanggal SJ: ${finance_filter.tanggal_sj_start} s/d ${finance_filter.tanggal_sj_end}`);
      }
      if (finance_filter.supplier) {
        parts.push(`Supplier: ${finance_filter.supplier_name}`);
      }
    }

    if (filterConfig.type === "payment_hutang") {
      if (finance_filter.tanggal_jatuh_tempo_start && finance_filter.tanggal_jatuh_tempo_end) {
        parts.push(`Jatuh Tempo: ${finance_filter.tanggal_jatuh_tempo_start} s/d ${finance_filter.tanggal_jatuh_tempo_end}`);
      }
      if (finance_filter.tanggal_pengambilan_giro_start && finance_filter.tanggal_pengambilan_giro_end) {
        parts.push(`Pengambilan Giro: ${finance_filter.tanggal_pengambilan_giro_start} s/d ${finance_filter.tanggal_pengambilan_giro_end}`);
      }
      if (finance_filter.no_giro) {
        parts.push(`No Giro: ${finance_filter.no_giro}`);
      }
    }

    if (filterConfig.type === "penerimaan_piutang") {
      if (finance_filter.customer) {
        parts.push(`Customer: ${finance_filter.customer_name}`);
      }
      if (finance_filter.tanggal_penerimaan_start && finance_filter.tanggal_penerimaan_end) {
        parts.push(`Penerimaan: ${finance_filter.tanggal_penerimaan_start} s/d ${finance_filter.tanggal_penerimaan_end}`);
      }
      if (finance_filter.tanggal_jatuh_tempo_start && finance_filter.tanggal_jatuh_tempo_end) {
        parts.push(`Jatuh Tempo: ${finance_filter.tanggal_jatuh_tempo_start} s/d ${finance_filter.tanggal_jatuh_tempo_end}`);
      }
    }

    return parts.length > 0 ? parts.join(", ") : "Tidak ada filter";
  };

  return (
    <Show when={show}>
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-lg w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div class="p-6 border-b bg-white">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-xl font-bold">
                  Preview {block?.label}
                </h3>
                <p class="text-gray-600 mt-1">Jumlah Data: {data.length} records</p>
                <p class="text-sm text-blue-600 mt-1">
                  Filter: {getFinanceFilterLabel()}
                </p>
                <p class="text-sm text-gray-500 mt-1">
                  Menampilkan {processedData().length} dari {data.length} data
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div class="flex-1 overflow-auto p-6">
            <Show when={processedData().length === 0}>
              <div class="text-center py-8 text-gray-500">
                Tidak ada data untuk ditampilkan dengan filter yang dipilih
              </div>
            </Show>

            <Show when={processedData().length > 0}>
              <div class="overflow-x-auto">
                <table class="min-w-full border-collapse border border-gray-300 text-sm">
                  <thead class="bg-gray-50">
                    <tr>
                      <For each={columns}>
                        {(column) => (
                          <th class="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">
                            {column.label}
                          </th>
                        )}
                      </For>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={processedData()}>
                      {(item, index) => (
                        <tr class="hover:bg-gray-50">
                          <For each={columns}>
                            {(column) => (
                              <td class="border border-gray-300 px-3 py-2">
                                {column.key === "nominal" 
                                  ? formatCurrency(item[column.key] || item.total || item.nominal)
                                  : column.key.includes("tanggal")
                                  ? formatDate(item[column.key])
                                  : item[column.key] || "-"
                                }
                              </td>
                            )}
                          </For>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>
          </div>

          {/* Footer */}
          <div class="p-4 border-t bg-gray-50 flex justify-end gap-3">
            <button
              class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              onClick={onCancel}
              disabled={applyLoading}
            >
              Batal
            </button>
            <button
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              onClick={onApply}
              disabled={applyLoading}
            >
              <Show when={applyLoading}>
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </Show>
              {applyLoading ? 'Menerapkan Filter...' : 'Terapkan Filter'}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}