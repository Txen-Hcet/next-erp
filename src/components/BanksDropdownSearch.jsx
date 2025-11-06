import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { onClickOutside } from "./OnClickOutside.jsx";

export default function BanksDropdownSearch({
  options,
  banks,
  form,
  setForm,
  onChange,
  disabled = false,
  valueKey = "bank_id",
  placeholder = "Pilih Bank",
}) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");
  let dropdownRef;

  createEffect(() => {
    if (!dropdownRef) return;
    const cleanup = onClickOutside(dropdownRef, () => setIsOpen(false));
    onCleanup(cleanup);
  });

  const list = createMemo(() => {
    // Prioritaskan options, lalu banks
    if (typeof options === "function") {
      const maybe = options();
      return Array.isArray(maybe) ? maybe : [];
    }
    if (Array.isArray(options)) {
      return options;
    }

    if (typeof banks === "function") {
      const maybe = banks();
      return Array.isArray(maybe) ? maybe : [];
    }
    if (Array.isArray(banks)) {
      return banks;
    }

    return [];
  });

  const filtered = createMemo(() => {
    const q = search().trim().toLowerCase();
    if (!q) return list();
    return list().filter((b) => {
      const name = (b.name || b.bank_name || "").toLowerCase();
      const id = String(b.id || "").toLowerCase();
      const kode = (b.kode || "").toLowerCase();
      const bank_number = (b.bank_number || "").toLowerCase();
      
      return name.includes(q) || id.includes(q) || kode.includes(q) || bank_number.includes(q);
    });
  });

  const selected = createMemo(() =>
    list().find((b) => String(b.id) === String(form()?.[valueKey]))
  );

  const setFormSafe = (key, val) => {
    try {
      setForm((prev) => ({ ...(prev || {}), [key]: val }));
    } catch (e) {
      try {
        setForm({ ...(form() || {}), [key]: val });
      } catch (err) {
        console.error("BanksDropdownSearch: setForm failed", err);
      }
    }
  };

  const getBankDisplayText = (bank) => {
    if (!bank) return "";
    
    // Gunakan name atau bank_name (handle kedua kemungkinan)
    const bankName = bank.name || bank.bank_name || "";
    
    // Tampilkan dengan bank_number jika ada
    return bank.bank_number 
      ? `${bankName} - ${bank.bank_number}`
      : bankName;
  };

  const selectItem = (item) => {
    if (disabled) return;
    setFormSafe(valueKey, item.id);
    setIsOpen(false);
    setSearch("");
    onChange && onChange(item);
  };

  return (
    <div class="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        class="w-full border p-2 rounded text-left disabled:bg-gray-200"
        onClick={() => !disabled && setIsOpen(!isOpen())}
        disabled={disabled}
      >
        <span class="block whitespace-nowrap overflow-hidden text-ellipsis">
          {selected() ? getBankDisplayText(selected()) : placeholder}
        </span>
      </button>

      {isOpen() && !disabled && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder={`Cari ${placeholder.toLowerCase()}…`}
            class="w-full p-2 border-b focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            autofocus
          />

          {filtered().length > 0 ? (
            filtered().map((b) => (
              <div
                class="p-2 hover:bg-blue-100 cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis"
                onClick={() => selectItem(b)}
              >
                {getBankDisplayText(b)}
              </div>
            ))
          ) : (
            <div class="p-2 text-gray-400">{placeholder} tidak ditemukan</div>
          )}
        </div>
      )}
    </div>
  );
}