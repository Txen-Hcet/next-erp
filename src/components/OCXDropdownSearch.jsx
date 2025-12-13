import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { onClickOutside } from "./OnClickOutside";

export default function OCXDropdownSearch({
  items = [],
  value = null,
  onChange,
  disabled = false,
  form,
  setForm,
  filterCompleted = true, // Prop baru untuk filter OCX selesai
}) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");
  const [localValue, setLocalValue] = createSignal(value);
  let dropdownRef;

  // Update localValue ketika prop value berubah
  createEffect(() => {
    setLocalValue(value);
  });

  createEffect(() => {
    if (!dropdownRef) return;
    const cleanup = onClickOutside(dropdownRef, () => setIsOpen(false));
    onCleanup(cleanup);
  });

  const filteredItems = createMemo(() => {
    const q = search().toLowerCase();
    let filtered = items;
    
    // Filter OCX yang sudah selesai jika filterCompleted true
    if (filterCompleted) {
      filtered = filtered.filter(item => item.qty_status !== "SELESAI");
    }
    
    if (!q) return filtered;
    
    return filtered.filter((item) => {
      const noPoEx = (item.no_po_ex || "").toLowerCase();
      const supplier = (item.nama_supplier || "").toLowerCase();
      return noPoEx.includes(q) || supplier.includes(q);
    });
  });

  const selectedItem = createMemo(() => {
    if (!localValue()) return null;
    
    return items.find((item) => String(item.id) === String(localValue()));
  });

  const selectItem = (item) => {
    // Update local value
    setLocalValue(item.id);
    
    // Panggil onChange callback
    if (onChange) {
      onChange(item);
    }
    
    setIsOpen(false);
    setSearch("");
  };

  // Render display text
  const displayText = createMemo(() => {
    const item = selectedItem();
    if (item) {
      return `${item.no_po_ex} - ${item.nama_supplier}`;
    }
    return "Pilih OCX";
  });

  return (
    <div class="relative" ref={dropdownRef}>
      <button
        type="button"
        class={`w-full border p-2 rounded text-left ${
          disabled ? "bg-gray-200 cursor-default" : "bg-white hover:bg-gray-50"
        }`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen());
          }
        }}
        disabled={disabled}
      >
        <span class="block whitespace-nowrap overflow-hidden text-ellipsis">
          {displayText()}
        </span>
      </button>

      {isOpen() && !disabled && (
        <div class="absolute z-50 w-full bg-white border mt-1 rounded shadow-lg max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari No. OCX atau Supplier..."
            class="w-full p-2 border-b focus:outline-none focus:ring-2 focus:ring-blue-300 sticky top-0 bg-white"
            value={search()}
            onInput={(e) => {
              setSearch(e.target.value);
            }}
            autofocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filteredItems().length > 0) {
                selectItem(filteredItems()[0]);
              }
            }}
          />
          <div class="max-h-52 overflow-y-auto">
            {filteredItems().length > 0 ? (
              filteredItems().map((item) => (
                <div
                  key={item.id}
                  class={`p-2 hover:bg-blue-50 cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis ${
                    selectedItem()?.id === item.id ? 'bg-blue-100 font-semibold' : ''
                  }`}
                  onClick={() => {
                    selectItem(item);
                  }}
                >
                  <div class="flex justify-between items-center">
                    <div>
                      {item.no_po_ex} - {item.nama_supplier}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div class="p-3 text-center text-gray-500">
                {search() ? "Tidak ditemukan" : "Tidak ada OCX tersedia"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}