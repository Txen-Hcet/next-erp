import { createSignal, createEffect, For, Show } from "solid-js";
import Litepicker from "litepicker";
import Swal from "sweetalert2";
import SupplierDropdownFinance from "../SupplierDropdownFinance";
import CustomerDropdownFinance from "../CustomerDropdownFinance";

export default function FinanceFilterModal(props) {
  const { block, filter, onFilterChange, onPreview, onApply, onCancel, loading } = props;

  const [localFilter, setLocalFilter] = createSignal(filter || {});

  createEffect(() => {
    setLocalFilter(filter || {});
  });

  const handleDateRangeChange = async (field, title) => {
    const { value: rangeVal } = await Swal.fire({
      title: title,
      html: `<input type="text" id="date-range" class="swal2-input" placeholder="Klik untuk pilih rentang" value="${localFilter()[field + '_start'] && localFilter()[field + '_end'] ? `${localFilter()[field + '_start']} - ${localFilter()[field + '_end']}` : ''}">`,
      didOpen: () => {
        new Litepicker({
          element: document.getElementById("date-range"),
          singleMode: false,
          format: "YYYY-MM-DD",
          autoApply: true,
          numberOfMonths: 2,
          numberOfColumns: 2,
        });
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
      allowEscapeKey: false,
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

  const handleDropdownChange = (field, selectedOption) => {
    setLocalFilter(prev => ({
      ...prev,
      [field]: selectedOption
    }));
  };

  const clearDateRange = (field) => {
    setLocalFilter(prev => ({
      ...prev,
      [field + '_start']: null,
      [field + '_end']: null
    }));
  };

  const handlePreview = () => {
    onPreview(block, localFilter());
  };

  const handleApply = () => {
    onFilterChange(localFilter());
    onApply();
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
          field: "tanggal_penerimaan",
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
    <div class="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-semibold mb-4">
          Filter - {block.label}
        </h3>

        <div class="space-y-4">
          <For each={fieldConfig}>
            {(field) => (
              <div>
                <label class="block text-sm font-medium mb-2">{field.label}</label>
                
                {field.type === "dateRange" && (
                  <div class="flex gap-2">
                    <button
                      class="flex-1 px-3 py-2 border border-gray-300 rounded text-left bg-white hover:bg-gray-50"
                      onClick={() => handleDateRangeChange(field.field, field.title)}
                    >
                      {localFilter()[field.field + '_start'] && localFilter()[field.field + '_end'] 
                        ? `${localFilter()[field.field + '_start']} s/d ${localFilter()[field.field + '_end']}`
                        : "Pilih Rentang Tanggal"}
                    </button>
                    {(localFilter()[field.field + '_start'] || localFilter()[field.field + '_end']) && (
                      <button
                        class="px-3 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50"
                        onClick={() => clearDateRange(field.field)}
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                )}

                {field.type === "text" && (
                  <input
                    type="text"
                    class="w-full border border-gray-300 p-2 rounded"
                    value={localFilter()[field.field] || ""}
                    onInput={(e) => handleInputChange(field.field, e.target.value)}
                    placeholder={field.placeholder}
                  />
                )}

                {field.type === "supplierDropdown" && (
                  <SupplierDropdownFinance
                    value={localFilter()[field.field] || ""}
                    onChange={(selected) => handleDropdownChange(field.field, selected)}
                  />
                )}

                {field.type === "customerDropdown" && (
                  <CustomerDropdownFinance
                    value={localFilter()[field.field] || ""}
                    onChange={(selected) => handleDropdownChange(field.field, selected)}
                  />
                )}
              </div>
            )}
          </For>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button
            class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            onClick={onCancel}
            disabled={loading}
          >
            Batal
          </button>
          <button
            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
            onClick={handlePreview}
            disabled={loading}
          >
            {loading ? 'Memproses...' : 'Preview Filter'}
          </button>
          <button
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
            onClick={handleApply}
            disabled={loading}
          >
            <Show when={loading}>
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </Show>
            {loading ? 'Memproses...' : 'Terapkan Filter'}
          </button>
        </div>
      </div>
    </div>
  );
}