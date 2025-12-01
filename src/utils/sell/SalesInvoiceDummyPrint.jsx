import { onCleanup, onMount, createSignal } from "solid-js";
import { get } from "idb-keyval";
import SalesInvoicePrint from "../../pages/print_function/invoice/SalesInvoicePrint";

export default function SalesInvoiceDummyPrint() {
  const [data, setData] = createSignal(null);

  onMount(async () => {
    let parsedData = null;

    try {
      // Ambil KEY dari URL ?key=xxxxx
      const url = new URL(window.location.href);
      const key = url.searchParams.get("key");
      if (!key) throw new Error("Missing key");

      // Ambil data besar dari IndexedDB
      parsedData = await get(key);
      if (!parsedData) throw new Error("IndexedDB return NULL");

      setData(parsedData);
    } catch (e) {
      console.error("Gagal load data print:", e);
      alert("Data print tidak valid.");
      window.close();
      return;
    }

    // Kalau bukan PDF mode dan bukan preview → auto-print
    if (!parsedData._pdfMode && !parsedData._previewMode) {
      const closeAfterPrint = () => window.close();
      window.addEventListener("afterprint", closeAfterPrint);

      // Tunggu render
      setTimeout(() => {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => window.print())
        );
      }, 500);

      // fallback auto close
      setTimeout(() => window.close(), 5000);

      onCleanup(() =>
        window.removeEventListener("afterprint", closeAfterPrint)
      );
    }
  });

  return (
    <div class="p-6 print:p-0">
      <SalesInvoicePrint data={data()} />
    </div>
  );
}
