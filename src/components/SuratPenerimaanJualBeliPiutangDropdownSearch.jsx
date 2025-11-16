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

export default function SuratPenerimaanJualBeliPiutangDropdownSearch(props) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");
  let dropdownRef;

  createEffect(() => {
    if (!dropdownRef) return;
    onClickOutside(dropdownRef, () => setIsOpen(false));
  });

  // Filter hanya surat penerimaan yang memiliki sisa utang per SJ > 0
  const filteredItems = createMemo(() => {
    const q = search().toLowerCase();
    return props.items.filter((sj) => {
      const noSj = (sj.no_sj || "").toLowerCase();
      const supplier = (sj.supplier_name || sj.supplier || "").toLowerCase();
      const customer = (sj.customer_name || sj.customer || "").toLowerCase();
      const tgl = formatSimpleDate(sj.tanggal_surat_jalan || sj.created_at).toLowerCase();
      
      // Filter berdasarkan pencarian DAN sisa utang per SJ > 0
      const matchesSearch = noSj.includes(q) || supplier.includes(q) || customer.includes(q) || tgl.includes(q);
      const hasRemainingDebt = (sj.sisa_utang_per_sj || 0) > 0;
      
      return matchesSearch && hasRemainingDebt;
    });
  });

  const selectedItem = createMemo(() => {
    return props.items.find((sj) => sj.id === props.value) || null;
  });

  const labelOf = (sj) => {
    const noSurat = sj?.no_sj || "-";
    const supplier = sj?.supplier_name || sj?.supplier || "-";
    const customer = sj?.customer_name || sj?.customer || "-";
    const tanggal = formatSimpleDate(sj?.tanggal_surat_jalan || sj?.created_at);
    
    return `${noSurat} - ${supplier} - ${customer} (${tanggal})`;
  };

  const handleSelect = (sj) => {
    setIsOpen(false);
    setSearch("");
    props.onChange?.(sj);
  };

  return (
    <div class="relative" ref={dropdownRef}>
      <button
        type="button"
        class="w-full border p-2 rounded text-left bg-transparent disabled:bg-gray-200"
        onClick={() => setIsOpen(!isOpen())}
        disabled={props.disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen()}
      >
        <span class="block whitespace-nowrap overflow-hidden text-ellipsis">
          {selectedItem()
            ? labelOf(selectedItem())
            : (props.placeholder || "Pilih Surat Penerimaan")}
        </span>
      </button>

      {isOpen() && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow-lg max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari No. SJ / Supplier / Customer / Tanggal…"
            class="w-full p-2 border-b sticky top-0"
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            autofocus
          />
          {filteredItems().length > 0 ? (
            filteredItems().map((sj) => (
              <div
                class="p-2 hover:bg-blue-100 cursor-pointer"
                onClick={() => handleSelect(sj)}
              >
                <div class="whitespace-nowrap overflow-hidden text-ellipsis font-medium">
                  {sj.no_sj} - {sj.supplier_name || sj.supplier} - {sj.customer_name || sj.customer} ({formatSimpleDate(sj.tanggal_surat_jalan || sj.created_at)})
                </div>
                <div class="text-sm text-gray-600 mt-1">
                  Format: No SP JB - Supplier - Customer
                </div>
              </div>
            ))
          ) : (
            <div class="p-2 text-gray-400">
              {props.items.length === 0 
                ? "Sedang memuat data..." 
                : "Tidak ada surat penerimaan dengan sisa utang"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}