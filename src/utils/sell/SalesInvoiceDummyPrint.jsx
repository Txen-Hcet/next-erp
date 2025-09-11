import { onMount, onCleanup } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import SalesInvoicePrint from "../../pages/print_function/invoice/SalesInvoicePrint";

export default function SalesInvoiceDummyPrint() {
  const [searchParams] = useSearchParams();

  const data = JSON.parse(searchParams.data);

  onMount(() => {
    const closeAfterPrint = () => {
      window.close();
    };

    window.addEventListener("afterprint", closeAfterPrint);

    // Tunggu 300ms supaya render komponen print kelar
    setTimeout(() => {
      window.print();
    }, 2500);

    // Fallback close jika afterprint gak jalan
    setTimeout(() => {
      window.close();
    }, 4000);

    onCleanup(() => {
      window.removeEventListener("afterprint", closeAfterPrint);
    });
  });

  return (
    <div class="p-6 print:p-0">
      <SalesInvoicePrint data={data} />
    </div>
  );
}