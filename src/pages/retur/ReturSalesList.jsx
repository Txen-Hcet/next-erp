import { createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  getAllDeliveryNotes,
  getDeliveryNotes,
  getPackingLists,
  getUser,
  setReturSales,
  undoReturSales,
} from "../../utils/auth";
import Swal from "sweetalert2";
import { RotateCcw, CheckCircle, XCircle, Printer } from "lucide-solid";

export default function ReturSalesList() {
  const [packingOrders, setPackingOrders] = createSignal([]);
  const navigate = useNavigate();
  const tokUser = getUser();
  const [currentPage, setCurrentPage] = createSignal(1);
  const pageSize = 20;

  const totalPages = createMemo(() =>
    Math.max(1, Math.ceil(packingOrders().length / pageSize))
  );

  const paginatedData = () => {
    const startIndex = (currentPage() - 1) * pageSize;
    return packingOrders().slice(startIndex, startIndex + pageSize);
  };

  const formatNumber = (num, decimals = 2) => {
    const n = Number(num ?? 0);
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(isNaN(n) ? 0 : n);
  };

  // ---- GET DATA ----
  const handleGetAllData = async (tok) => {
    try {
      const result = await getAllDeliveryNotes(tok);

      const list =
        result?.suratJalans ??
        result?.surat_jalan_list ??
        result?.data ??
        [];

      if (Array.isArray(list)) {
        const sortedData = [...list].sort((a, b) => Number(b.id) - Number(a.id));
        setPackingOrders(sortedData);
        return;
      }

      if (result?.status === 403 || result?.statusCode === 403) {
        await Swal.fire({
          title: "Tidak Ada Akses",
          text: "Anda tidak memiliki izin untuk melihat Retur Penjualan",
          icon: "warning",
          confirmButtonColor: "#6496df",
        });
        navigate("/dashboard");
        return;
      }

      Swal.fire({
        title: "Gagal",
        text: result?.message || "Gagal mengambil data Retur Penjualan",
        icon: "error",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
      setPackingOrders([]);
    } catch {
      setPackingOrders([]);
    }
  };

  // Ambil roll IDs dari detail SJ (kompatibel ke banyak bentuk payload)
  const getRollIdsForSJ = async (sjId, token) => {
    const detail = await getDeliveryNotes(sjId, token);

    const sj =
      detail?.suratJalan ??
      detail?.surat_jalan ??
      detail?.order ??
      null;

    if (!sj) return [];

    // pola lama: sj.items[...].(rolls|item_rolls|...)
    const directItems = sj.items || [];
    const collectFromDirect = [];
    directItems.forEach((it) => {
      const candidates =
        it.item_rolls || it.rolls || it.detail_rolls || it.roll_details || [];
      candidates.forEach((r) => {
        if (r?.id != null) collectFromDirect.push(Number(r.id));
      });
    });

    // pola packing_lists: sj.packing_lists[].items[].rolls[]
    const collectFromPacking = [];
    const pls = sj.packing_lists || sj.packingLists || [];
    pls.forEach((pl) => {
      (pl.items || []).forEach((it) => {
        (it.rolls || []).forEach((r) => {
          if (r?.id != null) collectFromPacking.push(Number(r.id));
        });
      });
    });

    return [...collectFromDirect, ...collectFromPacking];
  };

  // ===== ENRICH: isi no_bal & lot per roll/item dari data PL asli =====
  const enrichOrderFromPL = async (orderRaw, token) => {
    const order = JSON.parse(JSON.stringify(orderRaw)); // deep clone aman

    // Untuk setiap PL yang ada di SJ:
    for (const pl of order.packing_lists || []) {
      // Ambil PL lengkap (punya data roll paling “ground truth”)
      const plDetail = await getPackingLists(pl.id, token);
      const fullPl = plDetail?.order;
      if (!fullPl) continue;

      // Buat map: pli_roll_id -> { no_bal, lot }
      const balByRollId = new Map();
      const lotByRollId = new Map();
      (fullPl.items || []).forEach((it) => {
        (it.rolls || []).forEach((r) => {
          const rid = Number(r.id);
          if (!Number.isFinite(rid)) return;
          const nb = r.no_bal != null ? String(r.no_bal).trim() : "";
          const lt = r.lot    != null ? String(r.lot).trim()    : "";
          if (nb) balByRollId.set(rid, nb);
          if (lt) lotByRollId.set(rid, lt);
        });
      });

      // Isi ke struktur SJ (roll: pakai pli_roll_id). Lalu agregat di level item.
      (pl.items || []).forEach((sjItem) => {
        const setBal = new Set();
        const setLot = new Set();

        (sjItem.rolls || []).forEach((rr) => {
          const rid = Number(rr.pli_roll_id ?? rr.id);
          const nb = balByRollId.get(rid);
          const lt = lotByRollId.get(rid);

          if (nb && !rr.no_bal) rr.no_bal = nb;
          if (lt && !rr.lot)    rr.lot    = lt;

          if (rr.no_bal) setBal.add(String(rr.no_bal));
          if (rr.lot)    setLot.add(String(rr.lot));
        });

        const sortNum = (a, b) => Number(a) - Number(b);
        sjItem.no_bal = setBal.size
          ? Array.from(setBal).sort(sortNum).join(", ")
          : (sjItem.no_bal || "-");

        sjItem.lot = setLot.size
          ? Array.from(setLot).join(", ")
          : (sjItem.lot || "-");
      });
    }

    return order;
  };  

  // ========= Handler Retur =========
  const handleSetReturned = async (sj) => {
    if (sj.returned_at) {
      Swal.fire({
        title: "Sudah Retur",
        text: "Data ini sudah diretur.",
        icon: "info",
        timer: 1200,
        showConfirmButton: false,
      });
      return;
    }

    // ✅ WAJIB SUDAH DICETAK
    if (!sj.printed_at) {
      Swal.fire({
        title: "Belum Dicetak",
        text: "Silakan cetak Surat Jalan terlebih dahulu sebelum set retur.",
        icon: "info",
        timer: 1400,
        showConfirmButton: false,
      });
      return;
    }

    const konfirm = await Swal.fire({
      title: "Konfirmasi Retur",
      text: `Jadikan Retur untuk ${sj.no_sj} dengan ID ${sj.id}? Stok akan dikembalikan.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Retur",
      cancelButtonText: "Batal",
      confirmButtonColor: "#2563eb",
    });
    if (!konfirm.isConfirmed) return;

    try {
      const rollIds = await getRollIdsForSJ(sj.id, tokUser?.token);

      if (!rollIds.length) {
        await Swal.fire({
          title: "Tidak ada roll",
          text: "Surat jalan ini tidak memiliki roll untuk diretur.",
          icon: "info",
          timer: 1400,
          showConfirmButton: false,
        });
        return;
      }

      await setReturSales(tokUser?.token, sj.id, rollIds);

      setPackingOrders((prev) =>
        prev.map((x) =>
          x.id === sj.id
            ? {
                ...x,
                returned_at: new Date().toISOString().slice(0, 19).replace("T", " "),
                returned_by: tokUser?.id || 0,
              }
            : x
        )
      );

      Swal.fire({
        title: "Berhasil",
        text: "Retur berhasil diset.",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (e) {
      Swal.fire({
        title: "Gagal",
        text: e?.message || "Gagal set retur.",
        icon: "error",
      });
    }
  };

  const handleUnsetReturned = async (sj) => {
    if (!sj.returned_at) {
      Swal.fire({
        title: "Belum Retur",
        text: "Data ini belum diretur.",
        icon: "info",
        timer: 1200,
        showConfirmButton: false,
      });
      return;
    }

    const konfirm = await Swal.fire({
      title: "Batalkan Retur?",
      text: `Batalkan status retur untuk ${sj.no_sj} dengan ID ${sj.id}? Stok akan dikoreksi kembali.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Batalkan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#d97706",
    });
    if (!konfirm.isConfirmed) return;

    try {
      const rollIds = await getRollIdsForSJ(sj.id, tokUser?.token);

      if (!rollIds.length) {
        await Swal.fire({
          title: "Tidak ada roll",
          text: "Surat jalan ini tidak memiliki roll untuk di-undo retur.",
          icon: "info",
          timer: 1400,
          showConfirmButton: false,
        });
        return;
      }

      await undoReturSales(tokUser?.token, sj.id, rollIds);

      setPackingOrders((prev) =>
        prev.map((x) =>
          x.id === sj.id ? { ...x, returned_at: null, returned_by: null } : x
        )
      );

      Swal.fire({
        title: "Dibatalkan",
        text: "Status retur dibatalkan.",
        icon: "success",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (e) {
      Swal.fire({
        title: "Gagal",
        text: e?.message || "Gagal membatalkan retur.",
        icon: "error",
      });
    }
  };

  // ===== PRINT RETUR =====
  const handlePrintRetur = async (sj) => {
    if (!sj.returned_at) {
      Swal.fire({
        title: "Belum Retur",
        text: "Set retur dulu sebelum mencetak dokumen retur.",
        icon: "info",
        timer: 1200,
        showConfirmButton: false,
      });
      return;
    }

    try {
      const detail = await getDeliveryNotes(sj.id, tokUser?.token);

      const orderRaw =
        detail?.order ??
        detail?.suratJalan ??
        detail?.surat_jalan;

      if (!orderRaw) {
        Swal.fire("Gagal", "Data retur tidak ditemukan.", "error");
        return;
      }

      // ⬅️ KUNCI: Enrich dulu dari PL supaya Bal & Lot lengkap/akurat
      const order = await enrichOrderFromPL(orderRaw, tokUser?.token);

      // helper angka -> number
      const toNum = (v, d = 0) => {
        const n = Number(String(v ?? d));
        return Number.isFinite(n) ? n : d;
      };

      // siapkan versi “flat” item
      const flatItems = (order.packing_lists || []).flatMap((pl) =>
        (pl.items || []).map((it) => ({
          corak_kain: it.corak_kain,
          konstruksi_kain: it.konstruksi_kain,
          deskripsi_warna: it.deskripsi_warna ?? it.kode_warna ?? "-",
          lebar_greige: null,
          lebar_finish: it.lebar ?? 0,
          gulung: (it.rolls || []).length,
          lot: it.lot ?? "-",
          meter_total: toNum(it.meter_total),
          yard_total: toNum(it.yard_total),
          harga: toNum(it.harga),
        }))
      );

      // Payload final untuk halaman print
      const printData = {
        // header
        no_sj: order.no_sj,
        created_at: order.created_at,
        tanggal_kirim: order.delivery_date,
        no_po: order.po_cust,
        supplier_name: order.customer_name,
        supplier_alamat: order.supplier_alamat,
        supplier_kirim_alamat: order.supplier_kirim_alamat,
        telepon: order.supllier_no_telp ?? order.supplier_no_telp ?? "0",
        satuan_unit_name: order.satuan_unit,
        keterangan: order.keterangan ?? "-",
        ppn_percent: order.ppn_percent ?? "0",

        // penting: kirim struktur asli (packing_lists) yang sudah di-enrich
        packing_lists: order.packing_lists || [],

        // tambahan: versi flat
        items: flatItems,

        // summary
        summary: {
          total_meter: toNum(order.summary?.total_meter),
          total_yard:  toNum(order.summary?.total_yard),
          subtotal:    toNum(order.summary?.subtotal),
        },

        // field lain yang dipakai komponen print
        no_so: order.no_so,
        no_mobil: order.no_mobil,
        sopir: order.sopir,
        customer_name: order.customer_name,
        satuan_unit: order.satuan_unit,
      };

      // console.log("Data Print Retur Sales:", JSON.stringify(printData, null, 2));
      const encoded = encodeURIComponent(JSON.stringify(printData));
      window.open(`/print/retur-sales#${encoded}`, "_blank");
    } catch (e) {
      Swal.fire("Gagal", e?.message || "Tidak bisa memuat data print.", "error");
    }
  };

  // ---- load ----
  createEffect(() => {
    if (tokUser?.token) handleGetAllData(tokUser?.token);
  });

  function formatTanggalIndo(tanggalString) {
    if (!tanggalString) return "-";
    const tanggal = new Date(tanggalString);
    const bulanIndo = [
      "Januari","Februari","Maret","April","Mei","Juni",
      "Juli","Agustus","September","Oktober","November","Desember",
    ];
    const tanggalNum = tanggal.getDate();
    const bulan = bulanIndo[tanggal.getMonth()];
    const tahun = tanggal.getFullYear();
    return `${tanggalNum} ${bulan} ${tahun}`;
  }

  const renderStatusRetur = (sj) => {
    const isReturned = !!sj.returned_at;
    return (
      <span
        class={`inline-flex items-center justify-center gap-1 w-full ${
          isReturned ? "text-green-600" : "text-red-600"
        }`}
        title={
          isReturned
            ? `Sudah retur${sj.returned_at ? ` • ${formatTanggalIndo(sj.returned_at)}` : ""}`
            : "Belum retur"
        }
      >
        {isReturned ? <CheckCircle size={18} /> : <XCircle size={18} />}
      </span>
    );
  };

  return (
    <MainLayout>
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">Retur Surat Jalan</h1>
        <button
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => navigate("/jualbeli-deliverynote/form")}
          hidden
        >
          + Tambah Surat Jalan
        </button>
      </div>

      <div class="w-full overflow-x-auto">
        <table class="w-full bg-white shadow-md rounded">
          <thead>
            <tr class="bg-gray-200 text-left text-sm uppercase text-gray-700">
              <th class="py-2 px-4">ID</th>
              <th class="py-2 px-2">No Surat Jalan</th>
              <th class="py-2 px-2">Tanggal</th>
              <th class="py-2 px-2">Customer</th>
              <th class="py-2 px-2">Satuan Unit</th>
              <th class="py-2 px-2">Jumlah Kain</th>
              <th class="py-2 px-2">Total</th>
              <th class="py-2 px-2">Status Retur</th>
              <th class="py-2 px-4">Aksi</th>
              <th class="py-2 px-4">Print</th>
            </tr>
          </thead>

          <tbody>
            {paginatedData().map((sj, index) => {
              const unitName = sj.satuan_unit_name ?? sj.satuan_unit ?? "-";
              const canPrint = !!sj.returned_at;
              const jumlahKain = Number(sj.summary?.jumlah_kain ?? 0);
              const totalDisplay =
                unitName === "Meter"
                  ? `${formatNumber(sj.summary?.total_meter)} m`
                  : unitName === "Yard"
                  ? `${formatNumber(sj.summary?.total_yard)} yd`
                  : `${formatNumber(sj.summary?.total_kilogram)} kg`;

              return (
                <tr class="border-b" key={sj.id}>
                  <td class="py-2 px-4">
                    {(currentPage() - 1) * pageSize + (index + 1)}
                  </td>
                  <td class="py-2 px-4">{sj.no_sj}</td>
                  <td class="py-2 px-4">{formatTanggalIndo(sj.created_at)}</td>
                  <td class="py-2 px-4">{sj.customer_name}</td>
                  <td class="py-2 px-4">{unitName}</td>
                  <td class="py-2 px-4 text-center">{jumlahKain}</td>
                  <td class="py-2 px-4 text-right">{totalDisplay}</td>

                  <td class="py-2 px-4">{renderStatusRetur(sj)}</td>

                  <td class="py-2 px-4 space-x-2">
                    {!sj.returned_at ? (
                      <button
                        class={`${
                          sj.printed_at
                            ? "text-emerald-600 hover:underline"
                            : "text-gray-400 cursor-not-allowed"
                        }`}
                        onClick={() => sj.printed_at && handleSetReturned(sj)}
                        disabled={!sj.printed_at}
                        title={
                          sj.printed_at
                            ? "Set Retur"
                            : "Belum dicetak — tidak bisa set retur"
                        }
                      >
                        ⤿ Retur
                      </button>
                    ) : (
                      <button
                        class="text-amber-600 hover:underline"
                        onClick={() => handleUnsetReturned(sj)}
                        title="Batalkan Retur"
                      >
                        <RotateCcw size={20} class="inline-block mr-1" /> Batal Retur
                      </button>
                    )}
                  </td>

                  <td class="py-2 px-4 text-center">
                    <button
                      class={`mx-auto ${
                        canPrint
                          ? "text-green-600 hover:underline"
                          : "text-gray-400 cursor-not-allowed"
                      }`}
                      onClick={() => canPrint && handlePrintRetur(sj)}
                      disabled={!canPrint}
                      title={canPrint ? "Print Retur" : "Belum retur — tidak bisa print"}
                    >
                      <Printer size={22} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div class="w-full mt-8 flex justify-between space-x-2">
          <button
            class="px-3 py-1 bg-gray-200 rounded min-w-[80px]"
            onClick={() => setCurrentPage(currentPage() - 1)}
            disabled={currentPage() === 1}
          >
            Prev
          </button>
          <span>
            Page {currentPage()} of {totalPages()}
          </span>
          <button
            class="px-3 py-1 bg-gray-200 rounded min-w-[80px]"
            onClick={() => setCurrentPage(currentPage() + 1)}
            disabled={currentPage() === totalPages()}
          >
            Next
          </button>
        </div>
      </div>
    </MainLayout>
  );
}
