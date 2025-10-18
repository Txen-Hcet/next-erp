import MainLayout from "../layouts/MainLayout";
import { onMount, createSignal, createEffect, For, Show } from "solid-js";
import ApexChart from "../components/ApexChart";
import { Printer, FileSpreadsheet } from "lucide-solid";
import Litepicker from "litepicker";
import Swal from "sweetalert2";
import { exportDeliveryNotesToExcel } from "../helpers/export_excel/delivery-notes-excel-export";
import { exportPOStatusToExcel } from "../helpers/export_excel/po-status-excel-export";
import { exportSummaryToExcel } from "../helpers/export_excel/summary-excel-export";

import CustomerDropdownSearch from "../components/CustomerDropdownSearch";

// ==== IMPORT ENDPOINTS ====
import {
  hasPermission,
  // SJ (surat penerimaan / surat jalan)
  getAllBGDeliveryNotes,
  getAllOCDeliveryNotes,
  getAllKJDeliveryNotes,
  getAllJBDeliveryNotes,
  getAllDeliveryNotes,

  // Detail SJ
  getBGDeliveryNotes,
  getOCDeliveryNotes,
  getKJDeliveryNotes,
  getJBDeliveryNotes,
  getDeliveryNotes,

  // SO
  getSalesOrders, // detail SO
  getAllSalesOrders, // list SO

  // ==== PO PEMBELIAN - LIST ====
  getAllBeliGreigeOrders,
  getAllOrderCelupOrders,
  getAllKainJadiOrders,
  getAllJualBelis,

  // ==== PO PEMBELIAN - DETAIL ====
  getBeliGreigeOrders,
  getOrderCelupOrders,
  getKainJadiOrders,
  getJualBelis,
  getUser,
} from "../utils/auth";

// ==== CETAK HELPERS (file terpisah) ====
import { printPOStatus } from "./reports/poStatusPrint";
import { printDeliveryNotes } from "./reports/deliveryNotesPrint";
import { printSummaryReport } from "./reports/summaryPrint";

const [activeTab, setActiveTab] = createSignal("pembelian");
const [salesCustomerForm, setSalesCustomerForm] = createSignal({ customer_id: null }); // Filter laporan penjualan berdasarkan nama customer

