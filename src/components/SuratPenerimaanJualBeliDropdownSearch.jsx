import { createSignal, createMemo, createEffect } from "solid-js";
import { onClickOutside } from "./OnClickOutside.jsx";

/* ===== Helpers ===== */
const formatSimpleDate = (s) => {
  if (!s) return "-";
  const d = new Date(s);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
};

// robust cek “sudah terbit invoice”
const isDelivered = (row) => {
  const v =
    row?.delivered_status ??
    row?.status_invoice ??
    row?.invoiced ??
    row?.is_invoiced ??
    0;
  if (typeof v === "string") return v === "1" || v.toLowerCase() === "true";
  if (typeof v === "number") return v === 1;
  return !!v;
};

// optional lots (kalau kamu mau tampilkan lot; default tidak dipakai)
const lotsOf = (sj) => {
  const items = Array.isArray(sj?.items) ? sj.items : [];
  const lots = [
    ...new Set(
      items
        .map((it) => it?.lot ?? it?.no_lot ?? it?.lot_no)
        .filter(Boolean)
        .map(String)
    ),
  ];
  if (lots.length === 0) return "-";
  return lots.length <= 3
    ? lots.join(", ")
    : `${lots.slice(0, 3).join(", ")} +${lots.length - 3}`;
};
/* ==================== */

export default function SuratPenerimaanJualBeliDropdownSearch(props) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");
  let dropdownRef;

  // default JB: wajib sudah invoice
  const requireDelivered = props.requireDelivered ?? true;
  const excludeReturned = props.excludeReturned ?? false;
  const excludeZeroAvailable = props.excludeZeroAvailable ?? false;
  const showLots = () => Boolean(props.showLots); // off by default

  createEffect(() => {
    if (!dropdownRef) return;
    onClickOutside(dropdownRef, () => setIsOpen(false));
  });

  // Base list: filter invoiced & (optional) belum retur
  const baseItems = createMemo(() => {
    const list = Array.isArray(props.items) ? props.items : [];
    return list.filter((sj) => {
      if (requireDelivered && !isDelivered(sj)) return false;
      if (excludeReturned && sj?.returned_at) return false;

      // penting: buang yang sisa = 0 (mengandalkan field __available_total__)
      if (excludeZeroAvailable) {
        const total = Number(sj?.__available_total__ ?? Infinity);
        if (!Number.isFinite(total) ? false : total <= 0) return false;
      }
      return true;
    });
  });

  const filteredItems = createMemo(() => {
    const q = search().toLowerCase();
    return baseItems().filter((sj) => {
      const noSj = (sj.no_sj || "").toLowerCase();
      const noSupp = (sj.no_sj_supplier || "").toLowerCase();
      const supplier = (sj.supplier_name || sj.supplier || "").toLowerCase();
      const tgl = formatSimpleDate(sj.tanggal_kirim || sj.created_at).toLowerCase();
      const fields = [noSj, noSupp, supplier, tgl];

      if (showLots()) {
        fields.push(lotsOf(sj).toLowerCase());
      }
      return fields.some((f) => f.includes(q));
    });
  });

  const selectedItem = createMemo(() => {
    if (!Array.isArray(props.items)) return null;
    // cari di baseItems biar yang belum invoiced tidak bisa “terseleksi”
    return baseItems().find((sj) => sj.id === props.value) || null;
  });

  const labelOf = (sj) => {
    const noSurat = sj?.no_sj || "-";
    const noSupp = sj?.no_sj_supplier || "-";
    const supplier = sj?.supplier_name || sj?.supplier || "-";
    const tanggal = formatSimpleDate(sj?.tanggal_kirim || sj?.created_at);

    if (showLots()) {
      return `${noSurat} - ${noSupp} - ${lotsOf(sj)} - ${supplier} (${tanggal})`;
    }
    return `${noSurat} - ${noSupp} - ${supplier} (${tanggal})`;
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
            : (props.placeholder || "Pilih Surat Penerimaan…")}
        </span>
      </button>

      {isOpen() && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow-lg max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder={
              showLots()
                ? "Cari No. SJ / No. SJ Supplier / Lot / Supplier / Tanggal…"
                : "Cari No. SJ / No. SJ Supplier / Supplier / Tanggal…"
            }
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
                {/* <div class="text-xs text-green-700 mt-0.5">Invoiced ✅</div> */}
              </div>
            ))
          ) : (
            <div class="p-2 text-gray-400">Surat Penerimaan tidak ditemukan</div>
          )}
        </div>
      )}
    </div>
  );
}
