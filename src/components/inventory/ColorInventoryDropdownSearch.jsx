import {
  createSignal,
  createMemo,
  createEffect,
  onCleanup,
} from "solid-js";
import { onClickOutside } from "../OnClickOutside";

// HAPUS destructuring. Gunakan 'props'
export default function ColorInventoryDropdownSearch(props) {
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
    // Gunakan props.colors()
    return props.colors().filter((f) => {
      const kode = (f.kode || "").toLowerCase();
      const deskripsi = (f.deskripsi || "").toLowerCase();
      return kode.includes(q) || deskripsi.includes(q);
    });
  });

  // PERBAIKAN UTAMA: props.item.warna_id
  const selectedColor = createMemo(() => {
    if (!props.item) return undefined;
    return props.colors().find((s) => s.id == props.item.warna_id);
  });

  const selectColor = (color) => {
    setIsOpen(false);
    setSearch("");
    props.onChange && props.onChange(color.id);
  };

  return (
    <div class="relative w-full" ref={dropdownRef}>
      <input type="hidden" name="warna_id" value={props.item?.warna_id} />
      <button
        type="button"
        class={`w-full border p-2 rounded text-left ${
          props.disabled ? "bg-gray-200" : "bg-transparent"
        } cursor-default`}
        disabled={props.disabled}
        onClick={() => !props.disabled && setIsOpen(!isOpen())}
      >
        {/* Tampilkan data terpilih */}
        {(selectedColor()?.kode ? selectedColor().kode + " | " : "") +
          (selectedColor()?.deskripsi || "") || "Pilih Warna..."}
      </button>

      {isOpen() && !props.disabled && (
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