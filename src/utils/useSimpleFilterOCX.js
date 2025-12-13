import { createSignal } from "solid-js";

export default function useSimpleFilterOCX(dataSource, searchFields = []) {
  const [filteredData, setFilteredData] = createSignal([]);

  const applyFilter = ({ search, sortField, sortOrder, filter }) => {
    let list = [...dataSource()];

    // Search multi-field
    if (search && searchFields.length > 0) {
      const searchLower = search.toLowerCase();
      list = list.filter((item) =>
        searchFields.some((field) => {
          // Jika field adalah 'items', cari di dalam array items untuk corak kain
          if (field === 'items') {
            if (item.items && Array.isArray(item.items)) {
              return item.items.some(i => 
                i.corak_kain && i.corak_kain.toLowerCase().includes(searchLower)
              );
            }
            return false;
          }
          
          const value = item[field];
          if (value === undefined || value === null) return false;
          return value.toString().toLowerCase().includes(searchLower);
        })
      );
    }

    // Filter khusus untuk berbagai jenis filter
    if (filter) {
      // Filter untuk satuan unit (1 = Meter, 2 = Yard)
      if (filter === "1" || filter === "2") {
        list = list.filter((item) => 
          item.satuan_unit_id && item.satuan_unit_id.toString() === filter
        );
      }
      // Filter untuk OCX Pajak (P) dan Non-Pajak (N)
      else if (filter === "/P/" || filter === "/N/") {
        list = list.filter((item) => 
          item.no_po_ex && item.no_po_ex.includes(filter)
        );
      }
      // Filter untuk Supplier (PT atau CV)
      else if (filter === "PT" || filter === "CV") {
        list = list.filter((item) => 
          item.nama_supplier && item.nama_supplier.includes(filter)
        );
      }
      // Filter untuk NON_PT (exclude PT)
      else if (filter === "NON_PT") {
        list = list.filter((item) => 
          !item.nama_supplier || !item.nama_supplier.includes("PT")
        );
      }
      // Filter umum (cari di semua field)
      else {
        const filterLower = filter.toLowerCase();
        list = list.filter((item) =>
          Object.values(item)
            .join(" ")
            .toLowerCase()
            .includes(filterLower)
        );
      }
    }

    // Sort
    if (sortField) {
      list.sort((a, b) => {
        const A = a[sortField]?.toString().toLowerCase();
        const B = b[sortField]?.toString().toLowerCase();
        
        // Handle sorting untuk satuan_unit_id (numerik)
        if (sortField === 'satuan_unit_id') {
          const numA = parseInt(A) || 0;
          const numB = parseInt(B) || 0;
          return sortOrder === "asc" ? numA - numB : numB - numA;
        }
        
        // Sorting string
        return sortOrder === "asc" ? A.localeCompare(B) : B.localeCompare(A);
      });
    }

    setFilteredData(list);
  };

  return { filteredData, applyFilter };
}