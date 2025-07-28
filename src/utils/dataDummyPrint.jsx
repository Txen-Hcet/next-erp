import SalesContractPrint from "../pages/print_function/SalesContractPrint";

const dummyDataSalesContract = {
  type: "Export",
  no_pesan: "SC-00123",
  po_cust: "PO-7890",
  validity_contract: "31-12-2025",
  customer_id: "CUST-456",
  currency_id: "USD",
  kurs: 14500,
  termin: 30,
  ppn_percent: 11,
  catatan: "Pengiriman dilakukan dalam 3 batch.",
  satuan_unit_id: "ROLL",
  items: [
    {
      kain_id: "K001",
      grade_id: "A",
      lebar: "150 cm",
      gramasi: "180 gsm",
      meter_total: 500,
      yard_total: 546.8,
      kilogram_total: 90,
      harga: 25000,
    },
    {
      kain_id: "K002",
      grade_id: "B",
      lebar: "160 cm",
      gramasi: "200 gsm",
      meter_total: 300,
      yard_total: 328.1,
      kilogram_total: 65,
      harga: 22000,
    },
    {
      kain_id: "K003",
      grade_id: "A",
      lebar: "155 cm",
      gramasi: "190 gsm",
      meter_total: 200,
      yard_total: 218.7,
      kilogram_total: null,
      harga: 23000,
    },
  ],
};

export default function DataDummyPrint() {
  return <SalesContractPrint data={dummyDataSalesContract} />;
}
