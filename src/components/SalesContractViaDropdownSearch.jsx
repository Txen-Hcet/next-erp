import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { onClickOutside } from "./OnClickOutside";

function formatSimpleDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

const qtyCounterbySystem = (sc, satuanUnit) => {
  let total = 0;
  let terkirim = 0;

  switch (satuanUnit) {
    case 1: // Meter
      total = parseFloat(sc.summary?.total_meter || 0);
      terkirim = parseFloat(sc.summary?.total_meter_dalam_proses || 0);
      break;
    case 2: // Yard
      total = parseFloat(sc.summary?.total_yard || 0);
      terkirim = parseFloat(sc.summary?.total_yard_dalam_proses || 0);
      break;
    case 3: // Kilogram
      total = parseFloat(sc.summary?.total_kilogram || 0);
      terkirim = parseFloat(sc.summary?.total_kilogram_dalam_proses || 0);
      break;
    default:
      return "-";
  }

  const sisa = total - terkirim;
  if (sisa <= 0) return "SELESAI";

  return `${sisa.toLocaleString("id-ID")} / ${total.toLocaleString("id-ID")}`;
};

export default function SalesContractViaDropdownSearch({
  salesContracts, 
  form,
  setForm,
  onChange,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");
  let dropdownRef;

  createEffect(() => {
    if (!dropdownRef) return;
    const cleanup = onClickOutside(dropdownRef, () => setIsOpen(false));
    onCleanup(cleanup);
  });

  // Filter hanya sales contract dengan is_via = 1 (true)
  const viaSalesContracts = createMemo(() => {
    return salesContracts().filter(c => c.is_via === 1 || c.is_via === true);
  });

  const filteredSalesContracts = createMemo(() => {
    const q = search().toLowerCase();
    return viaSalesContracts().filter((c) => {
      const no_sc = (c.no_sc || "").toLowerCase();
      const customer = (c.customer_name || "").toLowerCase();

      // Cek status SELESAI (gunakan satuan_unit_id dari contract)
      const status = qtyCounterbySystem(c, c.satuan_unit_id);

      // Convert status ke string jika berupa React element
      const statusStr = typeof status === "string" ? status : "SELESAI";

      // Hanya tampilkan yang cocok search DAN bukan SELESAI
      return (no_sc.includes(q) || customer.includes(q)) && statusStr !== "SELESAI";
    });
  });

  const selectedSalesContract = createMemo(() =>
    viaSalesContracts().find((c) => c.id == form().sales_contract_id)
  );

  const selectContract = (contract) => {
    setForm({ ...form(), sales_contract_id: contract.id });
    setIsOpen(false);
    setSearch("");
    if (onChange) onChange(contract.id);
  };

  return (
    <div class="relative" ref={dropdownRef}>
      <input
        type="hidden"
        name="sales_contract_id"
        value={form().sales_contract_id}
      />
      <button
        type="button"
        class={`w-full border p-2 rounded text-left ${
          disabled ? "bg-gray-200" : "bg-transparent"
        } cursor-default`}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen())}
      >
        <span class="block whitespace-nowrap overflow-hidden text-ellipsis">
          {selectedSalesContract()
            ? `${selectedSalesContract().no_sc} - ${selectedSalesContract().customer_name} (${formatSimpleDate(selectedSalesContract().created_at)}) - VIA`
            : "Pilih Sales Contract VIA"}
        </span>
      </button>

      {isOpen() && !disabled && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari No. SC VIA atau Customer..."
            class="w-full p-2 border-b focus:outline-none focus:ring-2 focus:ring-blue-500 sticky top-0"
            value={search()}
            onInput={(e) => setSearch(e.target.value)}
            autofocus
          />
          {filteredSalesContracts().length > 0 ? (
            filteredSalesContracts().map((contract) => (
              <div
                key={contract.id}
                class="p-2 hover:bg-blue-100 cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis"
                onClick={() => selectContract(contract)}
              >
                <div class="font-medium">{contract.no_sc} - {contract.customer_name}</div>
                <div class="text-sm text-gray-600">
                  {formatSimpleDate(contract.created_at)} | 
                  {contract.satuan_unit_name} | 
                  <span class="ml-1 text-green-600 font-medium">VIA</span>
                </div>
              </div>
            ))
          ) : (
            <div class="p-2 text-gray-400">
              {viaSalesContracts().length === 0 
                ? "Tidak ada Sales Contract VIA tersedia" 
                : "Sales Contract VIA tidak ditemukan atau sudah SELESAI"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}