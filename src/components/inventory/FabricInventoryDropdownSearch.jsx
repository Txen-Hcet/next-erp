import {
  createSignal,
  createMemo,
  createEffect,
  onCleanup,
} from "solid-js";
import { onClickOutside } from "../OnClickOutside";

// HAPUS destructuring di sini. Gunakan 'props'
export default function FabricInventoryDropdownSearch(props) {
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
    // Gunakan props.fabrics()
    return props.fabrics().filter((f) => {
      const corak = (f.corak || "").toLowerCase();
      const konstruksi = (f.konstruksi || "").toLowerCase();
      return corak.includes(q) || konstruksi.includes(q);
    });
  });

  // PERBAIKAN UTAMA: Gunakan props.item.fabric_id
  const selectedFabric = createMemo(() => {
    // Safety check jika props.item belum ada
    if (!props.item) return undefined;
    
    // Akses props.item secara langsung agar reaktif
    return props.fabrics().find((f) => f.id == props.item.fabric_id);
  });

  const selectFabric = (fabric) => {
    // Gunakan props.onChange
    props.onChange(fabric.id);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div class="relative" ref={dropdownRef}>
      {/* Gunakan props.item */}
      <input type="hidden" name="fabric_id" value={props.item?.fabric_id} />

      <button
        type="button"
        class={`w-full border p-2 rounded text-left ${
          props.disabled ? "bg-gray-200" : "bg-transparent"
        } cursor-default`}
        disabled={props.disabled}
        onClick={() => !props.disabled && setIsOpen(!isOpen())}
      >
        {/* selectedFabric() akan otomatis update karena props.item dilacak di memo */}
        {selectedFabric()
          ? `${selectedFabric().corak} | ${selectedFabric().konstruksi}`
          : "Pilih Jenis Kain"}
      </button>

      {isOpen() && !props.disabled && (
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