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
/* === End Helpers === */

export default function SuratJalanDropdownSearch(props) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");
  let dropdownRef;

  createEffect(() => {
    if (!dropdownRef) return;
    onClickOutside(dropdownRef, () => setIsOpen(false));
  });

  const excludeFullyReturned = () => Boolean(props.excludeFullyReturned);

  // hanya tampilkan yang delivered_status == 1 (+ optional: belum full returned)
  const baseItems = createMemo(() => {
    const list = Array.isArray(props.items) ? props.items : [];
    const delivered = list.filter((sj) => Number(sj?.delivered_status) === 1);
    return props.excludeFullyReturned
      ? delivered.filter((sj) => !sj.__fully_returned__)
      : delivered;
  });

  const filteredItems = createMemo(() => {
    const q = search().toLowerCase();
    return baseItems().filter((sj) => {
      const noSj = (sj.no_sj || "").toLowerCase();
      const cust = (sj.customer_name || sj.customer || "").toLowerCase();
      const tgl = formatSimpleDate(sj.tanggal_surat_jalan || sj.created_at).toLowerCase();
      return noSj.includes(q) || cust.includes(q) || tgl.includes(q);
    });
  });

  const selectedItem = createMemo(() => {
    if (!Array.isArray(props.items)) return null;
    return baseItems().find((sj) => sj.id === props.value) || null;
  });

  const labelOf = (sj) => {
    const noSurat = sj?.no_sj || "-";
    const customer = sj?.customer_name || sj?.customer || "-";
    const tanggal = formatSimpleDate(sj?.tanggal_surat_jalan || sj?.created_at);
    return `${noSurat} - ${customer} (${tanggal})`;
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
            : (props.placeholder || "Pilih Surat Jalan")}
        </span>
      </button>

      {isOpen() && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow-lg max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari No. SJ / Customer / Tanggal…"
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
                  {labelOf(sj)}
                </div>
              </div>
            ))
          ) : (
            <div class="p-2 text-gray-400">Surat Jalan tidak ditemukan</div>
          )}
        </div>
      )}
    </div>
  );
}
