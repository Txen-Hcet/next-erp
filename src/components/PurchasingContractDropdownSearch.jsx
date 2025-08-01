import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { onClickOutside } from "./OnClickOutside";

export default function PurchaseContractDropdownSearch({
  purchaseContracts, // array of contracts
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

  const filteredContracts = createMemo(() => {
    const q = search().toLowerCase();
    return purchaseContracts().filter((p) => {
      const no_pc = (p.no_pc || "").toLowerCase();
      return no_pc.includes(q) || kode.includes(q);
    });
  });

  const selectedContract = createMemo(() =>
    purchaseContracts().find((p) => p.id == form().pc_id)
  );

  const selectContract = (contract) => {
    setForm({ ...form(), jenis_po_id: contract.id });
    setIsOpen(false);
    setSearch("");
    if (onChange) onChange(contract.id);
  };

  return (
    <div class="relative" ref={dropdownRef}>
      <button
        type="button"
        class={`w-full border p-2 rounded text-left ${
          disabled ? "bg-gray-200" : "bg-white/10"
        } cursor-default`}
        onClick={() => setIsOpen(!isOpen())}
      >
        {selectedContract()
          ? `${selectedContract().no_pc}`
          : "Pilih Purchase Contract"}
      </button>

      {isOpen() && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari Purchase Contract..."
            class="w-full p-2 border-b focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search()}
            onInput={(e) => setSearch(e.target.value)}
            autofocus
          />
          {filteredContracts().length > 0 ? (
            filteredContracts().map((p) => (
              <div
                key={p.id}
                class="p-2 hover:bg-blue-100 cursor-pointer"
                onClick={() => selectContract(p)}
              >
                {p.no_pc}
              </div>
            ))
          ) : (
            <div class="p-2 text-gray-400">
              Purchase Contract tidak ditemukan
            </div>
          )}
        </div>
      )}
    </div>
  );
}
