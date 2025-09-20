import { onMount, onCleanup, createSignal } from "solid-js";
import ReturJualBeliPrint from "../../pages/print_function/retur/ReturJualBeliPrint";

export default function ReturJualBeliDummyPrint() {
  // CHANGED: pakai signal supaya reaktif saat data masuk
  const [data, setData] = createSignal({ items: [], summary: {} });

  onMount(() => {
    try {
      const raw = window.location.hash.slice(1);
      const parsed = JSON.parse(decodeURIComponent(raw));

      // FIX: ratakan struktur supaya punya field root: items & summary
      const normalized = parsed.suratJalan
        ? {
            ...parsed.suratJalan,
            items: parsed.items ?? parsed.suratJalan.items ?? [],
            summary: parsed.summary ?? parsed.suratJalan.summary ?? {},
          }
        : {
            ...parsed,
            items: parsed.items ?? [],
            summary: parsed.summary ?? {},
          };

      setData(normalized);
    } catch (e) {
      console.error("Gagal parse data print:", e);
      alert("Data print tidak valid.");
      window.close();
      return;
    }

    const closeAfterPrint = () => window.close();
    window.addEventListener("afterprint", closeAfterPrint);
    setTimeout(() => window.print(), 300);
    setTimeout(() => window.close(), 3000);
    onCleanup(() => window.removeEventListener("afterprint", closeAfterPrint));
  });

  return (
    <div class="p-6 print:p-0">
      <ReturJualBeliPrint data={data()} /> {/* CHANGED: kirim signal value */}
    </div>
  );
}