import { createSignal, createEffect, For, onMount, Show } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  getLastSequence,
  getAllSatuanUnits,
  getAllFabrics,
  getUser,
  getAllSalesContracts,
  getAllCustomerTypes,
  getAllCurrenciess,
  getAllCustomers,
  getAllGrades,
  getAllBankAccounts,
  getAllColors,
  getAllAgents,
  createSalesContract,
  updateDataSalesContract,
  getSalesContracts,
} from "../../utils/auth";
import { Printer, Trash2 } from "lucide-solid";
import FabricDropdownSearch from "../../components/FabricDropdownSearch";
import SearchableCustomerSelect from "../../components/CustomerDropdownSearch";
import ColorDropdownSearch from "../../components/ColorDropdownSearch";
import BankAccountDropDownSearch from "../../components/BankAccountDropdownSearch";
import AgentDropdownSearch from "../../components/AgentDropdownSearch";
import GradeDropdownSearch from "../../components/GradeDropdownSearch";

export default function ExporSalesContractForm() {
  const navigate = useNavigate();
  const user = getUser();

  const [manualGenerateDone, setManualGenerateDone] = createSignal(false);

  const [salesContracts, setSalesContracts] = createSignal([]);
  const [satuanUnitOptions, setSatuanUnitOptions] = createSignal([]);
  const [fabricOptions, setFabricOptions] = createSignal([]);
  const [customerType, setCustomerType] = createSignal([]);
  const [currencyList, setCurrencyList] = createSignal([]);
  const [customersList, setCustomersList] = createSignal([]);
  const [agentList, setAgentList] = createSignal([]);
  const [bankAccountList, setBankAccountList] = createSignal([]);
  const [colorOptions, setColorOptions] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [purchaseContractData, setPurchaseContractData] = createSignal(null);
  const [gradeOptions, setGradeOptions] = createSignal([]);
  const [isChecked, setIsChecked] = createSignal(true);

  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const isView = params.view === "true";

  const [form, setForm] = createSignal({
    type: "",
    sequence_number: "", // SC/E/P/....
    no_seq: undefined, // angka urut (sequence)
    tanggal: "",
    po_cust: "-",
    no_pesan: "",
    validity_contract: "",
    customer_id: "",
    currency_id: "",
    kurs: "",
    termin: "",
    ppn_percent: "11.00", // ekspor selalu P
    keterangan: "",
    satuan_unit_id: "",
    percentage_tolerance: "",
    piece_length: "",
    shipment: "",
    terms_of_delivery: "",
    negotiation: "",
    remarks: "",
    bank_account_id: "",
    agent_id: "",
    items: [],
  });

  // Default Units ke Yard saat create
  createEffect(() => {
    if (!isEdit && !form().satuan_unit_id && satuanUnitOptions().length) {
      const yard = satuanUnitOptions().find(
        (u) => (u.satuan || "").toLowerCase() === "yard"
      );
      if (yard?.id) {
        setForm((prev) => ({ ...prev, satuan_unit_id: yard.id }));
      }
    }
  });

  // Generate nomor saat create (sekali)
  createEffect(() => {
    if (isEdit || isView || manualGenerateDone()) return;
    generateNomorKontrak();
  });

  // === HELPERS ===
  const colorNameById = (id) => {
    const row = (colorOptions() || []).find((c) => c.id == id);
    return row?.warna ?? row?.nama ?? row?.name ?? "";
  };

  const findColorIdByName = (name) => {
    if (!name) return null;
    const n = String(name).toLowerCase();
    const row = (colorOptions() || []).find(
      (c) => ((c.warna ?? c.nama ?? c.name) || "").toLowerCase() === n
    );
    return row?.id ?? null;
  };

  // === END HELPERS ===

  const selectedCurrency = () =>
    currencyList().find((c) => c.id == form().currency_id);

  // ===== NUMBER HELPERS =====

  // Format IDR: "Rp 12.345,00"
  const formatIDR = (val) => {
    if (val === null || val === "") return "";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Format USD: "USD 1.46"
  const formatNumberEN = (num, decimals = 2) => {
    const n = typeof num === "string" ? Number(num) : num;
    if (Number.isNaN(n)) return "";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n);
  };

  // Parser angka umum (qty) pakai gaya Indonesia: "41.148,00" -> 41148.00
  const parseNumber = (str) => {
    if (typeof str !== "string" || !str) return 0;
    // buang selain digit, koma, titik
    const cleaned = str.replace(/[^0-9,.\-]/g, "");
    // jika ada dua pemisah, anggap titik = thousands, koma = decimal
    if (cleaned.includes(".") && cleaned.includes(",")) {
      return parseFloat(cleaned.replace(/\./g, "").replace(",", ".")) || 0;
    }
    // jika hanya koma, anggap itu decimal
    if (cleaned.includes(",")) {
      return parseFloat(cleaned.replace(/\./g, "").replace(",", ".")) || 0;
    }
    // hanya titik atau polos
    return parseFloat(cleaned.replace(/,/g, "")) || 0;
  };

  const parseUSD = (str) => {
    if (typeof str !== "string" || !str) return 0;
    const t = str.replace(/[^0-9.,\-]/g, "").replace(/,/g, "");
    return parseFloat(t) || 0;
  };

  const parseIDR = (str) => {
    if (typeof str !== "string" || !str) return 0;
    const t = str.replace(/[^0-9,.\-]/g, "");
    if (t.includes(".") && t.includes(",")) {
      return parseFloat(t.replace(/\./g, "").replace(",", ".")) || 0;
    }
    if (t.includes(",")) {
      return parseFloat(t.replace(/\./g, "").replace(",", ".")) || 0;
    }
    return parseFloat(t) || 0;
  };

  const moneyWith = (currencyName, n) =>
    currencyName === "USD" ? `USD ${formatNumberEN(n, 2)}` : formatIDR(n);

  const activeCurrencyName = () =>
    isEdit
      ? purchaseContractData()?.currency_name ||
        selectedCurrency()?.name ||
        "IDR"
      : selectedCurrency()?.name || "IDR";

  const displayMoney = (n) => moneyWith(activeCurrencyName(), n);

  const roundTo = (n, d = 2) =>
    Math.round((Number(n) + Number.EPSILON) * 10 ** d) / 10 ** d;

  const sanitizeInt = (v) => {
    const s = String(v).replace(/[^\d]/g, "");
    return s === "" ? 0 : parseInt(s, 10);
  };

  const formatNumber = (num, options = {}) => {
    const numValue = typeof num === "string" ? parseNumber(num) : num;
    if (isNaN(numValue)) return "";
    if (numValue === 0 && options.showZero) {
      return new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: options.decimals ?? 0,
        maximumFractionDigits: options.decimals ?? 2,
      }).format(0);
    }
    if (numValue === 0) return "";
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: options.decimals ?? 0,
      maximumFractionDigits: options.decimals ?? 2,
    }).format(numValue);
  };

  const parseKurs = (s) => {
    if (s == null) return 0;
    // buang semua non-digit
    const only = String(s).replace(/[^\d]/g, "");
    return only ? Number(only) : 0;
  };

  const formatGroupID = (n, decimals = 0) =>
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(Number(n) || 0);

  // Format qty (meter/yard/kg) dengan desimal default 2
  const formatNumberQty = (num, decimals = 2) => {
    if (num === "" || num === null || num === undefined) return "";
    const v = Number(num);
    if (Number.isNaN(v)) return "";
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(v);
  };

  // === END OF NUMBER HELPERS ===

  // === AGENT HELPERS ===

  const agentNameById = (id) => {
    const row = (agentList() || []).find((a) => String(a.id) === String(id));
    return row?.agent_name || null;
  };

  // === END OF AGENT HELPERS ===

  onMount(async () => {
    setLoading(true);
    const [
      contracts,
      satuanUnits,
      fabrics,
      dataCustomerTypes,
      getCurrencies,
      getCustomers,
      getAgent,
      grades,
      getBankAccounts,
      colors,
    ] = await Promise.all([
      getAllSalesContracts(user?.token),
      getAllSatuanUnits(user?.token),
      getAllFabrics(user?.token),
      getAllCustomerTypes(user?.token),
      getAllCurrenciess(user?.token),
      getAllCustomers(user?.token),
      getAllAgents(user?.token),
      // optional/unused but kept for parity:
      getAllGrades(user?.token),
      getAllBankAccounts(user?.token),
      getAllColors(user?.token),
    ]);

    setSalesContracts(contracts.contracts);
    setSatuanUnitOptions(satuanUnits.data || []);
    setFabricOptions(fabrics.kain || []);
    setCustomerType(dataCustomerTypes.data || []);
    setCurrencyList(getCurrencies.data || []);
    setCustomersList(getCustomers.customers || []);
    setAgentList(getAgent.data || []);
    setBankAccountList(getBankAccounts?.data || []);
    setGradeOptions(grades?.data || []);
    setColorOptions(colors?.warna || ["Pilih"]);

    const eksporType = (dataCustomerTypes.data || []).find(
      (ct) => (ct.jenis || "").toLowerCase() === "ekspor"
    );
    if (!isEdit && eksporType?.id) {
      setForm((prev) => ({ ...prev, type: eksporType.id }));
    }

    if (isEdit) {
      const res = await getSalesContracts(params.id, user?.token);
      const data = res.contract;

      //console.log("Data SC Export: ", JSON.stringify(data, null, 2));

      setPurchaseContractData({ ...data });
      if (!data) {
        setLoading(false);
        return;
      }

      const normalizedItems = (data.items || []).map((item) => {
        const lebarValue = parseFloat(item.lebar) || 0;
        const gramasiValue = parseFloat(item.gramasi) || 0;
        const meterValue = parseFloat(item.meter_total) || 0;
        const yardValue = parseFloat(item.yard_total) || 0;
        const kilogramValue = parseFloat(item.kilogram_total) || 0;
        const hargaValue = parseFloat(item.harga) || 0;

        const subtotal =
          hargaValue *
          (parseInt(data.satuan_unit_id) === 1
            ? meterValue
            : parseInt(data.satuan_unit_id) === 2
            ? yardValue
            : parseInt(data.satuan_unit_id) === 3
            ? kilogramValue
            : 0);

        const designId = item.design_id ?? item.warna_id ?? null;
        const designKod =
          item.design_kode ?? item.design ?? colorNameById(designId) ?? "";

        return {
          meter_total: item.meter_total,
          yard_total: item.yard_total,
          kilogram_total: item.kilogram_total,
          meter_dalam_proses: item.meter_dalam_proses,
          yard_dalam_proses: item.yard_dalam_proses,
          kilogram_dalam_proses: item.kilogram_dalam_proses,
          corak_kain: item.corak_kain,
          konstruksi_kain: item.konstruksi_kain,

          id: item.id,
          fabric_id: item.kain_id ?? null,
          grade_id: item.grade_id ?? "",

          warna_id: designId,
          design: designKod,

          lebar: formatNumber(lebarValue, { decimals: 0, showZero: true }),
          lebarValue: Math.round(lebarValue),

          description_of_goods: item.description_of_goods ?? "",

          gramasi: formatNumber(roundTo(gramasiValue, 2), {
            decimals: 2,
            showZero: true,
          }),
          gramasiValue: roundTo(gramasiValue, 2),

          meter: formatNumber(roundTo(meterValue, 2), {
            decimals: 2,
            showZero: true,
          }),
          meterValue: roundTo(meterValue, 2),

          yard: formatNumber(roundTo(yardValue, 2), {
            decimals: 2,
            showZero: true,
          }),
          yardValue: roundTo(yardValue, 2),

          kilogram: formatNumber(roundTo(kilogramValue, 2), {
            decimals: 2,
            showZero: true,
          }),
          kilogramValue: roundTo(kilogramValue, 2),

          harga: moneyWith(data.currency_name, roundTo(hargaValue, 2)),
          hargaValue: roundTo(hargaValue, 2),

          subtotal,
          subtotalFormatted: moneyWith(data.currency_name, subtotal),
        };
      });

      const shipmentRaw =
        data.shipment ||
        data.shipment ||
        data.tanggal_pengiriman ||
        data.shipmentDate ||
        null;

      let noSeqFromExisting = data.no_seq;
      const existingNomor = data.no_sc || "";
      
      // Jika nomor sudah dalam format SC/E/P/1225-5001, ekstrak angka urutnya
      if (existingNomor.includes('-5')) {
        const parts = existingNomor.split('-5');
        if (parts.length > 1) {
          // Ambil 3 digit setelah -5
          const seqPart = parts[1];
          noSeqFromExisting = parseInt(seqPart, 10);
        }
      }

      setForm({
        type: data.transaction_type?.toLowerCase() === "domestik" ? 1 : 2,
        no_seq: noSeqFromExisting, // gunakan angka yang diekstrak
        sequence_number: existingNomor, // string asli
        tanggal: data.created_at
          ? new Date(data.created_at).toISOString().split("T")[0]
          : "",
        po_cust: data.po_cust ?? "",
        validity_contract: data.validity_contract
          ? new Date(data.validity_contract).toISOString().split("T")[0]
          : "",
        customer_id: data.customer_id ?? "",
        currency_id: data.currency_id ?? "",
        kurs: Number(data.kurs) || 0,
        termin: parseInt(data.termin) ?? "",
        ppn_percent: parseFloat(data.ppn_percent) > 0 ? "11.00" : "0.00",
        keterangan: data.keterangan ?? "",
        satuan_unit_id: parseInt(data.satuan_unit_id) ?? "",

        percentage_tolerance: data.percentage_tolerance ?? "",
        piece_length: data.piece_length ?? "",
        shipment: shipmentRaw
          ? new Date(shipmentRaw).toISOString().split("T")[0]
          : "",
        terms_of_delivery: data.terms_of_delivery ?? "",
        negotiation: data.negotiation ?? "",
        bank_account_id: data.bank_account_id ?? "",
        agent_id: data.agent_id ?? "",

        items: normalizedItems,
      });
    } else {
      const today = new Date().toISOString().split("T")[0];
      const lastSeq = await getLastSequence(user?.token, "sc", "ekspor", 11);
      setForm((prev) => ({
        ...prev,
        tanggal: today,
        no_seq: lastSeq?.last_sequence + 1, // angka urut
        ppn_percent: "11.00",
      }));
      // sequence_number (string SC/E/P/...) diisi oleh generateNomorKontrak()
    }

    setLoading(false);
  });

  const generateNomorKontrak = async () => {
    const lastSeq = await getLastSequence(user?.token, "sc", "ekspor", 11);
    const nextNum = String((lastSeq?.last_sequence || 0) + 1).padStart(4, "0"); // 4 digit untuk x
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(2);
    const ppnType = "P"; // ekspor selalu pajak
    const type = "E";
    const mmyy = `${month}${year}`;
    
    // Format: SC/E/P/1225-500x (5 tetap, x adalah angka urut 3 digit)
    const nomor = `SC/${type}/${ppnType}/${mmyy}-5${nextNum}`;
    
    setForm((prev) => ({
      ...prev,
      sequence_number: nomor, // string SC/E/P/1225-5001
      no_seq: lastSeq?.last_sequence + 1, // angka urut untuk database
    }));
    setManualGenerateDone(true);
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          fabric_id: null,
          grade_id: "",
          warna_id: null,
          design: "",
          lebar: "",
          lebarValue: 0,
          description_of_goods: "",
          gramasi: "",
          gramasiValue: 0,
          meter: "",
          meterValue: 0,
          yard: "",
          yardValue: 0,
          kilogram: "",
          kilogramValue: 0,
          harga: "",
          hargaValue: 0,
          subtotal: 0,
          subtotalFormatted: "",
        },
      ],
    }));
  };

  const removeItem = (index) => {
    setForm((prev) => {
      const newItems = [...prev.items];
      newItems.splice(index, 1);
      return { ...prev, items: newItems };
    });
  };

  const totalAll = () =>
    form().items.reduce((sum, item) => sum + (item.subtotal || 0), 0);

  const handleItemChange = (index, field, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      const item = { ...items[index] };
      const satuanId = parseInt(prev.satuan_unit_id);

      if (field === "fabric_id" || field === "grade_id") {
        item[field] = value;
      } else if (field === "warna_id") {
        const obj = typeof value === "object" && value ? value : {};
        const id = obj.id ?? value ?? null;
        const name =
          obj.warna ??
          obj.nama ??
          obj.name ??
          obj.label ??
          colorNameById(id) ??
          "";
        item.warna_id = id;
        item.design = name;
      } else if (field === "lebar") {
        const intVal = sanitizeInt(value);
        item.lebarValue = intVal;
        item.lebar = formatNumber(intVal, { decimals: 0, showZero: true });
      } else if ( field === "gramasi"){
        const numValue = roundTo(parseNumber(value), 2);
        item.gramasiValue = numValue;
        item.gramasi = formatNumber(numValue, { decimals: 2, showZero: true });
      } else if (field === "description_of_goods") {
        item.description_of_goods = value;
      } else {
        // numeric (max 2 desimal)
        let numValue;
        if (field === "harga") {
          const curr = activeCurrencyName();
          numValue = roundTo(
            curr === "USD" ? parseUSD(value) : parseIDR(value),
            2
          );
          item.hargaValue = numValue;
          item.harga = displayMoney(numValue); // tampil sesuai currency aktif (lihat helper)
        } else {
          numValue = roundTo(parseNumber(value), 2);
          item[`${field}Value`] = numValue;
          item[field] = formatNumber(numValue, { decimals: 2, showZero: true });
        }

        // auto convert antar satuan
        if (satuanId === 1 && field === "meter") {
          item.yardValue = roundTo((numValue || 0) * 1.093613, 2);
          item.yard = formatNumber(item.yardValue, {
            decimals: 2,
            showZero: true,
          });
          item.kilogramValue = 0;
          item.kilogram = formatNumber(0, { decimals: 2, showZero: true });
        } else if (satuanId === 2 && field === "yard") {
          item.meterValue = roundTo((numValue || 0) * 0.9144, 2);
          item.meter = formatNumber(item.meterValue, {
            decimals: 2,
            showZero: true,
          });
          item.kilogramValue = 0;
          item.kilogram = formatNumber(0, { decimals: 2, showZero: true });
        } else if (satuanId === 3 && field === "kilogram") {
          item.meterValue = 0;
          item.meter = formatNumber(0, { decimals: 2, showZero: true });
          item.yardValue = 0;
          item.yard = formatNumber(0, { decimals: 2, showZero: true });
        }
      }

      // subtotal
      const hargaValue = item.hargaValue || 0;
      let qtyValue = 0;
      if (satuanId === 1) qtyValue = item.meterValue || 0;
      else if (satuanId === 2) qtyValue = item.yardValue || 0;
      else if (satuanId === 3) qtyValue = item.kilogramValue || 0;

      const subtotal = roundTo(qtyValue * hargaValue, 2);
      item.subtotal = subtotal;
      item.subtotalFormatted = displayMoney(subtotal);

      items[index] = item;
      return { ...prev, items };
    });
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
      const customerTypeObj = customerType().find((ct) => ct.id == form().type);

      const payloadItems = form().items.map((item) => ({
        id: item.id,
        kain_id: item.fabric_id,
        grade_id: item.grade_id,

        design_id: item.warna_id ? Number(item.warna_id) : null,
        design_kode: item.design || colorNameById(item.warna_id) || "",

        lebar: item.lebarValue || 0,
        description_of_goods: item.description_of_goods || "",
        gramasi: item.gramasiValue || 0,
        meter_total: item.meterValue || 0,
        yard_total: item.yardValue || 0,
        kilogram_total: item.kilogramValue || 0,
        harga: item.hargaValue || 0,
      }));

      const payload = {
        type: customerTypeObj?.jenis.toLowerCase(),
        // Penting: no_sc = string SC/E/P/..., sequence_number = nomor urut
        no_sc: form().sequence_number, // format lengkap: SC/E/P/1225-5001
        sequence_number: form().no_seq, // angka urut saja: 1, 2, 3, dst
        po_cust: form().po_cust,
        validity_contract: form().validity_contract,
        customer_id: parseInt(form().customer_id),
        currency_id: parseInt(form().currency_id),
        kurs: Number(form().kurs) || 0,
        termin: form().termin ? parseInt(form().termin) : null,
        ppn_percent: form().ppn_percent,
        keterangan: form().keterangan,
        satuan_unit_id: parseInt(form().satuan_unit_id),

        percentage_tolerance: form().percentage_tolerance || "",
        piece_length: form().piece_length || "",
        shipment: form().shipment || "",
        terms_of_delivery: form().terms_of_delivery || "",
        negotiation: form().negotiation || "",
        bank_account_id: form().bank_account_id
          ? parseInt(form().bank_account_id)
          : null,

        agent_id: form().agent_id ? parseInt(form().agent_id) : null,
        agent_name: agentNameById(form().agent_id),

        items: payloadItems,
      };

      if (isEdit) {
        //console.log("Update Data SC: ", JSON.stringify(payload, null, 2));

        await updateDataSalesContract(user?.token, params.id, payload);
      } else {
        //console.log("Create Data SC: ", JSON.stringify(payload, null, 2));

        await createSalesContract(user?.token, payload);
      }

      Swal.fire({
        icon: "success",
        title: "Sales Contract berhasil disimpan!",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => {
        navigate("/expor/salescontract");
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Gagal menyimpan Sales Contract",
        text: err?.message || "Terjadi kesalahan.",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
    }
  };

  function handlePrint() {
    if (!purchaseContractData()) {
      Swal.fire(
        "Gagal",
        "Data untuk mencetak tidak tersedia. Pastikan Anda dalam mode Edit/View.",
        "error"
      );
      return;
    }
    const dataToPrint = { ...purchaseContractData() };

    //console.log("Data print SC Export: ", JSON.stringify(dataToPrint, null, 2));

    const encodedData = encodeURIComponent(JSON.stringify(dataToPrint));
    window.open(`/print/expor/salescontract#${encodedData}`, "_blank");
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
        {isView ? "Detail" : isEdit ? "Edit" : "Tambah"} Sales Contract Ekspor
      </h1>
      <button
        type="button"
        class="flex gap-2 bg-blue-600 text-white px-3 py-2 mb-4 rounded hover:bg-green-700"
        onClick={handlePrint}
        hidden={!isEdit}
      >
        <Printer size={20} />
        Print
      </button>

      <form class="space-y-4" onSubmit={handleSubmit} onkeydown={handleKeyDown}>
        <div class="grid grid-cols-4 gap-4">
          <div>
            <label class="block mb-1 font-medium">Contract Number</label>
            <div class="flex gap-2">
              <input
                class="w-full border bg-gray-200 p-2 rounded"
                value={form().sequence_number}
                readOnly
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
            <label class="block mb-1 font-medium">Date</label>
            <input
              type="date"
              class="w-full border bg-gray-200 p-2 rounded"
              value={form().tanggal}
              readOnly
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Transaction Type</label>
            <div class="w-full border p-2 rounded bg-gray-200">Export</div>
            <input type="hidden" value="1" />
          </div>

          <div>
            <label class="block mb-1 font-medium">Customer</label>
            <SearchableCustomerSelect
              customersList={customersList}
              form={form}
              setForm={setForm}
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
            />
          </div>
        </div>

        <div class="grid grid-cols-5 gap-4">
          <div>
            <label class="block mb-1 font-medium">Agent</label>
            <AgentDropdownSearch
              agentList={agentList}
              form={form}
              setForm={setForm}
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Validity Date</label>
            <input
              type="date"
              class="w-full border p-2 rounded"
              value={form().validity_contract}
              onInput={(e) =>
                setForm({ ...form(), validity_contract: e.target.value })
              }
              disabled={isView || isEdit}
              classList={{ "bg-gray-200": isView || isEdit }}
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Currency</label>
            <select
              class="w-full border p-2 rounded"
              value={form().currency_id || ""}
              onChange={(e) => {
                const currencyId = e.target.value;
                const curr = currencyList().find((c) => c.id == currencyId);
                setForm({
                  ...form(),
                  currency_id: currencyId,
                  kurs: curr?.name === "IDR" ? 0 : form().kurs,
                });
              }}
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
              required
            >
              <option value="" disabled>
                Pilih Currency
              </option>
              {currencyList().map((curr) => (
                <option value={curr.id}>{curr.name}</option>
              ))}
            </select>
          </div>

          {selectedCurrency()?.name !== "IDR" && (
            <div>
              <label class="block mb-1 font-medium">Kurs</label>
              <div class="flex">
                <span class="inline-flex items-center px-3 border border-r-0 border-black bg-gray-50 rounded-l">
                  IDR
                </span>
                <input
                  class="w-full border p-2 rounded rounded-l-none"
                  type="text"
                  value={formatGroupID(form().kurs)}
                  onInput={(e) =>
                    setForm({ ...form(), kurs: parseKurs(e.target.value) })
                  }
                  required
                  disabled={isView}
                  classList={{ "bg-gray-200": isView }}
                />
              </div>
            </div>
          )}

          <div>
            <label class="block mb-1 font-medium">Units</label>
            <select
              class="w-full border p-2 rounded"
              value={form().satuan_unit_id || ""}
              onChange={(e) =>
                setForm({ ...form(), satuan_unit_id: e.target.value })
              }
              disabled={true}
              classList={{ "bg-gray-200 ": true }}
              required
            >
              <option value="">Pilih Satuan</option>
              <For each={satuanUnitOptions()}>
                {(u) => <option value={u.id}>{u.satuan}</option>}
              </For>
            </select>
          </div>
        </div>

        <hr class="border border-gray-300" />

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-medium">Percentage Tolerance</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().percentage_tolerance}
              onInput={(e) =>
                setForm({ ...form(), percentage_tolerance: e.target.value })
              }
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Piece Length</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().piece_length}
              onInput={(e) =>
                setForm({ ...form(), piece_length: e.target.value })
              }
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
            />
          </div>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block mb-1 font-medium">Shipment Date</label>
            <input
              type="date"
              class="w-full border p-2 rounded"
              value={form().shipment}
              onInput={(e) => setForm({ ...form(), shipment: e.target.value })}
              disabled={isView || isEdit}
              classList={{ "bg-gray-200": isView || isEdit }}
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Terms of Delivery</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().terms_of_delivery}
              onInput={(e) =>
                setForm({ ...form(), terms_of_delivery: e.target.value })
              }
              disabled={isView}
              classList={{ "bg-gray-200": isView }}
            />
          </div>

          <div>
            <label class="block mb-1 font-medium">Payment Terms</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().payment_terms || "T/T Payment"}
              onInput={(e) =>
                setForm({ ...form(), payment_terms: e.target.value })
              }
              required
              disabled={true}
              classList={{ "bg-gray-200 ": true }}
            />
          </div>
        </div>

        <div>
          <label class="block mb-1 font-medium">Negotiation</label>
          <input
            type="text"
            class="w-full border p-2 rounded"
            value={form().negotiation}
            onInput={(e) => setForm({ ...form(), negotiation: e.target.value })}
            disabled={isView}
            classList={{ "bg-gray-200": isView }}
          />
        </div>

        <div>
          <label class="block mb-1 font-medium">Account</label>
          <BankAccountDropDownSearch
            bankAccounts={bankAccountList}
            form={form}
            setForm={setForm}
            disabled={isView}
            classList={{ "bg-gray-200": isView }}
          />
        </div>

        <div>
          <label class="block mb-1 font-medium">Remarks</label>
          <textarea
            class="w-full border p-2 rounded"
            value={form().keterangan}
            onInput={(e) => setForm({ ...form(), keterangan: e.target.value })}
            readOnly={isView}
            classList={{ "bg-gray-200": isView }}
          ></textarea>
        </div>

        <hr class="border border-gray-300" />

        <Show when={isView && form().items && form().items.length > 0}>
          <div class="border p-3 rounded my-4 bg-gray-50">
            <h3 class="text-md font-bold mb-2 text-gray-700">Quantity Kain:</h3>
            <ul class="space-y-1 pl-5">
              <For each={form().items}>
                {(item) => {
                  const unit =
                    parseInt(form().satuan_unit_id) === 1
                      ? "Meter"
                      : parseInt(form().satuan_unit_id) === 2
                      ? "Yard"
                      : "Kilogram";

                  const sisa =
                    unit === "Meter"
                      ? Number(item.meter_total || 0) -
                        Number(item.meter_dalam_proses || 0)
                      : unit === "Yard"
                      ? Number(item.yard_total || 0) -
                        Number(item.yard_dalam_proses || 0)
                      : Number(item.kilogram_total || 0) -
                        Number(item.kilogram_dalam_proses || 0);

                  const corak = item.corak_kain || "Kain";
                  const konstruksi = item.konstruksi_kain || "";

                  return (
                    <li class="text-sm list-disc">
                      <span class="font-semibold">
                        {corak} | {konstruksi}
                      </span>{" "}
                      - Quantity:{" "}
                      {sisa > 0 ? (
                        <span class="font-bold text-blue-600">
                          {formatNumberQty(sisa)}{" "}
                          {unit === "Meter"
                            ? "m"
                            : unit === "Yard"
                            ? "yd"
                            : "kg"}
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

        <h2 class="text-lg font-bold mt-6 mb-2">Items</h2>
        <button
          type="button"
          class="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 mb-4"
          onClick={addItem}
          hidden={isView}
        >
          + Tambah Item
        </button>

        <table class="w-full text-sm border border-gray-300 mb-4">
          <thead class="bg-gray-100">
            <tr>
              <th class="border p-2">#</th>
              <th class="border p-2">Article</th>
              <th hidden class="border p-2">
                Design (Color)
              </th>
              <th class="border p-2">Grade</th>
              <th class="border p-2">Lebar</th>
              <th class="border p-2">Gramasi</th>
              <th class="border p-2">Desc of Goods</th>
              <th class="border p-2">Yard</th>
              <th class="border p-2">Meter</th>
              <th class="border p-2">Price</th>
              <th class="border p-2">Amount</th>
              <th class="border p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            <For each={form().items}>
              {(item, i) => (
                <tr>
                  <td class="border p-2 text-center">{i() + 1}</td>
                  <td class="border w-62 p-2">
                    <FabricDropdownSearch
                      fabrics={fabricOptions}
                      item={item}
                      onChange={(val) =>
                        handleItemChange(i(), "fabric_id", val)
                      }
                      disabled={isView}
                      classList={{ "bg-gray-200": isView }}
                    />
                  </td>
                  <td hidden class="border p-2">
                    <ColorDropdownSearch
                      colors={colorOptions}
                      item={item}
                      onChange={(val) => handleItemChange(i(), "warna_id", val)}
                      disabled={isView}
                      classList={{ "bg-gray-200": isView }}
                    />
                  </td>
                  <td class="border p-2">
                    <GradeDropdownSearch
                      grades={gradeOptions}
                      item={item}
                      onChange={(val) => handleItemChange(i(), "grade_id", val)}
                      disabled={isView}
                      classList={{ "bg-gray-200": isView }}
                    />
                  </td>
                  
                  {/* TAMBAH KOLOM LEBAR */}
                  <td class="border p-2">
                    <input
                      type="text"
                      inputmode="decimal"
                      class="border p-1 rounded w-full text-right"
                      value={item.lebar}
                      onBlur={(e) =>
                        handleItemChange(i(), "lebar", e.target.value)
                      }
                      disabled={isView}
                      classList={{ "bg-gray-200": isView }}
                      placeholder="0"
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      inputmode="decimal"
                      class="border p-1 rounded w-full text-right"
                      value={item.gramasi}
                      onBlur={(e) =>
                        handleItemChange(i(), "gramasi", e.target.value)
                      }
                      disabled={isView}
                      classList={{ "bg-gray-200": isView }}
                      placeholder="0.00"
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      class="border p-1 rounded w-full"
                      value={item.description_of_goods}
                      onBlur={(e) =>
                        handleItemChange(
                          i(),
                          "description_of_goods",
                          e.target.value
                        )
                      }
                      disabled={isView}
                      classList={{ "bg-gray-200": isView }}
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      inputmode="decimal"
                      class={`border p-1 rounded w-full ${
                        parseInt(form().satuan_unit_id) !== 2
                          ? "bg-gray-200"
                          : ""
                      }`}
                      readOnly={parseInt(form().satuan_unit_id) !== 2}
                      value={item.yard}
                      onBlur={(e) => {
                        if (parseInt(form().satuan_unit_id) === 2) {
                          handleItemChange(i(), "yard", e.target.value);
                        }
                      }}
                      disabled={isView}
                      classList={{ "bg-gray-200": isView }}
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      inputmode="decimal"
                      class={`border p-1 rounded w-full ${
                        parseInt(form().satuan_unit_id) !== 1
                          ? "bg-gray-200"
                          : ""
                      }`}
                      readOnly={parseInt(form().satuan_unit_id) !== 1}
                      value={item.meter}
                      onBlur={(e) => {
                        if (parseInt(form().satuan_unit_id) === 1) {
                          handleItemChange(i(), "meter", e.target.value);
                        }
                      }}
                      disabled={isView}
                      classList={{ "bg-gray-200": isView }}
                    />
                  </td>
                  <td class="border p-2">
                    <input
                      type="text"
                      inputmode="decimal"
                      class="border p-1 rounded w-full"
                      value={item.harga}
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
                    />
                  </td>
                  <td class="border p-2 text-center">
                    <button
                      type="button"
                      class="text-red-600 hover:text-red-800 text-xs"
                      onClick={() => removeItem(i())}
                      disabled={isView}
                    >
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
          <tfoot>
            <tr class="font-bold bg-gray-100">
              <td colSpan="9" class="text-right p-2">
                TOTAL
              </td>
              <td class="border p-2">{displayMoney(totalAll())}</td>
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
