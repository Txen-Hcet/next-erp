import {
  createSignal,
  createEffect,
  For,
  onMount,
  Show,
  createMemo,
  onCleanup,
} from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  getOCX,
  createSJOCX,
  getUser,
  getSJOCX,
  getAllOCX,
  getLastSequence,
  updateSJOCX,
} from "../../../utils/auth";
import OCXDropdownSearch from "../../../components/OCXDropdownSearch";
import { Printer, Trash2 } from "lucide-solid";

// Cache untuk detail OCX
const ocxDetailCache = new Map();

// Function untuk load detail dengan cache
const loadOCXDetailWithCache = async (ocxId, token) => {
  if (ocxDetailCache.has(ocxId)) {
    return ocxDetailCache.get(ocxId);
  }
  
  try {
    const res = await getOCX(ocxId, token);
    if (res?.data) {
      ocxDetailCache.set(ocxId, res.data);
      return res.data;
    }
  } catch (error) {
    console.error(`Failed to load OCX detail for ${ocxId}:`, error);
  }
  
  return null;
};

// Function to calculate OCX status
const calculateOCXStatus = (ocxData, detail) => {
  if (!detail || !detail.items || detail.items.length === 0) {
    return "UNKNOWN";
  }

  const items = detail.items;
  let totalMeter = 0;
  let totalYard = 0;
  let totalDeliveredMeter = 0;
  let totalDeliveredYard = 0;

  items.forEach((item) => {
    totalMeter += parseFloat(item.meter_total || 0);
    totalYard += parseFloat(item.yard_total || 0);
    totalDeliveredMeter += parseFloat(item.delivered_meter_total || 0);
    totalDeliveredYard += parseFloat(item.delivered_yard_total || 0);
  });

  let sisa = 0;
  const satuanUnitId = ocxData.satuan_unit_id || 1;

  switch (parseInt(satuanUnitId)) {
    case 1: // Meter
      sisa = totalMeter - totalDeliveredMeter;
      break;
    case 2: // Yard
      sisa = totalYard - totalDeliveredYard;
      break;
    default:
      sisa = 0;
  }

  // Kalau udah habis atau kurang dari 0.01 (untuk toleransi floating point)
  if (sisa <= 0) {
    return "SELESAI";
  }

  return "AVAILABLE";
};

