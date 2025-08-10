import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { onClickOutside } from "./OnClickOutside";

export default function SalesContractDropdownSearch({
  salesContracts, // Ini adalah signal, bukan array langsung
  form,
  setForm,
  onChange,
}) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");

  let dropdownRef;

  createEffect(() => {
    if (!dropdownRef) return;

    const cleanup = onClickOutside(dropdownRef, () => {
      setIsOpen(false);
    });

    onCleanup(cleanup);
  });

  const filteredSalesContracts = createMemo(() => {
    const q = search().toLowerCase();
    // Panggil salesContracts() di sini
    return salesContracts().filter((c) => {
      const no_sc = c.no_sc?.toLowerCase() || "";
      return no_sc.includes(q);
    });
  });

  const selectedSalesContract = createMemo(() =>
    // Panggil salesContracts() di sini
    salesContracts().find((c) => c.id == form().sales_contract_id)
  );

  const selectCustomer = (cust) => {
    setForm({ ...form(), sales_contract_id: cust.id });
    setIsOpen(false);
    setSearch("");

    if (onChange) onChange(cust.id);
  };

  return (
    <div class="relative" ref={dropdownRef}>
      <button
        type="button"
        class="w-full border p-2 rounded text-left bg-white/10"
        onClick={() => setIsOpen(!isOpen())}
      >
        {selectedSalesContract()
          ? `${selectedSalesContract().no_sc}`
          : "Pilih Sales Contract"}
      </button>

      {isOpen() && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari customer..."
            class="w-full p-2 border-b focus:outline-none focus:ring-2 focus:ring-blue-500" // Tambahan styling fokus
            value={search()}
            onInput={(e) => setSearch(e.target.value)}
            autofocus
          />
          {filteredSalesContracts().length > 0 ? (
            filteredSalesContracts().map((cust) => (
              <div
                key={cust.id} // Sangat penting menambahkan key di sini
                class="p-2 hover:bg-blue-100 cursor-pointer"
                onClick={() => selectCustomer(cust)}
              >
                {cust.no_sc}
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
