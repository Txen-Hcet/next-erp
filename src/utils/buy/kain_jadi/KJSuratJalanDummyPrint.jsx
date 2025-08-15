// import KJSuratJalanPrint from "../../../pages/print_function/buy/kain_jadi/KJSuratJalanPrint";

// const dummyDataKJSuratJalan = {
//   type: "Export",
//   customer: "BAPAK YANA, PT.",
//   alamat: "",
//   no_sc: "SC/D/0725-00123",
//   no_so: "SO/D/0725-00123",
//   po_cust: "PO-7890",
//   tanggal: "25-10-2025",
//   tgl_kirim: "31-12-2025",
//   sopir: "TOPI", // isi pas mau print aja
//   no_mobil: "D 8677 WX", // isi pas mau print aja
//   ppn_percent: 11,
//   currency_id: "USD",
//   satuan: "Yard",
//   kurs: 14500,
//   termin: 30,
//   catatan: "Pengiriman dilakukan dalam 3 batch.",
//   items: [
//     {
//       kode_kain: "K001",
//       jenis_kain: "PExPE20 62",
//       warna_kain: "MALVINAS",
//       satuan_unit: "Yard",
//       lot: "3320",
//       grade: "A",
//       lebar: "58",
//       gramasi: "180",
//       roll: 1,
//       meter_total: 500,
//       yard_total: 546.8,
//       kilogram_total: 90,
//       harga: 25000,
//     },
//     {
//       kode_kain: "K002",
//       jenis_kain: "PExPE20 62",
//       warna_kain: "MALVINAS",
//       satuan_unit: "Yard",
//       lot: "3320",
//       grade: "A",
//       lebar: "58",
//       gramasi: "200",
//       roll: 1,
//       meter_total: 300,
//       yard_total: 328.1,
//       kilogram_total: 65,
//       harga: 22000,
//     },
//     {
//       kode_kain: "K003",
//       jenis_kain: "PExPE20 62",
//       warna_kain: "MALVINAS",
//       satuan_unit: "Yard",
//       lot: "3320",
//       grade: "A",
//       lebar: "58",
//       gramasi: "190",
//       roll: 1,
//       meter_total: 200,
//       yard_total: 218.7,
//       kilogram_total: null,
//       harga: 23000,
//     },
//   ],
// };

// export default function KJSuratJalanDataDummyPrint() {
//   return <KJSuratJalanPrint data={dummyDataKJSuratJalan} />;
// }

import { onCleanup, onMount } from "solid-js";
import KJSuratJalanPrint from "../../../pages/print_function/buy/kain_jadi/KJSuratJalanPrint";
import { useSearchParams } from "@solidjs/router";

export default function KJSuratJalanDataDummyPrint() {
  const [searchParams] = useSearchParams();

  const data = JSON.parse(decodeURIComponent(searchParams.data));

  onMount(() => {
    // const closeAfterPrint = () => {
    //   window.close();
    // };

    // window.addEventListener("afterprint", closeAfterPrint);
    // // Tunggu 300ms supaya render komponen print kelar
    // setTimeout(() => {
    //   window.print();
    // }, 2500);

    // // Fallback close jika afterprint gak jalan
    // setTimeout(() => {
    //   window.close();
    // }, 4000);
    
    // onCleanup(() => {
    //   window.removeEventListener("afterprint", closeAfterPrint);
    // });
  });

  return (
    <div class="p-6 print:p-0">
      <KJSuratJalanPrint data={data} />
    </div>
  );
}
