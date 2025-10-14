import { onCleanup, onMount, createSignal } from "solid-js";
import SalesInvoicePrint from "../../pages/print_function/invoice/SalesInvoicePrint";

export default function SalesInvoiceDummyPrint() {
  const [data, setData] = createSignal(null);

  onMount(() => {
    let parsedData = null;
    try {
      const raw = window.location.hash.slice(1);
      parsedData = JSON.parse(decodeURIComponent(raw));
      setData(parsedData);
    } catch (e) {
      console.error("Gagal parse data print:", e);
      alert("Data print tidak valid.");
      window.close();
      return;
    }

    if (!parsedData._pdfMode && !parsedData._previewMode) {
      const closeAfterPrint = () => window.close();
      window.addEventListener("afterprint", closeAfterPrint);

      // Tunggu render, lalu print
      setTimeout(() => {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => window.print())
        );
      }, 500); 

      // Fallback auto-close
      setTimeout(() => window.close(), 5000);

      onCleanup(() => window.removeEventListener("afterprint", closeAfterPrint));
    }
  });

  return (
    <div class="p-6 print:p-0">
      <SalesInvoicePrint data={data()} />
    </div>
  );
}