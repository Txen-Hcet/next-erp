import { createSignal } from "solid-js";

export default function SearchSortFilter(props) {
  const [search, setSearch] = createSignal("");
  const [sortField, setSortField] = createSignal("");
  const [sortOrder, setSortOrder] = createSignal("asc");
  const [filter, setFilter] = createSignal("");

  const handleChange = () => {
    // Cari filter option yang sesuai dengan value yang dipilih
    const selectedFilterOption = props.filterOptions?.find(
      (opt) => opt.value === filter()
    );
    
    props.onChange({
      search: search(),
      sortField: sortField(),
      sortOrder: sortOrder(),
      filter: filter(),
      filterType: selectedFilterOption?.type // Kirim type juga
    });
  };

  return (
    <div class="flex flex-wrap gap-3 mb-4 bg-white p-4 rounded shadow">
      {/* Search */}
      <input
        type="text"
        placeholder="Cari..."
        class="border px-3 py-2 rounded w-full sm:w-1/3"
        onInput={(e) => {
          setSearch(e.target.value);
          handleChange();
        }}
      />

      {/* Sort Field */}
      <select
        class="border px-3 py-2 rounded"
        onChange={(e) => {
          setSortField(e.target.value);
          handleChange();
        }}
      >
        <option value="">Sort By</option>
        {props.sortOptions?.map((opt) => (
          <option value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* Sort Order */}
      <select
        class="border px-3 py-2 rounded"
        onChange={(e) => {
          setSortOrder(e.target.value);
          handleChange();
        }}
      >
        <option value="asc">ASC</option>
        <option value="desc">DESC</option>
      </select>

      {/* Filter */}
      <select
        class="border px-3 py-2 rounded"
        onChange={(e) => {
          setFilter(e.target.value);
          handleChange();
        }}
      >
        <option value="">Filter</option>
        {props.filterOptions?.map((opt) => (
          <option value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}