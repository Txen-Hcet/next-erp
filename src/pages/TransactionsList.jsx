import { createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../layouts/MainLayout";

export default function TransactionsList() {
  const navigate = useNavigate();

  const [transactions, setTransactions] = createSignal([
    { id: 1, name: "Pembayaran Transfer" },
    { id: 2, name: "Pembayaran Tunai" },
  ]);

  const handleDelete = (id) => {
    if (confirm("Yakin ingin menghapus transaksi ini?")) {
      setTransactions(transactions().filter((tx) => tx.id !== id));
    }
  };

  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Jenis Transaksi</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/transactions/form")}
        >
          + Tambah Transaksi
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">ID</th>
              <th class="py-2 px-4">Nama</th>
              <th class="py-2 px-4">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {transactions().map((tx) => (
              <tr class="border-b" key={tx.id}>
                <td class="py-2 px-4">{tx.id}</td>
                <td class="py-2 px-4">{tx.name}</td>
                <td class="py-2 px-4 space-x-2">
                  <button
                    class="text-blue-600 hover:underline"
                    onClick={() => navigate(`/transactions/form?id=${tx.id}`)}
                  >
                    <Edit size={25} />
                  </button>
                  <button
                    class="text-red-600 hover:underline"
                    onClick={() => handleDelete(tx.id)}
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
