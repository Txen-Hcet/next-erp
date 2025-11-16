import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { onClickOutside } from "./OnClickOutside";

export default function ColorDropdownOutstanding(props) {
  // Akses props sebagai function untuk reactivity
  const colors = () => props.colors;
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

  const filteredColors = createMemo(() => {
    const q = search().toLowerCase();
    const cols = colors();
    if (!Array.isArray(cols)) return [];
    return cols.filter((c) => {
      const kode_warna = (c.kode_warna || "").toLowerCase();
      const deskripsi_warna = (c.deskripsi_warna || "").toLowerCase();
      return kode_warna.includes(q) || deskripsi_warna.includes(q);
    });
  });

  // PERBAIKAN: Gunakan createMemo yang proper
  const selectedColor = createMemo(() => {
    const val = value();
    const cols = colors();
    
    if (!val || !Array.isArray(cols)) return null;
    return cols.find((c) => c.id == val);
  });

  const selectColor = (color) => {
    onChange(color.id);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div class="relative" ref={dropdownRef}>
      <button
        type="button"
        class={`w-full border p-2 rounded text-left ${
          disabled() ? "bg-gray-200" : "bg-white"
        } cursor-default`}
        disabled={disabled()}
        onClick={() => !disabled() && setIsOpen(!isOpen())}
      >
        {selectedColor() ? selectedColor().kode_warna : "Pilih Warna"}
      </button>

      {isOpen() && !disabled() && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari warna..."
            class="w-full p-2 border-b focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search()}
            onInput={(e) => setSearch(e.target.value)}
            autofocus
          />
          {filteredColors().length > 0 ? (
            filteredColors().map((c) => (
              <div
                class="p-2 hover:bg-blue-100 cursor-pointer"
                onClick={() => selectColor(c)}
              >
                {c.kode_warna + (c.deskripsi_warna ? " | " + c.deskripsi_warna : "")}
              </div>
            ))
          ) : (
            <div class="p-2 text-gray-400">Warna tidak ditemukan</div>
          )}
        </div>
      )}
    </div>
  );
}