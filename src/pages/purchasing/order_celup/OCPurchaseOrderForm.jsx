import { createSignal, onMount, For, Show } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  getAllSOTypes,
  getLastSequence,
  getAllSuppliers,
  getAllSatuanUnits,
  getAllFabrics,
  getOrderCelupOrders,
  getAllOrderCelups,
  updateDataOrderCelupOrder,
  createOrderCelupOrder,
  getAllColors,
  getOrderCelups,
  getUser,
} from "../../../utils/auth";
import SupplierDropdownSearch from "../../../components/SupplierDropdownSearch";
import FabricDropdownSearch from "../../../components/FabricDropdownSearch";
import PurchasingContractDropdownSearch from "../../../components/PurchasingContractDropdownSearch";
import { Printer, Trash2 } from "lucide-solid";
import ColorDropdownSearch from "../../../components/ColorDropdownSearch";
import { jwtDecode } from "jwt-decode";

export default function OCPurchaseOrderForm() {
  const navigate = useNavigate();
  const user = getUser();

  const [supplierOptions, setSupplierOptions] = createSignal([]);
  const [satuanUnitOptions, setSatuanUnitOptions] = createSignal([
    { id: 1, satuan: "Meter" },
    { id: 2, satuan: "Yard" },
    // { id: 3, satuan: "Kilogram" }, // tidak dipakai di OC
  ]);
  const [fabricOptions, setFabricOptions] = createSignal([]);
  const [purchaseContracts, setPurchaseContracts] = createSignal([]);
  const [colorOptions, setColorOptions] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const isView = params.view === "true";

  const filteredSatuanOptions = () =>
    satuanUnitOptions().filter((u) =>
      ["meter", "yard"].includes(String(u.satuan).toLowerCase())
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

  const [form, setForm] = createSignal({
    jenis_po_id: "",
    sequence_number: "",
    tanggal: new Date().toISOString().substring(0, 10),
    pc_id: "",
    supplier_id: "",
    satuan_unit_id: "", // CHANGED: dibiarkan kosong dulu, user bisa pilih sendiri
    termin: "",
    ppn: "",
    keterangan: "",
    instruksi_kain: "",
    items: [],
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

  onMount(async () => {
    setLoading(true);
    const [bgc, suppliers, units, fabrics, colors] = await Promise.all([
      getAllOrderCelups(user?.token),
      getAllSuppliers(user?.token),
      getAllSatuanUnits(user?.token),
      getAllFabrics(user?.token),
      getAllColors(user?.token),
    ]);

    setPurchaseContracts(bgc.contracts);
    setSupplierOptions(suppliers.suppliers);
    setSatuanUnitOptions(units.data?.length ? units.data : satuanUnitOptions());
    setFabricOptions(fabrics.kain);
    setColorOptions(colors?.warna || ["Pilih"]);

    if (isEdit) {
      const res = await getOrderCelupOrders(params.id, user?.token);
      const data = res.order;
      const dataItems = res.order.items;

      const fullPrintData = { ...data };
      setPurchaseContractData(fullPrintData);

      if (!data) {
        setLoading(false);
        return;
      }

      const normalizedItems = (dataItems || []).map((item) => {
        return {
          id: item.id,
          meter_total: item.meter_total,
          yard_total: item.yard_total,
          meter_dalam_proses: item.meter_dalam_proses,
          yard_dalam_proses: item.yard_dalam_proses,
          corak_kain: item.corak_kain,
          konstruksi_kain: item.konstruksi_kain,

          pc_item_id: item.pc_item_id,
          fabric_id: item.kain_id,
          kain_id: item.kain_id,
          lebar_greige: item.lebar_greige,
          lebar_finish: item.lebar_finish,
          warna_id: item.warna_id,
          keterangan_warna: item.keterangan_warna || "",

          std_susutValue:
            item.std_susut != null ? parseFloat(item.std_susut) : 0,
          std_susut:
            item.std_susut != null
              ? formatPercent(parseFloat(item.std_susut))
              : "",

          meter: formatNumber(parseFloat(item.meter_total || 0), {
            decimals: 2,
          }),
          yard: formatNumber(parseFloat(item.yard_total || 0), { decimals: 2 }),
          meterValue: parseFloat(item.meter_total || 0) || 0,
          yardValue: parseFloat(item.yard_total || 0) || 0,

          harga: item.harga,
          hargaValue: parseFloat(item.harga || 0) || 0,
          hargaFormatted:
            item.subtotal > 0
              ? new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0,
                }).format(item.subtotal)
              : "",

          subtotal: parseFloat(item.subtotal || 0) || 0,
          subtotalFormatted:
            item.subtotal > 0
              ? new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  maximumFractionDigits: 0,
                }).format(item.subtotal)
              : "",
        };
      });

      // CHANGED: pakai satuan dari data jika ada, tapi tetap editable
      const satuanIdEdit = String(data.satuan_unit_id || "");

      await handlePurchaseContractChange(data.pc_id, normalizedItems, true);

      setForm((prev) => ({
        ...prev,
        pc_id: Number(data.pc_id) ?? "",
        sequence_number: data.no_po ?? "",
        no_seq: data.sequence_number ?? 0,
        supplier_id: data.supplier_id ?? "",
        satuan_unit_id: satuanIdEdit, // tetap pakai yg dari PO saat edit, tapi bisa diubah user
        termin: data.termin ?? "",
        ppn: data.ppn_percent ?? "",
        keterangan: data.keterangan ?? "",
        instruksi_kain: data.instruksi_kain ?? "",
        tanggal: data.created_at
          ? new Date(data.created_at).toISOString().substring(0, 10)
          : prev.tanggal,
      }));

      // Recompute subtotal sesuai satuan yang aktif
      handleSatuanUnitChange(satuanIdEdit || "1");
    } else {
      const lastSeq = await getLastSequence(
        user?.token,
        "oc_o",
        "domestik",
        form().ppn
      );

      setForm((prev) => ({
        ...prev,
        sequence_number: lastSeq?.no_sequence + 1 || "",
        // CHANGED: default satuan Meter agar UI langsung bisa input
        satuan_unit_id: prev.satuan_unit_id || "1",
      }));
    }

    setLoading(false);
  });

  // CHANGED: saat user ganti satuan, hitung ulang subtotal + lock kolom input
  const handleSatuanUnitChange = (newId) => {
    setForm((prev) => {
      const satuanId = parseInt(newId);
      const items = (prev.items || []).map((it) => {
        const harga = it.hargaValue || 0;
        const qty = satuanId === 2 ? it.yardValue || 0 : it.meterValue || 0;
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

  const handlePurchaseContractChange = async (
    contractId,
    overrideItems,
    skipSetSeq = false
  ) => {
    // 1) Ambil dari cache
    let selectedContract = purchaseContracts().find(
      (sc) => sc.id == contractId
    );

    // 2) SELALU ambil detail supaya dapat qty/lebar/harga lengkap
    try {
      const detail = await getOrderCelups(contractId, user?.token);

      //console.log("Data Contract OC: ",  JSON.stringify(detail, null, 2));
      if (detail?.contract) selectedContract = detail.contract;
    } catch (e) {
      console.warn("[OC] gagal fetch detail, pakai cache:", e);
    }
    if (!selectedContract) return;

    const {
      supplier_id,
      satuan_unit_id: contract_satuan,
      termin,
      ppn_percent,
      items = [],
    } = selectedContract;

    // 3) Sumber item: override dari PO (mode edit) atau item kontrak
    const sourceItems = overrideItems ?? items;

    // 4) Gunakan satuan pilihan user jika sudah ada; kalau belum, fallback ke kontrak
    const effectiveSatuanId =
      String(form().satuan_unit_id || "") || String(contract_satuan || "1");

    const mappedItems = sourceItems.map((ci0) => {
      const base = overrideItems
        ? (selectedContract.items || []).find(
            (it) => String(it.id) === String(ci0.pc_item_id)
          )
        : null;

      const ci = overrideItems ? ci0 : { ...ci0, pc_item_id: ci0.id };
      const fabricId =
        ci.kain_id ??
        ci.fabric_id ??
        base?.kain_id ??
        base?.fabric_id ??
        base?.kain?.id ??
        ci.kain?.id ??
        null;

      // normalisasi qty
      let mNum =
        parseFloat(ci.meter_total ?? ci.meter ?? base?.meter_total ?? 0) || 0;
      let yNum =
        parseFloat(ci.yard_total ?? ci.yard ?? base?.yard_total ?? 0) || 0;

      if (!mNum && yNum) mNum = yNum * 0.9144;
      if (!yNum && mNum) yNum = mNum * 1.093613;

      const hargaNum = parseFloat(ci.harga ?? base?.harga ?? 0) || 0;
      const qty = parseInt(effectiveSatuanId) === 2 ? yNum : mNum;
      const sub = qty * hargaNum;

      return {
        meter_total: mNum,
        yard_total: yNum,
        meter_dalam_proses: parseFloat(ci.meter_dalam_proses ?? 0) || 0,
        yard_dalam_proses: parseFloat(ci.yard_dalam_proses ?? 0) || 0,
        corak_kain:
          ci.corak_kain ?? base?.corak_kain ?? ci.kain?.corak_kain ?? "-",
        konstruksi_kain:
          ci.konstruksi_kain ??
          base?.konstruksi_kain ??
          ci.kain?.konstruksi_kain ??
          "-",

        id: ci.id ?? null,
        pc_item_id: ci.pc_item_id ?? ci.id ?? null,

        fabric_id: fabricId,
        kain_id: fabricId,

        warna_id: ci.warna_id ?? null,
        lebar_greige: String(ci.lebar_greige ?? base?.lebar_greige ?? ""),
        lebar_finish: String(ci.lebar_finish ?? base?.lebar_finish ?? ""),
        keterangan_warna: ci.keterangan_warna ?? "",

        std_susutValue: ci.std_susut != null ? parseFloat(ci.std_susut) : 0,
        std_susut:
          ci.std_susut != null ? formatPercent(parseFloat(ci.std_susut)) : "",

        meter: formatNumber(mNum, { decimals: 2 }),
        meterValue: mNum,
        yard: formatNumber(yNum, { decimals: 2 }),
        yardValue: yNum,

        harga: hargaNum,
        hargaValue: hargaNum,
        hargaFormatted: formatIDR(hargaNum),

        subtotal: sub,
        subtotalFormatted: formatIDR(sub),

        readOnly: false,
      };
    });

    // 5) Update form (jangan paksa satuan dari kontrak)
    const lastSeq =
      skipSetSeq || isEdit
        ? null
        : await getLastSequence(user?.token, "oc_o", "domestik", form().ppn);

    setForm((prev) => ({
      ...prev,
      pc_id: contractId,
      supplier_id: supplier_id ?? prev.supplier_id,
      // ⬇️ jika user belum pilih satuan, ikuti kontrak; kalau sudah pilih, pertahankan
      satuan_unit_id:
        String(prev.satuan_unit_id || "") ||
        String(contract_satuan || prev.satuan_unit_id || "1"),
      termin: termin ?? prev.termin,
      ppn: ppn_percent ?? prev.ppn,
      keterangan: prev.keterangan || "",
      instruksi_kain: prev.instruksi_kain || "",
      items: mappedItems,
      sequence_number:
        prev.sequence_number || (lastSeq ? lastSeq?.no_sequence + 1 : "") || "",
    }));

    setContractItems(selectedContract.items || []);
  };

  const generateNomorKontrak = async () => {
    const lastSeq = await getLastSequence(
      user?.token,
      "oc_o",
      "domestik",
      form().ppn
    );

    const nextNum = String((lastSeq?.last_sequence || 0) + 1).padStart(5, "0");
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(2);
    const ppnValue = parseFloat(form().ppn) || 0;
    const ppnType = ppnValue > 0 ? "P" : "N";
    const mmyy = `${month}${year}`;
    const nomor = `PO/OC/${ppnType}/${mmyy}/${nextNum}`;
    setForm((prev) => ({
      ...prev,
      sequence_number: nomor,
      no_seq: lastSeq?.last_sequence + 1,
    }));
  };

  const templateFromOCContractItem = (ci, satuan_unit_id) => {
    const hargaNum = parseFloat(ci.harga ?? 0) || 0;
    let meterNum = parseFloat(ci.meter_total ?? ci.meter ?? 0) || 0;
    let yardNum = parseFloat(ci.yard_total ?? ci.yard ?? 0) || 0;

    if (!meterNum && yardNum) meterNum = yardNum * 0.9144;
    if (!yardNum && meterNum) yardNum = meterNum * 1.093613;

    const qty = parseInt(satuan_unit_id) === 2 ? yardNum : meterNum;
    const subtotal = qty * hargaNum;

    const fabricId = ci.kain_id || ci.fabric_id || ci.kain?.id || null;

    return {
      id: null,
      pc_item_id: ci.id,
      fabric_id: fabricId,
      kain_id: fabricId,
      warna_id: ci.warna_id ?? null,
      keterangan_warna: "",

      lebar_greige: ci.lebar_greige ?? "",
      lebar_finish: ci.lebar_finish ?? "",

      corak_kain: ci.corak_kain ?? ci.kain?.corak_kain ?? "-",
      konstruksi_kain: ci.konstruksi_kain ?? ci.kain?.konstruksi_kain ?? "-",
      meter_total: meterNum,
      yard_total: yardNum,
      meter_dalam_proses: parseFloat(ci.meter_dalam_proses ?? 0) || 0,
      yard_dalam_proses: parseFloat(ci.yard_dalam_proses ?? 0) || 0,

      std_susutValue: ci.std_susut != null ? parseFloat(ci.std_susut) : 0,
      std_susut:
        ci.std_susut != null ? formatPercent(parseFloat(ci.std_susut)) : "",

      meter: formatNumber(meterNum, { decimals: 2 }),
      meterValue: meterNum,
      yard: formatNumber(yardNum, { decimals: 2 }),
      yardValue: yardNum,

      harga: formatIDR(hargaNum),
      hargaValue: hargaNum,
      hargaFormatted: formatIDR(hargaNum),

      subtotal,
      subtotalFormatted: formatIDR(subtotal),

      readOnly: false,
    };
  };

  // CHANGED: tambah item mengikuti satuan yang dipilih user (fallback kontrak bila kosong)
  const addItem = async () => {
    const pcId = form().pc_id;
    if (!pcId) {
      Swal.fire(
        "Peringatan",
        "Silakan pilih Purchase Contract terlebih dahulu.",
        "warning"
      );
      return;
    }

    let baseItems = contractItems();
    let contractSatuan = form().satuan_unit_id;

    if (!baseItems || baseItems.length === 0) {
      const detail = await getOrderCelups(pcId, user?.token);
      baseItems = detail?.contract?.items || [];
      contractSatuan = detail?.contract?.satuan_unit_id || contractSatuan;
    }

    if (!baseItems.length) {
      Swal.fire("Info", "Item pada Purchase Contract tidak ditemukan.", "info");
      return;
    }

    const selectedSatuan = form().satuan_unit_id || contractSatuan || 1;
    const paketBaru = baseItems.map((ci) =>
      templateFromOCContractItem(ci, selectedSatuan)
    );

    setForm((prev) => ({ ...prev, items: [...prev.items, ...paketBaru] }));
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
        field === "warna_id"
      ) {
        item[field] = value;

        if (field === "fabric_id" || field === "kain_id") {
          item.kain_id = value;
          const contract = purchaseContracts().find(
            (sc) => sc.id == prev.pc_id
          );
          if (contract && contract.items) {
            const matchedItem = contract.items.find(
              (i) => i.fabric_id == value || i.kain_id == value
            );
            if (matchedItem) {
              item.pc_item_id = matchedItem.id;
            }
          }
        }
      } else if (field === "keterangan_warna") {
        item.keterangan_warna = value;
      } else if (field === "std_susut") {
        const p = parsePercent(value);
        item.std_susutValue = p;
        item.std_susut = formatPercent(p);
      } else {
        const numValue = parseNumber(value);
        item[`${field}Value`] = numValue;

        if (field === "harga") {
          item.hargaValue = numValue;
          const formattedValue = formatIDR(numValue);
          item.harga = formattedValue;
          item.hargaFormatted = formattedValue;
        } else {
          item[field] = formatNumber(numValue, {
            decimals:
              field === "lebar_greige" || field === "lebar_finish" ? 0 : 2,
          });
        }

        // CHANGED: konversi dua arah tergantung satuan pilihan
        if (satuanId === 1 && field === "meter") {
          const yardValue = numValue * 1.093613;
          item.yardValue = yardValue;
          item.yard = formatNumber(yardValue, { decimals: 2 });
        } else if (satuanId === 2 && field === "yard") {
          const meterValue = numValue * 0.9144;
          item.meterValue = meterValue;
          item.meter = formatNumber(meterValue, { decimals: 2 });
        }
      }

      const harga = item.hargaValue || 0;
      const qty = satuanId === 2 ? item.yardValue || 0 : item.meterValue || 0;
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

  const totalAll = () => {
    return form().items.reduce((sum, item) => {
      return sum + (item.subtotal || 0);
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
    if (!form().no_seq && !isEdit) {
      Swal.fire({
        icon: "warning",
        title: "Generate Nomor PO",
        text: "Silakan klik tombol 'Generate' untuk membuat nomor PO terlebih dahulu.",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
      });
      return;
    }
    try {
      if (isEdit) {
        const payload = {
          no_po: form().sequence_number,
          pc_id: Number(form().pc_id),
          keterangan: form().keterangan,
          instruksi_kain: form().instruksi_kain,
          items: form().items.map((i) => ({
            //id: i.id,
            pc_item_id: i.pc_item_id,
            warna_id: i.warna_id,
            std_susut: i.std_susutValue || 0,
            keterangan_warna: i.keterangan_warna,
            meter_total: i.meterValue || 0,
            yard_total: i.yardValue || 0,
          })),
        };
        //console.log("Update OC Payload:", JSON.stringify(payload, null, 2));

        await updateDataOrderCelupOrder(user?.token, params.id, payload);
      } else {
        const payload = {
          pc_id: Number(form().pc_id),
          supplier_id: Number(form().supplier_id),
          // CHANGED: kirim satuan pilihan user
          satuan_unit_id: Number(form().satuan_unit_id || 1),
          termin: Number(form().termin),
          ppn: parseFloat(form().ppn) || 0,
          keterangan: form().keterangan,
          instruksi_kain: form().instruksi_kain,
          sequence_number: Number(form().no_seq),
          no_po: form().sequence_number,
          items: form().items.map((i) => ({
            // id: i.id,
            pc_item_id: i.pc_item_id,
            warna_id: i.warna_id,
            std_susut: i.std_susutValue || 0,
            keterangan_warna: i.keterangan_warna ?? "",
            meter_total: i.meterValue || 0,
            yard_total: i.yardValue || 0,
          })),
        };
        //console.log("Create OC Payload:", JSON.stringify(payload, null, 2));

        await createOrderCelupOrder(user?.token, payload);
      }
      Swal.fire({
        icon: "success",
        title: "Order Celup berhasil disimpan!",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => {
        navigate("/ordercelup-purchaseorder");
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Gagal menyimpan Order Celup",
        text: err.message,
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
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
    
    const printUrl = `/print/ordercelup/order?type=${printType}#${encodedData}`;
    window.open(printUrl, "_blank");
  }

  return (
    <MainLayout>
      {loading() && (
        <div class="fixed inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-md bg-opacity-40 z-50 gap-10">
          <div class="w-52 h-52 border-[20px] border-white border-t-transparent rounded-full animate-spin"></div>
          <span class="animate-pulse text-[40px] text-white">Loading...</span>
        </div>
      )}
      <h1 class="text-2xl font-bold mb-4">
        {isView ? "Detail" : isEdit ? "Edit" : "Tambah"} Order Celup
      </h1>

      <div class="flex flex-wrap gap-2 mb-4" hidden={!isEdit}>
        {/* Tombol 1: Print Gudang */}
        <button
          type="button"
          class="flex gap-2 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
          onClick={() => handlePrint("gudang")}
        >
          <Printer size={20} />
          Print Gudang
        </button>

        {/* Tombol 2: Print Pabrik */}
        <button
          type="button"
          class="flex gap-2 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
          onClick={() => handlePrint("pabrik")}
        >
          <Printer size={20} />
          Print Pabrik
        </button>

        {/* Tombol 3: Print (Default) */}
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
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block mb-1 font-medium">No Order</label>
            <div class="flex gap-2">
              <input
                class="w-full border bg-gray-200 p-2 rounded"
                value={form().sequence_number || ""}
                readOnly
                required
              />
              <button
                type="button"
                class="bg-gray-300 text-sm px-2 rounded hover:bg-gray-400"
                onClick={generateNomorKontrak}
                hidden={isEdit}
              >
                Generate
              </button>
            </div>
          </div>

          <div>
            <label class="block mb-1 font-medium">No Purchase Contract</label>
            <PurchasingContractDropdownSearch
              purchaseContracts={purchaseContracts}
              form={form}
              setForm={setForm}
              onChange={handlePurchaseContractChange}
              disabled={isView || isEdit}
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Tanggal</label>
            <input
              type="date"
              class="w-full border bg-gray-200 p-2 rounded"
              value={form().tanggal}
              readOnly
            />
          </div>
        </div>

        <div class="grid grid-cols-4 gap-4">
          <div>
            <label class="block mb-1 font-medium">Supplier</label>
            <SupplierDropdownSearch
              suppliers={supplierOptions}
              form={form}
              setForm={setForm}
              onChange={(id) => setForm({ ...form(), supplier_id: id })}
              disabled={true}
            />
          </div>

          {/* CHANGED: Satuan Unit selectable & triggers recalc */}
          <div>
            <label class="block mb-1 font-medium">Satuan Unit</label>
            <input
              type="hidden"
              name="satuan_unit_id"
              value={form().satuan_unit_id}
            />
            <select
              class="w-full border p-2 rounded"
              value={form().satuan_unit_id}
              onChange={(e) => handleSatuanUnitChange(e.currentTarget.value)}
              disabled={isView || isEdit}
              classList={{ "bg-gray-200 ": isView || isEdit }}
            >
              <option value="">Pilih Satuan</option>
              <For each={filteredSatuanOptions()}>
                {(u) => <option value={u.id}>{u.satuan}</option>}
              </For>
            </select>
          </div>

          <div>
            <label class="block mb-1 font-medium">Termin</label>
            <input type="hidden" name="termin" value={form().termin} />
            <select
              class="w-full border p-2 rounded bg-gray-200 cursor-not-allowed"
              value={form().termin}
              disabled
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
            <input type="hidden" name="ppn" value={form().ppn} />
            <label class="flex items-center gap-3">
              <div class="relative opacity-60 cursor-not-allowed">
                <input
                  type="checkbox"
                  checked={parseFloat(form().ppn) > 0}
                  disabled
                  class="sr-only peer"
                />
                <div class="w-24 h-10 bg-gray-200 rounded-full peer-checked:bg-green-600 transition-colors"></div>
                <div class="absolute left-0.5 top-0.5 w-9 h-9 bg-white border border-gray-300 rounded-full shadow-sm peer-checked:translate-x-14 transition-transform"></div>
              </div>
              <span class="text-lg text-gray-700">
                {parseFloat(form().ppn) === 11 ? "11%" : "0%"}
              </span>
            </label>
          </div>
        </div>

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
            <label class="block mb-1 font-medium">Instruksi Kain</label>
            <textarea
              class="w-full border p-2 rounded"
              value={form().instruksi_kain}
              onInput={(e) =>
                setForm({ ...form(), instruksi_kain: e.target.value })
              }
              disabled={!canEditInstruksiKain}
              classList={{ "bg-gray-200": !canEditInstruksiKain() }}
            ></textarea>
          </div>
        </div>

        <Show when={form().items && form().items.length > 0}>
          <div class="border p-3 rounded my-4 bg-gray-50">
            <h3 class="text-md font-bold mb-2 text-gray-700">Quantity Kain:</h3>
            <ul class="space-y-1 pl-5">
              <For each={form().items}>
                {(item) => {
                  const meterTotal = Number(item.meter_total ?? 0);
                  const yardTotal = Number(item.yard_total ?? 0);
                  const meterInProc = Number(item.meter_dalam_proses ?? 0);
                  const yardInProc = Number(item.yard_dalam_proses ?? 0);

                  const sisaMeter = Math.max(meterTotal - meterInProc, 0);
                  const sisaYard = Math.max(yardTotal - yardInProc, 0);
                  const habis = sisaMeter === 0 && sisaYard === 0;

                  return (
                    <li class="text-sm list-disc">
                      <div class="flex flex-wrap items-baseline gap-x-2">
                        <span class="font-semibold">
                          {item.corak_kain} | {item.konstruksi_kain}
                        </span>
                        <span class="text-gray-500">—</span>
                        <span class="text-gray-700">Quantity:</span>

                        {habis ? (
                          <span class="font-bold text-red-600">HABIS</span>
                        ) : (
                          <>
                            <span class="font-bold text-blue-600 tabular-nums">
                              {formatNumberQty(sisaMeter)} m
                            </span>
                            <span class="text-gray-400">|</span>
                            <span class="font-bold text-blue-600 tabular-nums">
                              {formatNumberQty(sisaYard)} yd
                            </span>
                          </>
                        )}
                      </div>
                    </li>
                  );
                }}
              </For>
            </ul>
          </div>
        </Show>

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
              <th class="border p-2 w-92">Jenis Kain</th>
              <th class="border p-2 w-30">Lebar Greige</th>
              <th class="border p-2 w-30">Lebar Finish</th>
              <th hidden class="border p-2 w-30">
                Std Susut
              </th>
              <th class="border p-2">Warna</th>
              <th class="border p-2">Keterangan Warna</th>
              {/* CHANGED: selalu tampil dua kolom */}
              <th class="border p-2 w-48">Meter</th>
              <th class="border p-2 w-48">Yard</th>
              <th class="border p-2" hidden>
                Harga
              </th>
              <th class="border p-2" hidden>
                Subtotal
              </th>
              <th class="border p-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <For each={form().items}>
              {(item, i) => {
                const unitIsMeter = String(form().satuan_unit_id) === "1";
                return (
                  <tr>
                    <td class="border p-2 text-center">{i() + 1}</td>
                    <td class="border w-92 p-2">
                      <FabricDropdownSearch
                        fabrics={fabricOptions}
                        item={item}
                        onChange={(val) =>
                          handleItemChange(i(), "kain_id", val)
                        }
                        disabled={true}
                      />
                    </td>
                    <td class="border p-2">
                      <input
                        type="number"
                        class="border p-1 rounded w-30 bg-gray-200"
                        value={item.lebar_greige}
                        disabled={true}
                      />
                    </td>
                    <td class="border p-2">
                      <input
                        type="number"
                        class="border p-1 rounded w-30 bg-gray-200"
                        value={item.lebar_finish}
                        disabled={true}
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
                      <ColorDropdownSearch
                        colors={colorOptions}
                        item={item}
                        onChange={(val) =>
                          handleItemChange(i(), "warna_id", val)
                        }
                        disabled={isView}
                      />
                    </td>
                    <td class="border p-2">
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

                    {/* CHANGED: dua kolom qty selalu tampil; hanya satu yang editable */}
                    <td class="border p-2">
                      <input
                        type="text"
                        inputmode="decimal"
                        class="border p-1 rounded w-48"
                        readOnly={isView || !canEditQty() || !unitIsMeter}
                        classList={{
                          "bg-gray-200":
                            isView || !canEditQty() || !unitIsMeter,
                        }}
                        value={item.meter}
                        onBlur={(e) => {
                          if (!unitIsMeter || !canEditQty()) return;
                          handleItemChange(i(), "meter", e.target.value);
                        }}
                      />
                    </td>

                    <td class="border p-2">
                      <input
                        type="text"
                        inputmode="decimal"
                        class="border p-1 rounded w-48"
                        readOnly={isView || !canEditQty() || unitIsMeter}
                        classList={{
                          "bg-gray-200": isView || !canEditQty() || unitIsMeter,
                        }}
                        value={item.yard}
                        onBlur={(e) => {
                          if (unitIsMeter || !canEditQty()) return;
                          handleItemChange(i(), "yard", e.target.value);
                        }}
                      />
                    </td>

                    <td class="border p-2" hidden>
                      <input
                        type="text"
                        class="border p-2 rounded w-full bg-gray-200"
                        value={item.hargaFormatted || ""}
                        onBlur={(e) =>
                          handleItemChange(i(), "harga", e.target.value)
                        }
                        disabled={isView || isEdit}
                        classList={{ "bg-gray-200": isView || isEdit }}
                      />
                    </td>
                    <td class="border p-2" hidden>
                      <input
                        type="text"
                        class="border p-1 rounded w-full bg-gray-200"
                        value={item.subtotalFormatted ?? ""}
                        disabled={true}
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
            {/* CHANGED: tampilkan total meter & total yard sekaligus */}
            <tr class="font-bold bg-gray-100">
              <td colSpan="6" class="text-right p-2">
                TOTAL
              </td>
              <td class="border p-2">
                {formatNumber(totalMeter(), { decimals: 2 })}
              </td>
              <td class="border p-2">
                {formatNumber(totalYard(), { decimals: 2 })}
              </td>
              <td class="border p-2" hidden>
                {formatIDR(totalAll())}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <div>
          <button
            type="submit"
            class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            hidden={isView}
            disabled={isView}
          >
            Simpan
          </button>
        </div>
      </form>
    </MainLayout>
  );
}
