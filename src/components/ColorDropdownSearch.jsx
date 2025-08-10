import {
  createSignal,
  createMemo,
  createEffect,
  onCleanup,
  onMount,
} from "solid-js";
import { onClickOutside } from "./OnClickOutside";

export default function ColorDropdownSearch({
  colors,
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

  const filteredColors = createMemo(() => {
    const q = search().toLowerCase();
    return colors().filter((f) => {
      const kode = (f.kode || "").toLowerCase();
      const deskripsi = (f.deskripsi || "").toLowerCase();
      return kode.includes(q) || deskripsi.includes(q);
    });
  });

  const selectedColor = createMemo(() =>
    colors().find((s) => s.id == form().warna_id)
  );

  const selectColor = (warna) => {
    setForm({ ...form(), warna_id: warna.id });
    setIsOpen(false);
    setSearch("");
    if (onChange) onChange(warna.id);
  };

  return (
    <div class="relative w-64" ref={dropdownRef}>
      <button
        type="button"
        class="w-full border p-2 rounded text-left bg-white/10"
        onClick={() => !disabled && setIsOpen(!isOpen())}
        disabled={disabled}
      >
        {selectedColor()?.label || "Pilih Warna..."}
      </button>

      {isOpen() && !disabled && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari Warna..."
            class="w-full p-2 border-b focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search()}
            onInput={(e) => setSearch(e.target.value)}
            autofocus
          />
          {filteredColors().length > 0 ? (
            filteredColors().map((s) => (
              <div
                key={s.id}
                class="p-2 hover:bg-blue-100 cursor-pointer"
                onClick={() => selectColor(s)}
              >
                {s.kode} | {s.deskripsi}
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
