import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../../layouts/MainLayout";
import {
  getAllBeliGreigeOrders,
  getUser,
  softDeleteBeliGreigeOrder,
  hasPermission,
} from "../../../utils/auth";
import Swal from "sweetalert2";
import { Edit, Eye, Trash } from "lucide-solid";
import { formatCorak } from "../../../components/CorakKainList";
import SearchSortFilter from "../../../components/SearchSortFilter";

export default function BGPurchaseOrderList() {
  const [packingOrders, setPackingOrders] = createSignal([]);
  const [filtered, setFiltered] = createSignal([]);
  const navigate = useNavigate();
  const tokUser = getUser();
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  const totalPages = createMemo(() => {
    return Math.max(1, Math.ceil(filtered().length / pageSize));
  });

  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;
    return filtered().slice(startIndex, startIndex + pageSize);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus beli greige order?",
      text: `Apakah kamu yakin ingin menghapus beli greige order dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const deleteCustomer = await softDeleteBeliGreigeOrder(
          id,
          tokUser?.token
        );

        await Swal.fire({
          title: "Terhapus!",
          text: `Data beli greige order dengan ID ${id} berhasil dihapus.`,
          icon: "success",
          confirmButtonColor: "#6496df",
        });

        // Optional: update UI setelah hapus
        setPackingOrders(packingOrders().filter((s) => s.id !== id));
      } catch (error) {
        console.error(error);
        Swal.fire({
          title: "Gagal",
          text:
            error.message ||
            `Gagal menghapus data beli greige order dengan ID ${id}`,
          icon: "error",

          showConfirmButton: false,
          timer: 1000,
          timerProgressBar: true,
        });
      }
    }
  };

  // const handleGetAllPurchaseOrders = async (tok) => {
  //   const getDataPurchaseOrders = await getAllBeliGreigeOrders(tok);

  //   if (getDataPurchaseOrders.status === 200) {
  //     const sortedData = getDataPurchaseOrders.orders.sort(
  //       (a, b) => a.id - b.id
  //     );
  //     setPackingOrders(sortedData);
  //   }
  // };

  const handleGetAllPurchaseOrders = async (tok) => {
    const result = await getAllBeliGreigeOrders(tok);

    //console.log("Data All PO Greige: ", JSON.stringify(result, null, 2));

    if (result.status === 200) {
      const sortedData = result.orders.sort((a, b) => b.id - a.id);
      setPackingOrders(sortedData);
    } else if (result.status === 403) {
      await Swal.fire({
        title: "Tidak Ada Akses",
        text: "Anda tidak memiliki izin untuk melihat Purchase Order Greige",
        icon: "warning",
        confirmButtonColor: "#6496df",
      });
      navigate("/dashboard");
    } else {
      Swal.fire({
        title: "Gagal",
        text: result.message || "Gagal mengambil data Purchase Order Greige",
        icon: "error",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
    }
  };

  const qtyCounterbySystem = (po, satuanUnit) => {
    let total = 0;
    let terkirim = 0;

    switch (satuanUnit) {
      case "Meter": // Meter
        total = parseFloat(po.summary?.total_meter || 0);
        terkirim = parseFloat(po.summary?.total_meter_dalam_proses || 0);
        break;
      case "Yard": // Yard
        total = parseFloat(po.summary?.total_yard || 0);
        terkirim = parseFloat(po.summary?.total_yard_dalam_proses || 0);
        break;
      case "Kilogram": // Kilogram
        total = parseFloat(po.summary?.total_kilogram || 0);
        terkirim = parseFloat(po.summary?.total_kilogram_dalam_proses || 0);
        break;
      default:
        return "-";
    }

    const sisa = total - terkirim;

    // Kalau udah habis
    if (total > 0 && sisa <= total * 0.1) {
      return "SELESAI";
    }

    return `${sisa.toLocaleString("id-ID")} / ${total.toLocaleString("id-ID")}`;
  };

  function formatTanggalIndo(tanggalString) {
    const tanggal = new Date(tanggalString);
    const bulanIndo = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];

    const tanggalNum = tanggal.getDate();
    const bulan = bulanIndo[tanggal.getMonth()];
    const tahun = tanggal.getFullYear();

    return `${tanggalNum} ${bulan} ${tahun}`;
  }

  function CorakCell(props) {
    const maxShow = props.maxShow ?? 3;

    // Pastikan selalu berupa array & ambil unik
    const uniqCorak = () => {
      const raw = Array.isArray(props.items)
        ? props.items
        : props.items
          ? [props.items] // jaga-jaga kalau API kadang kirim object
          : [];

      const vals = raw
        .map(it => (it?.corak_kain ?? "").toString().trim())
        .filter(Boolean);

      return Array.from(new Set(vals)); // unik
    };

    const full = () => uniqCorak().join(", ");

    const display = () => {
      const u = uniqCorak();
      if (u.length === 0) return "-";
      if (u.length <= maxShow) return u.join(", ");
      return `${u.slice(0, maxShow).join(", ")} +${u.length - maxShow} lainnya`;
    };

    return (
      <span
        class="inline-block max-w-[260px] truncate align-middle"
        title={full()} // tooltip semua corak
      >
        {display()}
      </span>
    );
  }

  const handleFilterChange = ({ search, sortField, sortOrder, filter }) => {
    let data = [...packingOrders()];

    // Search/Filter berdasarkan kata kunci
    if (search) {
      const lowerSearch = search.toLowerCase();
      data = data.filter((po) => {
        // Cek di no_pc (No Pembelian)
        if (po.no_po?.toLowerCase().includes(lowerSearch)) return true;

        if (po.no_pc?.toLowerCase().includes(lowerSearch)) return true;
        
        // Cek di supplier_name
        if (po.supplier_name?.toLowerCase().includes(lowerSearch)) return true;
        
        // Cek di corak kain dari items
        if (po.items && Array.isArray(po.items)) {
          const hasMatchingCorak = po.items.some(item => 
            item.corak_kain?.toLowerCase().includes(lowerSearch)
          );
          if (hasMatchingCorak) return true;
        }
        
        return false;
      });
    }

    // Filter tambahan jika diperlukan (misal: berdasarkan satuan unit)
    if (filter) {
      data = data.filter((po) => {
        if (filter === "Meter") return po.satuan_unit_id === 1;
        if (filter === "Yard") return po.satuan_unit_id === 2;
        if (filter === "Kilogram") return po.satuan_unit_id === 3;
        return true;
      });
    }

    // Sorting
    if (sortField) {
      data.sort((a, b) => {
        let valA, valB;
        
        switch (sortField) {
          case "no_pc":
            valA = a.no_po;
            valB = b.no_po;
          case "no_pc":
            valA = a.no_pc;
            valB = b.no_pc;
            break;
          case "supplier":
            valA = a.supplier_name;
            valB = b.supplier_name;
            break;
          case "corak_kain":
            // Ambil corak kain pertama untuk sorting
            valA = a.items && a.items.length > 0 ? a.items[0].corak_kain : "";
            valB = b.items && b.items.length > 0 ? b.items[0].corak_kain : "";
            break;
          case "tanggal":
            valA = new Date(a.created_at);
            valB = new Date(b.created_at);
            break;
          default:
            valA = a[sortField];
            valB = b[sortField];
        }
        
        // Handle perbandingan untuk string dan date
        if (sortField === "tanggal") {
          return sortOrder === "asc" ? valA - valB : valB - valA;
        }
        
        valA = valA?.toString().toLowerCase() || "";
        valB = valB?.toString().toLowerCase() || "";
        
        return sortOrder === "asc" 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      });
    }

    setFiltered(data);
    setCurrentPage(1);
  };  

  createEffect(() => {
    if (tokUser?.token) {
      handleGetAllPurchaseOrders(tokUser?.token);
    }
  });

  createEffect(() => {
    setFiltered(packingOrders());
  });    

  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Daftar Order Beli Greige</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/beligreige-purchaseorder/form")}
        >
          + Tambah Order Beli Greige
        </button>
      </div>

      <SearchSortFilter
        sortOptions={[
          { label: "No PO", value: "no_po" },
          { label: "No PC", value: "no_pc" },
          { label: "Supplier", value: "supplier" },
          { label: "Corak Kain", value: "corak_kain" },
          { label: "Tanggal", value: "tanggal" },
        ]}
        filterOptions={[
          { label: "Semua Satuan", value: "" },
          { label: "Meter", value: "Meter" },
          { label: "Yard", value: "Yard" },
          { label: "Kilogram", value: "Kilogram" },
        ]}
        onChange={handleFilterChange}
        placeholder="Cari berdasarkan No PO, No PC, Supplier, atau Corak Kain..."
      />       

      <div class="w-full overflow-x-auto">
        <table class="w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">ID</th>
              <th class="py-2 px-2">No Order</th>
              <th class="py-2 px-2">No PC</th>
              <th class="py-2 px-2">Supplier</th>
              <th class="py-2 px-2">Corak Kain</th>
              <th class="py-2 px-2 text-center">
                <div>Qty by System</div>
                <span class="text-xs text-gray-500">
                  (Total - Total diproses / Total)
                </span>
              </th>
              <th class="py-2 px-2">Satuan Unit</th>
              <th class="py-2 px-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
          {paginatedData().length === 0 ? (
            <tr>
              <td colSpan="8" class="py-4 px-4 text-center text-gray-500">
                {packingOrders().length === 0 
                  ? "Tidak ada data Purchase Order" 
                  : "Data tidak ditemukan dengan filter yang diberikan"
                }
              </td>
            </tr>
          ) : (
            paginatedData().map((po, index) => (
              <tr class="border-b" key={po.id}>
                <td class="py-2 px-4">
                  {(currentPage() - 1) * pageSize + (index + 1)}
                </td>
                <td class="py-2 px-4">{po.no_po}</td>
                <td class="py-2 px-4">{po.no_pc}</td>
                <td class="py-2 px-4">{po.supplier_name}</td>
                <td class="py-2 px-4">
                  {(() => {
                    const { display, full } = formatCorak(po.items, { maxShow: 3 });
                    return (
                      <span
                        class="inline-block max-w-[260px] truncate align-middle"
                        title={full}
                      >
                        {display}
                      </span>
                    );
                  })()}
                </td>
                {/* <td class="py-2 px-4">{formatTanggalIndo(po.created_at)}</td> */}
                <td
                  className={`py-2 px-4 text-center ${
                    qtyCounterbySystem(po, po.satuan_unit_name) === "SELESAI"
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {qtyCounterbySystem(po, po.satuan_unit_name)}
                </td>
                <td class="py-2 px-4">{po.satuan_unit_name}</td>
                <td class="py-2 px-4 space-x-2">
                  <button
                    class="text-yellow-600 hover:underline"
                    onClick={() =>
                      navigate(`/beligreige-purchaseorder/form?id=${po.id}&view=true`)
                    }
                  >
                    <Eye size={25} />
                  </button>
                  {hasPermission("edit_purchase_greige_order") && (
                    <button
                      class="text-blue-600 hover:underline"
                      onClick={() =>
                        navigate(`/beligreige-purchaseorder/form?id=${po.id}`)
                      }
                    >
                      <Edit size={25} />
                    </button>
                  )}
                  {hasPermission("delete_purchase_greige_order") && (
                    <button
                      class="text-red-600 hover:underline"
                      onClick={() => handleDelete(po.id)}
                    >
                      <Trash size={25} />
                    </button>
                  )}
                </td>
              </tr>
            )))}
          </tbody>
        </table>
        <div class="w-full mt-8 flex justify-between space-x-2">
          <button
            class="px-3 py-1 bg-gray-200 rounded min-w-[80px]"
            onClick={() => setCurrentPage(currentPage() - 1)}
            disabled={currentPage() === 1}
          >
            Prev
          </button>
          <span>
            Page {currentPage()} of {totalPages()}
          </span>
          <button
            class="px-3 py-1 bg-gray-200 rounded min-w-[80px]"
            onClick={() => setCurrentPage(currentPage() + 1)}
            disabled={currentPage() === totalPages()}
          >
            Next
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
