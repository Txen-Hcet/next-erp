import { onMount, onCleanup, createSignal } from "solid-js";
import JBInvoicePrint from "../../../pages/print_function/invoice/JBInvoicePrint";

export default function JBInvoiceDummyPrint() {
  const [data, setData] = createSignal(null);

  onMount(() => {
    let parsedData = null; 

    try {
      const raw = window.location.hash.slice(1);
      if (!raw) throw new Error("Data hash tidak ditemukan.");

      parsedData = JSON.parse(decodeURIComponent(raw));

      const normalized = parsedData.suratJalan
        ? {
            ...parsedData.suratJalan,
            _previewMode: parsedData._previewMode,
            _pdfMode: parsedData._pdfMode,
            items: parsedData.items ?? parsedData.suratJalan.items ?? [],
            summary: parsedData.summary ?? parsedData.suratJalan.summary ?? {},
          }
        : {
            ...parsedData,
            items: parsedData.items ?? [],
            summary: parsedData.summary ?? {},
          };

      setData(normalized);
    } catch (e) {
      console.error("Gagal parse data print:", e);
      alert("Data print tidak valid.");
      window.close();
      return;
    }

    if (!parsedData._previewMode && !parsedData._pdfMode) {
      const closeAfterPrint = () => window.close();
      window.addEventListener("afterprint", closeAfterPrint);
      
      setTimeout(() => {
        requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
      }, 500);

      const fallbackClose = setTimeout(() => window.close(), 5000);

      onCleanup(() => {
        window.removeEventListener("afterprint", closeAfterPrint);
        clearTimeout(fallbackClose);
      });
    }
  });

  return (
    <div class="p-6 print:p-0">
      {data() && <JBInvoicePrint data={data()} />}
    </div>
  );
}