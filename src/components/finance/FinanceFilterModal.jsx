import { createSignal, createEffect, For, Show } from "solid-js";
import Litepicker from "litepicker";
import Swal from "sweetalert2";
import SupplierDropdownFinance from "../SupplierDropdownFinance";
import CustomerDropdownFinance from "../CustomerDropdownFinance";

export default function FinanceFilterModal(props) {
  const { block, filter, onFilterChange, onPreview, onCancel, loading } = props;

  const [localFilter, setLocalFilter] = createSignal(filter || {});
  const [selectedSupplierLabel, setSelectedSupplierLabel] = createSignal("");
  const [selectedCustomerLabel, setSelectedCustomerLabel] = createSignal("");

  createEffect(() => {
    setLocalFilter(filter || {});
    // Set label dari filter yang ada
    if (filter?.supplier) {
      setSelectedSupplierLabel(filter.supplier.label || "");
    }
    if (filter?.customer) {
      setSelectedCustomerLabel(filter.customer.label || "");
    }
  });

  const handleDateRangeChange = async (field, title, currentStart, currentEnd) => {
    const { value: rangeVal } = await Swal.fire({
      title: title,
      html: `
        <div class="space-y-2">
          <input type="text" id="date-range" class="swal2-input w-full" 
                 placeholder="Klik untuk pilih rentang" 
                 value="${currentStart && currentEnd ? `${currentStart} - ${currentEnd}` : ''}">
        </div>
      `,
      didOpen: () => {
        const picker = new Litepicker({
          element: document.getElementById("date-range"),
          singleMode: false,
          format: "YYYY-MM-DD",
          autoApply: true,
          numberOfMonths: 2,
          numberOfColumns: 2,
          setup: (picker) => {
            picker.on('selected', (date1, date2) => {
              // Auto close after selection
              setTimeout(() => {
                Swal.clickConfirm();
              }, 100);
            });
          }
        });
        
        // Focus pada input
        setTimeout(() => {
          document.getElementById("date-range").focus();
        }, 100);
      },
      preConfirm: () => {
        const val = document.getElementById("date-range").value;
        if (!val) {
          Swal.showValidationMessage("Rentang tanggal wajib dipilih!");
          return null;
        }
        const [start, end] = val.split(" - ");
        return { start, end };
      },
      showCancelButton: true,
      confirmButtonText: "Terapkan",
      cancelButtonText: "Batal",
      allowOutsideClick: false,
      allowEscapeKey: true,
      width: 600
    });

    if (rangeVal) {
      setLocalFilter(prev => ({
        ...prev,
        [field + '_start']: rangeVal.start,
        [field + '_end']: rangeVal.end
      }));
    }
  };

  const handleInputChange = (field, value) => {
    setLocalFilter(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSupplierChange = (selected) => {
    //console.log('Supplier selected:', selected);
    setLocalFilter(prev => ({
      ...prev,
      supplier: selected
    }));
    setSelectedSupplierLabel(selected?.label || "");
  };

  const handleCustomerChange = (selected) => {
    console.log('Customer selected:', selected);
    setLocalFilter(prev => ({
      ...prev,
      customer: selected
    }));
    setSelectedCustomerLabel(selected?.label || "");
  };

  const clearDateRange = (field) => {
    setLocalFilter(prev => {
      const newFilter = { ...prev };
      delete newFilter[field + '_start'];
      delete newFilter[field + '_end'];
      return newFilter;
    });
  };

  const clearSupplier = () => {
    setLocalFilter(prev => {
      const newFilter = { ...prev };
      delete newFilter.supplier;
      return newFilter;
    });
    setSelectedSupplierLabel("");
  };

  const clearCustomer = () => {
    setLocalFilter(prev => {
      const newFilter = { ...prev };
      delete newFilter.customer;
      return newFilter;
    });
    setSelectedCustomerLabel("");
  };

  const clearNoGiro = () => {
    setLocalFilter(prev => {
      const newFilter = { ...prev };
      delete newFilter.no_giro;
      return newFilter;
    });
  };

  const handlePreview = () => {
    console.log('Preview dengan filter:', localFilter());
    onPreview(block, localFilter());
  };

  const getFieldConfig = () => {
    const config = block.filterConfig;
    
    if (config.type === "purchase") {
      return [
        {
          type: "supplierDropdown",
          field: "supplier", 
          label: "Supplier"
        },
        {
          type: "dateRange",
          field: "tanggal_sj",
          label: "Tanggal Surat Jalan",
          title: "Pilih Rentang Tanggal Surat Jalan"
        }
      ];
    }

    if (config.type === "payment_hutang") {
      return [
        {
          type: "dateRange", 
          field: "tanggal_jatuh_tempo",
          label: "Tanggal Jatuh Tempo",
          title: "Pilih Rentang Tanggal Jatuh Tempo"
        },
        {
          type: "dateRange",
          field: "tanggal_pengambilan_giro", 
          label: "Tanggal Pengambilan Giro",
          title: "Pilih Rentang Tanggal Pengambilan Giro"
        },
        {
          type: "text",
          field: "no_giro",
          label: "No Giro",
          placeholder: "Masukkan nomor giro"
        }
      ];
    }

    if (config.type === "penerimaan_piutang") {
      return [
        {
          type: "customerDropdown",
          field: "customer",
          label: "Customer"
        },
        {
          type: "dateRange",
          field: "tanggal_pembayaran",
          label: "Tanggal Penerimaan", 
          title: "Pilih Rentang Tanggal Penerimaan"
        },
        {
          type: "dateRange",
          field: "tanggal_jatuh_tempo",
          label: "Tanggal Jatuh Tempo",
          title: "Pilih Rentang Tanggal Jatuh Tempo"
        }
      ];
    }

    return [];
  };

  const fieldConfig = getFieldConfig();

  return (
    <div class="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div class="sticky top-0 bg-white border-b px-6 py-4">
          <div class="flex justify-between items-center">
            <div>
              <h3 class="text-xl font-bold text-gray-900">Filter - {block.label}</h3>
              <p class="text-sm text-gray-500 mt-1">Atur filter yang diinginkan, lalu klik Preview untuk melihat hasil</p>
            </div>
            <button
              onClick={onCancel}
              class="text-gray-400 hover:text-gray-600 p-1"
              disabled={loading}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div class="p-6 space-y-6">
          <For each={fieldConfig}>
            {(field) => (
              <div class="bg-gray-50 rounded-lg p-4">
                <label class="block text-sm font-semibold text-gray-700 mb-3">
                  {field.label}
                </label>
                
                {field.type === "dateRange" && (
                  <div class="space-y-3">
                    <div class="flex gap-3">
                      <div class="flex-1">
                        <button
                          class="w-full px-4 py-3 border border-gray-300 rounded-lg text-left bg-white hover:bg-gray-50 flex items-center justify-between transition-colors"
                          onClick={() => handleDateRangeChange(
                            field.field, 
                            field.title,
                            localFilter()[field.field + '_start'],
                            localFilter()[field.field + '_end']
                          )}
                        >
                          <span class={localFilter()[field.field + '_start'] ? "text-gray-900" : "text-gray-500"}>
                            {localFilter()[field.field + '_start'] && localFilter()[field.field + '_end'] 
                              ? `${localFilter()[field.field + '_start']} s/d ${localFilter()[field.field + '_end']}`
                              : "Klik untuk pilih rentang tanggal"}
                          </span>
                          <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                      {(localFilter()[field.field + '_start'] || localFilter()[field.field + '_end']) && (
                        <button
                          class="px-4 py-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap"
                          onClick={() => clearDateRange(field.field)}
                        >
                          Hapus Rentang
                        </button>
                      )}
                    </div>
                    <div class="text-xs text-gray-500 flex items-center gap-1">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Pilih tanggal awal dan akhir untuk rentang filter
                    </div>
                  </div>
                )}

                {field.type === "text" && (
                  <div class="space-y-2">
                    <div class="relative">
                      <input
                        type="text"
                        class="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={localFilter()[field.field] || ""}
                        onInput={(e) => handleInputChange(field.field, e.target.value)}
                        placeholder={field.placeholder}
                      />
                      {localFilter()[field.field] && (
                        <button
                          class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500"
                          onClick={() => {
                            handleInputChange(field.field, "");
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div class="text-xs text-gray-500">
                      Masukkan {field.label.toLowerCase()} untuk filter spesifik
                    </div>
                  </div>
                )}

                {field.type === "supplierDropdown" && (
                  <div class="space-y-3">
                    <div class="relative">
                      <SupplierDropdownFinance
                        value={localFilter()[field.field] || ""}
                        onChange={handleSupplierChange}
                        placeholder="Ketik atau pilih supplier"
                        class="w-full"
                      />
                      {/* {localFilter()[field.field] && (
                        <button
                          class="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 z-10"
                          onClick={clearSupplier}
                        >
                          ✕
                        </button>
                      )} */}
                    </div>
                    {selectedSupplierLabel() && (
                      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div class="flex items-center justify-between">
                          <div>
                            <div class="font-medium text-blue-800">Supplier Terpilih:</div>
                            <div class="text-sm text-blue-600 mt-1">{selectedSupplierLabel()}</div>
                          </div>
                          <button
                            onClick={clearSupplier}
                            class="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {field.type === "customerDropdown" && (
                  <div class="space-y-3">
                    <div class="relative">
                      <CustomerDropdownFinance
                        value={localFilter()[field.field] || ""}
                        onChange={handleCustomerChange}
                        placeholder="Ketik atau pilih customer"
                        class="w-full"
                      />
                      {/* {localFilter()[field.field] && (
                        <button
                          class="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 z-10"
                          onClick={clearCustomer}
                        >
                          ✕
                        </button>
                      )} */}
                    </div>
                    {selectedCustomerLabel() && (
                      <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div class="flex items-center justify-between">
                          <div>
                            <div class="font-medium text-green-800">Customer Terpilih:</div>
                            <div class="text-sm text-green-600 mt-1">{selectedCustomerLabel()}</div>
                          </div>
                          <button
                            onClick={clearCustomer}
                            class="text-green-600 hover:text-green-800 text-sm"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </For>

          {/* Summary Filter Aktif */}
          {/* <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div class="flex items-center gap-2 mb-2">
              <svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="font-medium text-yellow-800">Filter Aktif:</span>
            </div>
            <div class="text-sm text-yellow-700 space-y-1">
              {Object.keys(localFilter()).length === 0 ? (
                <span class="italic">Belum ada filter yang diatur</span>
              ) : (
                <ul class="list-disc list-inside pl-2">
                  {localFilter().supplier && (
                    <li>Supplier: {localFilter().supplier.label || localFilter().supplier.value}</li>
                  )}
                  {localFilter().customer && (
                    <li>Customer: {localFilter().customer.label || localFilter().customer.value}</li>
                  )}
                  {localFilter().tanggal_sj_start && localFilter().tanggal_sj_end && (
                    <li>Tanggal SJ: {localFilter().tanggal_sj_start} s/d {localFilter().tanggal_sj_end}</li>
                  )}
                  {localFilter().tanggal_jatuh_tempo_start && localFilter().tanggal_jatuh_tempo_end && (
                    <li>Tanggal Jatuh Tempo: {localFilter().tanggal_jatuh_tempo_start} s/d {localFilter().tanggal_jatuh_tempo_end}</li>
                  )}
                  {localFilter().no_giro && (
                    <li>No Giro: {localFilter().no_giro}</li>
                  )}
                </ul>
              )}
            </div>
          </div> */}
        </div>

        {/* Footer */}
        <div class="sticky bottom-0 bg-white border-t px-6 py-4">
          <div class="flex justify-end gap-3">
            <button
              class="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              onClick={onCancel}
              disabled={loading}
            >
              Batal
            </button>
            <button
              class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
              onClick={handlePreview}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Memuat Preview...
                </>
              ) : (
                <>
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Preview Filter
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}