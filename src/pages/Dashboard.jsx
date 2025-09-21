import MainLayout from "../layouts/MainLayout";
import { onMount, createSignal } from "solid-js";
import { PaymentMethods } from "../utils/financeAuth";
import ApexChart from "../components/ApexChart";

export default function Dashboard() {
  const [stats, setStats] = createSignal([]);
  const [chartData, setChartData] = createSignal({
    series: [],
    categories: [],
  });

  onMount(async () => {
    try {
      // Ambil payment methods
      const payments = await PaymentMethods.getAll();

      console.log("Payment Methods:", payments);

      // Buat stats sederhana
      setStats([{ title: "Total Payment Methods", value: payments.length }]);

      // Contoh bikin chart: jumlah transaksi per metode pembayaran
      const categories = payments.data.map((p) => p.name);
      const series = payments.data.map((p) => p.transactionCount || 0); // asumsi ada field transactionCount

      setChartData({
        categories,
        series: [{ name: "Jumlah Transaksi", data: series }],
      });
    } catch (err) {
      console.error("Gagal fetch payment methods:", err);
    }
  });

  return (
    <MainLayout>
      <h1 class="text-2xl font-bold mb-4">Dashboard</h1>

      {/* Stats Cards */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats().map((stat) => (
          <div class="bg-white p-6 rounded shadow hover:shadow-md transition-all">
            <p class="text-sm text-gray-500">{stat.title}</p>
            <p class="text-2xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div class="bg-white p-6 rounded shadow">
        <h2 class="text-lg font-semibold mb-4">Grafik Payment Methods</h2>
        <ApexChart
          type="bar"
          height={300}
          series={chartData().series}
          options={{
            xaxis: { categories: chartData().categories },
          }}
        />
      </div>
    </MainLayout>
  );
}
