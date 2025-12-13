import { onCleanup, onMount, createSignal } from "solid-js";
import MemoOrderMatchingPrint from "../../pages/print_function/memo/MemoOrderMatchingPrint";

export default function MemoOrderMatchingDummyPrint() {
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
      <MemoOrderMatchingPrint data={data()} />{" "}
      {/* CHANGED: kirim signal value */}
    </div>
  );
}
