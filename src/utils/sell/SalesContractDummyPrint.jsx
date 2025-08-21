// import SalesContractPrint from "../../pages/print_function/sell/SalesContractPrint";

// const dummyDataSalesContract = {
//   type: "Export",
//   customer: "PT AJI WIJAYATEX GROUP",
//   alamat:
//     "KERTOHARJO BLOK O NO.0 RT 001 RW 005 KURIPAN KERTOHARJO PEKALONGAN SEL",
//   no_sc: "SC/D/0725-00123",
//   po_cust: "PO-7890",
//   tanggal: "25-10-2025",
//   validity_contract: "31-12-2025",
//   ppn_percent: 11,
//   currency_id: "USD",
//   kurs: 14500,
//   termin: 30,
//   keterangan: "Pengiriman dilakukan dalam 3 batch.",
//   items: [
//     {
//       kode_kain: "K001",
//       jenis_kain: "PExPE20 62",
//       lebar: "150",
//       gramasi: "180",
//       meter_total: 500,
//       yard_total: 546.8,
//       kilogram_total: 90,
//       harga: 25000,
//     },
//     {
//       kode_kain: "K002",
//       jenis_kain: "PExPE20 62",
//       lebar: "160",
//       gramasi: "200",
//       meter_total: 300,
//       yard_total: 328.1,
//       kilogram_total: 65,
//       harga: 22000,
//     },
//     {
//       kode_kain: "K003",
//       jenis_kain: "PExPE20 62",
//       lebar: "155",
//       gramasi: "190",
//       meter_total: 200,
//       yard_total: 218.7,
//       kilogram_total: null,
//       harga: 23000,
//     },
//   ],
// };

// export default function SalesContractDataDummyPrint() {
//   return <SalesContractPrint data={dummyDataSalesContract} />;
// }

import { onMount, onCleanup } from "solid-js";
import SalesContractPrint from "../../pages/print_function/sell/SalesContractPrint";
import { useSearchParams } from "@solidjs/router";

export default function SalesContractDataDummyPrint() {
  const [searchParams] = useSearchParams();

  const data = JSON.parse(decodeURIComponent(searchParams.data));

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
      <SalesContractPrint data={data} />
    </div>
  );
}
