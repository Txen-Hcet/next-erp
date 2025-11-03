import { createSignal } from "solid-js";

export default function useSimpleFilter(dataSource, searchFields = []) {
  const [filteredData, setFilteredData] = createSignal([]);

  const applyFilter = ({ search, sortField, sortOrder, filter }) => {
    let list = [...dataSource()];

    // Search multi-field
    if (search && searchFields.length > 0) {
      list = list.filter((item) =>
        searchFields.some((field) =>
          item[field]?.toString().toLowerCase().includes(search.toLowerCase())
        )
      );
    }

    // Filter
    if (filter) {
      if (filter === "NON_PT") {
        // Exclude PT
        list = list.filter(
          (item) => !Object.values(item).join(" ").toLowerCase().includes("pt")
        );
      } else {
        // Normal filter
        list = list.filter((item) =>
          Object.values(item)
            .join(" ")
            .toLowerCase()
            .includes(filter.toLowerCase())
        );
      }
    }

    // Sort
    if (sortField) {
      list.sort((a, b) => {
        const A = a[sortField]?.toString().toLowerCase();
        const B = b[sortField]?.toString().toLowerCase();
        return sortOrder === "asc" ? A.localeCompare(B) : B.localeCompare(A);
      });
    }

    setFilteredData(list);
  };

  return { filteredData, applyFilter };
}
