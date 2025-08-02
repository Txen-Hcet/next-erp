import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { onClickOutside } from "./OnClickOutside";

export default function FabricDropdownSearch({
  fabrics,
  item,
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

    console.log(fabrics())
  });

  const filteredFabrics = createMemo(() => {
    const q = search().toLowerCase();
    return fabrics().filter((f) => {
      const corak = (f.corak || "").toLowerCase();
      const konstruksi = (f.konstruksi || "").toLowerCase();
      return corak.includes(q) || konstruksi.includes(q);
    });
  });

  const selectedFabric = createMemo(() =>
    fabrics().find((f) => f.id == item.fabric_id)
  );

  const selectFabric = (fabric) => {
    onChange(fabric.id);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div class="relative" ref={dropdownRef}>
      <input type="hidden" name="fabric_id" value={item.fabric_id} />

      <button
        type="button"
        class={`w-full border p-2 rounded text-left ${
          disabled ? "bg-gray-200" : "bg-white"
        } cursor-default`}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen())}
      >
        {selectedFabric()
          ? `${selectedFabric().corak} | ${selectedFabric().konstruksi}`
          : "Pilih Jenis Kain"}
      </button>

      {isOpen() && !disabled && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari jenis/kode kain..."
            class="w-full p-2 border-b focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search()}
            onInput={(e) => setSearch(e.target.value)}
            autofocus
          />
          {filteredFabrics().length > 0 ? (
            filteredFabrics().map((f) => (
              <div
                key={f.id}
                class="p-2 hover:bg-blue-100 cursor-pointer"
                onClick={() => selectFabric(f)}
              >
                {f.corak} | {f.konstruksi}
              </div>
            ))
          ) : (
            <div class="p-2 text-gray-400">Jenis kain tidak ditemukan</div>
          )}
        </div>
      )}
    </div>
  );
}
