// src/pages/Dashboard.jsx
import FinanceMainLayout from "../layouts/FinanceMainLayout";
import { onMount, createSignal, For, Show } from "solid-js";
import ApexChart from "../components/ApexChart";
import { Printer, FileText, Filter, Funnel, Plus } from "lucide-solid";
import Litepicker from "litepicker";
import Swal from "sweetalert2";

import { User, PurchaseAksesorisEkspedisi } from "../utils/financeAuth";

// IMPORT SERVICES & UTILS
import PurchaseAksesorisEkspedisiService from "../services/PurchaseAksesorisEkspedisiService";
import { printPurchaseAksesorisEkspedisi } from "../pages/reports/finance/printPurchaseAksesorisEkspedisi";
import { exportPurchaseAksesorisEkspedisiToExcel } from "../helpers/export_excel/exportPurchaseAksesorisEkspedisiToExcel";

// IMPORT SERVICES & UTILS UNTUK PAYMENT HUTANG
import PaymentHutangAksesorisEkspedisiService from "../services/PaymentHutangAksesorisEkspedisiService";
import { printPaymentHutangAksesorisEkspedisi } from "../pages/reports/finance/printPaymentHutangAksesorisEkspedisi";
import { exportPaymentHutangAksesorisEkspedisiToExcel } from "../helpers/export_excel/exportPaymentHutangAksesorisEkspedisiToExcel";

import { printPaymentHutangPurchaseGreige } from "../pages/reports/finance/printPaymentHutangPurchaseGreige";
import { exportPaymenntHutangPurchaseGreigeToExcel } from "../helpers/export_excel/exportPaymentHutangPurchaseGreigeToExcel";
import PaymentHutangPurchaseGreigeService from "../services/PaymentHutangPurchaseGreigeService";

import { printPaymentHutangPurchaseCelup } from "../pages/reports/finance/printPaymentHutangPurchaseCelup";
import { exportPaymenntHutangPurchaseCelupToExcel } from "../helpers/export_excel/exportPaymentHutangPurchaseCelupToExcel";
import PaymentHutangPurchaseCelupService from "../services/PaymentHutangPurchaseCelupService";

import { printPaymentHutangPurchaseFinish } from "../pages/reports/finance/printPaymentHutangPurchaseFinish";
import { exportPaymenntHutangPurchaseFinishToExcel } from "../helpers/export_excel/exportPaymentHutangPurchaseFinishToExcel";
import PaymentHutangPurchaseFinishService from "../services/PaymentHutangPurchaseFinishService";

import { printPaymentHutangPurchaseJualBeli } from "../pages/reports/finance/printPaymentHutangPurchaseJualBeli";
import { exportPaymenntHutangPurchaseJualBeliToExcel } from "../helpers/export_excel/exrpotPaymentPurchaseJualBeliToExcel";
import PaymentHutangPurchaseJualBeliService from "../services/PaymentHutangPurchaseJualBeliService";

// IMPORT SERVICE & UTILS UNTUK PENERIMAAN PIUTANG
import PenerimaanPiutangSalesService from "../services/PenerimaanPiutangSalesService";
import { exportPenerimaanPiutangSalesToExcel } from "../helpers/export_excel/exportPenerimaanPiutangSalesToExcel";
import { printPenerimaanPiutangSales } from "../pages/reports/finance/printPenerimaanPiutangSales";

import PenerimaanPiutangJualBeliService from "../services/PenerimaanPiutangJualBeliService";
import { exportPenerimaanPiutangJualBeliToExcel } from "../helpers/export_excel/exportPenerimaanPiutangJualBeliToExcel";
import { printPenerimaanPiutangJualBeli } from "../pages/reports/finance/printPenerimaanPiutangJualBeli";

// IMPORT COMPONENTS FILTER
import FinanceFilterModal from "../components/finance/FinanceFilterModal";
import FinancePreviewModal from "../components/finance/FinancePreviewModal";
import SaldoPiutangTable from "./dashboard_components/SaldoPiutangTable";
import SaldoHutangTable from "./dashboard_components/SaldoHutangTable";
import SaldoPiutangService from "../services/SaldoPiutangService";
import SaldoHutangService from "../services/SaldoHutangService";
import FormSaldoModal from "../components/finance/FormSaldoModal";

const [activeTab, setActiveTab] = createSignal("saldo_piutang");

