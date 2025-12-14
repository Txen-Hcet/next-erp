import { createSignal, createMemo, For } from "solid-js";

export default function SaldoPiutangTable(props) {
  const [page, setPage] = createSignal(1);
  const pageSize = 10;

  const data = createMemo(() => props.data || []);

  const paginatedData = createMemo(() => {
    const start = (page() - 1) * pageSize;
    return data().slice(start, start + pageSize);
  });

  const totalPages = createMemo(() => Math.ceil(data().length / pageSize) || 1);

  const summary = createMemo(() => {
    const fields = [
      "saldo_awal",
      "jual",
      "retur",
      "pot_pemb",
      "bayar",
      "cash_disc",
      "saldo_akhir",
      "giro_mundur",
      "saldo_sth_gm",
    ];

    const total = {};
    fields.forEach((f) => {
      total[f] = data().reduce((sum, row) => sum + Number(row[f] || 0), 0);
    });
    return total;
  });

  return (
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="bg-gray-100">
            <th class="p-2 border">Customer</th>
            <th class="p-2 border">Saldo Awal</th>
            <th class="p-2 border">Jual</th>
            <th class="p-2 border">Retur</th>
            <th class="p-2 border">Pot/Pemb</th>
            <th class="p-2 border">Bayar</th>
            <th class="p-2 border">Cash Disc</th>
            <th class="p-2 border">Saldo Akhir</th>
            <th class="p-2 border">Giro Mundur</th>
            <th class="p-2 border">Saldo sth GM</th>
            <th class="p-2 border w-32 text-center">Aksi</th>
          </tr>
        </thead>

        <tbody>
          <For each={paginatedData()}>
            {(row) => (
              <tr class="hover:bg-gray-50">
                <td class="p-2 border">{row.customer}</td>
                <td class="p-2 border text-right">{row.saldo_awal}</td>
                <td class="p-2 border text-right">{row.jual}</td>
                <td class="p-2 border text-right">{row.retur}</td>
                <td class="p-2 border text-right">{row.pot_pemb}</td>
                <td class="p-2 border text-right">{row.bayar}</td>
                <td class="p-2 border text-right">{row.cash_disc}</td>
                <td class="p-2 border text-right">{row.saldo_akhir}</td>
                <td class="p-2 border text-right">{row.giro_mundur}</td>
                <td class="p-2 border text-right">{row.saldo_sth_gm}</td>
                <td class="p-2 border text-center">
                  <div class="flex justify-center gap-2">
                    <button
                      class="bg-yellow-500 text-white px-2 py-1 rounded"
                      // onClick={() => props.onEdit?.(row)}
                    >
                      Edit
                    </button>
                    <button
                      class="bg-red-600 text-white px-2 py-1 rounded"
                      // onClick={() => props.onDelete?.(row)}
                    >
                      Del
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </For>

          <tr class="bg-gray-200 font-semibold">
            <td class="p-2 border">TOTAL</td>
            <td class="p-2 border text-right">{summary().saldo_awal}</td>
            <td class="p-2 border text-right">{summary().jual}</td>
            <td class="p-2 border text-right">{summary().retur}</td>
            <td class="p-2 border text-right">{summary().pot_pemb}</td>
            <td class="p-2 border text-right">{summary().bayar}</td>
            <td class="p-2 border text-right">{summary().cash_disc}</td>
            <td class="p-2 border text-right">{summary().saldo_akhir}</td>
            <td class="p-2 border text-right">{summary().giro_mundur}</td>
            <td class="p-2 border text-right">{summary().saldo_sth_gm}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
