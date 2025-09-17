// import JBSuratJalanPrint from "../../../pages/print_function/buy/jual_beli/JBSuratJalanPrint";

// const dummyDataJBSuratJalan = {
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
//   keterangan: "Pengiriman dilakukan dalam 3 batch.",
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

// export default function JBSuratJalanDataDummyPrint() {
//   return <JBSuratJalanPrint data={dummyDataJBSuratJalan} />;
// }

import { onMount, onCleanup, createSignal } from "solid-js";
import JBSuratJalanPrint from "../../../pages/print_function/buy/jual_beli/JBSuratJalanPrint";

export default function JBSuratJalanDataDummyPrint() {
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
      <JBSuratJalanPrint data={data()} /> {/* CHANGED: kirim signal value */}
    </div>
  );
}