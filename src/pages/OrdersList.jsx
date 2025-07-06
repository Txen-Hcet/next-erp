import { createSignal } from "solid-js";
import MainLayout from "../layouts/MainLayout";
import { useNavigate } from "@solidjs/router";

export default function OrdersList() {
  const [orders, setOrders] = createSignal([
    {
      id: 1,
      customer: "PT Tekstil Maju",
      item: "Kain Katun 40s",
      quantity: 100,
      status: "Proses",
    },
    {
      id: 2,
      customer: "CV Textile Indo",
      item: "Polyester 30s",
      quantity: 200,
      status: "Selesai",
    },
  ]);

  const navigate = useNavigate();

  const handleDelete = (id) => {
    const confirmed = confirm("Yakin ingin menghapus pesanan ini?");
    if (confirmed) {
      setOrders(orders().filter((order) => order.id !== id));
    }
  };

  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Daftar Pesanan</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/orders/form")}
        >
          + Tambah Pesanan
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">ID</th>
              <th class="py-2 px-4">Customer</th>
              <th class="py-2 px-4">Item</th>
              <th class="py-2 px-4">Jumlah</th>
              <th class="py-2 px-4">Status</th>
              <th class="py-2 px-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {orders().map((order) => (
              <tr class="border-b" key={order.id}>
                <td class="py-2 px-4">{order.id}</td>
                <td class="py-2 px-4">{order.customer}</td>
                <td class="py-2 px-4">{order.item}</td>
                <td class="py-2 px-4">{order.quantity}</td>
                <td class="py-2 px-4">{order.status}</td>
                <td class="py-2 px-4 space-x-2">
                  <button
                    class="text-blue-600 hover:underline"
                    onClick={() => navigate(`/orders/form?id=${order.id}`)}
                  >
                    <Edit size={25} />
                  </button>
                  <button
                    class="text-red-600 hover:underline"
                    onClick={() => handleDelete(order.id)}
                  >
                   <Trash size={25} />
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
