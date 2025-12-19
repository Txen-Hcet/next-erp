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
    case 1:
      total = parseFloat(sc.summary?.total_meter || 0);
      terkirim = parseFloat(sc.summary?.total_meter_dalam_proses || 0);
      break;
    case 2:
      total = parseFloat(sc.summary?.total_yard || 0);
      terkirim = parseFloat(sc.summary?.total_yard_dalam_proses || 0);
      break;
    case 3:
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

export default function SalesContractDropdownSearch({
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

  // const filteredSalesContracts = createMemo(() => {
  //   const q = search().toLowerCase();
  //   return salesContracts().filter((c) => {
  //     const no_sc = (c.no_sc || "").toLowerCase();
  //     const customer = (c.customer_name || "").toLowerCase();
  //     return no_sc.includes(q) || customer.includes(q);
  //   });
  // });

  const viaSalesContracts = createMemo(() => {
    return salesContracts().filter(c => c.is_via === 0 || c.is_via === false);
  });

  const filteredSalesContracts = createMemo(() => {
    const q = search().toLowerCase();
    return viaSalesContracts().filter((c) => {
      const no_sc = (c.no_sc || "").toLowerCase();
      const customer = (c.customer_name || "").toLowerCase();

      // cek status SELESAI (gunakan satuan_unit_id dari contract)
      // karena di qtyCounterbySystem kamu return <span> untuk SELESAI,
      // lebih baik ubah dulu supaya hanya return string, mis. "SELESAI"
      const status = qtyCounterbySystem(c, c.satuan_unit_id);

      // kalau status berupa React element, convert ke string:
      const statusStr = typeof status === "string" ? status : "SELESAI";

      // hanya tampilkan kalau cocok search DAN bukan SELESAI
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
            ? `${selectedSalesContract().no_sc} - ${selectedSalesContract().customer_name} (${formatSimpleDate(selectedSalesContract().created_at)})`
            : "Pilih Sales Contract"}
        </span>
      </button>

      {isOpen() && !disabled && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari No. SC atau Customer..."
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
                {contract.no_sc} - {contract.customer_name} ({formatSimpleDate(contract.created_at)})
              </div>
            ))
          ) : (
            <div class="p-2 text-gray-400">Sales Contract tidak ditemukan</div>
          )}
        </div>
      )}
    </div>
  );
}