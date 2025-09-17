import { createSignal, createEffect, For, onMount, Show, createMemo } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../../layouts/MainLayout";
import Swal from "sweetalert2";
import {
  getJualBelis,
  createJBDeliveryNote,
  updateDataJBDeliveryNote,
  getJBDeliveryNotes,
  getUser,
  getAllJualBelis,
  getLastSequence,
  getAllSuppliers,
} from "../../../utils/auth";
import PurchaseOrderSearch from "../../../components/JualBeliDropdownSearch";
import SupplierAlamatDropdownSearch from "../../../components/SupplierAlamatDropdownSearch";
import { Printer, Trash2, XCircle } from "lucide-solid";
import FabricDropdownSearch from "../../../components/FabricDropdownSearch";

export default function JBDeliveryNoteForm() {
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const isView = params.view === 'true';
  const navigate = useNavigate();
  const user = getUser();

  const [jualBeliList, setJualBeliList] = createSignal([]);
  const [openStates, setOpenStates] = createSignal([]);
  const [groupRollCounts, setGroupRollCounts] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
//   const [allFabrics, setAllFabrics] = createSignal([]);
  const [deliveryNoteData, setDeliveryNoteData] = createSignal(null); 
  const [deletedItems, setDeletedItems] = createSignal([]);
  const [allSuppliers, setAllSuppliers] = createSignal([]);
  const [selectedSupplierId, setSelectedSupplierId] = createSignal(null);

  const [form, setForm] = createSignal({
    sequence_number: "",
    jb_id: "",
    keterangan: "",
    purchase_order_id: null,
    purchase_order_items: null,
    no_sj_supplier: "",
    tanggal_kirim: "",
    alamat_pengiriman: "",
    // supplier_kirim_alamat: "",
    // supplier_kirim_id: null, 
    unit: "Meter", 
    itemGroups: [],
  });

  const totalMeter = createMemo(() => 
    form().itemGroups.reduce((sum, group) => sum + (Number(group.meter_total) || 0), 0)
  );

  const totalYard = createMemo(() => 
    form().itemGroups.reduce((sum, group) => sum + (Number(group.yard_total) || 0), 0)
  );

  const totalAll = createMemo(() => 
    form().itemGroups.reduce((sum, group) => {
      const quantity = form().unit === 'Meter' ? group.meter_total : group.yard_total;
      const subtotal = (Number(group.item_details?.harga) || 0) * (Number(quantity) || 0);
      return sum + subtotal;
    }, 0)
  );

  onMount(async () => {
    setLoading(true);
    // const fabricsResponse = await getAllFabrics(user?.token);
    // setAllFabrics(fabricsResponse.kain || []);
    //console.log("1. Data Master Kain:", JSON.stringify(fabricsResponse, null, 2)); 

    const poListResponse = await getAllJualBelis(user?.token);
    //console.log("Data all JB: ", JSON.stringify(poListResponse, null, 2));
    setJualBeliList(poListResponse.mainRows || []);

    // const suppliersResponse = await getAllSuppliers(user?.token);
    // setAllSuppliers(suppliersResponse?.suppliers || []);

    if (isEdit) {
      const sjResponse = await getJBDeliveryNotes(params.id, user?.token);
      //console.log("Data SJ JB per id: ", JSON.stringify(sjResponse, null, 2));
      const suratJalanData = sjResponse?.suratJalan;

      if (!suratJalanData) {
        setLoading(false);
        Swal.fire("Error", "Data Surat Jalan tidak ditemukan.", "error");
        return;
      }

      const poDetailResponse = await getJualBelis(suratJalanData.jb_id, user?.token);
      //console.log("Data JB: ", JSON.stringify(poDetailResponse, null , 2));
      const poData = poDetailResponse?.mainRow;

      const fullPrintData = {
        ...suratJalanData,
        //purchase_order_detail: poData
      };
      // Simpan ke dalam signal
      setDeliveryNoteData(fullPrintData);
      
      // const supplierById = (suppliersResponse?.suppliers || []).find(
      //   (s) => s.id === suratJalanData.supplier_kirim_id
      // );

      // const alamatKirim =
      //   supplierById?.alamat ||
      //   suratJalanData?.supplier_kirim_alamat ||
      //   // suratJalanData?.supplier_alamat ||
      //   "";

      setForm({
        ...form(),
        jb_id: suratJalanData.no_sj,
        no_sj_supplier: suratJalanData.no_sj_supplier,
        alamat_pengiriman: suratJalanData.supplier_alamat || "",
        // supplier_kirim_alamat: suratJalanData.supplier_kirim_alamat || "",
        // supplier_kirim_id: supplierById ? supplierById.id : null,
        tanggal_kirim: suratJalanData.tanggal_kirim ? new Date(suratJalanData.tanggal_kirim).toISOString().split("T")[0] : "",
        purchase_order_id: suratJalanData.jb_id,
        purchase_order_items: poData,
        sequence_number: suratJalanData.sequence_number,
        keterangan: suratJalanData.keterangan || "",
        unit: suratJalanData.satuan_unit_name || "Meter",
        itemGroups: (suratJalanData.items || [])
          .filter(group => !group.deleted_at)
          .map((group) => ({
          
          id: group.id,
          purchase_order_item_id: group.jb_item_id,
          item_details: {
              corak_kain: group.corak_kain || "N/A",
              konstruksi_kain: group.konstruksi_kain || "",
              deskripsi_warna: group.deskripsi_warna || "",
              lebar_kain: group.lebar_kain || 0,
              harga: group.harga || 0,
          },
          meter_total: Number(group.meter_total) || 0,
          yard_total: Number(group.yard_total) || 0,
          }))
      });

      // if (supplierById) {
      //   setSelectedSupplierId(supplierById.id);
      // } else {
      //   const sjAlamat = suratJalanData?.supplier_kirim_alamat || "";
      //   const matchSupplier = (suppliersResponse?.suppliers || []).find(
      //     (s) => (s.alamat || "").trim() === sjAlamat.trim()
      //   );
      //   if (matchSupplier) {
      //     setSelectedSupplierId(matchSupplier.id);
      //     setForm(prev => ({
      //       ...prev,
      //       supplier_kirim_id: matchSupplier.id,
      //       supplier_kirim_alamat: matchSupplier.alamat,
      //     }));
      //   }
      // }
    }
    setLoading(false);
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

    const numValue = Number(num);
    
    if (isNaN(numValue)) return "";
    
    if (numValue === 0) return "0";

    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(numValue);
  };

  const parseNumber = (str) => {
    if (typeof str !== 'string' || !str) return 0;
    const cleaned = str.replace(/[^\d,]/g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };

  const formatHarga = (val) => {
    if (val === null || val === "") return "";
    return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 2,
    }).format(val);
  };
  
  const formatIDR = (val) =>{
    if(val === null || val === "") return "";
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 2,
    }).format(val);
  }

  const handleQuantityChange = (index, value) => {
    const unit = form().unit;
    const numValue = parseNumber(value);

    setForm((prev) => {
      const updatedItemGroups = [...prev.itemGroups];
      const itemToUpdate = { ...updatedItemGroups[index] };

      if (unit === "Meter") {
        itemToUpdate.meter_total = numValue;
        itemToUpdate.yard_total = numValue * 1.093613;
      } else {
        itemToUpdate.yard_total = numValue;
        itemToUpdate.meter_total = numValue / 1.093613;
      }

      updatedItemGroups[index] = itemToUpdate;
      return { ...prev, itemGroups: updatedItemGroups };
    });
  };
  
  const handleSuratJalanChange = async (selectedPO) => {
    if (!selectedPO) return;

    // Hanya jalankan logika untuk mode "Tambah Baru"
    const res = await getJualBelis(selectedPO.id, user?.token);
    //console.log("Data get BG ORDER ", JSON.stringify(res, null, 2));    
    const selectedPOData = res?.mainRow; 

    const poTypeLetter = selectedPO.no_jb.split("/")[1];
    const poPPN = selectedPO.no_jb.split("/")[2];
    const ppnValue = poPPN === "P" ? 1 : 0;

    const { newSJNumber, newSequenceNumber } = await generateSJNumber(
      poTypeLetter,
      ppnValue
    );

    const unitName = selectedPOData.satuan_unit_name; // "Meter" / "Yard"
    const newItemGroups = (selectedPOData.items || []).map(item =>
      templateFromPOItem(item, unitName)
    );

    setForm({
      ...form(),
      purchase_order_id: selectedPO.id,
      purchase_order_items: selectedPOData,
      jb_id: newSJNumber,
      sequence_number: newSequenceNumber,
      // Komen alamat_pengiriman klo dropdown
      alamat_pengiriman: selectedPOData.supplier_alamat,
      unit: unitName,
      itemGroups: newItemGroups, 
    });
  };

  const generateSJNumber = async (salesType, ppn) => {
    const lastSeq = await getLastSequence(
      user?.token,
      "jb_sj",
      salesType,
      ppn
    );

    const nextNum = String((lastSeq?.last_sequence || 0) + 1).padStart(5, "0");
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = String(now.getFullYear()).slice(2);
    const ppnValue = parseFloat(ppn) || 0;
    const type = ppnValue > 0 ? "P" : "N";
    const mmyy = `${month}${year}`;
    const nomor = `SJ/JB/${type}/${mmyy}-${nextNum}`;

    return {
      newSJNumber: nomor,
      newSequenceNumber: (lastSeq?.last_sequence || 0) + 1,
    };
  };

  // const handleSupplierSelected = (opt) => {
  //   setSelectedSupplierId(opt ? opt.id : null);
  //   setForm((prev) => ({
  //     ...prev,
  //     supplier_kirim_id: opt ? opt.id : null,
  //     supplier_kirim_alamat: opt ? opt.alamat : "",
  //   }));
  // };

  const templateFromPOItem = (poItem) => {
    const m = Number(poItem.meter_total ?? poItem.meter ?? 0) || 0;
    const y = Number(poItem.yard_total  ?? poItem.yard  ?? 0) || 0;

    const hasM = m > 0;
    const hasY = y > 0;

    // Lengkapi unit lain bila kosong
    const meterVal = hasM ? m : (hasY ? y * 0.9144   : 0);
    const yardVal  = hasY ? y : (hasM ? m * 1.093613 : 0);

    return {
      purchase_order_item_id: poItem.id,
      item_details: {
        corak_kain:      poItem.corak_kain,
        konstruksi_kain: poItem.konstruksi_kain,
        deskripsi_warna: poItem.deskripsi_warna,
        lebar_kain:      poItem.lebar_kain,
        harga:           poItem.harga,
      },
      // Keduanya diisi, UI tinggal pilih mana yang ditampilkan sesuai form().unit
      meter_total: meterVal,
      yard_total:  yardVal,
    };
  };

  const addItemGroup = () => {
    const poDetail = form().purchase_order_items;
    if (!poDetail || !poDetail.items || poDetail.items.length === 0) {
      Swal.fire("Peringatan", "Silakan pilih Jual Beli terlebih dahulu.", "warning");
      return;
    }

    const paketBaru = poDetail.items.map(templateFromPOItem);

    setForm((prev) => ({
      ...prev,
      itemGroups: [...prev.itemGroups, ...paketBaru],
    }));
  };

  // const addItemGroup = () => {
  //   setForm((prev) => ({
  //     ...prev,
  //     itemGroups: [
  //       ...prev.itemGroups,
  //       {
  //         purchase_order_item_id: "",
  //         item_details: {},
  //         meter_total: 0,
  //         yard_total: 0,
  //       },
  //     ],
  //   }));
  //   setOpenStates((prev) => [...prev, false]);
  //   setGroupRollCounts((prev) => [...prev, 0]);
  // };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // LANGKAH 1: Validasi Input
    if (!form().purchase_order_id) {
      Swal.fire("Gagal", "Harap pilih Purchase Order terlebih dahulu.", "error");
      return;
    }
    if (!form().no_sj_supplier.trim()) { 
      Swal.fire("Gagal", "Harap isi No Surat Jalan Supplier.", "error");
      return;
    }
    if (form().itemGroups.length === 0) {
      Swal.fire("Gagal", "Harap tambahkan minimal satu item group.", "error");
      return;
    }
    for (const group of form().itemGroups) {
      if (!group.purchase_order_item_id) {
        Swal.fire("Gagal", "Harap pilih 'Item' untuk setiap group.", "error");
        return;
      }
    }

    try {
      if (isEdit) {
      const payload = {
        no_sj: form().jb_id,
        jb_id: form().purchase_order_id,
        no_sj_supplier: form().no_sj_supplier.trim(),
        // supplier_kirim_alamat: form().supplier_kirim_alamat,
        // supplier_kirim_id: form().supplier_kirim_id,
        tanggal_kirim: form().tanggal_kirim,
        alamat_pengiriman: form().alamat_pengiriman,
        keterangan: form().keterangan,
        items: form().itemGroups
          .filter(g => (form().unit === 'Meter' ? g.meter_total : g.yard_total) > 0)
          .map((g) => ({
            jb_item_id: Number(g.purchase_order_item_id),
            meter_total: Number(g.meter_total) || 0,
            yard_total: Number(g.yard_total) || 0,
          })),
        deleted_items: deletedItems(),
      };
        //console.log("Update JB SJ: ", JSON.stringify(payload, null, 2));  
        await updateDataJBDeliveryNote(user?.token, params.id, payload);
      } else {
        const payload = {
          sequence_number: form().sequence_number,
          jb_id: form().purchase_order_id,
          keterangan: form().keterangan,
          tanggal_kirim: form().tanggal_kirim,
          alamat_pengiriman: form().alamat_pengiriman,
          // supplier_kirim_alamat: form().supplier_kirim_alamat,
          // supplier_kirim_id: form().supplier_kirim_id,  
          no_sj_supplier: form().no_sj_supplier.trim(),
          items: form().itemGroups.filter(g => (form().unit === 'Meter' ? g.meter_total : g.yard_total) > 0) // Hanya kirim item yg diisi
            .map((g) => ({
                id: g.id,
                jb_item_id: Number(g.purchase_order_item_id),
                meter_total: Number(g.meter_total) || 0,
                yard_total: Number(g.yard_total) || 0,
          })),
        }; 
        await createJBDeliveryNote(user?.token, payload);
      }

      Swal.fire({
        icon: "success",
        title: isEdit ? "Berhasil Update" : "Berhasil Simpan",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => {
        navigate("/jualbeli-deliverynote");
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error?.message || "Terjadi kesalahan saat menyimpan.",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
    }
  };

  // function handlePrint() {
  //   if (!deliveryNoteData()) {
  //     Swal.fire("Gagal", "Data untuk mencetak tidak tersedia. Pastikan Anda dalam mode Edit/View.", "error");
  //     return;
  //   }

  //   const dataToPrint = {
  //     ...deliveryNoteData(),
  //     //...form(),
  //   };

  //   //console.log("📄 Data yang dikirim ke halaman Print:", JSON.stringify(dataToPrint, null, 2));
  //   const encodedData = encodeURIComponent(JSON.stringify(dataToPrint));
  //   window.open(`/print/jualbeli/suratjalan?data=${encodedData}`, "_blank");
  // }

  function handlePrint() {
    if (!deliveryNoteData()) {
      Swal.fire("Gagal", "Data untuk mencetak tidak tersedia. Pastikan Anda dalam mode Edit/View.", "error");
      return;
    }

    const dataToPrint = { ...deliveryNoteData() };
    // CHANGED: kirim via hash, bukan query, agar tidak kena 431
    const encodedData = encodeURIComponent(JSON.stringify(dataToPrint));
    window.open(`/print/jualbeli/suratjalan#${encodedData}`, "_blank");
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
        {isView ? "Detail" : isEdit ? "Edit" : "Tambah"} Surat Penerimaan Jual Beli
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

      <form class="space-y-4" onSubmit={handleSubmit}>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-sm mb-1">No Surat Penerimaan</label>
            <div class="flex gap-2">
              <input
                class="w-full border bg-gray-200 p-2 rounded"
                value={form().jb_id}
                readOnly
              />
            </div>
          </div>
          <div>
            <label class="block text-sm mb-1">No Surat Jalan Supplier</label>
            <input
              class="w-full border p-2 rounded"
              value={form().no_sj_supplier}
              onInput={(e) => setForm({ ...form(), no_sj_supplier: e.target.value })}
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
                value={form().alamat_pengiriman}
                readOnly
              />
            </div>
          </div>
          {/* <div>
            <label class="block text-sm mb-1">Alamat Pengiriman</label>
              <SupplierAlamatDropdownSearch
                suppliers={allSuppliers()}
                value={selectedSupplierId()}
                onChange={handleSupplierSelected}
                disabled={isView}
                showPreview={true}
              />
          </div> */}
          <div>
            <label class="block text-sm mb-1">Tanggal Pengiriman</label>
            <div class="flex gap-2">
              <input
                type="date"
                class="w-full border p-2 rounded"                
                value={form().tanggal_kirim}
                onInput={(e) => 
                  setForm({ ...form(), tanggal_kirim: e.target.value })}
                disabled={isView}
                classList={{ "bg-gray-200": isView }} 
              />
            </div>
          </div>          
          <div>
            <label class="block text-sm mb-1">Purchase Order</label>
              <PurchaseOrderSearch
                items={jualBeliList()}
                value={form().purchase_order_id} 
                form={form}
                setForm={setForm}
                onChange={handleSuratJalanChange}
                disabled={isView}
              />
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
            ></textarea>
          </div>
        </div>

        <Show when={form().purchase_order_items && form().itemGroups.length > 0}>
          <div class="border p-3 rounded my-4 bg-gray-50">
            <h3 class="text-md font-bold mb-2 text-gray-700">Quantity Kain PO:</h3>
            <ul class="space-y-1 pl-5">
              <For each={form().purchase_order_items.items}>
                {(item) => {
                  const sisa = form().unit === 'Meter'
                    ? Number(item.meter_total) - Number(item.meter_dalam_proses || 0)
                    : Number(item.yard_total) - Number(item.yard_dalam_proses || 0);

                  return (
                    <li class="text-sm list-disc">
                      <span class="font-semibold">{item.corak_kain} | {item.konstruksi_kain}</span> - 
                      Quantity: 
                      {sisa > 0 ? (
                        <span class="font-bold text-blue-600">
                          {formatNumber(sisa)} {form().unit === 'Meter' ? 'm' : 'yd'}
                        </span>
                      ) : (
                        <span class="font-bold text-red-600">
                          HABIS
                        </span>
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
              <th class="border p-2 w-48">Lebar Kain</th>
              <th class="border p-2 w-60">Warna</th>
              <th class="border p-2 w-55">{form().unit}</th>
              <th hidden class="border p-2 w-48">Harga</th>
              <th hidden class="border p-2 w-48">Subtotal</th>
              <th class="border p-2 w-48">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <Show 
                when={form().itemGroups.length > 0}
                // fallback={
                // <tr>
                //     <td colspan="6" class="p-4 text-center text-gray-500">
                //     Klik "+ Tambah Item" untuk memulai.
                //     </td>
                // </tr>
                // }
            >
              <For each={form().itemGroups}>
                {(group, i) => {
                  const quantity = form().unit === 'Meter' ? group.meter_total : group.yard_total;
                  const subtotal = (group.item_details?.harga || 0) * quantity;

                  return (
                    <tr>
                      <td class="border p-2 text-center">{i() + 1}</td>
                      <td class="border w-108 p-2">
                        <input
                          class="border p-1 rounded w-full bg-gray-200"
                          value={`${group.item_details?.corak_kain || ""} | ${group.item_details?.konstruksi_kain || ""}`}
                          disabled
                        />
                      </td>
                      <td class="border p-2">
                        <input type="number"
                            class="border p-1 rounded w-full bg-gray-200"
                            value={group.item_details?.lebar_kain}
                            disabled={true}
                        />
                      </td>
                      <td class="border p-2">
                        <input
                            class="border p-1 rounded w-full bg-gray-200"
                            value={group.item_details?.deskripsi_warna}
                            disabled={true}
                        />
                      </td>
                      <td class="border p-2">
                        <input
                          type="text"
                          class="w-full border p-2 rounded text-right"
                          value={formatNumber(quantity)}
                          onBlur={(e) => handleQuantityChange(i(), e.target.value)}
                          disabled={isView}
                          classList={{ "bg-gray-200": isView }}
                        />
                      </td>
                      <td hidden class="border p-2 text-right">
                        <input
                          class="w-full border p-2 rounded text-right"
                          value={formatHarga(group.item_details?.harga)}
                          disabled={true}
                          classList={{ "bg-gray-200": true }}
                        />
                      </td>
                      <td hidden class="border p-2 text-right font-semibold">
                        <input
                          class="w-full border p-2 rounded text-right"
                          value={formatHarga(subtotal)}
                          disabled={true}
                          classList={{ "bg-gray-200": true }}
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
            <td colSpan="4" class="text-right p-2 border-t border-gray-300">TOTAL</td>
            <td class="border p-2 text-right">
              {form().unit === 'Meter' 
                ? formatNumber(totalMeter(), 2) 
                : formatNumber(totalYard(), 2)
              }
            </td>
            {/* Kolom kosong untuk harga */}
            {/* <td></td>  */}
            <td hidden class="border p-2 text-right">{formatIDR(totalAll())}</td>
            <td hidden class="border-t border-gray-300"></td>
        </tr>
        </tfoot>
        </table>

        </div>

        <div class="mt-6">
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
