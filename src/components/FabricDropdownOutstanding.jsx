import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { onClickOutside } from "./OnClickOutside";

export default function FabricDropdownOutstanding(props) {
  // Akses props sebagai function untuk reactivity
  const fabrics = () => props.fabrics;
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

  const filteredFabrics = createMemo(() => {
    const q = search().toLowerCase();
    const fabrs = fabrics();
    if (!Array.isArray(fabrs)) return [];
    return fabrs.filter((f) => {
      const corak_kain = (f.corak_kain || "").toLowerCase();
      const konstruksi_kain = (f.konstruksi_kain || "").toLowerCase();
      return corak_kain.includes(q) || konstruksi_kain.includes(q);
    });
  });

  // PERBAIKAN: Gunakan createMemo yang proper
  const selectedFabric = createMemo(() => {
    const val = value();
    const fabrs = fabrics();
    
    if (!val || !Array.isArray(fabrs)) return null;
    return fabrs.find((f) => f.id == val);
  });

  const selectFabric = (fabric) => {
    onChange(fabric.id);
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
        {selectedFabric() ? selectedFabric().corak_kain : "Pilih Kain"}
      </button>

      {isOpen() && !disabled() && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari kain..."
            class="w-full p-2 border-b focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search()}
            onInput={(e) => setSearch(e.target.value)}
            autofocus
          />
          {filteredFabrics().length > 0 ? (
            filteredFabrics().map((f) => (
              <div
                class="p-2 hover:bg-blue-100 cursor-pointer"
                onClick={() => selectFabric(f)}
              >
                {f.corak_kain + (f.konstruksi_kain ? " | " + f.konstruksi_kain : "")}
              </div>
            ))
          ) : (
            <div class="p-2 text-gray-400">Kain tidak ditemukan</div>
          )}
        </div>
      )}
    </div>
  );
}