export default function DashboardFinance() {
  const user = User.getUser();

  // ==== STATE FILTER ====
  const [showFilterModal, setShowFilterModal] = createSignal(false);
  const [showPreviewModal, setShowPreviewModal] = createSignal(false);
  const [currentBlock, setCurrentBlock] = createSignal(null);
  const [currentFilter, setCurrentFilter] = createSignal({});
  const [previewData, setPreviewData] = createSignal([]);
  const [applyLoading, setApplyLoading] = createSignal(false);
  const [previewLoading, setPreviewLoading] = createSignal(false);
  const [applyFilterLoading, setApplyFilterLoading] = createSignal(false);
  const [activeFilters, setActiveFilters] = createSignal({});
  const [pendingFilter, setPendingFilter] = createSignal({});

  // ==== FORMATTERS ====
  const formatTanggalIndo = (tanggalString) => {
    if (!tanggalString) return "-";
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
    return `${tanggal.getDate()} ${
      bulanIndo[tanggal.getMonth()]
    } ${tanggal.getFullYear()}`;
  };

  const normalizeDate = (d) => {
    if (!d) return null;
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return null;
    return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  };

  // ==== LAYOUT CONFIG ====
  const SECTIONS = [
    {
      key: "saldo_piutang",
      title: "Laporan Saldo Piutang",
      blocks: [
        {
          key: "laporan_saldo_piutang",
          label: "Laporan Saldo Piutang",
          // filterConfig: { type: "saldo_piutang" },
        },
      ],
    },
    {
      key: "saldo_hutang",
      title: "Laporan Saldo Hutang",
      blocks: [
        {
          key: "laporan_saldo_hutang",
          label: "Laporan Saldo Hutang",
          // filterConfig: { type: "saldo_hutang" },
        },
      ],
    },
    {
      key: "purchase",
      title: "Laporan Purchase Aksesoris Ekspedisi",
      blocks: [
        {
          key: "purchase_aksesoris_ekspedisi",
          label: "Purchase Aksesoris Ekspedisi",
          filterConfig: { type: "purchase" },
          //perm: "view_purchase_aksesoris_ekspedisi",
        },
      ],
    },
    {
      key: "hutang",
      title: "Laporan Pembayaran Hutang",
      blocks: [
        {
          key: "payment_hutang_purchase_greige",
          label: "Pembayaran Hutang Purchase Greige",
          filterConfig: { type: "payment_hutang" },
          //perm: "",
        },
        {
          key: "payment_hutang_purchase_celup",
          label: "Pembayaran Hutang Purchase Celup",
          filterConfig: { type: "payment_hutang" },
          // perm: ""
        },
        {
          key: "payment_hutang_purchase_finish",
          label: "Pembayaran Hutang Purchase Finish",
          filterConfig: { type: "payment_hutang" },
          // perm: "",
        },
        {
          key: "payment_hutang_purchase_jual_beli",
          label: "Pembayaran Hutang Purchase Jual Beli",
          filterConfig: { type: "payment_hutang" },
          // perm: "",
        },
        {
          key: "payment_hutang_aksesoris_ekspedisi",
          label: "Pembayaran Hutang Aksesoris Ekspedisi",
          filterConfig: { type: "payment_hutang" },
          //perm: "view_payment_hutang_aksesoris_ekspedisi",
        },
      ],
    },
    {
      key: "piutang",
      title: "Laporan Penerimaan Piutang",
      blocks: [
        {
          key: "penerimaan_piutang_sales",
          label: "Penerimaan Piutang Sales",
          filterConfig: { type: "penerimaan_piutang" },
          //perm: "",
        },
        {
          key: "penerimaan_piutang_jual_beli",
          label: "Penerimaan Piutang Jual Beli",
          filterConfig: { type: "penerimaan_piutang" },
          //perm: "",
        },
      ],
    },
  ];

  // ---- state
  const [sectionsData, setSectionsData] = createSignal([]);
  const [loading, setLoading] = createSignal(true);

  // filter tanggal
  const [startDate, setStartDate] = createSignal("");
  const [endDate, setEndDate] = createSignal("");

  const currentFilterLabel = () => {
    if (!startDate() && !endDate()) return "Semua tanggal";
    return `${startDate()} s/d ${endDate()}`;
  };

  // ==== HANDLERS FILTER ====
  const handleOpenFilter = (block) => {
    setCurrentBlock(block);
    setCurrentFilter(activeFilters()[block.key] || {});
    setShowFilterModal(true);
  };

  const handleFilterChange = (newFilter) => {
    setCurrentFilter(newFilter);
  };

  const handlePreviewFilter = async (block, filter) => {
    try {
      setPreviewLoading(true);

      let data = [];
      
      const filterParams = {}

      if (startDate() && endDate()) {
        filterParams.startDate = startDate();
        filterParams.endDate = endDate();
      }
      
      if (filter) {
        if (filter.supplier) {
          if (typeof filter.supplier === 'object' && filter.supplier.value !== undefined) {
            filterParams.supplier = filter.supplier.value;
          } else {
            filterParams.supplier = filter.supplier;
          }
        }
        if (filter.customer) {
          if (typeof filter.customer === 'object' && filter.customer.value !== undefined) {
            filterParams.customer = filter.customer.value;
          } else {
            filterParams.customer = filter.customer;
          }
        }
        if (filter.tanggal_sj_start && filter.tanggal_sj_end) {
          filterParams.tanggal_sj_start = filter.tanggal_sj_start;
          filterParams.tanggal_sj_end = filter.tanggal_sj_end;
        }
        if (filter.tanggal_jatuh_tempo_start && filter.tanggal_jatuh_tempo_end) {
          filterParams.tanggal_jatuh_tempo_start = filter.tanggal_jatuh_tempo_start;
          filterParams.tanggal_jatuh_tempo_end = filter.tanggal_jatuh_tempo_end;
        }
        if (filter.tanggal_pengambilan_giro_start && filter.tanggal_pengambilan_giro_end) {
          filterParams.tanggal_pengambilan_giro_start = filter.tanggal_pengambilan_giro_start;
          filterParams.tanggal_pengambilan_giro_end = filter.tanggal_pengambilan_giro_end;
        }
        if (filter.tanggal_pembayaran_start && filter.tanggal_pembayaran_end) {
          filterParams.tanggal_pembayaran_start = filter.tanggal_pembayaran_start;
          filterParams.tanggal_pembayaran_end = filter.tanggal_pembayaran_end;
        }
        if (filter.customer && filter.customer.value) {
          filterParams.customer = filter.customer.value;
        }
        if (filter.no_giro) {
          filterParams.no_giro = filter.no_giro;
        }
      }

      // Load data berdasarkan tipe block
      if (block.key === "laporan_saldo_piutang") {
        data = await SaldoPiutangService.getAllWithDetails(filterParams);
      } else if (block.key === "laporan_saldo_hutang") {
        data = await SaldoHutangService.getAllWithDetails(filterParams);
      } else if (block.key === "purchase_aksesoris_ekspedisi") {
        data = await PurchaseAksesorisEkspedisiService.getAllWithDetails(
          filterParams
        );
      } else if (block.key === "payment_hutang_purchase_greige") {
        data = await PaymentHutangPurchaseGreigeService.getAllWithDetails(
          filterParams
        );
      } else if (block.key === "payment_hutang_purchase_celup") {
        data = await PaymentHutangPurchaseCelupService.getAllWithDetails(
          filterParams
        );
      } else if (block.key === "payment_hutang_purchase_finish") {
        data = await PaymentHutangPurchaseFinishService.getAllWithDetails(
          filterParams
        );
      } else if (block.key === "payment_hutang_purchase_jual_beli") {
        data = await PaymentHutangPurchaseJualBeliService.getAllWithDetails(
          filterParams
        );
      } else if (block.key === "payment_hutang_aksesoris_ekspedisi") {
        data = await PaymentHutangAksesorisEkspedisiService.getAllWithDetails(
          filterParams
        );
      } else if (block.key === "penerimaan_piutang_sales") {
        data = await PenerimaanPiutangSalesService.getDataForPreview(
          filterParams
        );
      } else if (block.key === "penerimaan_piutang_jual_beli") {
        data = await PenerimaanPiutangJualBeliService.getDataForPreview(
          filterParams
        );
      }

      setPendingFilter(filter);
      setPreviewData(Array.isArray(data) ? data : []);
      setShowPreviewModal(true);
      setShowFilterModal(false);
    } catch (error) {
      console.error("Error preview filter:", error);
      Swal.fire("Error", "Gagal memuat data preview", "error");
    } finally {
      setApplyLoading(false);
    }
  };

  const handleApplyFilter = async (filterToApply = null) => {
    try {
      setApplyFilterLoading(true);
      
      const blockKey = currentBlock().key;
      
      // GUNAKAN FILTER DARI PARAMETER ATAU DARI PENDING FILTER
      const filter = filterToApply || pendingFilter() || currentFilter();
      
      // UPDATE ACTIVE FILTERS
      setActiveFilters(prev => ({
        ...prev,
        [blockKey]: filter
      }));
      
      setShowPreviewModal(false);
      
      // RESET PENDING FILTER
      setPendingFilter({});
      
      // TUNGGU SEBENTAR UNTUK STATE TERUPDATE, LALU RELOAD
      setTimeout(async () => {
        await reloadData();
        
        Swal.fire({
          icon: 'success',
          title: 'Sukses',
          text: 'Filter berhasil diterapkan',
          timer: 1000,
          showConfirmButton: false,
          timerProgressBar: true
        });
        setApplyFilterLoading(false);
      }, 50);
      
    } catch (error) {
      console.error('Error applying filter:', error);
      Swal.fire('Error', 'Gagal menerapkan filter', 'error');
      setApplyFilterLoading(false);
    }
  };

  const resetFilter = async (blockKey) => {
    try {
      // Reset filter untuk block tertentu
      setActiveFilters(prev => {
        const newFilters = { ...prev };
        delete newFilters[blockKey];
        return newFilters;
      });
      
      // Reload data tanpa filter
      setTimeout(async () => {
        await reloadData();
        
        Swal.fire({
          icon: 'success',
          title: 'Sukses',
          text: 'Filter berhasil direset',
          timer: 1000,
          showConfirmButton: false,
          timerProgressBar: true
        });
      }, 50);
      
    } catch (error) {
      console.error('Error resetting filter:', error);
      Swal.fire('Error', 'Gagal mereset filter', 'error');
    }
  };

  // Fungsi untuk mendapatkan filter params yang sudah digabungkan
  const getCombinedFilterParams = (blockKey) => {
    const filterParams = {};
    
    // Tambahkan filter tanggal range jika ada
    if (startDate() && endDate()) {
      filterParams.startDate = startDate();
      filterParams.endDate = endDate();
    }
    
    // Tambahkan filter aktif untuk block ini jika ada
    const activeFilter = activeFilters()[blockKey];
    if (activeFilter) {
      // Salin semua properti dari activeFilter ke filterParams
      Object.keys(activeFilter).forEach(key => {
        const value = activeFilter[key];
        
        // Handle object dengan properti value (untuk select options)
        if (typeof value === 'object' && value !== null && value.value !== undefined) {
          filterParams[key] = value.value;
        } else {
          filterParams[key] = value;
        }
      });
    } else {
        //console.log(`No active filter for ${blockKey}`);
    }
    
    return filterParams;
  };  

  // ==== LOAD DATA ====
  const reloadData = async () => {
    setLoading(true);
    const assembled = [];

    for (const sec of SECTIONS) {
      const blocks = [];

      for (const b of sec.blocks) {
        const filterParams = getCombinedFilterParams(b.key);

        // === LAPORAN SALDO PIUTANG ===
        if (b.key === "laporan_saldo_piutang") {
          try {
            const dataWithDetails = await SaldoPiutangService.getAllWithDetails(
              filterParams
            );

            // Pastikan data adalah array
            const safeData = Array.isArray(dataWithDetails)
              ? dataWithDetails
              : [];

            // const totals =
            //   PurchaseAksesorisEkspedisiService.calculateTotals(safeData);
            // const status =
            //   PurchaseAksesorisEkspedisiService.calculateStatus(safeData);

            blocks.push({
              ...b,
              data: safeData,
              // totals: totals,
              // status: status
            });
          } catch (error) {
            console.error("Error loading laporan saldo piutang:", error);
            blocks.push({
              ...b,
              data: [],
              totals: { totalSuratJalan: 0, totalNilai: 0 },
              status: { belumJatuhTempo: 0, lewatJatuhTempo: 0 },
              chart: {
                series: [0, 0],
                categories: ["Belum Jatuh Tempo", "Lewat Jatuh Tempo"],
              },
            });
          }
          continue;
        }

        // === LAPORAN SALDO HUTANG ===
        if (b.key === "laporan_saldo_hutang") {
          try {
            const dataWithDetails = await SaldoHutangService.getAllWithDetails(
              filterParams
            );

            // Pastikan data adalah array
            const safeData = Array.isArray(dataWithDetails)
              ? dataWithDetails
              : [];

            // const totals =
            //   PurchaseAksesorisEkspedisiService.calculateTotals(safeData);
            // const status =
            //   PurchaseAksesorisEkspedisiService.calculateStatus(safeData);

            blocks.push({
              ...b,
              data: safeData,
              // totals: totals,
              // status: status
            });
          } catch (error) {
            console.error("Error loading laporan saldo hutang:", error);
            blocks.push({
              ...b,
              data: [],
              totals: { totalSuratJalan: 0, totalNilai: 0 },
              status: { belumJatuhTempo: 0, lewatJatuhTempo: 0 },
              chart: {
                series: [0, 0],
                categories: ["Belum Jatuh Tempo", "Lewat Jatuh Tempo"],
              },
            });
          }
          continue;
        }

        // === PURCHASE AKSESORIS EKSPEDISI ===
        if (b.key === "purchase_aksesoris_ekspedisi") {
          try {
            const dataWithDetails =
              await PurchaseAksesorisEkspedisiService.getAllWithDetails(
                filterParams
              );

            // Pastikan data adalah array
            const safeData = Array.isArray(dataWithDetails)
              ? dataWithDetails
              : [];

            const totals =
              PurchaseAksesorisEkspedisiService.calculateTotals(safeData);
            const status =
              PurchaseAksesorisEkspedisiService.calculateStatus(safeData);

            blocks.push({
              ...b,
              data: safeData,
              totals: totals,
              status: status,
              chart: {
                series: [status.belumJatuhTempo, status.lewatJatuhTempo],
                categories: ["Belum Jatuh Tempo", "Lewat Jatuh Tempo"],
              },
            });
          } catch (error) {
            console.error("Error loading purchase aksesoris ekspedisi:", error);
            blocks.push({
              ...b,
              data: [],
              totals: { totalSuratJalan: 0, totalNilai: 0 },
              status: { belumJatuhTempo: 0, lewatJatuhTempo: 0 },
              chart: {
                series: [0, 0],
                categories: ["Belum Jatuh Tempo", "Lewat Jatuh Tempo"],
              },
            });
          }
          continue;
        }

        // === PAYMENT HUTANG PURCHASE GREIGE ===
        if (b.key === "payment_hutang_purchase_greige") {
          try {
            const dataWithDetails =
              await PaymentHutangPurchaseGreigeService.getAllWithDetails(
                filterParams
              );

            const safeData = Array.isArray(dataWithDetails)
              ? dataWithDetails
              : [];

            const totals =
              PaymentHutangPurchaseGreigeService.calculateTotals(safeData);
            const status =
              PaymentHutangPurchaseGreigeService.calculateStatus(safeData);

            const totalPembayaran =
              typeof status.totalPembayaran === "string"
                ? parseFloat(status.totalPembayaran)
                : status.totalPembayaran || 0;

            const totalPotongan =
              typeof status.totalPotongan === "string"
                ? parseFloat(status.totalPotongan)
                : status.totalPotongan || 0;

            blocks.push({
              ...b,
              data: safeData,
              totals: totals,
              status: status,
              chart: {
                series: [totalPembayaran, totalPotongan],
                categories: ["Total Pembayaran", "Total Potongan"],
              },
            });
          } catch (error) {
            console.error(
              "Error loading payment hutang purchase greige:",
              error
            );
            blocks.push({
              ...b,
              data: [],
              totals: {
                totalSuratJalan: 0,
                totalNilai: 0,
              },
              status: {
                totalPembayaran: 0,
                totalPotongan: 0,
              },
              chart: {
                series: [0, 0],
                categories: ["Total Pembayaran", "Total Potongan"],
              },
            });
          }
          continue;
        }

        // === PAYMENT HUTANG PURCHASE CELUP ===
        if (b.key === "payment_hutang_purchase_celup") {
          try {
            const dataWithDetails =
              await PaymentHutangPurchaseCelupService.getAllWithDetails(
                filterParams
              );

            const safeData = Array.isArray(dataWithDetails)
              ? dataWithDetails
              : [];

            const totals =
              PaymentHutangPurchaseCelupService.calculateTotals(safeData);
            const status =
              PaymentHutangPurchaseCelupService.calculateStatus(safeData);

            const totalPembayaran =
              typeof status.totalPembayaran === "string"
                ? parseFloat(status.totalPembayaran)
                : status.totalPembayaran || 0;

            const totalPotongan =
              typeof status.totalPotongan === "string"
                ? parseFloat(status.totalPotongan)
                : status.totalPotongan || 0;

            blocks.push({
              ...b,
              data: safeData,
              totals: totals,
              status: status,
              chart: {
                series: [totalPembayaran, totalPotongan],
                categories: ["Total Pembayaran", "Total Potongan"],
              },
            });
          } catch (error) {
            console.error(
              "Error loading payment hutang purchase celup:",
              error
            );
            blocks.push({
              ...b,
              data: [],
              totals: {
                totalSuratJalan: 0,
                totalNilai: 0,
              },
              status: {
                totalPembayaran: 0,
                totalPotongan: 0,
              },
              chart: {
                series: [0, 0],
                categories: ["Total Pembayaran", "Total Potongan"],
              },
            });
          }
          continue;
        }

        // === PAYMENT HUTANG PURCHASE FINISH ===
        if (b.key === "payment_hutang_purchase_finish") {
          try {
            const dataWithDetails =
              await PaymentHutangPurchaseFinishService.getAllWithDetails(
                filterParams
              );

            const safeData = Array.isArray(dataWithDetails)
              ? dataWithDetails
              : [];

            const totals =
              PaymentHutangPurchaseFinishService.calculateTotals(safeData);
            const status =
              PaymentHutangPurchaseFinishService.calculateStatus(safeData);

            const totalPembayaran =
              typeof status.totalPembayaran === "string"
                ? parseFloat(status.totalPembayaran)
                : status.totalPembayaran || 0;

            const totalPotongan =
              typeof status.totalPotongan === "string"
                ? parseFloat(status.totalPotongan)
                : status.totalPotongan || 0;

            blocks.push({
              ...b,
              data: safeData,
              totals: totals,
              status: status,
              chart: {
                series: [totalPembayaran, totalPotongan],
                categories: ["Total Pembayaran", "Total Potongan"],
              },
            });
          } catch (error) {
            console.error(
              "Error loading payment hutang purchase finish:",
              error
            );
            blocks.push({
              ...b,
              data: [],
              totals: {
                totalSuratJalan: 0,
                totalNilai: 0,
              },
              status: {
                totalPembayaran: 0,
                totalPotongan: 0,
              },
              chart: {
                series: [0, 0],
                categories: ["Total Pembayaran", "Total Potongan"],
              },
            });
          }
          continue;
        }

        // === PAYMENT HUTANG PURCHASE JUAL BELI ===
        if (b.key === "payment_hutang_purchase_jual_beli") {
          try {
            const dataWithDetails =
              await PaymentHutangPurchaseJualBeliService.getAllWithDetails(
                filterParams
              );

            const safeData = Array.isArray(dataWithDetails)
              ? dataWithDetails
              : [];

            const totals =
              PaymentHutangPurchaseJualBeliService.calculateTotals(safeData);
            const status =
              PaymentHutangPurchaseJualBeliService.calculateStatus(safeData);

            const totalPembayaran =
              typeof status.totalPembayaran === "string"
                ? parseFloat(status.totalPembayaran)
                : status.totalPembayaran || 0;

            const totalPotongan =
              typeof status.totalPotongan === "string"
                ? parseFloat(status.totalPotongan)
                : status.totalPotongan || 0;

            blocks.push({
              ...b,
              data: safeData,
              totals: totals,
              status: status,
              chart: {
                series: [totalPembayaran, totalPotongan],
                categories: ["Total Pembayaran", "Total Potongan"],
              },
            });
          } catch (error) {
            console.error(
              "Error loading payment hutang purchase jual beli:",
              error
            );
            blocks.push({
              ...b,
              data: [],
              totals: {
                totalSuratJalan: 0,
                totalNilai: 0,
              },
              status: {
                totalPembayaran: 0,
                totalPotongan: 0,
              },
              chart: {
                series: [0, 0],
                categories: ["Total Pembayaran", "Total Potongan"],
              },
            });
          }
          continue;
        }

        // === PAYMENT HUTANG AKSESORIS EKSPEDISI ===
        if (b.key === "payment_hutang_aksesoris_ekspedisi") {
          try {
            const dataWithDetails =
              await PaymentHutangAksesorisEkspedisiService.getAllWithDetails(
                filterParams
              );

            const safeData = Array.isArray(dataWithDetails)
              ? dataWithDetails
              : [];

            const totals =
              PaymentHutangAksesorisEkspedisiService.calculateTotals(safeData);
            const status =
              PaymentHutangAksesorisEkspedisiService.calculateStatus(safeData);

            const totalPembayaran =
              typeof status.totalPembayaran === "string"
                ? parseFloat(status.totalPembayaran)
                : status.totalPembayaran || 0;

            const totalPotongan =
              typeof status.totalPotongan === "string"
                ? parseFloat(status.totalPotongan)
                : status.totalPotongan || 0;

            blocks.push({
              ...b,
              data: safeData,
              totals: totals,
              status: status,
              chart: {
                series: [totalPembayaran, totalPotongan],
                categories: ["Total Pembayaran", "Total Potongan"],
              },
            });
          } catch (error) {
            console.error(
              "Error loading payment hutang aksesoris ekspedisi:",
              error
            );
            blocks.push({
              ...b,
              data: [],
              totals: {
                totalSuratJalan: 0,
                totalNilai: 0,
              },
              status: {
                totalPembayaran: 0,
                totalPotongan: 0,
              },
              chart: {
                series: [0, 0],
                categories: ["Total Pembayaran", "Total Potongan"],
              },
            });
          }
          continue;
        }

        // === PENERIMAAN PIUTANG SALES ===
        if (b.key === "penerimaan_piutang_sales") {
          try {
            const dataWithDetails =
              await PenerimaanPiutangSalesService.getAllWithDetails(
                filterParams
              );

            const safeData = Array.isArray(dataWithDetails)
              ? dataWithDetails
              : [];

            const totals =
              PenerimaanPiutangSalesService.calculateTotals(safeData);
            const status =
              PenerimaanPiutangSalesService.calculateStatus(safeData);

            const totalPenerimaan =
              typeof status.totalPenerimaan === "string"
                ? parseFloat(status.totalPenerimaan)
                : status.totalPenerimaan || 0;

            const totalPotongan =
              typeof status.totalPotongan === "string"
                ? parseFloat(status.totalPotongan)
                : status.totalPotongan || 0;

            blocks.push({
              ...b,
              data: safeData,
              totals: totals,
              status: status,
              chart: {
                series: [totalPenerimaan, totalPotongan],
                categories: ["Total Penerimaan", "Total Potongan"],
              },
            });
          } catch (error) {
            console.error("Error loading penerimaan piutang sales:", error);
            blocks.push({
              ...b,
              data: [],
              totals: {
                totalSuratJalan: 0,
                totalNilai: 0,
              },
              status: {
                totalPenerimaan: 0,
                totalPotongan: 0,
              },
              chart: {
                series: [0, 0],
                categories: ["Total Penerimaan", "Total Potongan"],
              },
            });
          }
          continue;
        }

        // === PENERIMAAN PIUTANG JUAL BELI ===
        if (b.key === "penerimaan_piutang_jual_beli") {
          try {
            const dataWithDetails =
              await PenerimaanPiutangJualBeliService.getAllWithDetails(
                filterParams
              );

            const safeData = Array.isArray(dataWithDetails)
              ? dataWithDetails
              : [];

            const totals =
              PenerimaanPiutangJualBeliService.calculateTotals(safeData);
            const status =
              PenerimaanPiutangJualBeliService.calculateStatus(safeData);

            const totalPenerimaan =
              typeof status.totalPenerimaan === "string"
                ? parseFloat(status.totalPenerimaan)
                : status.totalPenerimaan || 0;

            const totalPotongan =
              typeof status.totalPotongan === "string"
                ? parseFloat(status.totalPotongan)
                : status.totalPotongan || 0;

            blocks.push({
              ...b,
              data: safeData,
              totals: totals,
              status: status,
              chart: {
                series: [totalPenerimaan, totalPotongan],
                categories: ["Total Penerimaan", "Total Potongan"],
              },
            });
          } catch (error) {
            console.error("Error loading penerimaan piutang jual beli:", error);
            blocks.push({
              ...b,
              data: [],
              totals: {
                totalSuratJalan: 0,
                totalNilai: 0,
              },
              status: {
                totalPenerimaan: 0,
                totalPotongan: 0,
              },
              chart: {
                series: [0, 0],
                categories: ["Total Penerimaan", "Total Potongan"],
              },
            });
          }
          continue;
        }
      }

      if (blocks.length)
        assembled.push({ key: sec.key, title: sec.title, blocks });
    }

    setSectionsData(assembled);
    setLoading(false);
  };

  // ==== FILTER MODAL ====
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

  // ==== EXPORT EXCEL ====
  const exportToExcel = (data, block, type = "purchase") => {
    const activeFilter = activeFilters()[block.key];

    if (type === "purchase") {
      exportPurchaseAksesorisEkspedisiToExcel({
        startDate: startDate(),
        endDate: endDate(),
        filter: activeFilter
      });
    } else if (type === "payment_hutang_aksesoris") {
      exportPaymentHutangAksesorisEkspedisiToExcel({
        startDate: startDate(),
        endDate: endDate(),
        filter: activeFilter
      });
    } else if (type === "payment_hutang_greige") {
      exportPaymenntHutangPurchaseGreigeToExcel({
        startDate: startDate(),
        endDate: endDate(),
        filter: activeFilter
      });
    } else if (type === "payment_hutang_celup") {
      exportPaymenntHutangPurchaseCelupToExcel({
        startDate: startDate(),
        endDate: endDate(),
        filter: activeFilter
      });
    } else if (type === "payment_hutang_finish") {
      exportPaymenntHutangPurchaseFinishToExcel({
        startDate: startDate(),
        endDate: endDate(),
        filter: activeFilter
      });
    } else if (type === "payment_hutang_jual_beli") {
      exportPaymenntHutangPurchaseJualBeliToExcel({
        startDate: startDate(),
        endDate: endDate(),
        filter: activeFilter
      });
    } else if (type === "penerimaan_piutang_sales") {
      exportPenerimaanPiutangSalesToExcel({
        startDate: startDate(),
        endDate: endDate(),
        filter: activeFilter
      });
    } else if (type === "penerimaan_piutang_jual_beli") {
      exportPenerimaanPiutangJualBeliToExcel({
        startDate: startDate(),
        endDate: endDate(),
        filter: activeFilter
      });
    }
  };

  // SALDO LOGIC
  const [showForm, setShowForm] = createSignal(false);
  const [editingItem, setEditingItem] = createSignal(null);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEditData = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDeleteData = (item) => {
    Swal.fire({
      title: "Hapus?",
      text: `Yakin hapus data "${item.nama}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Hapus",
    }).then((res) => {
      if (res.isConfirmed) {
        const updated = previewData().filter((d) => d.id !== item.id);
        setPreviewData(updated);
        Swal.fire("Terhapus!", "", "success");
      }
    });
  };

  const handleSubmitForm = (form) => {
    if (form.id) {
      // edit
      const updated = previewData().map((d) =>
        d.id === form.id ? { ...d, nama: form.nama } : d
      );
      setPreviewData(updated);
    } else {
      // create
      setPreviewData([...previewData(), { id: Date.now(), nama: form.nama }]);
    }

    setShowForm(false);
  };

  // DUMMY DATA

  const dataSaldoPiutang = [
    {
      customer: "PT Maju Jaya",
      saldo_awal: 1200000,
      jual: 500000,
      retur: 20000,
      pot_pemb: 10000,
      bayar: 300000,
      cash_disc: 15000,
      saldo_akhir: 1420000,
      giro_mundur: 0,
      saldo_sth_gm: 1420000,
    },
    {
      customer: "CV Sinar Abadi",
      saldo_awal: 800000,
      jual: 300000,
      retur: 0,
      pot_pemb: 15000,
      bayar: 200000,
      cash_disc: 8000,
      saldo_akhir: 877000,
      giro_mundur: 10000,
      saldo_sth_gm: 887000,
    },
    {
      customer: "Toko Berkah",
      saldo_awal: 500000,
      jual: 250000,
      retur: 10000,
      pot_pemb: 5000,
      bayar: 100000,
      cash_disc: 7000,
      saldo_akhir: 638000,
      giro_mundur: 0,
      saldo_sth_gm: 638000,
    },
    {
      customer: "PT Mandiri Solusi",
      saldo_awal: 1500000,
      jual: 700000,
      retur: 30000,
      pot_pemb: 20000,
      bayar: 500000,
      cash_disc: 12000,
      saldo_akhir: 1658000,
      giro_mundur: 50000,
      saldo_sth_gm: 1708000,
    },
    {
      customer: "UD Sejahtera",
      saldo_awal: 300000,
      jual: 150000,
      retur: 5000,
      pot_pemb: 2000,
      bayar: 50000,
      cash_disc: 3000,
      saldo_akhir: 398000,
      giro_mundur: 0,
      saldo_sth_gm: 398000,
    },
    {
      customer: "CV Bumi Raya",
      saldo_awal: 950000,
      jual: 400000,
      retur: 20000,
      pot_pemb: 10000,
      bayar: 250000,
      cash_disc: 9000,
      saldo_akhir: 1161000,
      giro_mundur: 0,
      saldo_sth_gm: 1161000,
    },
    {
      customer: "PT Mega Utama",
      saldo_awal: 700000,
      jual: 200000,
      retur: 10000,
      pot_pemb: 5000,
      bayar: 150000,
      cash_disc: 5000,
      saldo_akhir: 750000,
      giro_mundur: 0,
      saldo_sth_gm: 750000,
    },
    {
      customer: "Toko Sumber Rezeki",
      saldo_awal: 420000,
      jual: 180000,
      retur: 0,
      pot_pemb: 4000,
      bayar: 80000,
      cash_disc: 3000,
      saldo_akhir: 519000,
      giro_mundur: 12000,
      saldo_sth_gm: 531000,
    },
    {
      customer: "CV Sentosa Makmur",
      saldo_awal: 1100000,
      jual: 450000,
      retur: 20000,
      pot_pemb: 10000,
      bayar: 300000,
      cash_disc: 10000,
      saldo_akhir: 1530000,
      giro_mundur: 0,
      saldo_sth_gm: 1530000,
    },
    {
      customer: "PT Jaya Bersama",
      saldo_awal: 600000,
      jual: 220000,
      retur: 5000,
      pot_pemb: 3000,
      bayar: 100000,
      cash_disc: 7000,
      saldo_akhir: 724000,
      giro_mundur: 0,
      saldo_sth_gm: 724000,
    },
    {
      customer: "UD Makmur Lestari",
      saldo_awal: 350000,
      jual: 120000,
      retur: 3000,
      pot_pemb: 2000,
      bayar: 90000,
      cash_disc: 2000,
      saldo_akhir: 377000,
      giro_mundur: 0,
      saldo_sth_gm: 377000,
    },
    {
      customer: "PT Bintang Timur",
      saldo_awal: 2000000,
      jual: 900000,
      retur: 40000,
      pot_pemb: 20000,
      bayar: 700000,
      cash_disc: 15000,
      saldo_akhir: 2355000,
      giro_mundur: 80000,
      saldo_sth_gm: 2435000,
    },
    {
      customer: "CV Cahaya Baru",
      saldo_awal: 480000,
      jual: 160000,
      retur: 8000,
      pot_pemb: 4000,
      bayar: 60000,
      cash_disc: 5000,
      saldo_akhir: 571000,
      giro_mundur: 5000,
      saldo_sth_gm: 576000,
    },
    {
      customer: "Toko Barokah",
      saldo_awal: 250000,
      jual: 100000,
      retur: 0,
      pot_pemb: 2000,
      bayar: 30000,
      cash_disc: 2000,
      saldo_akhir: 320000,
      giro_mundur: 0,
      saldo_sth_gm: 320000,
    },
    {
      customer: "PT Prima Mandiri",
      saldo_awal: 1300000,
      jual: 600000,
      retur: 25000,
      pot_pemb: 10000,
      bayar: 400000,
      cash_disc: 9000,
      saldo_akhir: 1716000,
      giro_mundur: 0,
      saldo_sth_gm: 1716000,
    },
  ];

  const dataSaldoHutang = [
    {
      supplier: "PT Maju Jaya",
      saldo_awal: 1200000,
      jual: 500000,
      retur: 20000,
      pot_pemb: 10000,
      bayar: 300000,
      cash_disc: 15000,
      saldo_akhir: 1420000,
      giro_mundur: 0,
      saldo_sth_gm: 1420000,
    },
    {
      supplier: "CV Sinar Abadi",
      saldo_awal: 800000,
      jual: 300000,
      retur: 0,
      pot_pemb: 15000,
      bayar: 200000,
      cash_disc: 8000,
      saldo_akhir: 877000,
      giro_mundur: 10000,
      saldo_sth_gm: 887000,
    },
    {
      supplier: "Toko Berkah",
      saldo_awal: 500000,
      jual: 250000,
      retur: 10000,
      pot_pemb: 5000,
      bayar: 100000,
      cash_disc: 7000,
      saldo_akhir: 638000,
      giro_mundur: 0,
      saldo_sth_gm: 638000,
    },
    {
      supplier: "PT Mandiri Solusi",
      saldo_awal: 1500000,
      jual: 700000,
      retur: 30000,
      pot_pemb: 20000,
      bayar: 500000,
      cash_disc: 12000,
      saldo_akhir: 1658000,
      giro_mundur: 50000,
      saldo_sth_gm: 1708000,
    },
    {
      supplier: "UD Sejahtera",
      saldo_awal: 300000,
      jual: 150000,
      retur: 5000,
      pot_pemb: 2000,
      bayar: 50000,
      cash_disc: 3000,
      saldo_akhir: 398000,
      giro_mundur: 0,
      saldo_sth_gm: 398000,
    },
    {
      supplier: "CV Bumi Raya",
      saldo_awal: 950000,
      jual: 400000,
      retur: 20000,
      pot_pemb: 10000,
      bayar: 250000,
      cash_disc: 9000,
      saldo_akhir: 1161000,
      giro_mundur: 0,
      saldo_sth_gm: 1161000,
    },
    {
      supplier: "PT Mega Utama",
      saldo_awal: 700000,
      jual: 200000,
      retur: 10000,
      pot_pemb: 5000,
      bayar: 150000,
      cash_disc: 5000,
      saldo_akhir: 750000,
      giro_mundur: 0,
      saldo_sth_gm: 750000,
    },
    {
      supplier: "Toko Sumber Rezeki",
      saldo_awal: 420000,
      jual: 180000,
      retur: 0,
      pot_pemb: 4000,
      bayar: 80000,
      cash_disc: 3000,
      saldo_akhir: 519000,
      giro_mundur: 12000,
      saldo_sth_gm: 531000,
    },
    {
      supplier: "CV Sentosa Makmur",
      saldo_awal: 1100000,
      jual: 450000,
      retur: 20000,
      pot_pemb: 10000,
      bayar: 300000,
      cash_disc: 10000,
      saldo_akhir: 1530000,
      giro_mundur: 0,
      saldo_sth_gm: 1530000,
    },
    {
      supplier: "PT Jaya Bersama",
      saldo_awal: 600000,
      jual: 220000,
      retur: 5000,
      pot_pemb: 3000,
      bayar: 100000,
      cash_disc: 7000,
      saldo_akhir: 724000,
      giro_mundur: 0,
      saldo_sth_gm: 724000,
    },
    {
      supplier: "UD Makmur Lestari",
      saldo_awal: 350000,
      jual: 120000,
      retur: 3000,
      pot_pemb: 2000,
      bayar: 90000,
      cash_disc: 2000,
      saldo_akhir: 377000,
      giro_mundur: 0,
      saldo_sth_gm: 377000,
    },
    {
      supplier: "PT Bintang Timur",
      saldo_awal: 2000000,
      jual: 900000,
      retur: 40000,
      pot_pemb: 20000,
      bayar: 700000,
      cash_disc: 15000,
      saldo_akhir: 2355000,
      giro_mundur: 80000,
      saldo_sth_gm: 2435000,
    },
    {
      supplier: "CV Cahaya Baru",
      saldo_awal: 480000,
      jual: 160000,
      retur: 8000,
      pot_pemb: 4000,
      bayar: 60000,
      cash_disc: 5000,
      saldo_akhir: 571000,
      giro_mundur: 5000,
      saldo_sth_gm: 576000,
    },
    {
      supplier: "Toko Barokah",
      saldo_awal: 250000,
      jual: 100000,
      retur: 0,
      pot_pemb: 2000,
      bayar: 30000,
      cash_disc: 2000,
      saldo_akhir: 320000,
      giro_mundur: 0,
      saldo_sth_gm: 320000,
    },
    {
      supplier: "PT Prima Mandiri",
      saldo_awal: 1300000,
      jual: 600000,
      retur: 25000,
      pot_pemb: 10000,
      bayar: 400000,
      cash_disc: 9000,
      saldo_akhir: 1716000,
      giro_mundur: 0,
      saldo_sth_gm: 1716000,
    },
  ];

  // ==== UI ====
  return (
    <FinanceMainLayout>
      <h1 class="text-2xl font-bold mb-6">Dashboard Finance</h1>

      {/* Filter Bar */}
      <div class="bg-white rounded shadow p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div class="text-sm text-gray-700">
          <span class="font-semibold">Filter:</span> {currentFilterLabel()}
        </div>
        <div class="flex gap-2">
          <button
            class="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
            onClick={async () => {
              await askFilterMode();
              await reloadData();
            }}
            title="Ubah rentang / mode tanggal"
          >
            Ubah Rentang
          </button>
          <button
            class="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
            onClick={async () => {
              setStartDate("");
              setEndDate("");
              setActiveFilters({});
              await reloadData();
            }}
            title="Reset ke semua tanggal"
          >
            Reset ke Semua
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div class="flex gap-2 mb-6 border-b">
        <button
          class={`px-4 py-2 ${
            activeTab() === "saldo_piutang"
              ? "border-b-2 border-blue-600 font-bold text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("saldo_piutang")}
        >
          Laporan Saldo Piutang
        </button>
        <button
          class={`px-4 py-2 ${
            activeTab() === "saldo_hutang"
              ? "border-b-2 border-blue-600 font-bold text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("saldo_hutang")}
        >
          Laporan Saldo Hutang
        </button>
        <button
          class={`px-4 py-2 ${
            activeTab() === "purchase"
              ? "border-b-2 border-blue-600 font-bold text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("purchase")}
        >
          Laporan Purchase Aksesoris Ekspedisi
        </button>
        <button
          class={`px-4 py-2 ${
            activeTab() === "hutang"
              ? "border-b-2 border-blue-600 font-bold text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("hutang")}
        >
          Laporan Pembayaran Hutang
        </button>
        <button
          class={`px-4 py-2 ${
            activeTab() === "piutang"
              ? "border-b-2 border-blue-600 font-bold text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("piutang")}
        >
          Laporan Penerimaan Piutang
        </button>
      </div>

      <Show when={loading()}>
        <div class="p-6 bg-white rounded shadow text-center">Loading…</div>
      </Show>

      <For each={sectionsData().filter((s) => s.key === activeTab())}>
        {(section) => (
          <div class="mb-12">
            <h2 class="text-xl font-bold mb-4">{section.title}</h2>

            <For each={section.blocks}>
              {(block) => {
                // === LAPORAN SALDO PIUTANG ===
                if (block.key === "laporan_saldo_piutang") {
                  return (
                    <div class="bg-white rounded shadow mb-8">
                      <div class="p-6 border-b flex justify-between items-center">
                        <h3 class="text-lg font-semibold">{block.label}</h3>

                        <div class="flex gap-2">
                          <button
                            class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                            onClick={() => handleOpenCreate(block)}
                          >
                            <Plus size={16} /> Tambah
                          </button>

                          <button class="px-3 py-1 border rounded hover:bg-gray-50 flex items-center gap-2">
                            <Filter size={16} /> Filter
                          </button>
                        </div>
                      </div>

                      <div class="p-6">
                        <SaldoPiutangTable data={dataSaldoPiutang} />
                      </div>
                    </div>
                  );
                }

                // === LAPORAN SALDO HUTANG ===
                if (block.key === "laporan_saldo_hutang") {
                  return (
                    <div class="bg-white rounded shadow mb-8">
                      <div class="p-6 border-b flex justify-between items-center">
                        <h3 class="text-lg font-semibold">{block.label}</h3>

                        <div class="flex gap-2">
                          <button
                            class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                            onClick={() => handleOpenCreate(block)}
                          >
                            <Plus size={16} /> Tambah
                          </button>

                          <button class="px-3 py-1 border rounded hover:bg-gray-50 flex items-center gap-2">
                            <Filter size={16} /> Filter
                          </button>
                        </div>
                      </div>

                      <div class="p-6">
                        <SaldoHutangTable data={dataSaldoHutang} />
                      </div>
                    </div>
                  );
                }

                // === PURCHASE AKSESORIS EKSPEDISI ===
                if (block.key === "purchase_aksesoris_ekspedisi") {
                  return (
                    <div class="bg-white rounded shadow mb-8">
                      <div class="p-6 border-b flex justify-between items-center">
                        <h3 class="text-lg font-semibold">{block.label}</h3>
                        <div class="flex gap-2">
                          <button
                            class="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 flex items-center gap-2"
                            onClick={() => handleOpenFilter(block)}
                            title="Filter Data"
                          >
                            <Funnel size={16} />
                            Filter {activeFilters()[block.key] ? "(Aktif)" : ""}
                          </button>
                          <Show when={activeFilters()[block.key]}>
                            <button
                              class="px-3 py-1 rounded border border-red-300 hover:bg-red-50 text-red-600 flex items-center gap-2"
                              onClick={() => resetFilter(block.key)}
                              title="Reset Filter"
                            >
                              Reset Filter
                            </button>
                          </Show>
                        </div>
                      </div>
                      <div class="p-6 border-b">
                        <ApexChart
                          type="donut"
                          height={320}
                          series={block.chart.series}
                          options={{
                            labels: block.chart.categories,
                            legend: { position: "bottom" },
                            dataLabels: { 
                              enabled: true,
                              formatter: (val) => `${val.toFixed(1)}%`
                            },
                            colors: ['#10B981', '#EF4444']
                          }}
                        />
                      </div>

                      <div class="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Kartu Total Surat Jalan */}
                        <div class="bg-white p-6 rounded shadow relative border">
                          <p class="text-sm text-gray-500">Total Pembelian</p>
                          <p class="text-3xl font-bold text-blue-600">{block.totals.totalSuratJalan}</p>
                          <button
                            class="absolute top-4 right-4 text-gray-500 hover:text-blue-600"
                            title="Cetak Laporan"
                            onClick={() => printPurchaseAksesorisEkspedisi({
                              startDate: startDate(),
                              endDate: endDate(),
                              filter: activeFilters()[block.key]
                            })}
                          >
                            <Printer size={20} />
                          </button>
                        </div>

                        {/* Kartu Total Nilai */}
                        <div class="bg-white p-6 rounded shadow relative border">
                          <p class="text-sm text-gray-500">Total Nilai Pembelian</p>
                          <p class="text-3xl font-bold text-green-600">
                            {new Intl.NumberFormat("id-ID", {
                              style: "currency",
                              currency: "IDR",
                              minimumFractionDigits: 0
                            }).format(block.totals.totalNilai)}
                          </p>
                          <button
                            class="absolute top-4 right-4 text-gray-500 hover:text-blue-600"
                            title="Export Excel"
                            onClick={() => exportToExcel(block.data, block, "purchase")}
                          >
                            <FileText size={20} />
                          </button>
                        </div>

                        {/* Kartu Status Pembayaran */}
                        <div class="bg-white p-6 rounded shadow border">
                          <p class="text-sm text-gray-500 mb-2">Status Pembayaran</p>
                          <div class="space-y-1 text-sm">
                            <div class="flex justify-between">
                              <span class="text-green-600">Belum Jatuh Tempo:</span>
                              <span class="font-semibold">{block.status.belumJatuhTempo}</span>
                            </div>
                            <div class="flex justify-between">
                              <span class="text-red-600">Lewat Jatuh Tempo:</span>
                              <span class="font-semibold">{block.status.lewatJatuhTempo}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // === PAYMENT HUTANG PURCHASE GREIGE ===
                if (block.key === "payment_hutang_purchase_greige") {
                  return (
                    <div class="bg-white rounded shadow mb-8">
                      <div class="p-6 border-b flex justify-between items-center">
                        <h3 class="text-lg font-semibold">{block.label}</h3>
                        <div class="flex gap-2">
                          <button
                            class="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 flex items-center gap-2"
                            onClick={() => handleOpenFilter(block)}
                            title="Filter Data"
                          >
                            <Funnel size={16} />
                            Filter {activeFilters()[block.key] ? "(Aktif)" : ""}
                          </button>
                          <Show when={activeFilters()[block.key]}>
                            <button
                              class="px-3 py-1 rounded border border-red-300 hover:bg-red-50 text-red-600 flex items-center gap-2"
                              onClick={() => resetFilter(block.key)}
                              title="Reset Filter"
                            >
                              Reset Filter
                            </button>
                          </Show>
                        </div>
                      </div>
                      <div class="p-6 border-b">
                        <ApexChart
                          type="donut"
                          height={320}
                          series={block.chart.series}
                          options={{
                            labels: block.chart.categories,
                            legend: { position: "bottom" },
                            dataLabels: { 
                              enabled: true,
                              formatter: (val) => `${val.toFixed(1)}%`
                            },
                            colors: ['#3B82F6', '#10B981']
                          }}
                        />
                      </div>

                      <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Kartu Total Laporan Pembayaran Hutang */}
                        <div class="bg-white p-6 rounded shadow relative border">
                          <p class="text-sm text-gray-500">Total Laporan Pembayaran Hutang</p>
                          <p class="text-3xl font-bold text-blue-600">{block.totals.totalSuratJalan}</p>
                          <button
                            class="absolute top-4 right-4 text-gray-500 hover:text-blue-600"
                            title="Cetak Laporan"
                            onClick={() => printPaymentHutangPurchaseGreige({
                              startDate: startDate(),
                              endDate: endDate(),
                              filter: activeFilters()[block.key]
                            })}
                          >
                            <Printer size={20} />
                          </button>
                        </div>

                        {/* Kartu Total Pembayaran Hutang */}
                        <div class="bg-white p-6 rounded shadow relative border">
                          <p class="text-sm text-gray-500">Total Pembayaran Hutang</p>
                          <p class="text-3xl font-bold text-green-600">
                            {new Intl.NumberFormat("id-ID", {
                              style: "currency",
                              currency: "IDR",
                              minimumFractionDigits: 0
                            }).format(block.totals.totalNilai)}
                          </p>
                          <button
                            class="absolute top-4 right-4 text-gray-500 hover:text-blue-600"
                            title="Export Excel"
                            onClick={() => exportToExcel(block.data, block, "payment_hutang_greige")}
                          >
                            <FileText size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                // === PAYMENT HUTANG PURCHASE CELUP ===
                if (block.key === "payment_hutang_purchase_celup") {
                  return (
                    <div class="bg-white rounded shadow mb-8">
                      <div class="p-6 border-b flex justify-between items-center">
                        <h3 class="text-lg font-semibold">{block.label}</h3>
                        <div class="flex gap-2">
                          <button
                            class="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 flex items-center gap-2"
                            onClick={() => handleOpenFilter(block)}
                            title="Filter Data"
                          >
                            <Funnel size={16} />
                            Filter {activeFilters()[block.key] ? "(Aktif)" : ""}
                          </button>
                          <Show when={activeFilters()[block.key]}>
                            <button
                              class="px-3 py-1 rounded border border-red-300 hover:bg-red-50 text-red-600 flex items-center gap-2"
                              onClick={() => resetFilter(block.key)}
                              title="Reset Filter"
                            >
                              Reset Filter
                            </button>
                          </Show>
                        </div>
                      </div>
                      <div class="p-6 border-b">
                        <ApexChart
                          type="donut"
                          height={320}
                          series={block.chart.series}
                          options={{
                            labels: block.chart.categories,
                            legend: { position: "bottom" },
                            dataLabels: { 
                              enabled: true,
                              formatter: (val) => `${val.toFixed(1)}%`
                            },
                            colors: ['#3B82F6', '#10B981']
                          }}
                        />
                      </div>

                      <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Kartu Total Laporan Pembayaran Hutang */}
                        <div class="bg-white p-6 rounded shadow relative border">
                          <p class="text-sm text-gray-500">Total Laporan Pembayaran Hutang</p>
                          <p class="text-3xl font-bold text-blue-600">{block.totals.totalSuratJalan}</p>
                          <button
                            class="absolute top-4 right-4 text-gray-500 hover:text-blue-600"
                            title="Cetak Laporan"
                            onClick={() => printPaymentHutangPurchaseCelup({
                              startDate: startDate(),
                              endDate: endDate(),
                              filter: activeFilters()[block.key]
                            })}
                          >
                            <Printer size={20} />
                          </button>
                        </div>

                        {/* Kartu Total Pembayaran Hutang */}
                        <div class="bg-white p-6 rounded shadow relative border">
                          <p class="text-sm text-gray-500">Total Pembayaran Hutang</p>
                          <p class="text-3xl font-bold text-green-600">
                            {new Intl.NumberFormat("id-ID", {
                              style: "currency",
                              currency: "IDR",
                              minimumFractionDigits: 0
                            }).format(block.totals.totalNilai)}
                          </p>
                          <button
                            class="absolute top-4 right-4 text-gray-500 hover:text-blue-600"
                            title="Export Excel"
                            onClick={() => exportToExcel(block.data, block, "payment_hutang_celup")}
                          >
                            <FileText size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                // === PAYMENT HUTANG PURCHASE FINISH ===
                if (block.key === "payment_hutang_purchase_finish") {
                  return (
                    <div class="bg-white rounded shadow mb-8">
                      <div class="p-6 border-b flex justify-between items-center">
                        <h3 class="text-lg font-semibold">{block.label}</h3>
                        <div class="flex gap-2">
                          <button
                            class="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 flex items-center gap-2"
                            onClick={() => handleOpenFilter(block)}
                            title="Filter Data"
                          >
                            <Funnel size={16} />
                            Filter {activeFilters()[block.key] ? "(Aktif)" : ""}
                          </button>
                          <Show when={activeFilters()[block.key]}>
                            <button
                              class="px-3 py-1 rounded border border-red-300 hover:bg-red-50 text-red-600 flex items-center gap-2"
                              onClick={() => resetFilter(block.key)}
                              title="Reset Filter"
                            >
                              Reset Filter
                            </button>
                          </Show>
                        </div>
                      </div>
                      <div class="p-6 border-b">
                        <ApexChart
                          type="donut"
                          height={320}
                          series={block.chart.series}
                          options={{
                            labels: block.chart.categories,
                            legend: { position: "bottom" },
                            dataLabels: { 
                              enabled: true,
                              formatter: (val) => `${val.toFixed(1)}%`
                            },
                            colors: ['#3B82F6', '#10B981']
                          }}
                        />
                      </div>

                      <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Kartu Total Laporan Pembayaran Hutang */}
                        <div class="bg-white p-6 rounded shadow relative border">
                          <p class="text-sm text-gray-500">Total Laporan Pembayaran Hutang</p>
                          <p class="text-3xl font-bold text-blue-600">{block.totals.totalSuratJalan}</p>
                          <button
                            class="absolute top-4 right-4 text-gray-500 hover:text-blue-600"
                            title="Cetak Laporan"
                            onClick={() => printPaymentHutangPurchaseFinish({
                              startDate: startDate(),
                              endDate: endDate(),
                              filter: activeFilters()[block.key]
                            })}
                          >
                            <Printer size={20} />
                          </button>
                        </div>

                        {/* Kartu Total Pembayaran Hutang */}
                        <div class="bg-white p-6 rounded shadow relative border">
                          <p class="text-sm text-gray-500">Total Pembayaran Hutang</p>
                          <p class="text-3xl font-bold text-green-600">
                            {new Intl.NumberFormat("id-ID", {
                              style: "currency",
                              currency: "IDR",
                              minimumFractionDigits: 0
                            }).format(block.totals.totalNilai)}
                          </p>
                          <button
                            class="absolute top-4 right-4 text-gray-500 hover:text-blue-600"
                            title="Export Excel"
                            onClick={() => exportToExcel(block.data, block, "payment_hutang_finish")}
                          >
                            <FileText size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                // === PAYMENT HUTANG PURCHASE JUAL BELI ===
                if (block.key === "payment_hutang_purchase_jual_beli") {
                  return (
                    <div class="bg-white rounded shadow mb-8">
                      <div class="p-6 border-b flex justify-between items-center">
                        <h3 class="text-lg font-semibold">{block.label}</h3>
                        <div class="flex gap-2">
                          <button
                            class="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 flex items-center gap-2"
                            onClick={() => handleOpenFilter(block)}
                            title="Filter Data"
                          >
                            <Funnel size={16} />
                            Filter {activeFilters()[block.key] ? "(Aktif)" : ""}
                          </button>
                          <Show when={activeFilters()[block.key]}>
                            <button
                              class="px-3 py-1 rounded border border-red-300 hover:bg-red-50 text-red-600 flex items-center gap-2"
                              onClick={() => resetFilter(block.key)}
                              title="Reset Filter"
                            >
                              Reset Filter
                            </button>
                          </Show>
                        </div>
                      </div>
                      <div class="p-6 border-b">
                        <ApexChart
                          type="donut"
                          height={320}
                          series={block.chart.series}
                          options={{
                            labels: block.chart.categories,
                            legend: { position: "bottom" },
                            dataLabels: { 
                              enabled: true,
                              formatter: (val) => `${val.toFixed(1)}%`
                            },
                            colors: ['#3B82F6', '#10B981']
                          }}
                        />
                      </div>

                      <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Kartu Total Laporan Pembayaran Hutang */}
                        <div class="bg-white p-6 rounded shadow relative border">
                          <p class="text-sm text-gray-500">Total Laporan Pembayaran Hutang</p>
                          <p class="text-3xl font-bold text-blue-600">{block.totals.totalSuratJalan}</p>
                          <button
                            class="absolute top-4 right-4 text-gray-500 hover:text-blue-600"
                            title="Cetak Laporan"
                            onClick={() => printPaymentHutangPurchaseJualBeli({
                              startDate: startDate(),
                              endDate: endDate(),
                              filter: activeFilters()[block.key]
                            })}
                          >
                            <Printer size={20} />
                          </button>
                        </div>

                        {/* Kartu Total Pembayaran Hutang */}
                        <div class="bg-white p-6 rounded shadow relative border">
                          <p class="text-sm text-gray-500">Total Pembayaran Hutang</p>
                          <p class="text-3xl font-bold text-green-600">
                            {new Intl.NumberFormat("id-ID", {
                              style: "currency",
                              currency: "IDR",
                              minimumFractionDigits: 0
                            }).format(block.totals.totalNilai)}
                          </p>
                          <button
                            class="absolute top-4 right-4 text-gray-500 hover:text-blue-600"
                            title="Export Excel"
                            onClick={() => exportToExcel(block.data, block, "payment_hutang_jual_beli")}
                          >
                            <FileText size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                // === PAYMENT HUTANG AKSESORIS EKSPEDISI ===
                if (block.key === "payment_hutang_aksesoris_ekspedisi") {
                  return (
                    <div class="bg-white rounded shadow mb-8">
                      <div class="p-6 border-b flex justify-between items-center">
                        <h3 class="text-lg font-semibold">{block.label}</h3>
                        <div class="flex gap-2">
                          <button
                            class="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 flex items-center gap-2"
                            onClick={() => handleOpenFilter(block)}
                            title="Filter Data"
                          >
                            <Funnel size={16} />
                            Filter {activeFilters()[block.key] ? "(Aktif)" : ""}
                          </button>
                          <Show when={activeFilters()[block.key]}>
                            <button
                              class="px-3 py-1 rounded border border-red-300 hover:bg-red-50 text-red-600 flex items-center gap-2"
                              onClick={() => resetFilter(block.key)}
                              title="Reset Filter"
                            >
                              Reset Filter
                            </button>
                          </Show>
                        </div>
                      </div>
                      <div class="p-6 border-b">
                        <ApexChart
                          type="donut"
                          height={320}
                          series={block.chart.series}
                          options={{
                            labels: block.chart.categories,
                            legend: { position: "bottom" },
                            dataLabels: { 
                              enabled: true,
                              formatter: (val) => `${val.toFixed(1)}%`
                            },
                            colors: ['#3B82F6', '#10B981']
                          }}
                        />
                      </div>

                      <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Kartu Total Laporan Pembayaran Hutang */}
                        <div class="bg-white p-6 rounded shadow relative border">
                          <p class="text-sm text-gray-500">Total Laporan Pembayaran Hutang</p>
                          <p class="text-3xl font-bold text-blue-600">{block.totals.totalSuratJalan}</p>
                          <button
                            class="absolute top-4 right-4 text-gray-500 hover:text-blue-600"
                            title="Cetak Laporan"
                            onClick={() => printPaymentHutangAksesorisEkspedisi({
                              startDate: startDate(),
                              endDate: endDate(),
                              filter: activeFilters()[block.key]
                            })}
                          >
                            <Printer size={20} />
                          </button>
                        </div>

                        {/* Kartu Total Pembayaran Hutang */}
                        <div class="bg-white p-6 rounded shadow relative border">
                          <p class="text-sm text-gray-500">Total Pembayaran Hutang</p>
                          <p class="text-3xl font-bold text-green-600">
                            {new Intl.NumberFormat("id-ID", {
                              style: "currency",
                              currency: "IDR",
                              minimumFractionDigits: 0
                            }).format(block.totals.totalNilai)}
                          </p>
                          <button
                            class="absolute top-4 right-4 text-gray-500 hover:text-blue-600"
                            title="Export Excel"
                            onClick={() => exportToExcel(block.data, block, "payment_hutang_aksesoris")}
                          >
                            <FileText size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                // === PENERIMAAN PIUTANG SALES ===
                if (block.key === "penerimaan_piutang_sales") {
                  return (
                    <div class="bg-white rounded shadow mb-8">
                      <div class="p-6 border-b flex justify-between items-center">
                        <h3 class="text-lg font-semibold">{block.label}</h3>
                        <div class="flex gap-2">
                          <button
                            class="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 flex items-center gap-2"
                            onClick={() => handleOpenFilter(block)}
                            title="Filter Data"
                          >
                            <Funnel size={16} />
                            Filter {activeFilters()[block.key] ? "(Aktif)" : ""}
                          </button>
                          <Show when={activeFilters()[block.key]}>
                            <button
                              class="px-3 py-1 rounded border border-red-300 hover:bg-red-50 text-red-600 flex items-center gap-2"
                              onClick={() => resetFilter(block.key)}
                              title="Reset Filter"
                            >
                              Reset Filter
                            </button>
                          </Show>
                        </div>
                      </div>
                      <div class="p-6 border-b">
                        <ApexChart
                          type="donut"
                          height={320}
                          series={block.chart.series}
                          options={{
                            labels: block.chart.categories,
                            legend: { position: "bottom" },
                            dataLabels: { 
                              enabled: true,
                              formatter: (val) => `${val.toFixed(1)}%`
                            },
                            colors: ['#3B82F6', '#10B981']
                          }}
                        />
                      </div>

                      <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Kartu Total Laporan Penerimaan Piutang */}
                        <div class="bg-white p-6 rounded shadow relative border">
                          <p class="text-sm text-gray-500">Total Laporan Penerimaan Piutang</p>
                          <p class="text-3xl font-bold text-blue-600">{block.totals.totalSuratJalan}</p>
                          <button
                            class="absolute top-4 right-4 text-gray-500 hover:text-blue-600"
                            title="Cetak Laporan"
                            onClick={() => printPenerimaanPiutangSales({
                              startDate: startDate(),
                              endDate: endDate(),
                              filter: activeFilters()[block.key]
                            })}
                          >
                            <Printer size={20} />
                          </button>
                        </div>

                        {/* Kartu Total Penerimaan Piutang */}
                        <div class="bg-white p-6 rounded shadow relative border">
                          <p class="text-sm text-gray-500">Total Penerimaan Piutang</p>
                          <p class="text-3xl font-bold text-green-600">
                            {new Intl.NumberFormat("id-ID", {
                              style: "currency",
                              currency: "IDR",
                              minimumFractionDigits: 0
                            }).format(block.totals.totalNilai)}
                          </p>
                          <button
                            class="absolute top-4 right-4 text-gray-500 hover:text-blue-600"
                            title="Export Excel"
                            onClick={() => exportToExcel(block.data, block, "penerimaan_piutang_sales")}
                          >
                            <FileText size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                // === PENERIMAAN PIUTANG JUAL BELI ===
                if (block.key === "penerimaan_piutang_jual_beli") {
                  return (
                    <div class="bg-white rounded shadow mb-8">
                      <div class="p-6 border-b flex justify-between items-center">
                        <h3 class="text-lg font-semibold">{block.label}</h3>
                        <div class="flex gap-2">
                          <button
                            class="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 flex items-center gap-2"
                            onClick={() => handleOpenFilter(block)}
                            title="Filter Data"
                          >
                            <Funnel size={16} />
                            Filter {activeFilters()[block.key] ? "(Aktif)" : ""}
                          </button>
                          <Show when={activeFilters()[block.key]}>
                            <button
                              class="px-3 py-1 rounded border border-red-300 hover:bg-red-50 text-red-600 flex items-center gap-2"
                              onClick={() => resetFilter(block.key)}
                              title="Reset Filter"
                            >
                              Reset Filter
                            </button>
                          </Show>
                        </div>
                      </div>
                      <div class="p-6 border-b">
                        <ApexChart
                          type="donut"
                          height={320}
                          series={block.chart.series}
                          options={{
                            labels: block.chart.categories,
                            legend: { position: "bottom" },
                            dataLabels: { 
                              enabled: true,
                              formatter: (val) => `${val.toFixed(1)}%`
                            },
                            colors: ['#3B82F6', '#10B981']
                          }}
                        />
                      </div>

                      <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Kartu Total Laporan Penerimaan Piutang */}
                        <div class="bg-white p-6 rounded shadow relative border">
                          <p class="text-sm text-gray-500">Total Laporan Penerimaan Piutang</p>
                          <p class="text-3xl font-bold text-blue-600">{block.totals.totalSuratJalan}</p>
                          <button
                            class="absolute top-4 right-4 text-gray-500 hover:text-blue-600"
                            title="Cetak Laporan"
                            onClick={() => printPenerimaanPiutangJualBeli({
                              startDate: startDate(),
                              endDate: endDate(),
                              filter: activeFilters()[block.key]
                            })}
                          >
                            <Printer size={20} />
                          </button>
                        </div>

                        {/* Kartu Total Penerimaan Piutang */}
                        <div class="bg-white p-6 rounded shadow relative border">
                          <p class="text-sm text-gray-500">Total Penerimaan Piutang</p>
                          <p class="text-3xl font-bold text-green-600">
                            {new Intl.NumberFormat("id-ID", {
                              style: "currency",
                              currency: "IDR",
                              minimumFractionDigits: 0
                            }).format(block.totals.totalNilai)}
                          </p>
                          <button
                            class="absolute top-4 right-4 text-gray-500 hover:text-blue-600"
                            title="Export Excel"
                            onClick={() => exportToExcel(block.data, block, "penerimaan_piutang_jual_beli")}
                          >
                            <FileText size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            </For>
          </div>
        )}
      </For>

      <Show when={!loading() && sectionsData().length === 0}>
        <div class="p-6 bg-white rounded shadow text-gray-500 text-center">
          Tidak ada laporan yang dapat ditampilkan.
        </div>
      </Show>

      {/* Filter Modal */}
      <Show when={showFilterModal()}>
        <FinanceFilterModal
          block={currentBlock()}
          filter={currentFilter()}
          onFilterChange={handleFilterChange}
          onPreview={handlePreviewFilter}
          onApply={() => handleApplyFilter(currentFilter())}
          onCancel={() => setShowFilterModal(false)}
          loading={previewLoading()}
        />
      </Show>

      {/* Preview Modal */}
      <Show when={showPreviewModal()}>
        <FinancePreviewModal
          show={showPreviewModal()}
          block={currentBlock()}
          data={previewData()}
          finance_filter={pendingFilter()}
          onApply={() => handleApplyFilter(pendingFilter())}
          onCancel={() => setShowPreviewModal(false)}
          applyLoading={applyFilterLoading()}
        />
      </Show>

      {/* Form Satuan Modal */}
      <Show when={showForm()}>
        <FormSaldoModal
          show={showForm()}
          initialData={editingItem()}
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmitForm}
        />
      </Show>
    </FinanceMainLayout>
  );
}
