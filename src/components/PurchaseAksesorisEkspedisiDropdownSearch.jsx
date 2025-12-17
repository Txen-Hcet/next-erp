import { createSignal, createMemo, createEffect } from "solid-js";
import { onClickOutside } from "./OnClickOutside.jsx";

/* === Helpers === */
function formatSimpleDate(dateString) {
  if (!dateString) return "-";
  const d = new Date(dateString);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
}

function formatIDR(amount) {
  if (amount === null || amount === undefined) amount = 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
/* === End Helpers === */

export default function PurchaseAksesorisEkspedisiDropdownSearch(props) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");
  let dropdownRef;

  createEffect(() => {
    if (!dropdownRef) return;
    onClickOutside(dropdownRef, () => setIsOpen(false));
  });

  const filteredItems = createMemo(() => {
    const q = search().toLowerCase();
    const list = Array.isArray(props.items) ? props.items : [];
    const isEditMode = props.isEdit ?? false;
    const isViewMode = props.isView ?? false;
    const currentValue = props.value;

    if (list.length === 0) return [];

    return list
      .filter((item) => {
        // Pencarian
        const noPembelian = (item.no_pembelian || "").toLowerCase();
        const noSjSupp = (item.no_sj_supplier || "").toLowerCase();
        const supplier = (item.supplier_name || "").toLowerCase();
        const tgl = formatSimpleDate(item.tanggal_sj).toLowerCase();
        const fields = [noPembelian, noSjSupp, supplier, tgl];
        const matchesSearch = fields.some((f) => f.includes(q));

        if (!matchesSearch) return false;

        // Filter sisa utang
        const sisaUtang = item.sisa_utang_per_sj || 0;
        const hasRemainingDebt = sisaUtang > 0;
        const isSelected = item.id == currentValue;

        // Jika ini adalah item yang dipilih dalam mode edit/view, tampilkan
        if ((isEditMode || isViewMode) && isSelected) {
          return true;
        }

        // Untuk mode tambah baru, hanya tampilkan yang sisa utang > 0
        return hasRemainingDebt;
      });
  });

  const selectedItem = createMemo(() => {
    if (!Array.isArray(props.items)) return null;
    return props.items.find((item) => item.id == props.value) || null;
  });

  const labelOf = (item) => {
    if (!item) return "";
    const noPembelian = item.no_pembelian || "-";
    const noSjSupp = item.no_sj_supplier || "-";
    const supplier = item.supplier_name || "-";
    const tanggal = formatSimpleDate(item.tanggal_sj);
    
    return `${noPembelian} - ${noSjSupp} - ${supplier} (${tanggal})`;
  };

  const handleSelect = (item) => {
    setIsOpen(false);
    setSearch("");
    props.onChange?.(item);
  };

  const placeholder = props.placeholder || "Pilih Pembelian Aksesoris/Ekspedisi";

  return (
    <div class="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        class="w-full border p-2 rounded text-left bg-transparent disabled:bg-gray-200"
        onClick={() => setIsOpen(!isOpen())}
        disabled={props.disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen()}
      >
        {selectedItem() ? labelOf(selectedItem()) : placeholder}
      </button>

      {isOpen() && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow-lg max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari No. Pembelian / No. SJ Supplier / Supplier / Tanggal…"
            class="w-full p-2 border-b sticky top-0"
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            autofocus
          />
          {filteredItems().length > 0 ? (
            filteredItems().map((item) => (
              <div
                class="p-2 hover:bg-blue-100 cursor-pointer"
                onClick={() => handleSelect(item)}
              >
                <div class="font-medium">
                  {item.no_pembelian} - {item.no_sj_supplier || "-"} - {item.supplier_name} ({formatSimpleDate(item.tanggal_sj)})
                </div>
              </div>
            ))
          ) : (
            <div class="p-2 text-gray-400">
              {props.items.length === 0 
                ? "Sedang memuat data..." 
                : "Tidak ada data yang sesuai"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}