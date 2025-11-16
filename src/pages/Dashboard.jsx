import MainLayout from "../layouts/MainLayout";
import { onMount, createSignal, createMemo, createEffect, For, Show } from "solid-js";
import ApexChart from "../components/ApexChart";
import { Printer, FileSpreadsheet, Funnel } from "lucide-solid";
import Litepicker from "litepicker";
import Swal from "sweetalert2";
import { exportDeliveryNotesToExcel } from "../helpers/export_excel/delivery-notes-excel-export";
import { exportPOStatusToExcel } from "../helpers/export_excel/po-status-excel-export";
import { exportSummaryToExcel } from "../helpers/export_excel/summary-excel-export";

import OutstandingPreviewModal from "./reports/OutstandingPreviewModal";
import CustomerDropdownSearch from "../components/CustomerDropdownSearch";
import SupplierDropdownOutstanding from "../components/SupplierDropdownOutstanding";
import ColorDropdownOutstanding from "../components/ColorDropdownOutstanding";
import FabricDropdownOutstanding from "../components/FabricDropdownOutstanding";
import CustomerDropdownOutstanding from "../components/CustomerDropdownOutstanding";

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
  
  // ==== DATA MASTER ====
  getAllSuppliers,
  getAllColors,
  getAllFabrics,
  getAllCustomers,
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

  // ==== STATE UNTUK FILTER OUTSTANDING ====
  const [outstandingFilters, setOutstandingFilters] = createSignal({});
  const [outstandingLoading, setOutstandingLoading] = createSignal(false);
  const [filterButtonLoading, setFilterButtonLoading] = createSignal(false);
  const [applyFilterLoading, setApplyFilterLoading] = createSignal(false);
  const [showOutstandingModal, setShowOutstandingModal] = createSignal(false);
  const [currentOutstandingBlock, setCurrentOutstandingBlock] = createSignal(null);
  const [showOutstandingPreview, setShowOutstandingPreview] = createSignal(false);
  const [previewData, setPreviewData] = createSignal({
    block: null,
    poRows: [],
    outstanding_filter: null
  });
  const [masterData, setMasterData] = createSignal({
    suppliers: [],
    colors: [],
    fabrics: [],
    customers: []
  });

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

  // ==== FUNGSI UNTUK FILTER OUTSTANDING ====
  const loadMasterData = async () => {
    try {
      const [suppliersRes, colorsRes, fabricsRes, customersRes] = await Promise.all([
        getAllSuppliers(user?.token),
        getAllColors(user?.token),
        getAllFabrics(user?.token),
        getAllCustomers(user?.token)
      ]);

      // Ekstrak dan normalisasi data suppliers
      const suppliersArray = suppliersRes?.suppliers || suppliersRes?.data || suppliersRes || [];
      const mappedSuppliers = suppliersArray.map(s => ({ 
        ...s,
        id: s.id,
        nama: s.nama || s.name,
        kode: s.kode || s.supplier_kode
      }));

      // Ekstrak dan normalisasi data colors
      const colorsArray = colorsRes?.warna || colorsRes?.data || colorsRes || [];
      const mappedColors = colorsArray.map(c => ({
        ...c,
        id: c.id,
        kode_warna: c.kode_warna || c.kode,
        deskripsi_warna: c.deskripsi_warna || c.deskripsi,
        nama: c.nama
      }));

      // Ekstrak dan normalisasi data fabrics
      const fabricsArray = fabricsRes?.kain || fabricsRes?.data || fabricsRes || [];
      const mappedFabrics = fabricsArray.map(f => ({
        ...f, 
        id: f.id,
        corak_kain: f.corak_kain || f.corak,
        konstruksi_kain: f.konstruksi_kain || f.konstruksi,
        nama: f.nama
      }));

      const customersArray = customersRes?.customers || customersRes?.data || customersRes || [];
      const mappedCustomers = customersArray.map(c => ({
        ...c,
        id: c.id,
        nama: c.nama || c.name,
        kode: c.kode || c.customer_kode
      }));

      setMasterData({
        suppliers: mappedSuppliers,
        colors: mappedColors,
        fabrics: mappedFabrics,
        customers: mappedCustomers,
      });
      
    } catch (error) {
      console.error("Gagal memuat data master:", error);
    }
  };

  const openOutstandingFilter = async (block) => {
    setFilterButtonLoading(true);
    setCurrentOutstandingBlock(block);
    
    try {
      const isPenjualan = block.mode === "penjualan";

      // Load filter yang sudah ada untuk block ini
      const existingFilter = outstandingFilters()[block.key] || {
        // Untuk penjualan: customer_id, untuk pembelian: supplier_id
        ...(isPenjualan ? { customer_id: null } : { supplier_id: null }),
        color_id: null,
        fabric_id: null,
        start_date: startDate(),
        end_date: endDate(),    
      };
        
      setOutstandingFilters(prev => ({
        ...prev,
        [block.key]: existingFilter
      }));
      
      // Tampilkan modal filter outstanding
      setShowOutstandingModal(true);
    } catch (error) {
      console.error("Error opening filter modal:", error);
      Swal.fire("Error", "Gagal membuka filter", "error");
    } finally {
      setFilterButtonLoading(false);
    }
  };

  const applyFilterFromPreview = async () => {
    setApplyFilterLoading(true);
    const preview = previewData();
    
    try {
      if (preview.block && preview.outstanding_filter) {
        setOutstandingFilters(prev => ({
          ...prev,
          [preview.block.key]: preview.outstanding_filter
        }));
        setShowOutstandingPreview(false);
        
        // Tampilkan loading di dashboard selama reload data
        setLoading(true);
        await reloadData(); // Reload data dengan filter yang baru
      }
    } catch (error) {
      console.error("Error applying filter:", error);
      Swal.fire("Error", "Gagal menerapkan filter", "error");
    } finally {
      setApplyFilterLoading(false);
    }
  };

  // Fungsi untuk cancel filter dari preview  
  const cancelFilterFromPreview = () => {
    setShowOutstandingPreview(false);
  };

  const applyOutstandingFilter = async () => {
    setOutstandingLoading(true);
    setShowOutstandingModal(false);
    try {
      await reloadData(); // Reload data dengan filter outstanding baru
    } catch (error) {
      console.error("Error applying outstanding filter:", error);
    } finally {
      setOutstandingLoading(false);
    }
  }

  const clearOutstandingFilter = async (blockKey) => {
    setOutstandingLoading(true);
    try {
      setOutstandingFilters(prev => {
        const newFilters = { ...prev };
        delete newFilters[blockKey];
        return newFilters;
      });
      await reloadData();
    } catch (error) {
      console.error("Error clearing outstanding filter:", error);
      Swal.fire("Error", "Gagal menghapus filter", "error");
    } finally {
      setOutstandingLoading(false);
    }
  };

  const getOutstandingFilterLabel = (block) => {
    const filter = outstandingFilters()[block?.key];
    
    const parts = [];

    // Tampilkan filter customer dari salesCustomerForm untuk penjualan
    if (block.mode === "penjualan") {
      const customerFromForm = salesCustomerForm().customer_id 
        ? masterData().customers.find(c => c.id == salesCustomerForm().customer_id)
        : null;
        
      const customerFromFilter = filter?.customer_id 
        ? masterData().customers.find(c => c.id == filter.customer_id)
        : null;

      if (customerFromForm) {
        parts.push(`Customer: ${customerFromForm.nama}`);
      }
      if (customerFromFilter && customerFromFilter.id !== customerFromForm?.id) {
        parts.push(`Customer (Filter): ${customerFromFilter.nama}`);
      }
    }

    if (filter) {
      if (filter.start_date && filter.end_date) {
        parts.push(`Tanggal: ${filter.start_date} s/d ${filter.end_date}`);
      }
      
      // Untuk penjualan, jika ada customer_id di outstanding filter, tampilkan juga
      if (block.mode === "penjualan" && filter.customer_id) {
        const customer = masterData().customers.find(c => c.id == filter.customer_id);
        if (customer) parts.push(`Customer (Filter): ${customer.nama}`);
      }
      
      // Untuk pembelian, tampilkan supplier
      if (block.mode === "pembelian" && filter.supplier_id) {
        const supplier = masterData().suppliers.find(s => s.id == filter.supplier_id);
        if (supplier) parts.push(`Supplier: ${supplier.nama || supplier.name}`);
      }
      
      if (filter.color_id) {
        const color = masterData().colors.find(c => c.id == filter.color_id);
        if (color) parts.push(`Warna: ${color.kode_warna || color.kode}`);
      }
      if (filter.fabric_id) {
        const fabric = masterData().fabrics.find(f => f.id == filter.fabric_id);
        if (fabric) parts.push(`Kain: ${fabric.corak_kain || fabric.corak}`);
      }
    }

    return parts.length > 0 ? parts.join(", ") : null;
  };

  // Fungsi untuk memfilter PO berdasarkan kriteria outstanding
  const filterPOByOutstanding = (poRows, blockKey, mode = "pembelian") => {
    const filter = outstandingFilters()[blockKey];

    // Jika tidak ada filter outstanding, tetap terapkan filter customer dari salesCustomerForm untuk penjualan
    if (!filter) {
      if (mode === "penjualan" && salesCustomerForm().customer_id) {
        return poRows.filter(po => matchesCustomer(po, salesCustomerForm().customer_id));
      }
      return poRows;
    }

    return poRows.filter(po => {
      // Filter customer untuk penjualan
      if (mode === "penjualan") {
        const targetCustomerId = filter.customer_id || salesCustomerForm().customer_id;
        if (targetCustomerId && !matchesCustomer(po, targetCustomerId)) {
          return false;
        }
      } else {
        // Pembelian - filter supplier
        if (filter.supplier_id && po.supplier_id != filter.supplier_id) {
          return false;
        }
      }

      // Filter warna dan kain
      if (filter.color_id || filter.fabric_id) {
        const hasMatchingItem = po.items?.some(item => {
          // Dapatkan kode warna dari filter color_id
          const filterColor = masterData().colors.find(c => c.id == filter.color_id);
          const filterColorCode = filterColor?.kode_warna || filterColor?.kode;
          
          // Dapatkan corak kain dari filter fabric_id  
          const filterFabric = masterData().fabrics.find(f => f.id == filter.fabric_id);
          const filterFabricPattern = filterFabric?.corak_kain || filterFabric?.corak;

          // CARI FIELD WARNA DENGAN BERBAGAI KEMUNGKINAN
          let itemColor = null;
          const colorFields = ['kode_warna', 'warna_kode', 'color_code', 'warna', 'color', 'warna_nama'];
          for (const field of colorFields) {
            if (item[field]) {
              itemColor = item[field];
              break;
            }
          }

          // CARI FIELD CORAK DENGAN BERBAGAI KEMUNGKINAN
          let itemCorak = null;
          const corakFields = ['corak_kain', 'corak', 'fabric_pattern', 'fabric', 'kain_nama'];
          for (const field of corakFields) {
            if (item[field]) {
              itemCorak = item[field];
              break;
            }
          }

          // Filter warna
          const colorMatch = !filter.color_id || 
            (itemColor && filterColorCode && itemColor.toString().trim() === filterColorCode.toString().trim());
          
          // Filter kain
          const fabricMatch = !filter.fabric_id ||
            (itemCorak && filterFabricPattern && itemCorak.toString().trim() === filterFabricPattern.toString().trim());

          return colorMatch && fabricMatch;
        });

        if (!hasMatchingItem) {
          return false;
        }
      }

      // Filter tanggal outstanding
      if (filter.start_date || filter.end_date) {
        const poDate = new Date(po.created_at || po.tanggal);
        const poDateOnly = new Date(poDate.getFullYear(), poDate.getMonth(), poDate.getDate()).getTime();
        
        if (filter.start_date) {
          const startDate = new Date(filter.start_date);
          const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
          if (poDateOnly < startDateOnly) {
            return false;
          }
        }
        
        if (filter.end_date) {
          const endDate = new Date(filter.end_date);
          const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
          if (poDateOnly > endDateOnly) {
            return false;
          }
        }
      }

      return true;
    });
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
      let id = r?.customer_id || r?.buyer_id || r?.customer?.id || r?.buyer?.id;
      let kode = r?.customer_kode || r?.buyer_kode || r?.customer?.kode || r?.buyer?.kode || "";
      let nama = r?.customer_name || r?.buyer_name || r?.customer?.name || r?.customer?.nama || r?.buyer?.nama || "";

      // Jika tidak ada id, tapi ada nama, gunakan nama sebagai identifier
      const mapKey = id ? String(id) : nama ? `name:${nama}` : null;
      if (!mapKey) continue;

      if (!map.has(mapKey)) {
        map.set(mapKey, {
          id: id || `name:${nama}`, // Jika tidak ada ID, gunakan format name:Nama
          kode,
          nama,
        });
      }
    }
    
    return Array.from(map.values());
  };

  // util untuk cek apakah baris cocok dengan selectedCustomerId (bisa number id atau "name:..." fallback)
  const matchesCustomer = (row, selectedCustomerId) => {
    if (!selectedCustomerId) return true;

    const sel = String(selectedCustomerId);
    
    // **PERBAIKAN: Untuk penjualan, gunakan customer_name sebagai fallback**
    const cid = row?.customer_id || row?.buyer_id || row?.customer?.id || row?.buyer?.id;
    const cname = row?.customer_name || row?.buyer_name || row?.customer?.name || row?.customer?.nama || row?.buyer?.nama;

    // 1) match by id (jika ada)
    if (cid !== null && cid !== undefined && String(cid) === sel) {
      return true;
    }

    // 2) match by name key "name:Nama"
    if (cname && `name:${cname}` === sel) {
      return true;
    }

    // 3) direct name equality
    if (cname && String(cname) === sel) {
      return true;
    }

    // **PERBAIKAN BARU: 4) Cari customer di masterData berdasarkan selectedCustomerId dan bandingkan nama**
    if (cname && masterData().customers.length > 0) {
      const selectedCustomer = masterData().customers.find(c => c.id == selectedCustomerId);
      if (selectedCustomer && selectedCustomer.nama && cname.toLowerCase() === selectedCustomer.nama.toLowerCase()) {
        return true;
      }
    }

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
          const list = filterByDate(rowsFromResponse(poList));
          
          // FETCH DETAIL SETIAP PO UNTUK DAPATKAN DATA LENGKAP
          poRows = await Promise.all(
            list.map(async (po) => {
              try {
                const detail = await PO_DETAIL_FETCHER[key]?.(po.id, user?.token);
                
                // DEBUG DETAIL RESPONSE
                // console.log(`=== DETAIL RESPONSE FOR PO ${po.id} (${key}) ===`);
                // console.log("Detail response structure:", JSON.stringify({
                //   hasDetail: !!detail,
                //   detailKeys: detail ? Object.keys(detail) : [],
                //   hasOrder: detail?.order ? Object.keys(detail.order) : [],
                //   hasMainRow: detail?.mainRow ? Object.keys(detail.mainRow) : [],
                //   orderItems: detail?.order?.items ? detail.order.items.length : 0,
                //   mainRowItems: detail?.mainRow?.items ? detail.mainRow.items.length : 0
                // }, null, 2));

                // CARI ITEMS DARI BERBAGAI LOKASI YANG MUNGKIN
                let items = [];
                if (detail?.order?.items) {
                  items = detail.order.items;
                  //console.log(`Using items from detail.order.items for PO ${po.id}`);
                } else if (detail?.mainRow?.items) {
                  items = detail.mainRow.items;
                  //console.log(`Using items from detail.mainRow.items for PO ${po.id}`);
                } else if (detail?.items) {
                  items = detail.items;
                  //console.log(`Using items from detail.items for PO ${po.id}`);
                } else if (po.items) {
                  items = po.items;
                  //console.log(`Using items from po.items for PO ${po.id}`);
                }

                // DEBUG ITEMS STRUCTURE
                // if (items.length > 0) {
                //   console.log(`=== ITEMS STRUCTURE FOR PO ${po.id} ===`);
                //   console.log("First item:", JSON.stringify(items[0], null, 2));
                //   console.log("First item keys:", JSON.stringify(Object.keys(items[0]), null, 2));
                // }

                return {
                  ...po,
                  items: items,
                  // Pastikan supplier_id tersedia
                  supplier_id: po.supplier_id || detail?.order?.supplier_id || detail?.mainRow?.supplier_id
                };
              } catch (error) {
                console.error(`Gagal fetch detail PO ${po.id}:`, error);
                return po; // Fallback ke data asli
              }
            })
          );
        } catch (error) {
          console.error(`Gagal fetch PO list untuk ${key}:`, error);
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

        // Terapkan filter outstanding untuk pembelian / penjualan
        let finalPoRows = filteredPoRows;
        if (sec.key === "pembelian" || sec.key === "penjualan") {
          finalPoRows = filterPOByOutstanding(filteredPoRows, key, sec.key);
        }

        // override with filtered results (only for penjualan this changes, for pembelian selectedCustomerId is null so no filter)
        sjCount = filteredSJRows.length;
        poRows = finalPoRows;

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
    await loadMasterData(); // Load data master untuk filter
    await reloadData();
  });

  const totalCardLabel = (mode) =>
    mode === "penjualan" ? "Total Surat Jalan" : "Total Surat Penerimaan";

  // ==== MODAL FILTER OUTSTANDING ====
  const OutstandingFilterModal = () => {
    const block = currentOutstandingBlock();
    const showModal = showOutstandingModal();

    if (!block || !showModal) {
      return null;
    }

    const isPenjualan = block.mode === "penjualan";

    const currentFilter = createMemo(() => {
      return outstandingFilters()[block.key] || {
        // Untuk penjualan: customer_id, untuk pembelian: supplier_id
        ...(isPenjualan ? { customer_id: null } : { supplier_id: null }),
        color_id: null,
        fabric_id: null,
        start_date: startDate(),
        end_date: endDate()
      };
    });

    const handleDateRangeChange = async () => {
      const { value: rangeVal } = await Swal.fire({
        title: "Pilih Rentang Tanggal",
        html: `<input type="text" id="date-range" class="swal2-input" placeholder="Klik untuk pilih rentang" value="${currentFilter().start_date && currentFilter().end_date ? `${currentFilter().start_date} - ${currentFilter().end_date}` : ''}">`,
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
        setOutstandingFilters(prev => ({
          ...prev,
          [block.key]: {
            ...prev[block.key],
            start_date: rangeVal.start,
            end_date: rangeVal.end
          }
        }));
        // Juga update filter global
        // setStartDate(rangeVal.start);
        // setEndDate(rangeVal.end);
      }
    };

    // Handler untuk perubahan
    const handleSupplierChange = (supplierId) => {
      setOutstandingFilters(prev => ({
        ...prev,
        [block.key]: {
          ...prev[block.key],
          supplier_id: supplierId
        }
      }));
    };

    const handleCustomerChange = (customerId) => {
      setOutstandingFilters(prev => ({
        ...prev,
        [block.key]: {
          ...prev[block.key],
          customer_id: customerId
        }
      }));
    };

    const handleColorChange = (colorId) => {
      setOutstandingFilters(prev => ({
        ...prev,
        [block.key]: {
          ...prev[block.key],
          color_id: colorId
        }
      }));
    };

    const handleFabricChange = (fabricId) => {
      setOutstandingFilters(prev => ({
        ...prev,
        [block.key]: {
          ...prev[block.key],
          fabric_id: fabricId
        }
      }));
    };

  const handlePreviewFilter = async () => {
    setOutstandingLoading(true);
    try {
      // Ambil data PO untuk block ini
      let poRows = [];
      const poList = await PO_LIST_FETCHER[block.key]?.(user?.token);
      const list = filterByDate(rowsFromResponse(poList));
      
      // Fetch detail setiap PO
      poRows = await Promise.all(
        list.map(async (po) => {
          try {
            const detail = await PO_DETAIL_FETCHER[block.key]?.(po.id, user?.token);
            let items = [];
            
            if (detail?.order?.items) {
              items = detail.order.items;
            } else if (detail?.mainRow?.items) {
              items = detail.mainRow.items;
            } else if (detail?.items) {
              items = detail.items;
            } else if (po.items) {
              items = po.items;
            }

            return {
              ...po,
              items: items,
              supplier_id: po.supplier_id || detail?.order?.supplier_id || detail?.mainRow?.supplier_id
            };
          } catch (error) {
            console.error(`Gagal fetch detail PO ${po.id}:`, error);
            return po;
          }
        })
      );
      
      const currentFilter = outstandingFilters()[block.key];
      
      // Buat filter gabungan yang konsisten
      const combinedFilter = {
        ...currentFilter,
        // Untuk penjualan, selalu sertakan customer_id dari salesCustomerForm jika ada
        ...(block.mode === "penjualan" && salesCustomerForm().customer_id 
          ? { customer_id: salesCustomerForm().customer_id }
          : {})
      };
      
      const filteredPoRows = filterPOByOutstanding(poRows, block.key, block.mode);
      
      // Set data untuk preview - TAMBAHKAN CUSTOMER_ID
      setPreviewData({
        block: block,
        poRows: filteredPoRows,
        outstanding_filter: combinedFilter, // GUNAKAN COMBINED FILTER
        customer_id: block.mode === "penjualan" ? salesCustomerForm().customer_id : null
      });
      
      // Tutup modal filter dan buka modal preview
      setShowOutstandingModal(false);
      setShowOutstandingPreview(true);
      
    } catch (error) {
      console.error("Error preparing preview data:", error);
      Swal.fire("Error", "Gagal memuat data preview", "error");
    } finally {
      setOutstandingLoading(false);
    }
  };

    // Hide filter warna kalau greige
    const showColorFilter = createMemo(() => {
      return block.key !== 'greige';
    });

    return (
      <div class="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <h3 class="text-lg font-semibold mb-4">
            Filter Outstanding - {block.label}
          </h3>

          <div class="mb-6">
            <label class="block text-sm font-medium mb-2">Rentang Tanggal</label>
            <div class="flex gap-2">
              <button
                class="flex-1 px-3 py-2 border border-b rounded text-left bg-white hover:bg-gray-50"
                onClick={handleDateRangeChange}
              >
                {currentFilter().start_date && currentFilter().end_date 
                  ? `${currentFilter().start_date} s/d ${currentFilter().end_date}`
                  : "Pilih Rentang Tanggal"}
              </button>
              {(currentFilter().start_date || currentFilter().end_date) && (
                <button
                  class="px-3 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50"
                  onClick={() => {
                    setOutstandingFilters(prev => ({
                      ...prev,
                      [block.key]: {
                        ...prev[block.key],
                        start_date: null,
                        end_date: null
                      }
                    }));
                    // setStartDate("");
                    // setEndDate("");
                  }}
                >
                  Hapus
                </button>
              )}
            </div>
          </div>
          
          <div class="space-y-4">
            {isPenjualan ? (
              <div>
                <label class="block text-sm font-medium mb-1">Customer</label>
                <CustomerDropdownOutstanding
                  customers={masterData().customers}
                  value={currentFilter().customer_id}
                  onChange={handleCustomerChange}
                />
              </div>
            ) : (
              <div>
                <label class="block text-sm font-medium mb-1">Supplier</label>
                <SupplierDropdownOutstanding
                  suppliers={masterData().suppliers}
                  value={currentFilter().supplier_id}
                  onChange={handleSupplierChange}
                />
              </div>
            )}

            {/* Filter Warna - KEMBALI KE KOMPONEN KUSTOM */}
            <Show when={showColorFilter()}>
              <div>
                <label class="block text-sm font-medium mb-1">Warna</label>
                <ColorDropdownOutstanding
                  colors={masterData().colors}
                  value={currentFilter().color_id}
                  onChange={handleColorChange}
                />
              </div>
            </Show>

            {/* Filter Kain - KEMBALI KE KOMPONEN KUSTOM */}
            <div>
              <label class="block text-sm font-medium mb-1">Kain</label>
              <FabricDropdownOutstanding
                fabrics={masterData().fabrics}
                value={currentFilter().fabric_id}
                onChange={handleFabricChange}
              />
            </div>
          </div>

          {/* Preview Filter Aktif */}
          <div class="mt-6 p-4 bg-gray-50 rounded">

          </div>

          <div class="flex justify-end gap-3 mt-6">
            <button
              class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              onClick={() => setShowOutstandingModal(false)}
              disabled={outstandingLoading()}
            >
              Batal
            </button>
            <button
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
              onClick={handlePreviewFilter}
              disabled={outstandingLoading()}
            >
              <Show when={outstandingLoading()}>
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </Show>
              {outstandingLoading() ? 'Memproses...' : 'Preview Filter'}
            </button>
          </div>
        </div>
      </div>
    );
  };

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
                const outstandingFilterLabel = getOutstandingFilterLabel(block);

                return (
                  <div class="bg-white rounded shadow mb-8">
                    <div class="p-6 border-b">
                      <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold">{block.label}</h3>
                        {/* Tombol Filter Outstanding untuk Pembelian DAN Penjualan */}
                        {(section.key === "pembelian" || section.key === "penjualan") && (
                          <div class="flex gap-2">
                            {outstandingFilterLabel && (
                              <button
                                class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                onClick={() => clearOutstandingFilter(block.key)}
                                disabled={outstandingLoading()}
                                title="Hapus filter outstanding"
                              >
                                <Show when={outstandingLoading()}>
                                  <div class="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                </Show>
                                Hapus Filter
                              </button>
                            )}
                            <button
                              class="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => openOutstandingFilter(block)}
                              disabled={filterButtonLoading() || outstandingLoading()}
                              title="Filter outstanding"
                            >
                              <Show when={filterButtonLoading()}>
                                <div class="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                              </Show>
                              <Funnel size={16} />
                              {filterButtonLoading() ? 'Memuat...' : 'Filter Outstanding'}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Tampilkan Filter Aktif */}
                      {outstandingFilterLabel && (
                        <div class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <div class="text-sm font-medium text-yellow-800">
                            Filter Aktif: {outstandingFilterLabel}
                          </div>
                          <div class="text-xs text-yellow-600 mt-1">
                            Rentang: {currentFilterLabel()}
                          </div>
                        </div>
                      )}

                      {section.key === "penjualan" && block.key === "sales" && (
                        <div class="p-4 border-b">
                          <CustomerDropdownSearch
                            customersList={() => block.customers || []}
                            form={salesCustomerForm}
                            setForm={setSalesCustomerForm}
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
                                  customer_id: section.key === "penjualan" ? salesCustomerForm().customer_id : null,
                                  outstanding_filter: (section.key === "pembelian" || section.key === "penjualan") ? outstandingFilters()[block.key] : null
                                })}>
                                <FileSpreadsheet size={20} />
                            </button>
                            <button class="text-gray-500 hover:text-blue-600" title="Cetak laporan"
                                onClick={() => printDeliveryNotes(block, {
                                  token: user?.token,
                                  startDate: startDate(),
                                  endDate: endDate(),
                                  customer_id: section.key === "penjualan" ? salesCustomerForm().customer_id : null,
                                  outstanding_filter: (section.key === "pembelian" || section.key === "penjualan") ? outstandingFilters()[block.key] : null
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
                              const selectedCustomerId = section.key === "penjualan" ? salesCustomerForm().customer_id : null                            

                              const filteredPoRows = (block.poRows || []).filter((r) =>
                                matchesCustomer(r, selectedCustomerId)
                              );

                              exportPOStatusToExcel({
                                block: block,
                                status: "done",
                                filterLabel: currentFilterLabel(),
                                token: user?.token,
                                poRows: filteredPoRows,
                                isGreige: isGreige,
                                PO_DETAIL_FETCHER: PO_DETAIL_FETCHER,
                                customer_id: selectedCustomerId,
                                outstanding_filter: section.key === "pembelian" ? outstandingFilters()[block.key] : null
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
                                outstanding_filter: section.key === "pembelian" ? outstandingFilters()[block.key] : null
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
                                outstanding_filter: section.key === "pembelian" ? outstandingFilters()[block.key] : null
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
                                outstanding_filter: section.key === "pembelian" ? outstandingFilters()[block.key] : null
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

      {/* Modal Filter Outstanding */}
      <Show when={showOutstandingModal() && currentOutstandingBlock()}>
        <OutstandingFilterModal />
      </Show>

      <Show when={showOutstandingPreview()}>
        <OutstandingPreviewModal
          show={showOutstandingPreview()}
          block={previewData().block}
          poRows={previewData().poRows}
          outstanding_filter={previewData().outstanding_filter}
          token={user?.token}
          PO_DETAIL_FETCHER={PO_DETAIL_FETCHER}
          customer_id={activeTab() === "penjualan" ? salesCustomerForm().customer_id : null}
          filterLabel={currentFilterLabel()}
          masterData={masterData()}
          onApply={applyFilterFromPreview}
          onCancel={cancelFilterFromPreview}
          applyLoading={applyFilterLoading()}
        />
      </Show>

      <Show when={!loading() && sectionsData().length === 0}>
        <div class="p-6 bg-white rounded shadow text-gray-500">
          Tidak ada laporan yang dapat ditampilkan untuk akun ini.
        </div>
      </Show>
    </MainLayout>
  );
}