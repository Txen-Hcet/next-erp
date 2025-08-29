import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { onClickOutside } from "./OnClickOutside.jsx"; 

export default function PurchasingOrderDropdownSearch(props) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");
  let dropdownRef;

  // Efek untuk menutup dropdown saat klik di luar
  createEffect(() => {
    if (!dropdownRef) return;
    onClickOutside(dropdownRef, () => setIsOpen(false));
  });

  // Memo untuk memfilter daftar PO berdasarkan input pencarian
  const filteredItems = createMemo(() => {
    const query = search().toLowerCase();
    if (!Array.isArray(props.items)) return [];
    return props.items.filter((item) =>
      (item.no_jb || "").toLowerCase().includes(query)
    );
  });

  // Memo untuk mendapatkan objek PO yang sedang dipilih berdasarkan ID
  const selectedItem = createMemo(() => {
    if (!Array.isArray(props.items)) return null;
    return props.items.find((item) => item.id === props.value);
  });

  // Fungsi saat sebuah PO dipilih dari daftar
  const handleSelect = (item) => {
    setIsOpen(false);
    setSearch("");
    if (props.onChange) {
      props.onChange(item); // Kirim seluruh objek item ke parent
    }
  };

  return (
    <div class="relative" ref={dropdownRef}>
      <button
        type="button"
        class="w-full border p-2 rounded text-left bg-transparent disabled:bg-gray-200"
        onClick={() => setIsOpen(!isOpen())}
        disabled={props.disabled}
      >
        {selectedItem() ? selectedItem().no_jb : "Pilih Purchase Order"}
      </button>

      {isOpen() && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow-lg max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari No. Purchase Order..."
            class="w-full p-2 border-b sticky top-0"
            value={search()}
            onInput={(e) => setSearch(e.target.value)}
            autofocus
          />
          {filteredItems().length > 0 ? (
            filteredItems().map((item) => (
              <div
                class="p-2 hover:bg-blue-100 cursor-pointer"
                onClick={() => handleSelect(item)}
              >
                {item.no_jb}
              </div>
            ))
          ) : (
            <div class="p-2 text-gray-400">
              Purchase Order tidak ditemukan
            </div>
          )}
        </div>
      )}
    </div>
  );
}