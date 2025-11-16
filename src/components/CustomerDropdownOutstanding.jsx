import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { onClickOutside } from "./OnClickOutside";

export default function CustomerDropdownOutstanding(props) {
  // Akses props sebagai function untuk reactivity
  const customers = () => props.customers;
  const value = () => props.value;
  const onChange = (id) => props.onChange(id);
  const disabled = () => props.disabled || false;

  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");

  let dropdownRef;

  createEffect(() => {
    if (!dropdownRef) return;
    const cleanup = onClickOutside(dropdownRef, () => setIsOpen(false));
    onCleanup(cleanup);
  });

  const filteredCustomers = createMemo(() => {
    const q = search().toLowerCase();
    const custs = customers();
    if (!Array.isArray(custs)) return [];
    return custs.filter((c) => {
      const nama = (c.nama || "").toLowerCase();
      const kode = (c.kode || "").toLowerCase();
      return nama.includes(q) || kode.includes(q);
    });
  });

  const selectedCustomer = createMemo(() => {
    const val = value();
    const custs = customers();
    
    if (!val || !Array.isArray(custs)) return null;
    return custs.find((c) => c.id == val);
  });

  const selectCustomer = (customer) => {
    onChange(customer.id);
    setIsOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    onChange(null);
    setSearch("");
  };

  return (
    <div class="relative" ref={dropdownRef}>
      <div class="flex gap-2">
        <div class="flex-1">
          <button
            type="button"
            class={`w-full border p-2 rounded text-left ${
              disabled() ? "bg-gray-200" : "bg-white"
            } cursor-default flex justify-between items-center`}
            disabled={disabled()}
            onClick={() => !disabled() && setIsOpen(!isOpen())}
          >
            <span>
              {selectedCustomer() 
                ? `${selectedCustomer().nama}${selectedCustomer().kode ? ` (${selectedCustomer().kode})` : ''}`
                : "Pilih Customer"
              }
            </span>
          </button>
        </div>
        {selectedCustomer() && (
          <button
            type="button"
            class="px-3 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
            onClick={handleClear}
            disabled={disabled()}
          >
            Hapus
          </button>
        )}
      </div>

      {isOpen() && !disabled() && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari customer..."
            class="w-full p-2 border-b focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search()}
            onInput={(e) => setSearch(e.target.value)}
            autofocus
          />
          {filteredCustomers().length > 0 ? (
            filteredCustomers().map((customer) => (
              <div
                class="p-2 hover:bg-blue-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                onClick={() => selectCustomer(customer)}
              >
                <div class="font-medium">{customer.nama}</div>
              </div>
            ))
          ) : (
            <div class="p-2 text-gray-400 text-center">Customer tidak ditemukan</div>
          )}
        </div>
      )}
    </div>
  );
}