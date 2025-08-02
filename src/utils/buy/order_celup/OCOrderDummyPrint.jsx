import OCOrderPrint from "../../../pages/print_function/buy/order_celup/OCOrderPrint";

const dummyDataOCOrder = {
  type: "Export",
  customer: "PANCA BINTANG CEMERLANG, PT.",
  alamat: "",
  no_sc: "SC/D/0725-00123",
  no_so: "SO/D/0725-00123",
  po_cust: "PO-7890",
  tanggal: "25-10-2025",
  tgl_kirim: "31-12-2025",
  ppn_percent: 11,
  currency_id: "USD",
  kurs: 14500,
  termin: 30,
  catatan: "Pengiriman dilakukan dalam 3 batch.",
  items: [
    {
      kode_kain: "K001",
      jenis_kain: "PExPE20 62",
      warna: "Hitam",
      keterangan: "Repeat 102-102",
      satuan_unit: "Yard",
      lebar: "150",
      gramasi: "180",
      meter_total: 500,
      yard_total: 546.8,
      kilogram_total: 90,
      harga: 25000,
    },
    {
      kode_kain: "K002",
      jenis_kain: "PExPE20 62",
      warna: "Hitam",
      keterangan: "Repeat 102-102",
      satuan_unit: "Yard",
      lebar: "160",
      gramasi: "200",
      meter_total: 300,
      yard_total: 328.1,
      kilogram_total: 65,
      harga: 22000,
    },
    {
      kode_kain: "K003",
      jenis_kain: "PExPE20 62",
      warna: "Hitam",
      keterangan: "Repeat 102-102",
      satuan_unit: "Yard",
      lebar: "155",
      gramasi: "190",
      meter_total: 200,
      yard_total: 218.7,
      kilogram_total: null,
      harga: 23000,
    },
  ],
};

export default function OCOrderDataDummyPrint() {
  return <OCOrderPrint data={dummyDataOCOrder} />;
}

// import { onMount } from "solid-js";
// import OCOrderPrint from "../../../pages/print_function/buy/order_celup/OCOrderPrint";
// import { useSearchParams } from "@solidjs/router";

// export default function OCOrderDataDummyPrint() {
//   const [searchParams] = useSearchParams();

//   const data = JSON.parse(decodeURIComponent(searchParams.data));

//   onMount(() => {
//     const closeAfterPrint = () => {
//       window.close();
//     };

//     window.addEventListener("afterprint", closeAfterPrint);

//     // Fallback: Kalau `afterprint` nggak terpanggil (di browser tertentu)
//     setTimeout(() => {
//       window.close();
//     }, 1000); // kasih jeda 1 detik setelah print

//     // Trigger print
//     window.print();

//     // Clean up event
//     onCleanup(() => {
//       window.removeEventListener("afterprint", closeAfterPrint);
//     });
//   });

//   return (
//     <div class="p-6 print:p-0">
//       <OCOrderPrint data={data} />
//     </div>
//   );
// }
