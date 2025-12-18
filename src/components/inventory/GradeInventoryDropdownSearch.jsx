import {
  createSignal,
  createMemo,
  createEffect,
  onCleanup,
} from "solid-js";
import { onClickOutside } from "../OnClickOutside";

export default function GradeInventoryDropdownSearch(props) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");
  let dropdownRef;

  createEffect(() => {
    if (!dropdownRef) return;
    const cleanup = onClickOutside(dropdownRef, () => setIsOpen(false));
    onCleanup(cleanup);
  });

  const filteredGrades = createMemo(() => {
    const q = search().toLowerCase();
    // Gunakan props.grades()
    return props.grades().filter((f) => {
      const grade = (f.grade || "").toLowerCase();
      return grade.includes(q);
    });
  });

  // Gunakan props.item.grade_id secara langsung agar reaktif
  const selectedGrade = createMemo(() => {
    if (!props.item) return undefined;
    // Pastikan menggunakan '==' untuk mencocokkan string/number
    return props.grades().find((s) => s.id == props.item.grade_id);
  });

  const selectGrade = (grade) => {
    setIsOpen(false);
    setSearch("");
    props.onChange && props.onChange(grade.id);
  };

  return (
    // PERBAIKAN: Mengubah w-20 menjadi w-full agar selebar field lain
    <div class="relative w-full" ref={dropdownRef}>
      <input type="hidden" name="grade_id" value={props.item?.grade_id} />

      <button
        type="button"
        // PERBAIKAN: text-center diubah jadi text-left biar seragam dengan dropdown kain/warna
        class={`w-full border p-2 rounded text-left ${
          props.disabled ? "bg-gray-200" : "bg-transparent"
        } cursor-default`}
        disabled={props.disabled}
        onClick={() => !props.disabled && setIsOpen(!isOpen())}
      >
        {selectedGrade()?.grade || "Pilih Grade..."}
      </button>

      {isOpen() && !props.disabled && (
        <div class="absolute z-10 w-full bg-white border mt-1 rounded shadow max-h-64 overflow-y-auto">
          <input
            type="text"
            placeholder="Cari Grade..."
            class="w-full p-2 border-b focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search()}
            onInput={(e) => setSearch(e.target.value)}
            autofocus
          />
          {filteredGrades().length > 0 ? (
            filteredGrades().map((s) => (
              <div
                key={s.id}
                // PERBAIKAN: text-center dihapus/diubah default text-left
                class="p-2 hover:bg-blue-100 cursor-pointer"
                onClick={() => selectGrade(s)}
              >
                {s.grade}
              </div>
            ))
          ) : (
            <div class="p-2 text-gray-400">Grade tidak ditemukan</div>
          )}
        </div>
      )}
    </div>
  );
}