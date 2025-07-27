import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { onClickOutside } from "./OnClickOutside";

export default function SupplierDropdownSearch({
  suppliers,
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

  const filteredSuppliers = createMemo(() => {
    const q = search().toLowerCase();
    return suppliers().filter((s) => {
      const nama = (s.nama || "").toLowerCase();
      const kode = (s.kode || "").toLowerCase();
      return nama.includes(q) || kode.includes(q);
    });
  });

  const selectedSupplier = createMemo(() =>
    suppliers().find((s) => s.id == form().supplier_id)
  );

  const selectSupplier = (supplier) => {
    setForm({ ...form(), supplier_id: supplier.id });
    setIsOpen(false);
    setSearch("");
    if (onChange) onChange(supplier.id);
  };

  return (
    <div class="relative" ref={dropdownRef}>
      <input type="hidden" name="supplier_id" value={form().supplier_id} />
      <button
        type="button"
        class={`w-full border p-2 rounded text-left ${
          disabled ? "bg-gray-200" : "bg-white"
        } cursor-default`}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen())}
      >
        {selectedSupplier() ? selectedSupplier().nama : "Pilih Supplier"}
      </button>

      {isOpen() && !disabled && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari supplier..."
            class="w-full p-2 border-b focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search()}
            onInput={(e) => setSearch(e.target.value)}
            autofocus
          />
          {filteredSuppliers().length > 0 ? (
            filteredSuppliers().map((s) => (
              <div
                key={s.id}
                class="p-2 hover:bg-blue-100 cursor-pointer"
                onClick={() => selectSupplier(s)}
              >
                {s.kode + " | " + s.nama}
              </div>
            ))
          ) : (
            <div class="p-2 text-gray-400">Supplier tidak ditemukan</div>
          )}
        </div>
      )}
    </div>
  );
}