export default function OCXDeliveryNoteForm() {
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const isView = params.view === "true";
  const navigate = useNavigate();
  const user = getUser();

  const [orderCelupList, setOrderCelupList] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [deliveryNoteData, setDeliveryNoteData] = createSignal(null);
  const [deletedItems, setDeletedItems] = createSignal([]);
  const [formLoaded, setFormLoaded] = createSignal(false);
  const [loadingDetails, setLoadingDetails] = createSignal({});

  const [form, setForm] = createSignal({
    sequence_number: "",
    no_sj_ex: "",
    keterangan: "",
    purchase_order_id: null,
    purchase_order_items: null,
    no_sj_supplier: "",
    tanggal_kirim: "",
    alamat: "",
    satuan_unit_id: 1,
    itemGroups: [],
  });

  // Function to get unit name from satuan_unit_id
  const getUnitName = (satuanUnitId) => {
    switch (parseInt(satuanUnitId)) {
      case 1: return "Meter";
      case 2: return "Yard";
      case 3: return "Kilogram";
      default: return "Meter";
    }
  };

  // Computed for unit name based on satuan_unit_id
  const unitName = createMemo(() => {
    return getUnitName(form().satuan_unit_id);
  });

  // Perbaikan total calculations menggunakan satuan_unit_id
  const totalMeter = createMemo(() =>
    form().itemGroups.reduce(
      (sum, group) => sum + (parseFloat(group.meter_total) || 0),
      0
    )
  );

  const totalYard = createMemo(() =>
    form().itemGroups.reduce(
      (sum, group) => sum + (parseFloat(group.yard_total) || 0),
      0
    )
  );

  const totalQuantity = createMemo(() => {
    const satuanUnitId = form().satuan_unit_id;
    if (satuanUnitId === 1) {
      return totalMeter();
    } else if (satuanUnitId === 2) {
      return totalYard();
    } else {
      return totalMeter();
    }
  });

  // Function to load OCX with status
  const loadOrderCelupWithStatus = async () => {
    try {
      setLoading(true);
      
      // Load all OCX data
      const ocxResponse = await getAllOCX(user?.token);
      
      if (ocxResponse?.data) {
        // Untuk setiap OCX, load detail dan hitung status
        const ocxPromises = ocxResponse.data.map(async (ocx) => {
          setLoadingDetails(prev => ({ ...prev, [ocx.id]: true }));
          
          try {
            // Load detail untuk menghitung sisa
            const detail = await loadOCXDetailWithCache(ocx.id, user?.token);
            
            // Hitung status quantity
            const qty_status = calculateOCXStatus(ocx, detail);
            
            // Hitung sisa untuk ditampilkan
            let sisa = 0;
            let total = 0;
            
            if (detail && detail.items && detail.items.length > 0) {
              const items = detail.items;
              let totalMeter = 0;
              let totalYard = 0;
              let totalDeliveredMeter = 0;
              let totalDeliveredYard = 0;

              items.forEach((item) => {
                totalMeter += parseFloat(item.meter_total || 0);
                totalYard += parseFloat(item.yard_total || 0);
                totalDeliveredMeter += parseFloat(item.delivered_meter_total || 0);
                totalDeliveredYard += parseFloat(item.delivered_yard_total || 0);
              });

              switch (parseInt(ocx.satuan_unit_id || 1)) {
                case 1: // Meter
                  sisa = totalMeter - totalDeliveredMeter;
                  total = totalMeter;
                  break;
                case 2: // Yard
                  sisa = totalYard - totalDeliveredYard;
                  total = totalYard;
                  break;
              }
            }
            
            return {
              ...ocx,
              qty_status,
              sisa_quantity: sisa,
              total_quantity: total,
              detail: detail
            };
          } catch (error) {
            console.error(`Failed to load detail for OCX ${ocx.id}:`, error);
            return {
              ...ocx,
              qty_status: "UNKNOWN",
              sisa_quantity: 0,
              total_quantity: 0,
              detail: null
            };
          } finally {
            setLoadingDetails(prev => ({ ...prev, [ocx.id]: false }));
          }
        });

        // Tunggu semua OCX selesai di-load
        const ocxWithStatus = await Promise.all(ocxPromises);
        setOrderCelupList(ocxWithStatus);
      } else {
        setOrderCelupList([]);
      }
    } catch (error) {
      console.error("Error loading OCX data:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Gagal memuat data OCX.",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true
      });
      setOrderCelupList([]);
    } finally {
      setLoading(false);
    }
  };

  onMount(async () => {
    try {
      // Load OCX dengan status
      await loadOrderCelupWithStatus();
      
      // If edit mode, load existing SJ OCX data
      if (isEdit) {
        const sjResponse = await getSJOCX(params.id, user?.token);
        
        if (!sjResponse?.data) {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Data Surat Penerimaan OCX tidak ditemukan.",
            showConfirmButton: false,
            timer: 1500,
            timerProgressBar: true
          });
          return;
        }

        const suratJalanData = sjResponse.data;
        
        // Load OCX details
        const poDetailResponse = await getOCX(suratJalanData.po_ex_id, user?.token);
        const poData = poDetailResponse?.data;

        setDeliveryNoteData({
          ...suratJalanData,
          purchase_order_detail: poData
        });

        // Set form data for edit mode
        const formattedDate = suratJalanData.tanggal_kirim
          ? new Date(suratJalanData.tanggal_kirim).toISOString().split("T")[0]
          : "";

        // Determine satuan_unit_id from PO data
        let satuanUnitId = 1;
        if (poData?.satuan_unit_id) {
          satuanUnitId = poData.satuan_unit_id;
        }

        setForm({
          sequence_number: suratJalanData.sequence_number || "",
          no_sj_ex: suratJalanData.no_sj_ex || "",
          keterangan: suratJalanData.keterangan || "",
          purchase_order_id: suratJalanData.po_ex_id,
          purchase_order_items: poData,
          no_sj_supplier: suratJalanData.no_sj_supplier || "",
          tanggal_kirim: formattedDate,
          alamat: suratJalanData.alamat || "-",
          satuan_unit_id: satuanUnitId,
          itemGroups: (suratJalanData.items || [])
            .filter((group) => !group.deleted_at)
            .map((group) => {
              const poItem = poData?.items?.find(
                (item) => item.id === group.po_ex_item_id
              );

              return {
                id: group.id,
                purchase_order_item_id: group.po_ex_item_id,
                item_details: {
                  corak_kain: poItem?.corak_kain || "N/A",
                  konstruksi_kain: poItem?.konstruksi_kain || "",
                  kode_warna_ex: poItem?.kode_warna_ex || "",
                  deskripsi_warna_ex: poItem?.deskripsi_warna_ex || "",
                  kode_warna_new: poItem?.kode_warna_new || "",
                  deskripsi_warna_new: poItem?.deskripsi_warna_new || "",
                  lebar_finish: poItem?.lebar_finish || 0,
                  harga: poItem?.harga || 0,
                },
                meter_total: parseFloat(group.meter_total) || 0,
                yard_total: parseFloat(group.yard_total) || 0,
                gulung: typeof group.gulung === "number" ? group.gulung : 0,
                lot: typeof group.lot === "number" ? group.lot : 0,
              };
            }),
        });
      }
      
      setFormLoaded(true);
    } catch (error) {
      console.error("Error loading data:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Gagal memuat data.",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true
      });
    }
  });

  // Clear cache on unmount
  onCleanup(() => {
    ocxDetailCache.clear();
  });

  const removeItem = (index) => {
    setForm((prev) => {
      const updatedItemGroups = [...prev.itemGroups];
      const [removed] = updatedItemGroups.splice(index, 1);

      if (removed?.id) {
        setDeletedItems((prevDeleted) => [...prevDeleted, removed.id]);
      }

      return { ...prev, itemGroups: updatedItemGroups };
    });
  };

  const formatNumber = (num, decimals = 2) => {
    if (num === "" || num === null || num === undefined) return "";

    const numValue = parseFloat(num);

    if (isNaN(numValue)) return "";

    if (numValue === 0) return "0.00";

    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(numValue);
  };

  const parseNumber = (str) => {
    if (typeof str !== "string") str = String(str || "");
    if (!str) return 0;
    
    const cleaned = str.replace(/[^\d,\.]/g, "");
    const normalized = cleaned.replace(/,/g, ".");
    const result = parseFloat(normalized);
    
    return isNaN(result) ? 0 : result;
  };

  const handleQuantityChange = (index, value) => {
    const satuanUnitId = form().satuan_unit_id;
    const numValue = parseNumber(value);

    setForm((prev) => {
      const updatedItemGroups = [...prev.itemGroups];
      const itemToUpdate = { ...updatedItemGroups[index] };

      if (satuanUnitId === 1) {
        itemToUpdate.meter_total = numValue;
        itemToUpdate.yard_total = numValue * 1.093613;
      } else if (satuanUnitId === 2) {
        itemToUpdate.yard_total = numValue;
        itemToUpdate.meter_total = numValue / 1.093613;
      } else {
        itemToUpdate.meter_total = numValue;
        itemToUpdate.yard_total = numValue;
      }

      updatedItemGroups[index] = itemToUpdate;
      return { ...prev, itemGroups: updatedItemGroups };
    });
  };

  const handleGulungChange = (index, value) => {
    const numValue = parseNumber(value);
    setForm((prev) => {
      const arr = [...prev.itemGroups];
      arr[index] = { ...arr[index], gulung: numValue };
      return { ...prev, itemGroups: arr };
    });
  };

  const handleLotChange = (index, value) => {
    const numValue = parseNumber(value);
    setForm((prev) => {
      const arr = [...prev.itemGroups];
      arr[index] = { ...arr[index], lot: numValue };
      return { ...prev, itemGroups: arr };
    });
  };

  const handleSuratJalanChange = async (selectedPO) => {
    if (!selectedPO) return;

    try {
      // Pastikan detail OCX sudah di-cache
      let selectedPOData = selectedPO.detail;
      if (!selectedPOData) {
        selectedPOData = await loadOCXDetailWithCache(selectedPO.id, user?.token);
      }

      if (!selectedPOData) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Gagal memuat detail OCX.",
          showConfirmButton: false,
          timer: 1500,
          timerProgressBar: true
        });
        return;
      }

      // Cek apakah OCX sudah selesai
      if (selectedPO.qty_status === "SELESAI") {
        Swal.fire({
          icon: "warning",
          title: "OCX Sudah Selesai",
          text: "OCX ini sudah tidak memiliki quantity tersisa.",
          showConfirmButton: true,
          confirmButtonColor: "#3085d6",
        });
        return;
      }

      // Generate SJ number
      const poPPN = selectedPO.no_po_ex.split("/")[2];
      const ppnValue = poPPN === "P" ? 11 : 0;

      const { newSJNumber, newSequenceNumber } = await generateSJNumber(ppnValue);

      const satuanUnitId = selectedPOData?.satuan_unit_id || 1;

      const newItemGroups = (selectedPOData?.items || []).map((item) =>
        templateFromPOItem(item)
      );

      setForm(prev => ({
        ...prev,
        purchase_order_id: selectedPO.id,
        purchase_order_items: selectedPOData,
        no_sj_ex: newSJNumber,
        sequence_number: newSequenceNumber,
        alamat: selectedPOData?.alamat || selectedPO.alamat || "-",
        satuan_unit_id: satuanUnitId,
        itemGroups: newItemGroups,
      }));
    } catch (error) {
      console.error("Error loading OCX detail:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Gagal memuat detail OCX.",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true
      });
    }
  };

  const generateSJNumber = async (ppn) => {
    const ppnNumber = Number(ppn);
    
    let typeParam = "";
    if (ppnNumber === 11) {
      typeParam = "domestik";
    }

    const lastSeq = await getLastSequence(user?.token, "sj_ex", typeParam, ppnNumber);

    const nextNum = String((lastSeq?.last_sequence || 0) + 1).padStart(3, "0");
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(2);
    const type = ppnNumber > 0 ? "P" : "N";
    const mmyy = `${month}${year}`;
    const nomor = `SJ/OCX/${type}/${mmyy}-${nextNum}`;

    return {
      newSJNumber: nomor,
      newSequenceNumber: (lastSeq?.last_sequence || 0) + 1,
    };
  }

  const templateFromPOItem = (poItem) => {
    return {
      purchase_order_item_id: poItem.id,
      item_details: {
        corak_kain: poItem.corak_kain,
        konstruksi_kain: poItem.konstruksi_kain,
        kode_warna_ex: poItem.kode_warna_ex || "",
        deskripsi_warna_ex: poItem.deskripsi_warna_ex || "",
        kode_warna_new: poItem.kode_warna_new || "",
        deskripsi_warna_new: poItem.deskripsi_warna_new || "",
        lebar_finish: poItem.lebar_finish || 0,
        harga: poItem.harga || 0,
      },
      meter_total: 0,
      yard_total: 0,
      gulung: 0,
      lot: 0,
    };
  };

  const addItemGroup = () => {
    const poDetail = form().purchase_order_items;
    if (!poDetail || !poDetail.items || poDetail.items.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Peringatan",
        text: "Silakan pilih OCX terlebih dahulu.",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true
      });
      return;
    }

    const paketBaru = poDetail.items.map(templateFromPOItem);

    setForm((prev) => ({
      ...prev,
      itemGroups: [...prev.itemGroups, ...paketBaru],
    }));
  };

  const handleKeyDown = (e) => {
    const tag = e.target.tagName;
    const type = e.target.type;

    if (
      e.key === "Enter" &&
      tag !== "TEXTAREA" &&
      type !== "submit" &&
      type !== "button"
    ) {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validasi Input
    if (!form().purchase_order_id) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Harap pilih OCX terlebih dahulu.",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true
      });
      return;
    }
    
    // Cek apakah OCX yang dipilih masih tersedia
    const selectedOCX = orderCelupList().find(ocx => ocx.id === form().purchase_order_id);
    if (selectedOCX?.qty_status === "SELESAI") {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "OCX yang dipilih sudah tidak memiliki quantity tersisa.",
        showConfirmButton: true,
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    if (!form().no_sj_supplier.trim()) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Harap isi No Surat Jalan Supplier.",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true
      });
      return;
    }
    
    if (form().itemGroups.length === 0) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Harap tambahkan minimal satu item group.",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true
      });
      return;
    }
    
    const hasQuantity = form().itemGroups.some(group => {
      const quantity = form().satuan_unit_id === 1 ? group.meter_total : group.yard_total;
      return quantity > 0;
    });
    
    if (!hasQuantity) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Harap isi quantity untuk minimal satu item.",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true
      });
      return;
    }

    try {
      if (isEdit) {
        const payload = {
          no_sj_ex: form().no_sj_ex,
          no_sj_supplier: form().no_sj_supplier.trim(),
          po_ex_id: form().purchase_order_id,
          tanggal_kirim: form().tanggal_kirim,
          keterangan: form().keterangan,
          satuan: unitName(),
          items: form()
            .itemGroups.filter((g) => {
              const quantity = form().satuan_unit_id === 1 ? g.meter_total : g.yard_total;
              return quantity > 0;
            })
            .map((g) => ({
              id: g.id,
              po_ex_item_id: Number(g.purchase_order_item_id),
              meter_total: Number(g.meter_total) || 0,
              yard_total: Number(g.yard_total) || 0,
              gulung: Number(g.gulung) || 0,
              lot: Number(g.lot) || 0,
              sj_item_selected_status: 0,
            })),
          deleted_items: deletedItems(),
        };

        await updateSJOCX(user?.token, params.id, payload);
      } else {
        const payload = {
          no_sj_ex: form().no_sj_ex,
          no_sj_supplier: form().no_sj_supplier.trim(),
          po_ex_id: form().purchase_order_id,
          tanggal_kirim: form().tanggal_kirim,
          keterangan: form().keterangan,
          satuan: unitName(),
          items: form()
            .itemGroups.filter((g) => {
              const quantity = form().satuan_unit_id === 1 ? g.meter_total : g.yard_total;
              return quantity > 0;
            })
            .map((g) => ({
              po_ex_item_id: Number(g.purchase_order_item_id),
              meter_total: Number(g.meter_total) || 0,
              yard_total: Number(g.yard_total) || 0,
              gulung: Number(g.gulung) || 0,
              lot: Number(g.lot) || 0,
              sj_item_selected_status: 0,
            })),
        };
        
        await createSJOCX(user?.token, payload);
      }

      Swal.fire({
        icon: "success",
        title: isEdit ? "Berhasil Update Surat Penerimaan OCX" : "Berhasil Simpan Surat Penerimaan OCX",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => {
        navigate("/sjocx");
      });
    } catch (error) {
      console.error("Error submitting:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error?.message || "Terjadi kesalahan saat menyimpan.",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true
      });
    }
  };

  const handlePrint = () => {
    if (!deliveryNoteData()) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Data untuk mencetak tidak tersedia. Pastikan Anda dalam mode Edit/View.",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true
      });
      return;
    }

    const dataToPrint = { ...deliveryNoteData() };
    const encodedData = encodeURIComponent(JSON.stringify(dataToPrint));
    window.open(`/print/sjocx#${encodedData}`, "_blank");
  };

  return (
    <MainLayout>
      {loading() && (
        <div class="fixed inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-md bg-opacity-40 z-50 gap-10">
          <div class="w-52 h-52 border-[20px] border-white border-t-transparent rounded-full animate-spin"></div>
          <span class="animate-pulse text-[40px] text-white">Loading...</span>
        </div>
      )}
      
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-bold">
          {isView ? "Detail" : isEdit ? "Edit" : "Tambah"} Surat Penerimaan OCX
        </h1>
      </div>

      <div class="flex gap-2 mb-4">
          {isEdit && (
            <button
              type="button"
              class="flex gap-2 bg-blue-600 text-white px-3 py-2 rounded hover:bg-green-700"
              onClick={handlePrint}
            >
              <Printer size={20} />
              Print
            </button>
          )}
        </div>

      <form class="space-y-4" onSubmit={handleSubmit} onkeydown={handleKeyDown}>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-sm mb-1">No Surat Penerimaan</label>
            <div class="flex gap-2">
              <input
                class="w-full border bg-gray-200 p-2 rounded"
                value={form().no_sj_ex}
                readOnly
              />
            </div>
          </div>
          
          <div>
            <label class="block text-sm mb-1">No Surat Jalan Supplier</label>
            <input
              class="w-full border p-2 rounded"
              value={form().no_sj_supplier}
              onInput={(e) =>
                setForm({ ...form(), no_sj_supplier: e.target.value })
              }
              required
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
            />
          </div>
          
          <div>
            <label class="block text-sm mb-1">Alamat Pengiriman</label>
            <div class="flex gap-2">
              <input
                class="w-full border bg-gray-200 p-2 rounded"
                value={form().alamat}
                readOnly
              />
            </div>
          </div>
          
          <div>
            <label class="block text-sm mb-1">Tanggal Pengiriman</label>
            <div class="flex gap-2">
              <input
                type="date"
                class="w-full border p-2 rounded"
                value={form().tanggal_kirim}
                onInput={(e) =>
                  setForm({ ...form(), tanggal_kirim: e.target.value })
                }
                disabled={isView}
                classList={{ "bg-gray-200": isView }}
              />
            </div>
          </div>
          
          <div>
            <label class="block text-sm mb-1">OCX</label>
            <Show when={formLoaded()} fallback={
              <div class="w-full border p-2 rounded bg-gray-100">
                <span class="text-gray-500">Memuat data OCX...</span>
              </div>
            }>
              <OCXDropdownSearch
                items={orderCelupList()}
                value={form().purchase_order_id}
                form={form}
                setForm={setForm}
                onChange={handleSuratJalanChange}
                disabled={isView || isEdit}
                filterCompleted={!isEdit && !isView} // Hanya filter di mode tambah baru
              />
            </Show>
          </div>
        </div>

        <div class="block gap-4">
          <div class="col-span-2">
            <label class="block text-sm mb-1">Keterangan</label>
            <textarea
              class="w-full border p-2 rounded"
              value={form().keterangan}
              onInput={(e) =>
                setForm({ ...form(), keterangan: e.target.value })
              }
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
              rows="3"
            ></textarea>
          </div>
        </div>

        <Show when={form().purchase_order_items && form().itemGroups.length > 0}>
          <div class="border p-3 rounded my-4 bg-gray-50">
            <h3 class="text-md font-bold mb-2 text-gray-700">
              Quantity Kain OCX:
            </h3>
            <ul class="space-y-1 pl-5">
              <For each={form().purchase_order_items.items}>
                {(item) => {
                  const satuanUnitId = form().satuan_unit_id;
                  
                  const sisa = satuanUnitId === 1
                    ? parseFloat(item.meter_total) - parseFloat(item.delivered_meter_total || 0)
                    : parseFloat(item.yard_total) - parseFloat(item.delivered_yard_total || 0);

                  return (
                    <li class="text-sm list-disc">
                      <span class="font-semibold">
                        {item.corak_kain} | {item.konstruksi_kain}
                      </span>{" "}
                      - Quantity: 
                      {sisa > 0.01 ? (
                        <span class="font-bold text-blue-600">
                          {formatNumber(sisa)}{" "}
                          {unitName() === "Meter" ? "m" : "yd"}
                        </span>
                      ) : (
                        <span class="font-bold text-red-600">HABIS</span>
                      )}
                    </li>
                  );
                }}
              </For>
            </ul>
          </div>
        </Show>

        <div>
          <h2 class="text-lg font-bold mt-6 mb-2">Items</h2>
          <button
            type="button"
            onClick={() => addItemGroup()}
            class="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 mb-4"
            hidden
          >
            + Tambah Item
          </button>
          <table class="w-full text-sm border border-gray-300 mb-4">
            <thead class="bg-gray-100">
              <tr>
                <th class="border p-2 w-10">#</th>
                <th class="border p-2">Jenis Kain</th>
                <th class="border p-2">Warna Ex</th>
                <th class="border p-2">Warna Baru</th>
                <th class="border p-2">Lebar Finish</th>
                <th class="border p-2 w-40">{unitName()}</th>
                <th class="border p-2 w-32">Gulung</th>
                <th class="border p-2 w-32">Lot</th>
                <th class="border p-2 w-48">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <Show when={form().itemGroups.length > 0}>
                <For each={form().itemGroups}>
                  {(group, i) => {
                    const satuanUnitId = form().satuan_unit_id;
                    const quantity = satuanUnitId === 1 
                      ? group.meter_total 
                      : group.yard_total;

                    return (
                      <tr>
                        <td class="border p-2 text-center">{i() + 1}</td>
                        <td class="border w-108 p-2">
                          <input
                            class="border p-1 rounded w-full bg-gray-200"
                            value={`${group.item_details?.corak_kain || ""} | ${
                              group.item_details?.konstruksi_kain || ""
                            }`}
                            disabled
                          />
                        </td>
                        <td class="border p-2">
                          <input
                            class="border p-1 rounded w-full bg-gray-200"
                            value={`${group.item_details?.kode_warna_ex || ""} | ${
                              group.item_details?.deskripsi_warna_ex || ""
                            }`}
                            disabled={true}
                          />
                        </td>
                        <td class="border p-2">
                          <input
                            class="border p-1 rounded w-full bg-gray-200"
                            value={`${group.item_details?.kode_warna_new || ""} | ${
                              group.item_details?.deskripsi_warna_new || ""
                            }`}
                            disabled={true}
                          />
                        </td>
                        <td class="border p-2">
                          <input
                            type="text"
                            class="border p-1 rounded w-full bg-gray-200"
                            value={formatNumber(group.item_details?.lebar_finish)}
                            disabled={true}
                          />
                        </td>
                        <td class="border p-2">
                          <input
                            type="text"
                            class="w-full border p-2 rounded text-right"
                            value={formatNumber(quantity)}
                            onBlur={(e) =>
                              handleQuantityChange(i(), e.target.value)
                            }
                            disabled={isView}
                            classList={{ "bg-gray-200": isView }}
                          />
                        </td>
                        <td class="border p-2">
                          <input
                            type="number"
                            placeholder="Banyak gulung..."
                            class="w-full border p-2 rounded text-right"
                            value={group.gulung ?? 0}
                            onBlur={(e) =>
                              handleGulungChange(i(), e.target.value)
                            }
                            disabled={isView}
                            classList={{ "bg-gray-200": isView }}
                          />
                        </td>
                        <td class="border p-2">
                          <input
                            type="number"
                            placeholder="Input lot..."
                            class="w-full border p-2 rounded text-right"
                            value={group.lot ?? 0}
                            onBlur={(e) => handleLotChange(i(), e.target.value)}
                            disabled={isView}
                            classList={{ "bg-gray-200": isView }}
                          />
                        </td>
                        <td class="border p-2 text-center">
                          <button
                            type="button"
                            class="text-red-600 hover:text-red-800 disabled:cursor-not-allowed"
                            onClick={() => removeItem(i())}
                            disabled={isView}
                          >
                            <Trash2 size={20} />
                          </button>
                        </td>
                      </tr>
                    );
                  }}
                </For>
              </Show>
            </tbody>
            <tfoot>
              <tr class="font-bold bg-gray-100">
                <td colSpan="5" class="text-right p-2 border-t border-gray-300">
                  TOTAL
                </td>
                <td class="border p-2 text-right">
                  {formatNumber(totalQuantity(), 2)}
                </td>
                <td colspan="3" class="border-t border-gray-300"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="mt-6 flex gap-3">
          <button
            type="submit"
            class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            hidden={isView}
          >
            Simpan
          </button>
        </div>
      </form>
    </MainLayout>
  );
}