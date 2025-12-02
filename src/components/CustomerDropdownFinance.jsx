import { createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { onClickOutside } from "./OnClickOutside";
import { getAllCustomers, getUser } from "../utils/auth";

export default function CustomerDropdownFinance(props) {
  const value = () => props.value;
  const onChange = (selected) => props.onChange(selected);
  const disabled = () => props.disabled || false;

  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");
  const [customers, setCustomers] = createSignal([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");

  let dropdownRef;

  createEffect(() => {
    if (!dropdownRef) return;
    const cleanup = onClickOutside(dropdownRef, () => setIsOpen(false));
    onCleanup(cleanup);
  });

  // Fetch customers when dropdown opens
  createEffect(() => {
    if (isOpen() && customers().length === 0) {
      fetchCustomers();
    }
  });

  const fetchCustomers = async () => {
    setLoading(true);
    setError("");
    try {
      // Check if user is authenticated
      const user = getUser();
      if (!user || !user.token) {
        setError("Silakan login terlebih dahulu");
        setCustomers([]);
        return;
      }

      // Use the imported getAllCustomers function
      const response = await getAllCustomers(user.token);
      
      // Extract customers array from response
      const data = response.customers || [];
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      
      // Handle specific error messages
      if (error.message.includes("Invalid or expired token")) {
        setError("Sesi telah berakhir, silakan login ulang");
      } else if (error.message.includes("403") || error.message.includes("Forbidden")) {
        setError("Akses ditolak, tidak memiliki izin");
      } else {
        setError("Gagal memuat data customer");
      }
      
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = createMemo(() => {
    const q = search().toLowerCase();
    const custs = customers();
    if (!Array.isArray(custs)) return [];
    
    if (!q) return custs;
    
    return custs.filter((c) => {
      const nama = (c.nama || "").toLowerCase();
      const kode = (c.kode || "").toLowerCase();
      return nama.includes(q) || kode.includes(q);
    });
  });

  const selectedCustomer = createMemo(() => {
    const val = value();
    const custs = customers();
    
    if (!val || !Array.isArray(custs)) return null;
    return custs.find((c) => c.id == val);
  });

  const selectCustomer = (customer) => {
    onChange(customer.id);
    setIsOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    onChange(null);
    setSearch("");
  };

  const handleRetry = () => {
    setError("");
    fetchCustomers();
  };

  return (
    <div class="relative" ref={dropdownRef}>
      <div class="flex gap-2">
        <div class="flex-1">
          <button
            type="button"
            class={`w-full border border-gray-300 p-2 rounded text-left ${
              disabled() ? "bg-gray-200" : "bg-white hover:bg-gray-50"
            } cursor-default flex justify-between items-center`}
            disabled={disabled()}
            onClick={() => !disabled() && setIsOpen(!isOpen())}
          >
            <span class="truncate">
              {selectedCustomer() 
                ? `${selectedCustomer().nama}${selectedCustomer().kode ? ` (${selectedCustomer().kode})` : ''}`
                : "Pilih Customer"
              }
            </span>
            <svg class="w-4 h-4 ml-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        {selectedCustomer() && (
          <button
            type="button"
            class="px-3 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
            onClick={handleClear}
            disabled={disabled()}
          >
            Hapus
          </button>
        )}
      </div>

      {isOpen() && !disabled() && (
        <div class="absolute z-10 w-full bg-white border border-gray-300 mt-1 rounded shadow-lg max-h-64 overflow-y-auto">
          <div class="p-2 border-b">
            <input
              type="text"
              placeholder="Cari customer..."
              class="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={search()}
              onInput={(e) => setSearch(e.target.value)}
              autofocus
            />
          </div>
          
          {loading() ? (
            <div class="p-4 text-center text-gray-500">
              <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p class="mt-2">Memuat data...</p>
            </div>
          ) : error() ? (
            <div class="p-4 text-center">
              <div class="text-red-500 mb-2">{error()}</div>
              <button
                class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={handleRetry}
              >
                Coba Lagi
              </button>
            </div>
          ) : filteredCustomers().length > 0 ? (
            <div class="max-h-48 overflow-y-auto">
              {filteredCustomers().map((customer) => (
                <div
                  class="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  onClick={() => selectCustomer(customer)}
                >
                  <div class="font-medium text-gray-900">{customer.nama}</div>
                  {customer.kode && (
                    <div class="text-sm text-gray-600">Kode: {customer.kode}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div class="p-4 text-gray-500 text-center">
              {search() ? "Customer tidak ditemukan" : "Tidak ada data customer"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}