import {
  createSignal,
  createMemo,
  createEffect,
  onCleanup,
  onMount,
} from "solid-js";
import { onClickOutside } from "./OnClickOutside";

export default function GradeDropdownSearch({
  grades,
  item,
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

  const filteredGrades = createMemo(() => {
    const q = search().toLowerCase();
    return grades().filter((f) => {
      const grade = (f.grade || "").toLowerCase();
      return grade.includes(q);
    });
  });

  const selectedColor = createMemo(() =>
    grades().find((s) => s.id == item.grade_id)
  );

  const selectColor = (grade) => {
    setIsOpen(false);
    setSearch("");
    onChange && onChange(grade.id);
  };

  return (
    <div class="relative w-20" ref={dropdownRef}>
      <input type="hidden" name="grade_id" value={item.grade_id} />

      <button
        type="button"
        class={`w-full border p-2 rounded text-center ${
          disabled ? "bg-gray-200" : "bg-transparent"
        } cursor-default`}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen())}
      >
        {selectedColor()?.grade || "Pilih Grade..."}
      </button>

      {isOpen() && !disabled && (
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
                class="p-2 hover:bg-blue-100 cursor-pointer text-center"
                onClick={() => selectColor(s)}
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
