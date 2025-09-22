import MainLayout from "../layouts/MainLayout";
import { onMount, createSignal, For, Show } from "solid-js";
import ApexChart from "../components/ApexChart";
import { Printer } from "lucide-solid";
import {
  hasPermission,
  getAllBGDeliveryNotes,
  getAllOCDeliveryNotes,
  getAllKJDeliveryNotes,
  getAllJBDeliveryNotes,
  getAllDeliveryNotes,
  getUser,
  getBGDeliveryNotes,
  getOCDeliveryNotes,
  getKJDeliveryNotes,
  getJBDeliveryNotes,
  getSalesOrders,
} from "../utils/auth";

export default function Dashboard() {
  const user = getUser();

  // ==== FORMATTER ====

  function formatTanggalIndo(tanggalString) {
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
  }

  // helper parse tanggal aman (drop time)
  const normalizeDate = (d) => {
    if (!d) return null;
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return null;
    return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  };

  // ==== Helpers ====
  const refLabelFor = (mode, blockKey) => {
    if (mode === "penjualan") return "No SO";
    if (blockKey === "jual_beli") return "No PC";
    return "No PO";
  };

  // ambil nilai No.Ref per baris (untuk print)
  const refValueFor = (row, mode, blockKey) => {
    if (mode === "penjualan") return row.no_so ?? "-";
    if (blockKey === "jual_beli") return row.no_jb ?? row.no_pc ?? "-";
    return row.no_po ?? row.no_pc ?? "-";
  };

  const uniqueJoin = (arr, sep = ", ") => {
    const s = Array.from(new Set(arr.filter(Boolean)));
    return s.length ? s.join(sep) : "";
  };

  // ==== Config section + Datasource ====
  const SECTIONS = [
    {
      key: "pembelian",
      title: "Laporan Pembelian",
      blocks: [
        { 
          key: "greige",    
          label: "Pembelian Greige",      
          perm: "view_purchase_greige_surat_jalan",  
          fetcher: getAllBGDeliveryNotes 
        },
        { 
          key: "oc",        
          label: "Pembelian Order Celup",  
          perm: "view_purchase_celup_surat_jalan",   
          fetcher: getAllOCDeliveryNotes 
        },
        { 
          key: "kain_jadi", 
          label: "Pembelian Kain Jadi",   
          perm: "view_purchase_finish_surat_jalan",  
          fetcher: getAllKJDeliveryNotes 
        },
        { 
          key: "jual_beli", 
          label: "Jual Beli",    
          perm: "view_jual_beli_surat_jalan",        
          fetcher: getAllJBDeliveryNotes 
        },
      ],
    },
    {
      key: "penjualan",
      title: "Laporan Penjualan",
      blocks: [
        { 
          key: "sales",     
          label: "Surat Jalan",             
          perm: "view_surat_jalan",                  
          fetcher: getAllDeliveryNotes 
        },
      ],
    },
  ];

  // ---- state
  const [sectionsData, setSectionsData] = createSignal([]);
  const [loading, setLoading] = createSignal(true);

  // filter tanggal (range created_at)
  const [startDate, setStartDate] = createSignal("");
  const [endDate, setEndDate] = createSignal("");

  // ---- helpers
  const rowsFromResponse = (res) =>
    res?.suratJalans ?? res?.surat_jalan_list ?? res?.data ?? [];

  const HARD_DONE = 35;     // hardcode sementara
  const HARD_NOTDONE = 15;  // hardcode sementara

  const buildChart = () => ({
    series: [HARD_DONE, HARD_NOTDONE],
    categories: ["Selesai", "Belum Selesai"],
  });

  const totalCardLabel = (mode) =>
    mode === "penjualan" ? "Total Surat Jalan" : "Total Surat Penerimaan";

  // filter berdasarkan created_at (inklusif)
  const filterByDate = (rows) => {
    const s = normalizeDate(startDate());
    const e = normalizeDate(endDate());
    if (!s && !e) return rows;
    return rows.filter((r) => {
      const d = normalizeDate(r.created_at);
      if (d === null) return false;
      if (s && d < s) return false;
      if (e && d > e) return false;
      return true;
    });
  };

  // map block.key -> detail fetcher
  const getDetailFetcher = (blockKey) => {
    switch (blockKey) {
      case "greige": return getBGDeliveryNotes;
      case "oc": return getOCDeliveryNotes;
      case "kain_jadi": return getKJDeliveryNotes;
      case "jual_beli": return getJBDeliveryNotes;
      default: return null; // sales belum diperdalam (sesuai catatanmu)
    }
  };

  // panggil detail API dgn urutan argumen fleksibel (id, token) ATAU (token, id)
  const safeDetailCall = async (fn, id, token) => {
    try {
      return await fn(id, token);
    } catch {
      try {
        return await fn(token, id);
      } catch {
        return null;
      }
    }
  };

  const openPrintWindow = (title, rows, mode, showGrade, blockKey) => {
    const sorted = [...rows].sort((a,b) => {
      const da = normalizeDate(a.created_at) ?? 0;
      const db = normalizeDate(b.created_at) ?? 0;
      return da - db;
    });

    const w = window.open("", "", "height=700,width=980");
    const style = `
      <style>
        @page { 
          size: A4; 
          margin: 8mm; 
        }
        @media print { 
          html, body { 
            width: 210mm; 
          } 
        }

        body{ 
          font-family:ui-sans-serif,system-ui,Segoe UI,Helvetica,Arial; 
          margin:0;
          display: flex;
          justify-content: center; 
        }

        .paper{
          width: 100%;
          max-width: calc(210mm - 8mm);
        }

        h1{
          margin:0 0 8mm 0 
        }

        table{
          border-collapse: collapse;
          width: 100%;              /* isi penuh area .paper */
          table-layout: fixed;
          margin: 0 auto;           /* jaga-jaga kalau width < 100% */
        }
          
        th,td{ 
          border:1px solid #000000ff; 
          padding:3px 4px; 
          font-size:10px; 
          word-wrap:break-word; 
        }
        th{ 
          background:#DADBDD; 
          text-align:left 
        }
        .muted{ 
          color:#6b7280; 
          font-size:10px; 
        }

        thead th:nth-child(1){width:3%; text-align:center}    /* No */
        thead th:nth-child(2){width:9%; text-align:center}    /* Tgl */
        thead th:nth-child(3){width:13%; text-align:center}   /* No SJ */
        thead th:nth-child(4){width:14%; text-align:center}   /* No Ref */
        thead th:nth-child(5){width:15%; text-align:center}   /* Supplier/Customer */
        thead th:nth-child(6){width:9%; text-align:center}    /* Warna */
        ${showGrade ? `thead th:nth-child(7){width:6%; text-align:center}` : ""}
        thead th:nth-child(${showGrade ? 8 : 7}){width:15%; text-align:center} /* Kain */
        thead th:nth-child(${showGrade ? 9 : 8}){width:12%; text-align:center} /* Total Meter */
        thead th:nth-child(${showGrade ? 10 : 9}){width:12%; text-align:center}/* Total Yard */
        thead th:nth-child(${showGrade ? 11 : 10}){width:12%; text-align:center}/* Total Kg */

        /* center warna & kain */
        thead th:nth-child(6), tbody td:nth-child(6){ text-align:center; }
        ${showGrade
          ? `thead th:nth-child(8), tbody td:nth-child(8){ text-align:center; }`
          : `thead th:nth-child(7), tbody td:nth-child(7){ text-align:center; }`
        }

        tbody td:nth-child(${showGrade ? 9 : 8}),
        tbody td:nth-child(${showGrade ? 10 : 9}),
        tbody td:nth-child(${showGrade ? 11 : 10}){ text-align:center; }
      </style>`;
    const header = `<h1>${title}</h1><div>Tanggal cetak: ${new Date().toLocaleString()}</div><br/>`;
    const relasiHeader = mode === "penjualan" ? "Customer" : "Supplier";
    const refLabel = refLabelFor(mode, blockKey);

    const thead =
      `<tr>
        <th>No</th>
        <th>Tgl</th>
        <th>No SJ</th>
        <th>${refLabel}</th>
        <th>${relasiHeader}</th>
        <th>Warna</th>` +
      (showGrade ? `<th>Grade</th>` : ``) +
      `<th>Kain</th>
        <th>Total Meter</th>
        <th>Total Yard</th>
        <th>Total Kg</th>
      </tr>`;

    const tbody = sorted.map((r,i)=>`
      <tr>
        <td>${i+1}</td>
        <td>${formatTanggalIndo(r.created_at ?? "-")}</td>
        <td>${r.no_sj ?? "-"}</td>
        <td>${refValueFor(r, mode, blockKey)}</td>
        <td>${r.supplier_name ?? r.customer_name ?? "-"}</td>
        <td>${r.kode_warna ?? r.warna_kode ?? r.warna ?? "-"}</td>
        ${showGrade ? `<td>${r.grade_name ?? "-"}</td>` : ``}
        <td>${r.corak_kain ?? "-"}</td>
        <td>${r.meter_total ?? r.summary?.total_meter ?? "-"}</td>
        <td>${r.yard_total ?? r.summary?.total_yard ?? "-"}</td>
        <td>${r.total_kilogram ?? r.summary?.total_kilogram ?? "-"}</td>
      </tr>`).join("");

    const table = `<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
    const bodyHtml = `<div class="paper">${header}${table}</div>`;

    w.document.write(
      `<html><head><title>${title}</title>${style}</head><body>${bodyHtml}</body></html>`
    );
    w.document.close(); w.focus(); w.print();
  };

  const handlePrint = async (block) => {
    const res = await block.rawFetcher(user?.token);
    const baseRows = filterByDate(rowsFromResponse(res));

    // ===== Pembelian (gunakan detail BG/OC/KJ/JB untuk melengkapi kolom) =====
    const detailFn = getDetailFetcher(block.key);
    if (detailFn) {
      const MAX_CONC = 5;
      const queue = [...baseRows];
      const enriched = [];

      const worker = async () => {
        const row = queue.shift();
        if (!row) return;

        try {
          const det = await safeDetailCall(detailFn, row.id, user?.token);
          const sj = det?.suratJalan;
          const items = sj?.items ?? [];

          // ambil dari items (kalau list getAll kamu sudah punya items seperti BG, ini akan terisi)
          const warna = uniqueJoin(items.map(it => it.kode_warna ?? it.warna_kode ?? it.warna ?? null));
          const kain  = uniqueJoin(items.map(it => it.corak_kain ?? null));

          enriched.push({
            ...row,
            supplier_name: sj?.supplier_name ?? row.supplier_name,
            customer_name: sj?.customer_name ?? row.customer_name,
            no_po: sj?.no_po ?? row.no_po,
            no_pc: sj?.no_pc ?? row.no_pc,
            no_jb: sj?.no_jb ?? row.no_jb,
            // PAKAI hasil agregasi, jangan sj?.corak_kain (itu memang undefined)
            kode_warna: warna || row.kode_warna || row.warna_kode || row.warna || "-",
            corak_kain: kain  || row.corak_kain || "-",
            // grade pembelian disembunyikan di print (showGrade = false)
          });
        } catch {
          enriched.push(row);
        }

        return worker();
      };

      await Promise.all(Array.from({ length: Math.min(MAX_CONC, queue.length) }, worker));
      openPrintWindow(`Laporan - ${block.label}`, enriched, block.mode, /*showGrade*/ false, block.key);
      return;
    }

    // ===== Penjualan (gunakan SO by id untuk lengkapi warna/grade/kain) =====
    if (block.mode === "penjualan") {
      const MAX_CONC = 5;
      const queue = [...baseRows];
      const enriched = [];

      const worker = async () => {
        const row = queue.shift();
        if (!row) return;

        const soId = row.so_id ?? row.soId ?? null;
        if (!soId) { enriched.push(row); return worker(); }

        try {
          const soRes = await safeDetailCall(getSalesOrders, soId, user?.token);
          const so = soRes?.order;
          const items = so?.items ?? [];

          const warna = uniqueJoin(items.map((it) => it.kode_warna ?? null));
          const grade = uniqueJoin(items.map((it) => it.grade_name ?? null));
          const kain  = uniqueJoin(items.map((it) => it.corak_kain ?? null));

          enriched.push({
            ...row,
            no_so: so?.no_so ?? row.no_so,
            customer_name: so?.customer_name ?? row.customer_name,
            kode_warna: warna || row.kode_warna || "-",
            grade_name: grade || row.grade_name || "-",
            corak_kain: kain || row.corak_kain || "-",
          });
        } catch {
          enriched.push(row);
        }

        return worker();
      };

      await Promise.all(Array.from({ length: Math.min(MAX_CONC, queue.length) }, worker));
      openPrintWindow(`Laporan - ${block.label}`, enriched, block.mode, /*showGrade*/ true, block.key);
      return;
    }

    // ===== Fallback =====
    openPrintWindow(`Laporan - ${block.label}`, baseRows, block.mode, true, block.key);
  };


  // memuat & menghitung sesuai filter tanggal
  const reloadData = async () => {
    setLoading(true);
    const assembled = [];

    for (const sec of SECTIONS) {
      const blocks = [];
      for (const b of sec.blocks) {
        if (!hasPermission(b.perm)) continue;
        try {
          const res = await b.fetcher(user?.token);
          const list = filterByDate(rowsFromResponse(res));
          blocks.push({
            key: b.key,
            label: b.label,
            count: Array.isArray(list) ? list.length : 0,
            chart: buildChart(),
            rawFetcher: b.fetcher,
            mode: sec.key,
          });
        } catch {
          blocks.push({ 
            key: b.key, 
            label: b.label, 
            count: 0, 
            chart: buildChart(), 
            rawFetcher: b.fetcher,
            mode: sec.key,
          });
        }
      }
      if (blocks.length) assembled.push({ key: sec.key, title: sec.title, blocks });
    }

    setSectionsData(assembled);
    setLoading(false);
  };

  // ===== LOAD DATA ====
  onMount(async () => {
    await reloadData();
  });

  // ==== RETURN VIEW ====
  return (
    <MainLayout>
      <h1 class="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Filter tanggal (created_at) */}
      <div class="bg-white rounded shadow p-4 mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label class="block text-xs text-gray-500 mb-1">Dari Tanggal</label>
          <input
            type="date"
            class="border rounded px-2 py-1"
            value={startDate()}
            onInput={(e) => setStartDate(e.currentTarget.value)}
          />
        </div>
        <div>
          <label class="block text-xs text-gray-500 mb-1">Sampai Tanggal</label>
          <input
            type="date"
            class="border rounded px-2 py-1"
            value={endDate()}
            onInput={(e) => setEndDate(e.currentTarget.value)}
          />
        </div>
        <button
          class="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
          onClick={reloadData}
        >
          Terapkan
        </button>
        <button
          class="px-3 py-2 rounded border"
          onClick={() => { setStartDate(""); setEndDate(""); reloadData(); }}
        >
          Reset
        </button>
      </div>

      <Show when={loading()}>
        <div class="p-6 bg-white rounded shadow">Loading…</div>
      </Show>

      <For each={sectionsData()}>
        {(section) => (
          <div class="mb-12">
            <h2 class="text-xl font-bold mb-4">{section.title}</h2>

            {/* === per-sub laporan === */}
            <For each={section.blocks}>
              {(block) => (
                <div class="bg-white rounded shadow mb-8">
                  {/* Chart per block */}
                  <div class="p-6 border-b">
                    <h3 class="text-lg font-semibold mb-4">{block.label}</h3>
                    <ApexChart
                      type="pie"
                      height={320}
                      series={block.chart.series}
                      options={{
                        labels: block.chart.categories,
                        legend: { position: "bottom" },
                        dataLabels: { enabled: true, formatter: (v) => `${v.toFixed(1)}%` },
                      }}
                    />
                  </div>

                  {/* 3 kartu di bawah chart */}
                  <div class="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Total Surat */}
                    <div class="bg-white p-6 rounded shadow relative border">
                      <p class="text-sm text-gray-500">{totalCardLabel(block.mode)}</p>
                      <p class="text-3xl font-bold text-blue-600">{block.count}</p>
                      <button
                        class="absolute top-4 right-4 text-gray-500 hover:text-blue-600"
                        title="Cetak laporan"
                        onClick={() => handlePrint(block)}
                      >
                        <Printer size={20} />
                      </button>
                    </div>

                    {/* Selesai (hardcode) */}
                    <div hidden class="bg-white p-6 rounded shadow relative border">
                      <p class="text-sm text-gray-500">Total Pesanan Selesai</p>
                      <p class="text-3xl font-bold text-blue-600">{HARD_DONE}</p>
                      <button
                        class="absolute top-4 right-4 text-gray-400 cursor-not-allowed"
                        title="Print hanya untuk Total Surat"
                        disabled
                      >
                        <Printer size={20} />
                      </button>
                    </div>

                    {/* Belum selesai (hardcode) */}
                    <div hidden class="bg-white p-6 rounded shadow relative border">
                      <p class="text-sm text-gray-500">Total Pesanan Belum Selesai</p>
                      <p class="text-3xl font-bold text-blue-600">{HARD_NOTDONE}</p>
                      <button
                        class="absolute top-4 right-4 text-gray-400 cursor-not-allowed"
                        title="Print hanya untuk Total Surat"
                        disabled
                      >
                        <Printer size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
