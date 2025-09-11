// import OCContractPrint from "../../../pages/print_function/buy/order_celup/OCContractPrint";

// const dummyDataOCContract = {
//   type: "Export",
//   customer: "PT AJI WIJAYATEX GROUP",
//   alamat:
//     "KERTOHARJO BLOK O NO.0 RT 001 RW 005 KURIPAN KERTOHARJO PEKALONGAN SEL",
//   no_sc: "SC/D/0725-00123",
//   po_cust: "PO-7890",
//   tanggal: "25-10-2025",
//   kirim: "31-12-2025",
//   ppn_percent: 11,
//   currency_id: "USD",
//   kurs: 14500,
//   termin: 30,
//   keterangan: "Pengiriman dilakukan dalam 3 batch.",
//   items: [
//     {
//       kode_kain: "304",
//       jenis_kain: "PExPE20 62",
//       lebar: "150",
//       gramasi: "180",
//       meter_total: 50000,
//       satuan: "Yard",
//       yard_total: 546.8,
//       kilogram_total: 90,
//       harga: 25000,
//     },
//     {
//       kode_kain: "305",
//       jenis_kain: "PExPE20 62",
//       lebar: "160",
//       gramasi: "200",
//       meter_total: 30000,
//       satuan: "Yard",
//       yard_total: 328.1,
//       kilogram_total: 65,
//       harga: 22000,
//     },
//     {
//       kode_kain: "306",
//       jenis_kain: "PExPE20 62",
//       lebar: "155",
//       gramasi: "190",
//       meter_total: 20000,
//       satuan: "Yard",
//       yard_total: 218.7,
//       kilogram_total: null,
//       harga: 23000,
//     },
//   ],
// };

// export default function OCContractDataDummyPrint() {
//   return <OCContractPrint data={dummyDataOCContract} />;
// }

import { onCleanup, onMount } from "solid-js";
import OCContractPrint from "../../../pages/print_function/buy/order_celup/OCContractPrint";
import { useSearchParams } from "@solidjs/router";

export default function OCContractDataDummyPrint() {
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
      <OCContractPrint data={data} />
    </div>
  );
}
