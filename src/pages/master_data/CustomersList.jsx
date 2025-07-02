import { createEffect, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import { getAllCustomers, getUser, softDeleteCustomer } from "../../utils/auth";
import Swal from "sweetalert2";

export default function CustomerList() {
  const navigate = useNavigate();
  const tokUser = getUser();

  const [customers, setCustomers] = createSignal([]);

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Hapus customer?",
      text: `Apakah kamu yakin ingin menghapus customer dengan ID ${id}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const deleteCustomer = await softDeleteCustomer(id, tokUser?.token);

        await Swal.fire({
          title: "Terhapus!",
          text: `Data customer dengan ID ${id} berhasil dihapus.`,
          icon: "success",
          confirmButtonColor: "#6496df",
        });

        // Optional: update UI setelah hapus
        setCustomers(customers().filter((s) => s.id !== id));
      } catch (error) {
        console.error(error);
        Swal.fire({
          title: "Gagal",
          text:
            error.message || `Gagal menghapus data customer dengan ID ${id}`,
          icon: "error",
          confirmButtonColor: "#6496df",
          confirmButtonText: "OK",
        });
      }
    }
  };

  const handleGetAllCustomers = async (tok) => {
    const getDataCustomers = await getAllCustomers(tok);

    const sortedData = getDataCustomers.sort((a, b) => a.id - b.id);

    setCustomers(sortedData);
  };

  function formatPhoneNumber(phone) {
    if (!phone) return "";

    // Ambil kode area (3 digit pertama)
    const area = phone.slice(0, 3);
    const number = phone.slice(3);

    return `(${area}) ${number}`;
  }

  createEffect(() => {
    if (tokUser?.token) {
      handleGetAllCustomers(tokUser?.token);
    }
  });
  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Daftar Customer</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/customers/form")}
        >
          + Tambah Customer
        </button>
      </div>

      <div class="w-full overflow-x-auto">
        <table class="w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">ID</th>
              <th class="py-2 px-2">Kode Customer</th>
              <th class="py-2 px-2">Alias</th>
              <th class="py-2 px-2">Nama</th>
              <th class="py-2 px-2">Tipe Customer</th>
              <th class="py-2 px-4">No Telp</th>
              <th class="py-2 px-4">No HP</th>
              <th class="py-2 px-4">Alamat</th>
              <th class="py-2 px-4">Termin</th>
              <th class="py-2 px-4">Limit Kredit</th>
              <th class="py-2 px-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {customers().map((cust) => (
              <tr class="border-b" key={cust.id}>
                <td class="py-2 px-4">{cust.id}</td>
                <td class="py-2 px-4">{cust.kode}</td>
                <td class="py-2 px-4">{cust.alias}</td>
                <td class="py-2 px-4">{cust.nama}</td>
                <td class="py-2 px-4">{cust.customer_type_id}</td>
                <td class="py-2 px-4">{formatPhoneNumber(cust.no_telp)}</td>
                <td class="py-2 px-4">{cust.no_hp}</td>
                <td class="py-2 px-4">{cust.alamat}</td>
                <td class="py-2 px-4">{cust.termin}</td>
                <td class="py-2 px-4">
                  {new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    minimumFractionDigits: 0,
                  }).format(cust.limit_kredit || 0)}
                </td>
                <td class="py-2 px-4 space-x-2">
                  <button
                    class="text-blue-600 hover:underline"
                    onClick={() => navigate(`/customers/form?id=${cust.id}`)}
                  >
                    Edit
                  </button>
                  <button
                    class="text-red-600 hover:underline"
                    onClick={() => handleDelete(cust.id)}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MainLayout>
  );
}
