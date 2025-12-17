import { createSignal, onMount, For, Show, createEffect } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  getLastSequence,
  getAllSuppliers,
  getAllSatuanUnits,
  getAllFabrics,
  getOCX,
  updateOCX,
  createOCX,
  getAllColors,
  getUser,
  getOCDeliveryNotes,
  getAllOCDeliveryNotes,
} from "../../../utils/auth";
import SupplierDropdownSearch from "../../../components/SupplierDropdownSearch";
import FabricDropdownSearch from "../../../components/FabricDropdownSearch";
import { Printer, Trash2 } from "lucide-solid";
import ColorOCXDropdownSearch from "../../../components/ColorOCXDropdownSearch";
import SuratPenerimaanDropdownSearch from "../../../components/SuratPenerimaanDropdownSearch";
import { jwtDecode } from "jwt-decode";

export default function OCXPurchaseOrderForm() {
  const navigate = useNavigate();
  const user = getUser();

  const [supplierOptions, setSupplierOptions] = createSignal([]);
  const [satuanUnitOptions, setSatuanUnitOptions] = createSignal([]);
  const [fabricOptions, setFabricOptions] = createSignal([]);
  const [colorOptions, setColorOptions] = createSignal([]);
  const [sjOptions, setSjOptions] = createSignal([]); // State untuk Surat Penerimaan OC
  const [loading, setLoading] = createSignal(true);
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const isView = params.view === "true";

  const filteredSatuanOptions = () =>
    satuanUnitOptions().filter((u) =>
      ["meter", "yard", "kilogram"].includes(String(u.satuan).toLowerCase())
    );

  const [purchaseContractData, setPurchaseContractData] = createSignal(null);
  const [contractItems, setContractItems] = createSignal([]);

  const payload = (() => {
    try {
      return user?.token ? jwtDecode(user.token) : null;
    } catch {
      return null;
    }
  })();

  const [me, setMe] = createSignal(payload);
  const strictFromParam = (params.strict || "").toLowerCase() === "warna";

  // role 12 / "staff marketing 2" → strict
  const isStrictColorEdit = () => {
    const u = me();
    const rid = Number(u?.role?.id ?? u?.role_id ?? 0);
    const rname = String(u?.role?.name ?? u?.role_name ?? "").toLowerCase();
    const byRole = rid === 12 || rname === "staff marketing 2";
    return strictFromParam || byRole;
  };

  const canEditAll = () => !isView && !isStrictColorEdit();
  const canEditColorOnly = () => !isView && isStrictColorEdit();
  const canEditKeteranganWarna = () =>
    !isView && (!isEdit || !isStrictColorEdit());
  const canEditKeterangan = () => !isView && (!isEdit || !isStrictColorEdit());
  const canEditInstruksiKain = () =>
    !isView && (!isEdit || !isStrictColorEdit());
  const canEditQty = () => !isView && (!isEdit || !isStrictColorEdit());

  // Handler untuk PPN checkbox
  const handlePpnChange = (e) => {
    const isChecked = e.currentTarget.checked;
    const ppnValue = isChecked ? 11 : 0;
    setForm((prev) => ({ ...prev, ppn: ppnValue.toString() }));
  };

  const [form, setForm] = createSignal({
    jenis_po_id: "",
    sequence_number: "",
    sj_id: null, // Tambah field sj_id
    supplier_id: "",
    satuan_unit_id: "",
    termin: "",
    ppn: "0", // Default 0 (non PPN)
    keterangan: "",
    instruksi_spesial: "",
    tanggal_kirim: new Date().toISOString().substring(0, 10),
    items: [],
    no_seq: 0,
  });

  const formatIDR = (val) => {
    const numValue = typeof val === "string" ? parseNumber(val) : val;
    if (isNaN(numValue) || numValue === 0) return "";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numValue);
  };

  const parseNumber = (str) => {
    if (typeof str !== "string" || !str) return 0;
    let cleanStr = str.replace(/[^0-9,]/g, "");
    cleanStr = cleanStr.replace(",", ".");
    return parseFloat(cleanStr) || 0;
  };

  const formatNumber = (num, { decimals } = {}) => {
    if (isNaN(num)) return "";
    return Number(num).toLocaleString("id-ID", {
      minimumFractionDigits: decimals ?? 0,
      maximumFractionDigits: decimals ?? (decimals > 0 ? decimals : 2),
    });
  };

  const formatNumberQty = (num, decimals = 2) => {
    if (num === "" || num === null || num === undefined) return "";
    const numValue = Number(num);
    if (isNaN(numValue)) return "";
    if (numValue === 0) return "0";
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(numValue);
  };

  const parsePercent = (s) => {
    if (s === null || s === undefined) return 0;
    if (typeof s !== "string") return Number(s) || 0;
    let clean = s.replace(/[^0-9,.\-]/g, "");
    const lastDot = clean.lastIndexOf(".");
    const lastComma = clean.lastIndexOf(",");
    if (lastComma > lastDot) {
      clean = clean.replace(/\./g, "").replace(",", ".");
    } else {
      clean = clean.replace(/,/g, "");
    }
    const n = parseFloat(clean);
    return Number.isFinite(n) ? n : 0;
  };

  const formatPercent = (num) => {
    if (num === "" || num === null || num === undefined || isNaN(num))
      return "";
    return `${formatNumber(Number(num), { decimals: 2 })} %`;
  };

  // Handler untuk perubahan Surat Penerimaan OC
  const handleSuratPenerimaanChange = async (sj) => {
    try {
      // Reset state contract items jika ada
      setContractItems([]);
      
      if (!sj) {
        // Hapus SEMUA item yang berasal dari Surat Penerimaan jika SJ dikosongkan
        setForm((prev) => ({
          ...prev,
          sj_id: null,
          ppn: "0", // Reset ke non-pajak
          // Hapus item yang memiliki sj_item_id (hanya item dari SJ)
          items: prev.items.filter(item => !item.sj_item_id)
        }));
        return;
      }

      const sjId = sj.id;
      
      // Ambil detail Surat Penerimaan
      const res = await getOCDeliveryNotes(sjId, user?.token);
      const data = res?.suratJalan || res?.data || res;
      
      if (!data || !data.items || data.items.length === 0) {
        Swal.fire({
          icon: "warning",
          title: "Tidak ada item",
          text: "Surat Penerimaan yang dipilih tidak memiliki item",
          showConfirmButton: false,
          timer: 1500,
        });
        return;
      }

      // Tentukan PPN berdasarkan Surat Penerimaan
      let ppnValue = 0;
      if (data.ppn_percent !== undefined && data.ppn_percent !== null) {
        const ppnNum = parseFloat(data.ppn_percent);
        ppnValue = ppnNum === 11 ? 11 : 0;
      }

      // Map items dari Surat Penerimaan ke format OCX
      const sjItems = data.items.filter(item => !item.deleted_at);
      const newItems = sjItems.map((itemSJ) => {
        // Ambil detail kain dari fabricOptions
        const fabricDetail = fabricOptions().find(f => f.id == itemSJ.kain_id);
        
        return {
          id: null,
          po_ex_item_id: null,
          sj_item_id: itemSJ.id, // Simpan sj_item_id
          fabric_id: itemSJ.kain_id,
          kain_id: itemSJ.kain_id,
          warna_ex_id: itemSJ.warna_id, // Warna ex dari Surat Penerimaan
          warna_new_id: null, // Warna baru default null
          keterangan_warna: "",
          
          lebar_greige: "",
          lebar_finish: "",
          
          corak_kain: fabricDetail?.corak_kain || "-",
          konstruksi_kain: fabricDetail?.konstruksi_kain || "-",
          
          meter_total: 0,
          yard_total: 0,
          kilogram_total: 0,
          meter_dalam_proses: 0,
          yard_dalam_proses: 0,
          kilogram_dalam_proses: 0,
          
          std_susutValue: 0,
          std_susut: "",
          
          meter: "",
          meterValue: 0,
          yard: "",
          yardValue: 0,
          kilogram: "",
          kilogramValue: 0,

          harga: "0",
          hargaValue: 0,
          hargaFormatted: "",

          subtotal: 0,
          subtotalFormatted: "",
          
          readOnly: false,
          is_from_sj: true, // Flag untuk menandai item berasal dari SJ
        };
      });

      // Hapus item lama yang berasal dari SJ, pertahankan item manual
      setForm((prev) => {
        const manualItems = prev.items.filter(item => !item.is_from_sj);
        
        return {
          ...prev,
          sj_id: sjId,
          ppn: ppnValue.toString(), // Set PPN sesuai Surat Penerimaan
          items: [...manualItems, ...newItems], // Gabungkan item manual dengan item baru dari SJ
        };
      });

    } catch (error) {
      console.error("Error loading Surat Penerimaan:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal memuat Surat Penerimaan",
        text: error.message || "Terjadi kesalahan saat memuat data Surat Penerimaan",
        showConfirmButton: false,
        timerProgressBar: true,
        timer: 1500,
      });
    }
  };

  onMount(async () => {
    setLoading(true);
    
    try {
      // Load semua data yang diperlukan termasuk Surat Penerimaan OC
      const [suppliersResult, unitsResult, fabricsResult, colorsResult, sjResult] = await Promise.all([
        getAllSuppliers(user?.token),
        getAllSatuanUnits(user?.token),
        getAllFabrics(user?.token),
        getAllColors(user?.token),
        getAllOCDeliveryNotes(user?.token),
      ]);

      // Set data ke state
      if (suppliersResult?.suppliers) {
        setSupplierOptions(suppliersResult.suppliers);
      } else if (suppliersResult?.data) {
        setSupplierOptions(suppliersResult.data);
      }

      if (unitsResult?.data) {
        setSatuanUnitOptions(unitsResult.data);
      }

      if (fabricsResult?.kain) {
        setFabricOptions(fabricsResult.kain);
      } else if (fabricsResult?.data) {
        setFabricOptions(fabricsResult.data);
      }

      if (colorsResult?.warna) {
        setColorOptions(colorsResult.warna);
      } else if (colorsResult?.data) {
        setColorOptions(colorsResult.data);
      }

      // Set Surat Penerimaan OC options
      if (sjResult?.suratJalans) {
        // Parse format P/N dari nomor SJ untuk tampilan
        const formattedOptions = sjResult.suratJalans.map(sj => ({
          ...sj,
          // Tambah flag PPN dari format nomor SJ
          ppnFlag: sj.no_sj?.includes("/P/") ? "P" : "N"
        }));
        setSjOptions(formattedOptions);
      } else if (sjResult?.data) {
        // Parse format P/N dari nomor SJ untuk tampilan
        const formattedOptions = sjResult.data.map(sj => ({
          ...sj,
          // Tambah flag PPN dari format nomor SJ
          ppnFlag: sj.no_sj?.includes("/P/") ? "P" : "N"
        }));
        setSjOptions(formattedOptions);
      }

      if (isEdit) {
        // Mode edit: ambil data OCX dari API
        const res = await getOCX(params.id, user?.token);
        
        if (res.status === 200) {
          const data = res.data;
          const dataItems = data.items || [];
          const satuanUnitId = data.satuan_unit_id || 1;
          
          // Simpan data untuk print
          setPurchaseContractData(data);

          const normalizedItems = dataItems.map((item) => {
            // Tentukan quantity berdasarkan satuan unit
            let quantity = 0;
            if (satuanUnitId === 1) {
              quantity = parseFloat(item.meter_total || 0);
            } else if (satuanUnitId === 2) {
              quantity = parseFloat(item.yard_total || 0);
            } else if (satuanUnitId === 3) {
              quantity = parseFloat(item.kilogram_total || 0);
            }
            
            const harga = parseFloat(item.harga || 0);
            const subtotal = quantity * harga;

            return {
              id: item.id,
              po_ex_item_id: item.id,
              sj_item_id: item.sj_item_id || null, // Include sj_item_id
              meter_total: parseFloat(item.meter_total || 0),
              yard_total: parseFloat(item.yard_total || 0),
              kilogram_total: parseFloat(item.kilogram_total || 0),
              meter_dalam_proses: parseFloat(item.meter_dalam_proses || 0),
              yard_dalam_proses: parseFloat(item.yard_dalam_proses || 0),
              kilogram_dalam_proses: parseFloat(item.kilogram_dalam_proses || 0),
              corak_kain: item.corak_kain || "-",
              konstruksi_kain: item.konstruksi_kain || "-",
              
              fabric_id: item.kain_id,
              kain_id: item.kain_id,
              lebar_greige: item.lebar_greige || "",
              lebar_finish: item.lebar_finish || "",

              warna_ex_id: item.warna_ex_id || null,
              warna_new_id: item.warna_new_id || null,
              keterangan_warna: item.keterangan_warna || "",

              std_susutValue: parseFloat(item.std_susut || 0),
              std_susut: formatPercent(parseFloat(item.std_susut || 0)),

              meter: formatNumber(parseFloat(item.meter_total || 0), {
                decimals: 2,
              }),
              meterValue: parseFloat(item.meter_total || 0),
              
              yard: formatNumber(parseFloat(item.yard_total || 0), { decimals: 2 }),
              yardValue: parseFloat(item.yard_total || 0),

              kilogram: formatNumber(parseFloat(item.kilogram_total || 0), { decimals: 2 }),
              kilogramValue: parseFloat(item.kilogram_total || 0),

              harga: item.harga || "0",
              hargaValue: parseFloat(item.harga || 0),
              hargaFormatted: formatIDR(parseFloat(item.harga || 0)),

              subtotal: subtotal, // PERBAIKAN: Gunakan subtotal yang dihitung berdasarkan satuan
              subtotalFormatted: formatIDR(subtotal),
              readOnly: false,
              is_from_sj: !!item.sj_item_id, // Set flag berdasarkan ada/tidaknya sj_item_id
            };
          });

          // Parse sequence number dari no_po_ex
          const noPoEx = data.no_po_ex || "";
          let no_seq = 0;
          if (noPoEx) {
            const matches = noPoEx.match(/\d{5}$/);
            if (matches) {
              no_seq = parseInt(matches[0]);
            }
          }

          setForm((prev) => ({
            ...prev,
            sequence_number: noPoEx,
            sj_id: data.sj_id || null, // Set sj_id jika ada
            supplier_id: data.supplier_id || "",
            satuan_unit_id: data.satuan_unit_id?.toString() || "1",
            termin: data.termin?.toString() || "",
            ppn: data.ppn_percent?.toString() || "0",
            keterangan: data.keterangan || "",
            instruksi_spesial: data.instruksi_spesial || "",
            tanggal_kirim: data.tanggal_kirim 
              ? new Date(data.tanggal_kirim).toISOString().substring(0, 10)
              : prev.tanggal_kirim,
            tanggal: data.created_at
              ? new Date(data.created_at).toISOString().substring(0, 10)
              : prev.tanggal,
            items: normalizedItems,
            no_seq: no_seq,
          }));
        }
      } else {
        // Mode create: set default satuan unit
        setForm((prev) => ({
          ...prev,
          satuan_unit_id: "1", // Default ke Meter
        }));
      }
    } catch (error) {
      console.error("Error loading form data:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal memuat data",
        text: "Terjadi kesalahan saat memuat data OCX",
        showConfirmButton: false,
        timerProgressBar: true,
        timer: 1500,
      });
    } finally {
      setLoading(false);
    }
  });

  // Handler untuk generate nomor OCX baru
  const generateNomorKontrak = async () => {
    try {
      // Ambil nilai PPN dari form state (bisa dari Surat Penerimaan atau input manual)
      const ppnValue = parseFloat(form().ppn) || 0;
      
      const lastSeq = await getLastSequence(
        user?.token,
        "po_ex",
        "domestik",
        ppnValue.toString()
      );

      const nextNum = String((lastSeq?.last_sequence || 0) + 1).padStart(5, "0");
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = String(now.getFullYear()).slice(2);
      const ppnType = ppnValue > 0 ? "P" : "N";
      const mmyy = `${month}${year}`;
      const nomor = `PO/OCX/${ppnType}/${mmyy}-${nextNum}`;
      
      setForm((prev) => ({
        ...prev,
        sequence_number: nomor,
        no_seq: (lastSeq?.last_sequence || 0) + 1,
      }));

    } catch (error) {
      console.error("Error generating sequence:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal generate nomor",
        text: error.message || "Terjadi kesalahan saat generate nomor",
        timer: 1500,
      });
    }
  };

  const isPpnEditable = () => {
    // Di mode view, tidak bisa edit
    if (isView) return false;
    
    // Di mode edit, tidak bisa edit (karena PPN sudah fix)
    if (isEdit) return false;
    
    // Di mode create, jika sudah memilih Surat Penerimaan, PPN otomatis mengikuti SJ
    if (form().sj_id) return false;
    
    // Di mode create tanpa Surat Penerimaan, bisa edit manual
    return true;
  };

  // Fungsi untuk menentukan sumber PPN
  const getPpnSourceInfo = () => {
    if (form().sj_id) {
      const selectedSJ = sjOptions().find(sj => sj.id === form().sj_id);
      if (selectedSJ) {
        return `PPN otomatis mengikuti Surat Penerimaan: ${selectedSJ.no_sj} (${selectedSJ.ppn_percent === "11" ? "Pajak" : "Non-Pajak"})`;
      }
    }
    return isPpnEditable() 
      ? "Centang untuk PPN 11% (dapat diubah manual)" 
      : "PPN mengikuti Surat Penerimaan yang dipilih";
  };

  // CHANGED: saat user ganti satuan, hitung ulang subtotal
  const handleSatuanUnitChange = (newId) => {
    setForm((prev) => {
      const satuanId = parseInt(newId);
      const items = (prev.items || []).map((it) => {
        const harga = it.hargaValue || 0;
        let qty = 0;
        
        if (satuanId === 1) {
          qty = it.meterValue || 0;
        } else if (satuanId === 2) {
          qty = it.yardValue || 0;
        } else if (satuanId === 3) {
          qty = it.kilogramValue || 0;
        }

        const subtotal = qty * harga;
        return {
          ...it,
          subtotal,
          subtotalFormatted: formatIDR(subtotal),
        };
      });
      return { ...prev, satuan_unit_id: String(newId), items };
    });
  };

  const createEmptyItem = () => {
    return {
      id: null,
      po_ex_item_id: null,
      sj_item_id: null, // Tambah sj_item_id
      fabric_id: "",
      kain_id: "",
      warna_ex_id: null,
      warna_new_id: null,
      keterangan_warna: "",
      
      lebar_greige: "", 
      lebar_finish: "",
      
      corak_kain: "-",
      konstruksi_kain: "-",
      
      meter_total: 0,
      yard_total: 0,
      kilogram_total: 0,
      meter_dalam_proses: 0,
      yard_dalam_proses: 0,
      kilogram_dalam_proses: 0,
      
      std_susutValue: 0,
      std_susut: "",
      
      meter: "",
      meterValue: 0,
      yard: "",
      yardValue: 0,
      kilogram: "",
      kilogramValue: 0,
      
      harga: "",
      hargaValue: 0,
      hargaFormatted: "",
      
      subtotal: 0,
      subtotalFormatted: "",
      
      readOnly: false,
      is_from_sj: false,
    };
  };

  // Tambah item baru (manual, tanpa kontrak)
  const addItem = () => { 
    const newItem = createEmptyItem();
    setForm((prev) => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const removeItem = (index) => {
    setForm((prev) => {
      const items = [...prev.items];
      items.splice(index, 1);
      return { ...prev, items };
    });
  };

  const handleItemChange = (index, field, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      const item = { ...items[index] };
      const satuanId = parseInt(prev.satuan_unit_id || "1");

      if (
        field === "fabric_id" ||
        field === "kain_id" ||
        field === "warna_ex_id" ||
        field === "warna_new_id"
      ) {
        item[field] = value;

        if (field === "fabric_id" || field === "kain_id") {
          item.kain_id = value;
          item.fabric_id = value;

          // Ambil detail dari Master Kain
          const selectedFabric = fabricOptions().find(f => f.id == value);
          if (selectedFabric) {
            item.corak_kain = selectedFabric.corak_kain || "-";
            item.konstruksi_kain = selectedFabric.konstruksi_kain || "-";
          }
        }
      } else if (field === "keterangan_warna") {
        item.keterangan_warna = value;
      } else if (field === "std_susut") {
        const p = parsePercent(value);
        item.std_susutValue = p;
        item.std_susut = formatPercent(p);
      } else if (field === "harga") {
        const numValue = parseNumber(value);
        item.hargaValue = numValue;
        item.harga = formatIDR(numValue);
        item.hargaFormatted = formatIDR(numValue);
      } else {
        const numValue = parseNumber(value);
        item[`${field}Value`] = numValue;
        item[field] = formatNumber(numValue, {
          decimals: field === "lebar_greige" || field === "lebar_finish" ? 0 : 2,
        });

        // PERBAIKAN: Konversi hanya untuk meter-yard, kilogram tetap terpisah
        if (field === "meter" && satuanId === 1) {
          const yardValue = numValue * 1.093613;
          item.yardValue = yardValue;
          item.yard = formatNumber(yardValue, { decimals: 2 });
        } else if (field === "yard" && satuanId === 2) {
          const meterValue = numValue * 0.9144;
          item.meterValue = meterValue;
          item.meter = formatNumber(meterValue, { decimals: 2 });
        }
        // Kilogram tidak ada konversi ke meter/yard
      }

      // Recalculate subtotal
      const harga = item.hargaValue || 0;
      let qty = 0;
      
      if (satuanId === 1) {
        qty = item.meterValue || 0;
      } else if (satuanId === 2) {
        qty = item.yardValue || 0;
      } else if (satuanId === 3) {
        qty = item.kilogramValue || 0;
      }
      
      const subtotal = qty * harga;
      item.subtotal = subtotal;
      item.subtotalFormatted = formatIDR(subtotal);

      items[index] = item;
      return {
        ...prev,
        items,
      };
    });
  };

  const totalMeter = () =>
    form().items.reduce((sum, item) => sum + (item.meterValue || 0), 0);

  const totalYard = () =>
    form().items.reduce((sum, item) => sum + (item.yardValue || 0), 0);

  const totalKilogram = () =>
    form().items.reduce((sum, item) => sum + (item.kilogramValue || 0), 0);

  const totalAll = () => {
    const satuanId = parseInt(form().satuan_unit_id || "1");
    
    return form().items.reduce((sum, item) => {
      let qty = 0;
      
      if (satuanId === 1) {
        qty = item.meterValue || 0;
      } else if (satuanId === 2) {
        qty = item.yardValue || 0;
      } else if (satuanId === 3) {
        qty = item.kilogramValue || 0;
      }
      
      const harga = item.hargaValue || 0;
      return sum + (qty * harga);
    }, 0);
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

    try {
      // Validasi
      if (!form().supplier_id) {
        Swal.fire({
          icon: "warning",
          title: "Supplier belum dipilih",
          text: "Silakan pilih supplier terlebih dahulu",
          showConfirmButton: false,
          timerProgressBar: true,
          timer: 1500,
        });
        return;
      }

      if (form().items.length === 0) {
        Swal.fire({
          icon: "warning",
          title: "Belum ada item",
          text: "Silakan tambahkan minimal satu item",
          showConfirmButton: false,
          timerProgressBar: true,
          timer: 1500,
        });
        return;
      }

      if (!isEdit && (!form().sequence_number || !form().no_seq)) {
        Swal.fire({
          icon: "warning",
          title: "Generate No OCX",
          text: "Generate No OCX terlebih dahulu sebelum submit data OCX",
          showConfirmButton: false,
          timerProgressBar: true,
          timer: 1500,
        });
        return;
      }

      // Validasi item
      for (const item of form().items) {
        if (!item.kain_id) {
          Swal.fire({
            icon: "warning",
            title: "Jenis Kain belum dipilih",
            text: "Silakan pilih jenis kain untuk semua item",
            showConfirmButton: false,
            timerProgressBar: true,
            timer: 1500,
          });
          return;
        }
      }

      const payload = {
        no_po_ex: form().sequence_number,
        sj_id: form().sj_id, // Kirim sj_id
        supplier_id: Number(form().supplier_id),
        satuan_unit_id: Number(form().satuan_unit_id || 1),
        termin: Number(form().termin) || 0,
        ppn_percent: parseFloat(form().ppn) || 0,
        keterangan: form().keterangan || "",
        instruksi_spesial: form().instruksi_spesial || "",
        tanggal_kirim: form().tanggal_kirim || new Date().toISOString().substring(0, 10),
        items: form().items.map((i) => ({
          sj_item_id: i.sj_item_id || null, // Kirim sj_item_id
          kain_id: i.kain_id,
          warna_ex_id: i.warna_ex_id || null,
          warna_new_id: i.warna_new_id || null,
          keterangan_warna: i.keterangan_warna || "",
          lebar_finish: i.lebar_finish || 0,
          std_susut: i.std_susutValue || 0,
          meter_total: i.meterValue || 0,
          yard_total: i.yardValue || 0,
          kilogram_total: i.kilogramValue || 0,
          harga: i.hargaValue || 0,
        })),
      };

      //console.log("Payload yang dikirim:", JSON.stringify(payload, null, 2));

      if (isEdit) {
        await updateOCX(user?.token, params.id, payload);
        Swal.fire({
          icon: "success",
          title: "OCX berhasil diperbarui!",
          showConfirmButton: false,
          timerProgressBar: true,
          timer: 1500,
        }).then(() => {
          navigate("/ordercelup-purchaseocx");
        });
      } else {
        // Create OCX baru - perlu kirim no_po_ex dan sequence_number
        //console.log("Data create OCX: ", JSON.stringify(payload, null ,2));
        await createOCX(user?.token, payload);
        Swal.fire({
          icon: "success",
          title: "OCX berhasil dibuat!",
          showConfirmButton: false,
          timerProgressBar: true,
          timer: 1500,
        }).then(() => {
          navigate("/ordercelup-purchaseocx");
        });
      }
    } catch (err) {
      console.error("Error saving OCX:", err);
      Swal.fire({
        icon: "error",
        title: "Gagal menyimpan OCX",
        text: err.response?.data?.message || err.message || "Terjadi kesalahan",
        showConfirmButton: false,
        timerProgressBar: true,
        timer: 1500,
      });
    }
  };

  function handlePrint(printType = "default") {
    if (!purchaseContractData()) {
      Swal.fire(
        "Gagal",
        "Data untuk mencetak tidak tersedia. Pastikan Anda dalam mode Edit/View.",
        "error"
      );
      return;
    }
    const dataToPrint = { ...purchaseContractData() };
    const encodedData = encodeURIComponent(JSON.stringify(dataToPrint));

    const printUrl = `/print/ordercelup-purchaseocx?type=${printType}#${encodedData}`;
    window.open(printUrl, "_blank");
  }

  // PERBAIKAN: Fungsi untuk menentukan apakah field tertentu bisa diinput
  const canInputMeter = () => {
    return canEditQty() && String(form().satuan_unit_id) === "1";
  };

  const canInputYard = () => {
    return canEditQty() && String(form().satuan_unit_id) === "2";
  };

  const canInputKilogram = () => {
    return canEditQty() && String(form().satuan_unit_id) === "3";
  };

  return (
    <MainLayout>
      {loading() && (
        <div class="fixed inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-md bg-opacity-40 z-50 gap-10">
          <div class="w-52 h-52 border-[20px] border-white border-t-transparent rounded-full animate-spin"></div>
          <span class="animate-pulse text-[40px] text-white">Loading...</span>
        </div>
      )}
      <h1 class="text-2xl font-bold mb-4">
        {isView ? "Detail" : isEdit ? "Edit" : "Tambah"} OCX
      </h1>

      <div class="flex flex-wrap gap-2 mb-4" hidden={!isEdit}>
        <button
          type="button"
          class="flex gap-2 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
          onClick={() => handlePrint("gudang")}
        >
          <Printer size={20} />
          Print Gudang
        </button>

        <button
          type="button"
          class="flex gap-2 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
          onClick={() => handlePrint("pabrik")}
        >
          <Printer size={20} />
          Print Pabrik
        </button>

        <button
          type="button"
          class="flex gap-2 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
          onClick={() => handlePrint("default")}
        >
          <Printer size={20} />
          Print
        </button>
      </div>

      <form class="space-y-4" onSubmit={handleSubmit} onkeydown={handleKeyDown}>
        {/* Baris 1: No OCX, Supplier, Surat Penerimaan OC */}
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block mb-1 font-medium">No OCX</label>
            <div class="flex gap-2">
              <input
                class="w-full border bg-gray-200 p-2 rounded"
                value={form().sequence_number || ""}
                readOnly
                required
              />
              <button
                type="button"
                class="bg-gray-300 text-sm px-2 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={generateNomorKontrak}
                disabled={isEdit || isView}
                hidden={isEdit || isView}
              >
                Generate
              </button>
            </div>
          </div>
          <div>
            <label class="block mb-1 font-medium">Supplier</label>
            <SupplierDropdownSearch
              suppliers={supplierOptions}
              form={form}
              setForm={setForm}
              onChange={(id) => setForm({ ...form(), supplier_id: id })}
              disabled={isView}
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">Surat Penerimaan OC</label>
            <SuratPenerimaanDropdownSearch
              items={sjOptions()}
              value={form().sj_id}
              onChange={handleSuratPenerimaanChange}
              disabled={isView || isEdit} // Disable di mode edit/view
              placeholder="Pilih Surat Penerimaan OC"
              showLots
              excludeZeroAvailable
            />
            <span class="text-xs text-gray-500 mt-1 block">Dapat dikosongkan</span>
          </div>
        </div>

        {/* Baris 2: Tanggal Kirim, Satuan Unit, Termin, PPN */}
        <div class="grid grid-cols-4 gap-4">
          <div>
            <label class="block mb-1 font-medium">Tanggal Kirim</label>
            <input
              type="date"
              class="w-full border p-2 rounded"
              value={form().tanggal_kirim}
              onInput={(e) =>
                setForm({ ...form(), tanggal_kirim: e.target.value })
              }
              disabled={isView}
              classList={{ "bg-gray-200" : isView}}
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">Satuan Unit</label>
            <select
              class="w-full border p-2 rounded"
              value={form().satuan_unit_id}
              onChange={(e) => handleSatuanUnitChange(e.currentTarget.value)}
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
            >
              <option value="">Pilih Satuan</option>
              <For each={filteredSatuanOptions()}>
                {(u) => <option value={u.id}>{u.satuan}</option>}
              </For>
            </select>
          </div>

          <div>
            <label class="block mb-1 font-medium">Termin</label>
            <select
              class="w-full border p-2 rounded"
              value={form().termin}
              onInput={(e) =>
                setForm({ ...form(), termin: e.target.value })
              }
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
            >
              <option value="">-- Pilih Termin --</option>
              <option value="0">Cash</option>
              <option value="30">30 Hari</option>
              <option value="45">45 Hari</option>
              <option value="60">60 Hari</option>
              <option value="90">90 Hari</option>
            </select>
          </div>

          <div>
            <label class="block mb-1 font-medium">PPN (%)</label>
            <label class="flex items-center gap-3">
              <div class="relative">
                <input
                  type="checkbox"
                  checked={parseFloat(form().ppn) === 11}
                  onChange={handlePpnChange}
                  disabled={!isPpnEditable()}
                  class="sr-only peer"
                />
                <div class="w-24 h-10 bg-gray-200 rounded-full peer-checked:bg-green-600 transition-colors peer-disabled:opacity-50"></div>
                <div class="absolute left-0.5 top-0.5 w-9 h-9 bg-white border border-gray-300 rounded-full shadow-sm peer-checked:translate-x-14 transition-transform"></div>
              </div>
              <span class="text-lg text-gray-700">
                {parseFloat(form().ppn) === 11 ? "11%" : "0%"}
              </span>
            </label>
            <input type="hidden" name="ppn" value={form().ppn} />
            <div class="text-xs text-gray-500 mt-1">
              {getPpnSourceInfo()}
            </div>
          </div>
        </div>

        {/* Baris 3: Keterangan dan Instruksi Spesial */}
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-medium">Keterangan</label>
            <textarea
              class="w-full border p-2 rounded"
              value={form().keterangan}
              onInput={(e) =>
                setForm({ ...form(), keterangan: e.target.value })
              }
              disabled={!canEditKeterangan()}
              classList={{ "bg-gray-200": !canEditKeterangan() }}
            ></textarea>
          </div>

          <div>
            <label class="block mb-1 font-medium">Instruksi Spesial</label>
            <textarea
              class="w-full border p-2 rounded"
              value={form().instruksi_spesial}
              onInput={(e) =>
                setForm({ ...form(), instruksi_spesial: e.target.value })
              }
              disabled={!canEditInstruksiKain()}
              classList={{ "bg-gray-200": !canEditInstruksiKain() }}
            ></textarea>
          </div>
        </div>

        <h2 class="text-lg font-bold mt-6 mb-2">Items</h2>

        <button
          type="button"
          class="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 mb-4"
          onClick={addItem}
          hidden={isView || (isEdit && isStrictColorEdit())}
        >
          + Tambah Item
        </button>

        <table class="w-full text-sm border border-gray-300 mb-4">
          <thead class="bg-gray-100">
            <tr>
              <th class="border p-2">#</th>
              <th class="border p-2 w-62">Jenis Kain</th>
              <th hidden class="border p-2 w-30">Lebar Greige</th>
              <th class="border p-2 w-30">Lebar Finish</th>
              <th hidden class="border p-2 w-30">
                Std Susut
              </th>
              <th class="border p-2">Warna Ex</th>
              <th class="border p-2">Warna Baru</th>
              <th hidden class="border p-2">Keterangan Warna</th>
              <th class="border p-2 w-28">Meter</th>
              <th class="border p-2 w-28">Yard</th>
              <th class="border p-2 w-28">Kilogram</th>
              <th class="border p-2">Harga</th>
              <th class="border p-2">Subtotal</th>
              <th class="border p-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <For each={form().items}>
              {(item, i) => {
                const satuanId = String(form().satuan_unit_id);
                return (
                  <tr>
                    <td class="border p-2 text-center">{i() + 1}</td>
                    <td class="border w-62 p-2">
                      <FabricDropdownSearch
                        fabrics={fabricOptions}
                        item={item}
                        onChange={(val) => handleItemChange(i(), "kain_id", val)}
                        disabled={isView || (isEdit && item.id)}
                      />
                    </td>
                    <td hidden class="border p-2">
                      <input
                        type="number"
                        class="border p-1 rounded w-30"
                        value={item.lebar_greige}
                        disabled={isView}
                        onBlur={(e) => handleItemChange(i(), "lebar_greige", e.target.value)}
                      />
                    </td>
                    <td class="border p-2">
                      <input
                        type="number"
                        class="border p-1 rounded w-30"
                        value={item.lebar_finish}
                        disabled={isView}
                        classList={{ "bg-gray-200" : isView }}
                        onBlur={(e) => handleItemChange(i(), "lebar_finish", e.target.value)}
                      />
                    </td>
                    <td hidden class="border p-2">
                      <input
                        type="text"
                        class="border p-1 rounded w-30"
                        value={item.std_susut ?? ""}
                        onBlur={(e) =>
                          handleItemChange(i(), "std_susut", e.target.value)
                        }
                        disabled={isView || (isEdit && isStrictColorEdit())}
                      />
                    </td>
                    <td class="border p-2">
                      <ColorOCXDropdownSearch
                        colors={colorOptions}
                        item={item}
                        field="warna_ex_id"
                        onChange={(val) => handleItemChange(i(), "warna_ex_id", val)}
                        disabled={isView}
                      />
                    </td>

                    {/* Warna baru */}
                    <td class="border p-2">
                      <ColorOCXDropdownSearch
                        colors={colorOptions}
                        item={item}
                        field="warna_new_id"
                        onChange={(val) => handleItemChange(i(), "warna_new_id", val)}
                        disabled={isView}
                      />
                    </td>
                    <td hidden class="border p-2">
                      <input
                        type="text"
                        class="border p-1 rounded w-full"
                        value={item.keterangan_warna ?? ""}
                        onBlur={(e) =>
                          handleItemChange(
                            i(),
                            "keterangan_warna",
                            e.target.value
                          )
                        }
                        disabled={!canEditKeteranganWarna()}
                        classList={{ "bg-gray-200": !canEditKeteranganWarna() }}
                        placeholder="Keterangan warna..."
                      />
                    </td>

                    {/* PERBAIKAN: Meter - hanya bisa input jika satuan = meter */}
                    <td class="border p-2">
                      <input
                        type="text"
                        inputmode="decimal"
                        class="border p-1 rounded w-28"
                        readOnly={!canInputMeter()}
                        classList={{
                          "bg-gray-200": !canInputMeter(),
                        }}
                        value={item.meter}
                        onBlur={(e) => {
                          if (!canInputMeter()) return;
                          handleItemChange(i(), "meter", e.target.value);
                        }}
                      />
                    </td>

                    {/* PERBAIKAN: Yard - hanya bisa input jika satuan = yard */}
                    <td class="border p-2">
                      <input
                        type="text"
                        inputmode="decimal"
                        class="border p-1 rounded w-28"
                        readOnly={!canInputYard()}
                        classList={{
                          "bg-gray-200": !canInputYard(),
                        }}
                        value={item.yard}
                        onBlur={(e) => {
                          if (!canInputYard()) return;
                          handleItemChange(i(), "yard", e.target.value);
                        }}
                      />
                    </td>

                    {/* PERBAIKAN: Kilogram - hanya bisa input jika satuan = kilogram */}
                    <td class="border p-2">
                      <input
                        type="text"
                        inputmode="decimal"
                        class="border p-1 rounded w-28"
                        readOnly={!canInputKilogram()}
                        classList={{
                          "bg-gray-200": !canInputKilogram(),
                        }}
                        value={item.kilogram}
                        onBlur={(e) => {
                          if (!canInputKilogram()) return;
                          handleItemChange(i(), "kilogram", e.target.value);
                        }}
                      />
                    </td>

                    <td class="border p-2">
                      <input
                        type="text"
                        class="border p-1 rounded w-full"
                        value={item.hargaFormatted || ""}
                        onBlur={(e) =>
                          handleItemChange(i(), "harga", e.target.value)
                        }
                        disabled={isView}
                        classList={{ "bg-gray-200": isView }}
                      />
                    </td>
                    <td class="border p-2">
                      <input
                        type="text"
                        class="border p-1 rounded w-full bg-gray-200"
                        value={item.subtotalFormatted ?? ""}
                        readOnly
                        classList={{ "bg-gray-200": true }}
                      />
                    </td>
                    <td class="border p-2 text-center">
                      {(() => {
                        const disabledDelete =
                          isView || (isEdit && isStrictColorEdit());

                        return (
                          <button
                            type="button"
                            class="text-red-600 hover:text-red-800 text-xs disabled:text-gray-400 disabled:cursor-not-allowed"
                            onClick={() => {
                              if (!disabledDelete) removeItem(i());
                            }}
                            disabled={disabledDelete}
                            title={
                              disabledDelete
                                ? isView
                                  ? "Tidak bisa hapus pada tampilan View"
                                  : "Strict edit: hanya boleh ubah warna"
                                : "Hapus baris"
                            }
                          >
                            <Trash2 size={20} />
                          </button>
                        );
                      })()}
                    </td>
                  </tr>
                );
              }}
            </For>
          </tbody>
          <tfoot>
            <tr class="font-bold bg-gray-100">
              <td colSpan="5" class="text-right p-2">
                TOTAL
              </td>
              <td class="border p-2">
                {formatNumber(totalMeter(), { decimals: 2 })}
              </td>
              <td class="border p-2">
                {formatNumber(totalYard(), { decimals: 2 })}
              </td>
              <td class="border p-2">
                {formatNumber(totalKilogram(), { decimals: 2 })}
              </td>
              <td class="p-2"></td>
              <td class="border p-2">
                {formatIDR(totalAll())}
              </td>
              <td class="p-2"></td>
            </tr>
          </tfoot>
        </table>

        <div>
          <button
            type="submit"
            class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            hidden={isView}
            disabled={isView}
          >
            {isEdit ? "Update" : "Simpan"} OCX
          </button>
        </div>
      </form>
    </MainLayout>
  );
}