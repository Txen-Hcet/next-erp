import { onMount, onCleanup, createSignal } from "solid-js";
import SJOCXPrint from "../../../pages/print_function/order_celup_x/SJOCXPrint";

export default function SJOCXDataDummyPrint() {
  // CHANGED: pakai signal supaya reaktif saat data masuk
  const [data, setData] = createSignal({ items: [], summary: {} });

  onMount(() => {
    try {
      // CHANGED: ambil payload dari hash (sesuai handlePrint baru)
      const raw = window.location.hash.slice(1); // buang "#"
      const parsed = JSON.parse(decodeURIComponent(raw));
      setData(parsed);
    } catch (e) {
      console.error("Gagal parse data print:", e);
      alert("Data print tidak valid.");
      window.close();
      return;
    }

    const closeAfterPrint = () => window.close();
    window.addEventListener("afterprint", closeAfterPrint);

    // CHANGED: kasih jeda singkat agar render selesai
    setTimeout(() => window.print(), 300);
    setTimeout(() => window.close(), 3000);

    onCleanup(() => window.removeEventListener("afterprint", closeAfterPrint));
  });

  return (
    <div class="p-6 print:p-0">
      <SJOCXPrint data={data()} />
    </div>
  );
}
