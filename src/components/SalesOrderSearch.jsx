import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { onClickOutside } from "./OnClickOutside";

export default function SalesOrderDropdownSearch({
  salesOrders,
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
    // Panggil salesOrders() di sini
    return salesOrders().filter((c) => {
      const no_so = c.no_so?.toLowerCase() || "";
      return no_so.includes(q);
    });
  });

  const selectedSalesOrder = createMemo(() =>
    // Panggil salesOrders() di sini
    salesOrders().find((c) => c.id == form().sales_order_id)
  );

  const selectSalesOrder = (so) => {
    setForm({ ...form(), sales_order_id: so.id });
    setIsOpen(false);
    setSearch("");

    if (onChange) onChange(so);
  };

  return (
    <div class="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        class="w-full border p-2 rounded text-left bg-white/10"
        onClick={() => setIsOpen(!isOpen())}
      >
        {selectedSalesOrder() ? selectedSalesOrder().no_so : "Pilih SO"}
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
            filteredSalesContracts().map((so) => (
              <div
                key={so.id} // Sangat penting menambahkan key di sini
                class="p-2 hover:bg-blue-100 cursor-pointer"
                onClick={() => selectSalesOrder(so)}
              >
                {so.no_so}
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
