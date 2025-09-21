import MainLayout from "../layouts/MainLayout";
import { onMount, createSignal } from "solid-js";
import ApexChart from "../components/ApexChart";
import { Printer } from "lucide-solid";

export default function Dashboard() {
  const [chartData, setChartData] = createSignal({
    series: [],
    categories: [],
  });
  const [stats, setStats] = createSignal([]);
  const [preview, setPreview] = createSignal(null);

  onMount(() => {
    const totalSuratJalan = 50;
    const totalSelesai = 35;
    const totalBelum = 15;

    setChartData({
      categories: ["Selesai", "Belum Selesai"],
      series: [totalSelesai, totalBelum],
    });

    setStats([
      { title: "Total Surat Jalan", value: totalSuratJalan },
      { title: "Total Pesanan Selesai", value: totalSelesai },
      { title: "Total Pesanan Belum Selesai", value: totalBelum },
    ]);
  });

  const printPreview = () => {
    const content = document.getElementById("print-area").innerHTML;
    const w = window.open("", "", "height=600,width=800");
    w.document.write("<html><head><title>Print Preview</title></head><body>");
    w.document.write(content);
    w.document.write("</body></html>");
    w.document.close();
    w.print();
  };

  return (
    <MainLayout>
      <h1 class="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Pie Chart */}
      <div class="bg-white p-6 rounded shadow mb-8">
        <h2 class="text-lg font-semibold mb-4">Status Pesanan</h2>
        <ApexChart
          type="pie"
          height={350}
          series={chartData().series}
          options={{
            labels: chartData().categories,
            legend: { position: "bottom" },
          }}
        />
      </div>

      {/* Stats Cards */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats().map((stat) => (
          <div class="bg-white p-6 rounded shadow relative">
            <p class="text-sm text-gray-500">{stat.title}</p>
            <p class="text-3xl font-bold text-blue-600">{stat.value}</p>

            {/* Print Button */}
            <button
              class="absolute top-4 right-4 text-gray-500 hover:text-blue-600"
              onClick={() => setPreview(stat)}
            >
              <Printer size={20} />
            </button>
          </div>
        ))}
      </div>

      {/* Modal Preview */}
      {preview() && (
        <div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div class="bg-white rounded-lg p-6 w-1/2">
            <h2 class="text-xl font-bold mb-4">Print Preview</h2>
            <div id="print-area">
              <p class="text-gray-600">{preview().title}</p>
              <p class="text-4xl font-bold text-blue-600">{preview().value}</p>
            </div>
            <div class="flex justify-end gap-2 mt-4">
              <button
                class="bg-gray-300 px-4 py-2 rounded"
                onClick={() => setPreview(null)}
              >
                Close
              </button>
              <button
                class="bg-blue-500 text-white px-4 py-2 rounded"
                onClick={printPreview}
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
