import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { onClickOutside } from "./OnClickOutside";

export default function CustomerDropdownSearch({
  customersList, // Ini adalah signal, bukan array langsung
  form,
  setForm,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");

  let dropdownRef;

  createEffect(() => {
    if (!dropdownRef) return;

    const cleanup = onClickOutside(dropdownRef, () => {
      setIsOpen(false);
    });

    onCleanup(cleanup);
  });

  const filteredCustomers = createMemo(() => {
    const q = search().toLowerCase();

    // Panggil customersList() di sini
    return customersList().filter((c) => {
      const kode = c.kode?.toLowerCase() || "";
      const nama = c.nama?.toLowerCase() || "";
      return kode.includes(q) || nama.includes(q);
    });
  });

  const selectedCustomer = createMemo(() =>
    // Panggil customersList() di sini
    customersList().find((c) => c.id == form().customer_id)
  );

  const selectCustomer = (cust) => {
    setForm({ ...form(), customer_id: cust.id });
    setIsOpen(false);
    setSearch(""); // reset search input after selection
  };

  return (
    <div class="relative" ref={dropdownRef}>
      <button
        type="button"
        class={`w-full border p-2 rounded text-left ${
          disabled ? "bg-gray-200" : "bg-transparent"
        } cursor-default`}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen())}
      >
        {selectedCustomer()
          ? `${selectedCustomer().kode} - ${selectedCustomer().nama}`
          : "Pilih Customer"}
      </button>

      {isOpen() && !disabled && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari customer..."
            class="w-full p-2 border-b focus:outline-none focus:ring-2 focus:ring-blue-500" // Tambahan styling fokus
            value={search()}
            onInput={(e) => setSearch(e.target.value)}
            autofocus
          />
          {filteredCustomers().length > 0 ? (
            filteredCustomers().map((cust) => (
              <div
                key={cust.id} // Sangat penting menambahkan key di sini
                class="p-2 hover:bg-blue-100 cursor-pointer"
                onClick={() => selectCustomer(cust)}
              >
                {cust.kode} - {cust.nama}
              </div>
            ))
          ) : (
            <div class="p-2 text-gray-400">Customer tidak ditemukan</div>
          )}
        </div>
      )}
    </div>
  );
}
