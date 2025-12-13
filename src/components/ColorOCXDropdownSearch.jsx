// File: components/ColorOCXDropdownSearch.jsx
import {
  createSignal,
  createMemo,
  createEffect,
  onCleanup,
} from "solid-js";
import { onClickOutside } from "./OnClickOutside";

export default function ColorOCXDropdownSearch({
  colors,
  item,
  field = "warna_ex_id", // field yang akan diakses (warna_ex_id atau warna_new_id)
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
      // Cari di semua kemungkinan field
      const kode = (f.kode_warna || f.kode || "").toLowerCase();
      const deskripsi = (f.deskripsi_warna || f.deskripsi || f.nama_warna || "").toLowerCase();
      return kode.includes(q) || deskripsi.includes(q);
    });
  });

  // Gunakan field yang ditentukan
  const selectedColor = createMemo(() =>
    colors().find((s) => s.id == item[field])
  );

  const selectColor = (color) => {
    setIsOpen(false);
    setSearch("");
    onChange && onChange(color.id);
  };

  const getDisplayText = () => {
    const color = selectedColor();
    if (!color) return field === "warna_ex_id" ? "Pilih Warna Ex..." : "Pilih Warna Baru...";
    
    const kode = color.kode_warna || color.kode || "";
    const deskripsi = color.deskripsi_warna || color.deskripsi || color.nama_warna || "";
    
    if (kode && deskripsi) {
      return `${kode} | ${deskripsi}`;
    } else if (kode) {
      return kode;
    } else if (deskripsi) {
      return deskripsi;
    } else {
      return `Warna ${color.id}`;
    }
  };

  return (
    <div class="relative w-full" ref={dropdownRef}>
      <input type="hidden" name={field} value={item[field]} />
      <button
        type="button"
        class={`w-full border p-2 rounded text-left ${
          disabled ? "bg-gray-200" : "bg-transparent"
        } cursor-default`}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen())}
      >
        {getDisplayText()}
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
                {(s.kode_warna || s.kode || `Warna ${s.id}`)} | {(s.deskripsi_warna || s.deskripsi || s.nama_warna || "")}
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