export default function Dashboard() {
  const user = getUser();

  // ==== FORMATTERS ====
  const formatTanggalIndo = (tanggalString) => {
    const tanggal = new Date(tanggalString);
    const bulanIndo = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    const tanggalNum = tanggal.getDate();
    const bulan = bulanIndo[tanggal.getMonth()];
    const tahun = tanggal.getFullYear();
    return `${tanggalNum} ${bulan} ${tahun}`;
  };

  const normalizeDate = (d) => {
    if (!d) return null;
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return null;
    return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  };

  const uniqueJoin = (arr, sep = ", ") => {
    const s = Array.from(new Set(arr.filter(Boolean)));
    return s.length ? s.join(sep) : "";
  };
  const fmt2 = (val) => {
    if (val === undefined || val === null || val === "") return "-";
    const n = Number(String(val).replace(/,/g, ""));
    if (!Number.isFinite(n)) return "-";
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  };

  const pick = (...vals) =>
    vals.find((v) => v !== undefined && v !== null && v !== "");

  // ==== MAPPING ENDPOINTS ====
  const SJ_LIST_FETCHER = {
    greige: getAllBGDeliveryNotes,
    oc: getAllOCDeliveryNotes,
    kain_jadi: getAllKJDeliveryNotes,
    jual_beli: getAllJBDeliveryNotes,
    sales: getAllDeliveryNotes,
  };

  const SJ_DETAIL_FETCHER = {
    greige: getBGDeliveryNotes,
    oc: getOCDeliveryNotes,
    kain_jadi: getKJDeliveryNotes,
    jual_beli: getJBDeliveryNotes,
    sales: getDeliveryNotes,
  };

  const PO_LIST_FETCHER = {
    greige: getAllBeliGreigeOrders,
    oc: getAllOrderCelupOrders,
    kain_jadi: getAllKainJadiOrders,
    jual_beli: getAllJualBelis,
    sales: getAllSalesOrders, // sales = SO
  };

  const PO_DETAIL_FETCHER = {
    greige: getBeliGreigeOrders,
    oc: getOrderCelupOrders,
    kain_jadi: getKainJadiOrders,
    jual_beli: getJualBelis,
    sales: getSalesOrders,
  };

  // ==== LAYOUT CONFIG ====
  const SECTIONS = [
    {
      key: "pembelian",
      title: "Laporan Pembelian",
      blocks: [
        {
          key: "greige",
          label: "Pembelian Greige",
          perm: "view_purchase_greige_surat_jalan",
        },
        {
          key: "oc",
          label: "Pembelian Order Celup",
          perm: "view_purchase_celup_surat_jalan",
        },
        {
          key: "kain_jadi",
          label: "Pembelian Kain Jadi",
          perm: "view_purchase_finish_surat_jalan",
        },
        {
          key: "jual_beli",
          label: "Jual Beli",
          perm: "view_jual_beli_surat_jalan",
        },
      ],
    },
    {
      key: "penjualan",
      title: "Laporan Penjualan",
      blocks: [
        {
          key: "sales",
          label: "Surat Jalan (Penjualan)",
          perm: "view_surat_jalan",
        },
      ],
    },
    {
      key: "summary",
      title: "Laporan Summary",
      blocks: [
        // tampil jika user punya salah satu izin penjualan/jual beli
        {
          key: "summary",
          label: "Summary Invoice",
          anyPerm: ["view_surat_jalan", "view_jual_beli_surat_jalan", "print_invoice"],
        },
      ],
    },
  ];

  // ---- state
  const [sectionsData, setSectionsData] = createSignal([]);
  const [loading, setLoading] = createSignal(true);

  // filter tanggal (range created_at). Kosong = semua.
  const [startDate, setStartDate] = createSignal("");
  const [endDate, setEndDate] = createSignal("");

  const formatAngka = (n) => new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  const currentFilterLabel = () => {
    if (!startDate() && !endDate()) return "Semua Data"; 
    if (startDate() && endDate()) return `${startDate()} s/d ${endDate()}`;
    return startDate() || endDate();
  };

  // ---- helpers
  const rowsFromResponse = (res) => {
    const cand = [
      res?.suratJalans,
      res?.surat_jalan_list,
      res?.orders,
      res?.mainRows,
      res?.data,
    ];
    for (const c of cand) if (Array.isArray(c)) return c;
    return [];
  };

  const filterByDate = (rows, field = "created_at") => {
    const s = normalizeDate(startDate());
    const e = normalizeDate(endDate());
    if (!s && !e) return rows;
    return rows.filter((r) => {
      const d = normalizeDate(r[field]);
      if (d === null) return false;
      if (s && d < s) return false;
      if (e && d > e) return false;
      return true;
    });
  };

  const unitName = (po) => po?.satuan_unit_name || "Meter";

  const getTotalsByUnit = (po) => {
    const u = unitName(po);
    const s = po?.summary || {};
    if (u === "Meter")
      return {
        unit: "Meter",
        total: +(+s.total_meter || 0),
        masuk: +(+s.total_meter_dalam_proses || 0),
      };
    if (u === "Yard")
      return {
        unit: "Yard",
        total: +(+s.total_yard || 0),
        masuk: +(+s.total_yard_dalam_proses || 0),
      };
    if (u === "Kilogram")
      return {
        unit: "Kilogram",
        total: +(+s.total_kilogram || 0),
        masuk: +(+s.total_kilogram_dalam_proses || 0),
      };
    return { unit: "Meter", total: 0, masuk: 0 };
  };

  const isDoneByRule = (po, isGreige) => {
    const { total, masuk } = getTotalsByUnit(po);
    const sisa = total - masuk;
    if (total <= 0) return false;
    if (isGreige) {
      // Greige: toleransi ±10% → anggap habis bila sisa <= 10% total
      return sisa <= total * 0.1 + 1e-9;
    }
    // Lainnya: selesai bila sisa <= 0
    return sisa <= 0 + 1e-9;
  };

  const buildChartSeriesFromPOs = (poRows, isGreige) => {
    let done = 0,
      notDone = 0;
    for (const po of poRows) {
      if (isDoneByRule(po, isGreige)) done++;
      else notDone++;
    }
    return [done, notDone];
  };

  const hasAnyPerm = (arr) =>
    Array.isArray(arr) ? arr.some((p) => hasPermission(p)) : false;

  const buildCustomerListFromRows = (rows = []) => {
    const map = new Map();
    for (const r of rows || []) {
      // coba beberapa kemungkinan lokasi id
      let id =
        r?.customer_id ??
        r?.customer?.id ??
        r?.buyer_id ??
        r?.buyer?.id ??
        r?.mainRow?.customer_id ??
        r?.mainRow?.customer?.id ??
        null;

      const kode =
        r?.customer_kode ??
        r?.customer?.kode ??
        r?.kode_customer ??
        r?.kode ??
        r?.buyer?.kode ??
        "";

      const nama =
        r?.customer_name ??
        r?.customer?.name ??
        r?.customer?.nama ??
        r?.buyer_name ??
        r?.buyer?.nama ??
        r?.mainRow?.customer_name ??
        r?.name ??
        "";

      // jika tidak ada id, fallback ke "name:" key agar tetap unik per nama
      const mapKey = id ? String(id) : nama ? `name:${nama}` : null;
      if (!mapKey) continue;

      if (!map.has(mapKey)) {
        // simpan id sama persis (bisa number atau "name:...") — konsisten saat dipilih
        map.set(mapKey, {
          id: id ?? `name:${nama}`, // id akan dipakai sebagai nilai pilihan di dropdown
          kode,
          nama,
        });
      }
    }
    return Array.from(map.values());
  };

  // util untuk cek apakah baris cocok dengan selectedCustomerId (bisa number id atau "name:..." fallback)
  const matchesCustomer = (row, selectedCustomerId) => {
    if (!selectedCustomerId) return true; // tidak ada filter → cocok semua

    // kandidat id dari row (bila ada)
    const cid =
      row?.customer_id ??
      row?.customer?.id ??
      row?.buyer_id ??
      row?.buyer?.id ??
      null;

    // kandidat nama dari row
    const cname =
      row?.customer_name ??
      row?.customer?.name ??
      row?.customer?.nama ??
      row?.buyer_name ??
      row?.buyer?.nama ??
      null;

    // normalize jadi string
    const sel = String(selectedCustomerId);

    // 3 kemungkinan match:
    // 1) id cocok (nomor/str)
    if (cid !== null && String(cid) === sel) return true;

    // 2) nama based key match: "name:Nama Customer"
    if (cname && `name:${cname}` === sel) return true;

    // 3) langsung kalau selectedCustomerId equals nama (jika ada scenario ini)
    if (cname && String(cname) === sel) return true;

    return false;
  };

  // ====== LOAD & ASSEMBLE DATA PER BLOCK ======
  const reloadData = async () => {
    setLoading(true);
    const assembled = [];

    for (const sec of SECTIONS) {
      const blocks = [];
      for (const b of sec.blocks) {
        // permission check
        if (b.anyPerm) {
          if (!hasAnyPerm(b.anyPerm)) continue;
        } else {
          if (!hasPermission(b.perm)) continue;
        }

        const key = b.key; // greige | oc | kain_jadi | jual_beli | sales | summary

        // === SUMMARY SECTION ===
        if (sec.key === "summary" && key === "summary") {
          let salesRows = [],
            jbRows = [];
          try {
            const resSales = await getAllDeliveryNotes(user?.token);
            salesRows = filterByDate(rowsFromResponse(resSales));
          } catch {}
          try {
            const resJB = await getAllJBDeliveryNotes(user?.token);
            jbRows = filterByDate(rowsFromResponse(resJB));
          } catch {}

          const salesTotal = salesRows.length;
          const jbTotal = jbRows.length;

          const salesInv = salesRows.filter((r) => +r.delivered_status === 1).length;
          const jbInv = jbRows.filter((r) => +r.delivered_status === 1).length;

          blocks.push({
            key,
            label: b.label,
            mode: sec.key,
            chart: {
              series: [salesTotal, jbTotal],
              categories: ["Penjualan", "Jual Beli"],
            },
            summaryCounts: {
              sales: {
                total: salesTotal,
                invoiced: salesInv,
                pending: salesTotal - salesInv,
              },
              jb: { total: jbTotal, invoiced: jbInv, pending: jbTotal - jbInv },
            },
            rowsSales: salesRows,
            rowsJB: jbRows,
          });
          continue;
        }

        // === BLOK PEMBELIAN / PENJUALAN (existing) ===
        const keySJList = SJ_LIST_FETCHER[key];

        // 1) Ambil semua SJ (hanya untuk show count SJ)
        let sjCount = 0;
        let sjRows = [];
        try {
          const sjList = await keySJList?.(user?.token);
          sjRows = filterByDate(rowsFromResponse(sjList));
          sjCount = Array.isArray(sjRows) ? sjRows.length : 0;
        } catch {
          sjCount = 0;
        }

        // 2) Ambil semua PO (pembelian) / SO (penjualan)
        let poRows = [];
        try {
          const poList = await PO_LIST_FETCHER[key]?.(user?.token);
          const list = filterByDate(rowsFromResponse(poList)); // field created_at sama
          poRows = Array.isArray(list) ? list : [];
        } catch {
          poRows = [];
        }

        // Simpan data asli customer
        const originalPoRows = Array.isArray(poRows) ? poRows.slice() : [];

        // Filter dengan nama customer ketika mode penjualan
        const selectedCustomerId = sec.key === "penjualan" ? salesCustomerForm().customer_id : null;

        const filteredSJRows = (sjRows || []).filter((r) =>
          matchesCustomer(r, selectedCustomerId)
        );
        const filteredPoRows = (poRows || []).filter((r) =>
          matchesCustomer(r, selectedCustomerId)
        );

        // override with filtered results (only for penjualan this changes, for pembelian selectedCustomerId is null so no filter)
        sjCount = filteredSJRows.length;
        poRows = filteredPoRows;

        // continue processing
        const isGreige = key === "greige";
        const chartSeries = buildChartSeriesFromPOs(poRows, isGreige);

        // Ambil daftar nama customer asli agar dropdown konsisten
        const customers = buildCustomerListFromRows(originalPoRows);

        blocks.push({
          key,
          label: b.label,
          mode: sec.key,
          sjCount,
          chart: {
            series: chartSeries,
            categories: ["Selesai", "Belum Selesai"],
          },
          poRows,
          rawFetcher: keySJList,
          customers,
        });
      }
      if (blocks.length) assembled.push({ key: sec.key, title: sec.title, blocks });
    }

    setSectionsData(assembled);
    setLoading(false);
  };

  createEffect(() => {
    // ketika customer dipilih / di-clear -> reload data supaya cards & charts update
    const cid = salesCustomerForm().customer_id;
    // hanya trigger reload jika komponen sudah mounted; reloadData aman dipanggil berulang
    // jika ingin debounce, bisa ditambahkan, tapi ini langsung dan sederhana
    reloadData();
  });

  // ===== Dialog pilih mode (Semua / Rentang) =====
  const askFilterMode = async () => {
    const { value: choice } = await Swal.fire({
      title: "Tampilkan Data",
      input: "radio",
      inputOptions: { all: "Semua tanggal", range: "Rentang tanggal…" },
      inputValue: "all",
      confirmButtonText: "Lanjut",
      showCancelButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
    });

    if (choice === "range") {
      const { value: rangeVal } = await Swal.fire({
        title: "Pilih Rentang Tanggal",
        html: `<input type="text" id="date-range" class="swal2-input" placeholder="Klik untuk pilih rentang">`,
        didOpen: () => {
          new Litepicker({
            element: document.getElementById("date-range"),
            singleMode: false,
            format: "YYYY-MM-DD",
            autoApply: true,
            numberOfMonths: 2,
            numberOfColumns: 2,
          });
        },
        preConfirm: () => {
          const val = document.getElementById("date-range").value;
          if (!val) {
            Swal.showValidationMessage("Rentang tanggal wajib dipilih!");
            return null;
          }
          const [start, end] = val.split(" - ");
          return { start, end };
        },
        showCancelButton: true,
        confirmButtonText: "Terapkan",
        cancelButtonText: "Batal",
        allowOutsideClick: false,
        allowEscapeKey: false,
      });

      if (rangeVal) {
        setStartDate(rangeVal.start);
        setEndDate(rangeVal.end);
      } else {
        setStartDate("");
        setEndDate("");
      }
    } else {
      setStartDate("");
      setEndDate("");
    }
  };

  onMount(async () => {
    setStartDate("");
    setEndDate("");
    await reloadData();
  });

  const totalCardLabel = (mode) =>
    mode === "penjualan" ? "Total Surat Jalan" : "Total Surat Penerimaan";

  // ==== UI ====
  return (
    <MainLayout>
      <h1 class="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Bar info filter + aksi ubah */}
      <div class="bg-white rounded shadow p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div class="text-sm text-gray-700">
          <span class="font-semibold">Filter:</span> {currentFilterLabel()}
        </div>
        <div class="flex gap-2">
          <button
            class="px-3 py-2 rounded border"
            onClick={async () => {
              await askFilterMode();
              await reloadData();
            }}
            title="Ubah rentang / mode tanggal"
          >
            Ubah Rentang
          </button>
          <button
            class="px-3 py-2 rounded border"
            onClick={async () => {
              setStartDate("");
              setEndDate("");
              await reloadData();
            }}
            title="Reset ke semua tanggal"
          >
            Reset ke Semua
          </button>
        </div>
      </div>

      <Show when={loading()}>
        <div class="p-6 bg-white rounded shadow">Loading…</div>
      </Show>
      <div class="flex gap-2 mb-6 border-b">
        <button
          class={`px-4 py-2 ${
            activeTab() === "pembelian"
              ? "border-b-2 border-blue-600 font-bold"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("pembelian")}
        >
          Laporan Pembelian
        </button>
        <button
          class={`px-4 py-2 ${
            activeTab() === "penjualan"
              ? "border-b-2 border-blue-600 font-bold"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("penjualan")}
        >
          Laporan Penjualan
        </button>
        <button
          class={`px-4 py-2 ${
            activeTab() === "summary"
              ? "border-b-2 border-blue-600 font-bold"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("summary")}
        >
          Laporan Summary
        </button>
      </div>
      <For each={sectionsData().filter((s) => s.key === activeTab())}>
        {(section) => (
          <div class="mb-12">
            <h2 class="text-xl font-bold mb-4">{section.title}</h2>

            <For each={section.blocks}>
              {(block) => {
                // ==== KODE UNTUK DEBUGGING ====

                // (function () {
                //     try {
                //       console.groupCollapsed(
                //         `[DEBUG] Laporan block key=${block?.key ?? "?"} mode=${block?.mode ?? "?"}`
                //       );

                //       console.log("page URL:", JSON.stringify(window?.location?.href ?? null, null, 2));
                //       console.log("block keys:", JSON.stringify(Object.keys(block || {}), null, 2));
                //       console.log("poRows length:", JSON.stringify((block.poRows || []).length, null, 2));
                //       console.log("customers length:", JSON.stringify((block.customers || []).length, null, 2));

                //       console.log(
                //         "poRows[0]:",
                //         JSON.stringify((block.poRows && block.poRows[0]) ?? null, null, 2)
                //       );
                //       console.log(
                //         "poRows first 3:",
                //         JSON.stringify((block.poRows || []).slice(0, 3), null, 2)
                //       );

                //       console.log("block.customers:", JSON.stringify(block.customers ?? null, null, 2));

                //       try {
                //         console.log(
                //           "salesCustomerForm():",
                //           JSON.stringify(typeof salesCustomerForm === "function" ? salesCustomerForm() : null, null, 2)
                //         );
                //       } catch (e) {
                //         console.log("salesCustomerForm() read error:", String(e));
                //       }

                //       console.groupEnd();
                //     } catch (err) {
                //       console.error("[DEBUG] unexpected error:", err);
                //     }
                //     return null;
                //   })();
                
                // ==== RENDER KHUSUS SUMMARY ====
                if (section.key === "summary" && block.key === "summary") {
                  const s = block.summaryCounts?.sales ?? {
                    total: 0,
                    invoiced: 0,
                    pending: 0,
                  };
                  const j = block.summaryCounts?.jb ?? {
                    total: 0,
                    invoiced: 0,
                    pending: 0,
                  };
                  return (
                    <div class="bg-white rounded shadow mb-8">
                      <div class="p-6 border-b">
                        <h3 class="text-lg font-semibold mb-4">
                          {block.label}
                        </h3>
                        <ApexChart
                          type="pie"
                          height={320}
                          series={block.chart.series}
                          options={{
                            labels: block.chart.categories,
                            legend: { position: "bottom" },
                            dataLabels: {
                              enabled: true,
                              formatter: (v) => `${v.toFixed(1)}%`,
                            },
                          }}
                        />
                      </div>

                      <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Kartu Penjualan */}
                        <div class="bg-white p-6 rounded shadow relative border">
                          <p class="text-sm text-gray-500">Total Penjualan</p>
                          <p class="text-3xl font-bold text-blue-600">
                            {s.total}
                          </p>
                          <div class="mt-2 text-sm text-gray-600">
                            <div>
                              Sudah Invoice: <b>{s.invoiced}</b>
                            </div>
                            <div>
                              Belum Invoice: <b>{s.pending}</b>
                            </div>
                          </div>
                          <div class="absolute top-4 right-4 flex gap-3">
                            <button
                              class="text-gray-500 hover:text-green-600"
                              title="Export Summary Penjualan ke Excel"
                              onClick={() => exportSummaryToExcel({
                                kind: 'sales',
                                data: block.rowsSales,
                                filterLabel: currentFilterLabel(),
                                token: user?.token
                              })}
                            >
                              <FileSpreadsheet size={20} />
                            </button>
                            <button
                              class="text-gray-500 hover:text-blue-600" 
                              title="Print Summary Penjualan"
                              onClick={() =>
                                printSummaryReport({
                                  kind: "sales",
                                  token: user?.token,
                                  startDate: startDate(),
                                  endDate: endDate(),
                                })
                              }
                            >
                              <Printer size={20} />
                            </button>
                          </div>
                        </div>

                        {/* Kartu Jual Beli */}
                        <div class="bg-white p-6 rounded shadow relative border">
                          <p class="text-sm text-gray-500">Total Jual Beli</p>
                          <p class="text-3xl font-bold text-blue-600">
                            {j.total}
                          </p>
                          <div class="mt-2 text-sm text-gray-600">
                            <div>
                              Sudah Ada Invoice: <b>{j.invoiced}</b>
                            </div>
                            <div>
                              Belum Ada Invoice: <b>{j.pending}</b>
                            </div>
                          </div>
                          <div class="absolute top-4 right-4 flex gap-3">
                            <button
                              class="text-gray-500 hover:text-green-600"
                              title="Export Summary Jual Beli ke Excel"
                              onClick={() => exportSummaryToExcel({
                                kind: 'jb',
                                data: block.rowsJB,
                                filterLabel: currentFilterLabel(),
                                token: user?.token
                              })}
                            >
                              <FileSpreadsheet size={20} />
                            </button>
                            <button
                              class="text-gray-500 hover:text-blue-600" 
                              title="Print Summary Jual Beli"
                              onClick={() =>
                                printSummaryReport({
                                  kind: "jual_beli",
                                  token: user?.token,
                                  startDate: startDate(),
                                  endDate: endDate(),
                                })
                              }
                            >
                              <Printer size={20} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // ==== RENDER BLOK LAIN (PEMBELIAN / PENJUALAN) ====
                const [done, notDone] = block.chart.series || [0, 0];
                const isGreige = block.key === "greige";
                return (
                  <div class="bg-white rounded shadow mb-8">
                    <div class="p-6 border-b">
                      <h3 class="text-lg font-semibold mb-4">{block.label}</h3>
                      {section.key === "penjualan" && block.key === "sales" && (
                        <div class="p-4 border-b">
                          <CustomerDropdownSearch
                            customersList={() => block.customers || []}
                            form={salesCustomerForm}
                            setForm={setSalesCustomerForm}
                            // onChangeCustomer={reloadData}
                          />
                        </div>
                      )}
                      <ApexChart
                        type="pie"
                        height={320}
                        series={block.chart.series}
                        options={{
                          labels: block.chart.categories,
                          legend: { position: "bottom" },
                          dataLabels: {
                            enabled: true,
                            formatter: (v) => `${v.toFixed(1)}%`,
                          },
                        }}
                      />
                    </div>

                    <div class="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Kartu 1: Total SJ/SJ Penjualan */}
                      <div class="bg-white p-6 rounded shadow relative border">
                        <p class="text-sm text-gray-500">
                          {totalCardLabel(section.key)}
                        </p>
                        <p class="text-3xl font-bold text-blue-600">
                          {block.sjCount}
                        </p>

                        <div class="absolute top-4 right-4 flex gap-3">
                            <button class="text-gray-500 hover:text-green-600" title="Export Laporan ke Excel"
                                onClick={() => exportDeliveryNotesToExcel({
                                  block: block,
                                  token: user?.token,
                                  startDate: startDate(),
                                  endDate: endDate(),
                                  filterLabel: currentFilterLabel(),
                                  customer_id: section.key === "penjualan" ? salesCustomerForm().customer_id : null
                                })}>
                                <FileSpreadsheet size={20} />
                            </button>
                            <button class="text-gray-500 hover:text-blue-600" title="Cetak laporan"
                                onClick={() => printDeliveryNotes(block, {
                                  token: user?.token,
                                  startDate: startDate(),
                                  endDate: endDate(),
                                  customer_id: section.key === "penjualan" ? salesCustomerForm().customer_id : null
                                })}>
                                <Printer size={20} />
                            </button>
                        </div>
                      </div>

                      {/* Kartu 2: Total Pesanan Selesai */}
                      <div class="bg-white p-6 rounded shadow relative border">
                        <p class="text-sm text-gray-500">Total Pesanan Selesai</p>
                        <p class="text-3xl font-bold text-blue-600">{done}</p>
                        <div class="absolute top-4 right-4 flex gap-3">
                          {/* Export Done */}
                          <button
                            class="text-gray-500 hover:text-green-600"
                            title="Export Laporan ke Excel"
                            onClick={() => {
                              // ambil selected id saat klik
                              const selectedCustomerId = section.key === "penjualan" ? salesCustomerForm().customer_id : null                            

                              const filteredPoRows = (block.poRows || []).filter((r) =>
                                matchesCustomer(r, selectedCustomerId)
                              );

                              exportPOStatusToExcel({
                                block: block,
                                status: "done",
                                filterLabel: currentFilterLabel(),
                                token: user?.token,
                                poRows: filteredPoRows, // <-- hasil filter
                                isGreige: isGreige,
                                PO_DETAIL_FETCHER: PO_DETAIL_FETCHER,
                                customer_id: selectedCustomerId,
                              });
                            }}
                          >
                            <FileSpreadsheet size={20} />
                          </button>

                          {/* Print Done */}
                          <button
                            class="text-gray-500 hover:text-blue-600"
                            title="Cetak daftar PO/ SO yang selesai"
                            onClick={() => {
                              const selectedCustomerId = section.key === "penjualan" ? salesCustomerForm().customer_id : null

                              const filteredPoRows = (block.poRows || []).filter((r) =>
                                matchesCustomer(r, selectedCustomerId)
                              );

                              printPOStatus({
                                block: block,
                                status: "done",
                                poRows: filteredPoRows,
                                startDate: startDate(),
                                endDate: endDate(),
                                token: user?.token,
                                PO_DETAIL_FETCHER: PO_DETAIL_FETCHER,
                                customer_id: selectedCustomerId,
                              });
                            }}
                          >
                            <Printer size={20} />
                          </button>
                        </div>
                      </div>

                      {/* Kartu 3: Total Pesanan Belum Selesai */}
                      <div class="bg-white p-6 rounded shadow relative border">
                        <p class="text-sm text-gray-500">Total Pesanan Belum Selesai</p>
                        <p class="text-3xl font-bold text-blue-600">{notDone}</p>
                        <div class="absolute top-4 right-4 flex gap-3">
                          {/* Export Not Done */}
                          <button
                            class="text-gray-500 hover:text-green-600"
                            title="Export Laporan ke Excel"
                            onClick={() => {
                              const selectedCustomerId =  section.key === "penjualan" ? salesCustomerForm().customer_id : null;

                              const filteredPoRows = (block.poRows || []).filter((r) =>
                                matchesCustomer(r, selectedCustomerId)
                              );

                              exportPOStatusToExcel({
                                block: block,
                                status: "not_done",
                                filterLabel: currentFilterLabel(),
                                token: user?.token,
                                poRows: filteredPoRows,
                                isGreige: isGreige,
                                PO_DETAIL_FETCHER: PO_DETAIL_FETCHER,
                                customer_id: selectedCustomerId,
                              });
                            }}
                          >
                            <FileSpreadsheet size={20} />
                          </button>

                          {/* Print Not Done */}
                          <button
                            class="text-gray-500 hover:text-blue-600"
                            title="Cetak daftar PO/ SO yang belum selesai"
                            onClick={() => {
                              const selectedCustomerId = section.key === "penjualan" ? salesCustomerForm().customer_id : null;

                              const filteredPoRows = (block.poRows || []).filter((r) =>
                                matchesCustomer(r, selectedCustomerId)
                              );

                              printPOStatus({
                                block: block,
                                status: "not_done",
                                poRows: filteredPoRows,
                                startDate: startDate(),
                                endDate: endDate(),
                                token: user?.token,
                                PO_DETAIL_FETCHER: PO_DETAIL_FETCHER,
                                customer_id: selectedCustomerId,
                              });
                            }}
                          >
                            <Printer size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        )}
      </For>

      <Show when={!loading() && sectionsData().length === 0}>
        <div class="p-6 bg-white rounded shadow text-gray-500">
          Tidak ada laporan yang dapat ditampilkan untuk akun ini.
        </div>
      </Show>
    </MainLayout>
  );
}
