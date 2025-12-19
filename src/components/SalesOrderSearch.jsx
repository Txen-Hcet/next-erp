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
    // Diubah dari JSX menjadi string agar bisa dibandingkan
    return "SELESAI"; 
  }
  return `${sisa.toLocaleString("id-ID")} / ${total.toLocaleString("id-ID")}`;
};

export default function SalesOrderDropdownSearch({
  salesOrders,
  form,
  setForm,
  onChange,
  disabled = false,
  // 1. Tambahkan prop baru, dengan default 'packingList'
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

  const viaSalesOrders = createMemo(() => {
    return salesOrders().filter(so => so.is_via === 0 || so.is_via === false);
  });

  // 2. Logika filter diperbarui untuk menggunakan prop filterType
  const filteredSalesOrders = createMemo(() => {
    const q = search().toLowerCase();
    return viaSalesOrders().filter((so) => {
      const no_so = (so.no_so || "").toLowerCase();
      const customer = (so.customer_name || "").toLowerCase();
      
      let status;

      // Pilih fungsi kalkulasi berdasarkan filterType
      if (filterType === 'suratJalan') {
        // Gunakan qtyCounterReal dengan satuan_unit_id
        status = qtyCounterReal(so, so.satuan_unit_id);
      } else { 
        // Default ke qtyCounterbySystem untuk packingList dengan satuan_unit_name
        status = qtyCounterbySystem(so, so.satuan_unit_name);
      }

      const statusStr = typeof status === "string" ? status : "SELESAI";

      // Hanya tampilkan SO yang cocok pencarian DAN belum selesai
      return (no_so.includes(q) || customer.includes(q)) && statusStr !== "SELESAI";
    });
  });

  const selectedSalesOrder = createMemo(() =>
    viaSalesOrders().find((c) => c.id == form().sales_order_id)
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
            ? `${selectedSalesOrder().no_so} - ${selectedSalesOrder().customer_name} (${formatSimpleDate(selectedSalesOrder().created_at)})`
            : "Pilih SO"}
        </span>
      </button>

      {isOpen() && !disabled && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari No. SO atau Customer..."
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
                {so.no_so} - {so.customer_name} ({formatSimpleDate(so.created_at)})
              </div>
            ))
          ) : (
            <div class="p-2 text-gray-400">Sales Order tidak ditemukan</div>
          )}
        </div>
      )}
    </div>
  );
}