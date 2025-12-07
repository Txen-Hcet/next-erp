import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { onClickOutside } from "./OnClickOutside.jsx";

function formatSimpleDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

// Kalkulasi untuk Packing List (berdasarkan kuantitas dalam proses)
const qtyCounterbySystem = (so, satuanUnitName) => {
  let total = 0;
  let terkirim = 0;

  switch (satuanUnitName) {
    case "Meter":
      total = parseFloat(so.summary?.total_meter || 0);
      terkirim = parseFloat(so.summary?.total_meter_dalam_proses || 0);
      break;
    case "Yard":
      total = parseFloat(so.summary?.total_yard || 0);
      terkirim = parseFloat(so.summary?.total_yard_dalam_proses || 0);
      break;
    case "Kilogram":
      total = parseFloat(so.summary?.total_kilogram || 0);
      terkirim = parseFloat(so.summary?.total_kilogram_dalam_proses || 0);
      break;
    default:
      return "-";
  }

  const sisa = total - terkirim;
  if (sisa <= 0) {
    return "SELESAI";
  }
  return `${sisa.toLocaleString("id-ID")} / ${total.toLocaleString("id-ID")}`;
};

// Kalkulasi untuk Surat Jalan (berdasarkan kuantitas yang sudah terkirim)
const qtyCounterReal = (so, satuanUnitId) => {
  let total = 0;
  let terkirim = 0;

  switch (satuanUnitId) {
    case 1: // Meter
      total = parseFloat(so.summary?.total_meter || 0);
      terkirim = parseFloat(so.summary?.total_meter_dalam_surat_jalan || 0);
      break;
    case 2: // Yard
      total = parseFloat(so.summary?.total_yard || 0);
      terkirim = parseFloat(so.summary?.total_yard_dalam_surat_jalan || 0);
      break;
    case 3: // Kilogram
      total = parseFloat(so.summary?.total_kilogram || 0);
      terkirim = parseFloat(so.summary?.total_kilogram_dalam_surat_jalan || 0);
      break;
    default:
      return "-";
  }

  const sisa = total - terkirim;
  if (sisa <= 0) {
    return "SELESAI"; 
  }
  return `${sisa.toLocaleString("id-ID")} / ${total.toLocaleString("id-ID")}`;
};

export default function SalesOrderViaDropdownSearch({
  salesOrders,
  form,
  setForm,
  onChange,
  disabled = false,
  filterType = 'packingList',
}) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");
  let dropdownRef;

  createEffect(() => {
    if (!dropdownRef) return;
    const cleanup = onClickOutside(dropdownRef, () => setIsOpen(false));
    onCleanup(cleanup);
  });

  // Filter hanya sales order dengan is_via = 1 (true)
  const viaSalesOrders = createMemo(() => {
    return salesOrders().filter(so => so.is_via === 1 || so.is_via === true);
  });

  const filteredSalesOrders = createMemo(() => {
    const q = search().toLowerCase();
    return viaSalesOrders().filter((so) => {
      const no_so = (so.no_so || "").toLowerCase();
      const customer = (so.customer_name || "").toLowerCase();
      
      let status;

      // Pilih fungsi kalkulasi berdasarkan filterType
      if (filterType === 'suratJalan') {
        status = qtyCounterReal(so, so.satuan_unit_id);
      } else { 
        status = qtyCounterbySystem(so, so.satuan_unit_name);
      }

      const statusStr = typeof status === "string" ? status : "SELESAI";

      // Hanya tampilkan SO yang cocok pencarian DAN belum selesai DAN is_via = 1
      return (no_so.includes(q) || customer.includes(q)) && statusStr !== "SELESAI";
    });
  });

  const selectedSalesOrder = createMemo(() =>
    viaSalesOrders().find((so) => so.id == form().sales_order_id)
  );

  const selectSalesOrder = (so) => {
    if (disabled) return;
    setForm({ ...form(), sales_order_id: so.id });
    setIsOpen(false);
    setSearch("");
    if (onChange) onChange(so);
  };

  const handleToggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen());
    }
  };

  return (
    <div class="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        class="w-full border p-2 rounded text-left disabled:bg-gray-200"
        onClick={handleToggleDropdown}
        disabled={disabled}
      >
        <span class="block whitespace-nowrap overflow-hidden text-ellipsis">
          {selectedSalesOrder()
            ? `${selectedSalesOrder().no_so} - ${selectedSalesOrder().customer_name} (${formatSimpleDate(selectedSalesOrder().created_at)}) - VIA`
            : "Pilih SO VIA"}
        </span>
      </button>

      {isOpen() && !disabled && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari No. SO VIA atau Customer..."
            class="w-full p-2 border-b focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search()}
            onInput={(e) => setSearch(e.target.value)}
            autofocus
          />
          {filteredSalesOrders().length > 0 ? (
            filteredSalesOrders().map((so) => (
              <div
                key={so.id}
                class="p-2 hover:bg-blue-100 cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis"
                onClick={() => selectSalesOrder(so)}
              >
                <div class="font-medium">{so.no_so} - {so.customer_name}</div>
                <div class="text-sm text-gray-600">
                  {formatSimpleDate(so.created_at)} | 
                  {so.satuan_unit_name} | 
                  <span class="ml-1 text-green-600 font-medium">VIA</span>
                </div>
              </div>
            ))
          ) : (
            <div class="p-2 text-gray-400">
              {viaSalesOrders().length === 0 
                ? "Tidak ada Sales Order VIA tersedia" 
                : "Sales Order VIA tidak ditemukan atau sudah SELESAI"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}