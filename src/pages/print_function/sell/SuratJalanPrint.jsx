import { createMemo, createSignal, onMount } from "solid-js";
import logoNavel from "../../../assets/img/navelLogo.png";
import {
  getFabric,
  getSatuanUnits,
  getSupplier,
  getUser,
  getCustomer,
} from "../../../utils/auth";

export default function PackingOrderPrint(props) {
  const data = props.data;
  const [currency, setCurrency] = createSignal(null);
  const [customer, setCustomer] = createSignal(null);
  const [kainList, setKainList] = createSignal({});
  const [gradeList, setGradeList] = createSignal({});
  const allItems = data.itemGroups?.flatMap(group => group.items) || [];

  const tokUser = getUser(); // kalau token dibutuhkan

  function formatAngka(value, decimals = 2) {
    if (typeof value !== "number") {
      value = parseFloat(value) || 0;
    }
    if (value === 0) {
      return "0,00";
    }
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  async function handleGetCustomer() {
    try {
      const res = await getCustomer(data.customer_id, tokUser?.token);
      if (res.status === 200) {
        setCustomer(res.customers || null);
      }
    } catch (err) {
      console.error("Error getCustomers:", err);
    }
  }

  async function handleGetKain(kainId) {
    try {
      const res = await getFabric(kainId, tokUser?.token);
      // if (res.status === 200) {
      setKainList((prev) => ({
        ...prev,
        [kainId]: res,
      }));
      // }
    } catch (err) {
      console.error("Error getFabric:", err);
    }
  }

  async function handleGetGrade(gradeId) {
    try {
      const res = await getGrades(gradeId, tokUser?.token);
      if (res.status === 200) {
        setGradeList((prev) => ({
          ...prev,
          [gradeId]: res.data,
        }));
      }
    } catch (err) {
      console.error("Error getGrade:", err);
    }
  }

  onMount(() => {
    console.log(data);
    if (tokUser?.token) {
      //handleGetCurrency();
      handleGetCustomer();
      (data.items || []).forEach((item) => {
        if (item.fabric_id) {
          handleGetKain(item.fabric_id);
        }
        if (item.grade_id) {
          handleGetGrade(item.grade_id);
        }
      });
    }
  });

  function formatTanggal(tgl) {
    if (!tgl) return "-";
    const [year, month, day] = tgl.split("-");
    return `${day}-${month}-${year}`;
  }

  const itemsPerPage = 14;
  const itemPages = paginateItems(data.items ?? [], itemsPerPage);

  function paginateItems(items, itemsPerPage) {
    const pages = [];
    for (let i = 0; i < items.length; i += itemsPerPage) {
      pages.push(items.slice(i, i + itemsPerPage));
    }
    return pages;
  }

  const totalMeter = createMemo(() => 
      parseFloat(data.summary?.total_meter || 0)
  );

  const totalYard = createMemo(() =>
      parseFloat(data.summary?.total_yard || 0)
  );

  // Misalnya kamu sudah punya:
  const isPPN = createMemo(() => parseFloat(data.ppn) > 0);

  const subTotal = createMemo(() => {
    return (data.items || []).reduce(
      (sum, item) => sum + (item.subtotal || 0),
      0
    );
  });

  // DPP = subTotal

  const dpp = createMemo(() => {
    return subTotal() / 1.11;
  });

  const nilaiLain = createMemo(() => {
    return dpp() * (11 / 12);
  });

  const ppn = createMemo(() => {
    return isPPN() ? nilaiLain() * 0.12 : 0;
  });

  const jumlahTotal = createMemo(() => dpp() + ppn());

  const dataAkhir = {
    dpp: dpp(),
    nilai_lain: nilaiLain(),
    ppn: ppn(),
    total: jumlahTotal(),
  };

  return (
    <>
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }
        html, body {
          margin: 0;
          padding: 0;
          height: 100%;
          width: 100%;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          font-family: sans-serif;
        }
        @media print {
          .page {
            page-break-after: always;
          }
        }
      `}</style>

      <div
        className="flex flex-col items-center gap-2"
        style={{
          position: "relative",
          width: "210mm",
          height: "297mm",
          overflow: "hidden",
          padding: "5mm",
        }}
      >
        <img
          className="w-24"
          hidden={!isPPN()}
          src={logoNavel}
          alt=""
        />
        <h1 className="text-xl uppercase font-bold">Surat Jalan</h1>

        <div className="w-full flex gap-2 text-sm">
          {/* LEFT TABLE */}
          <table className="w-[55%] border-2 border-black text-[13px] table-fixed">
            <tbody>
              <tr>
                <td
                  className="px-2 pt-1 max-w-[300px] break-words whitespace-pre-wrap"
                  colSpan={2}
                >
                  Kepada Yth:
                </td>
              </tr>
              <tr>
                <td
                  className="px-2 max-w-[300px] break-words whitespace-pre-wrap"
                  colSpan={2}
                >
                  {data.customer_name}
                </td>
              </tr>
            </tbody>
          </table>

          {/* RIGHT TABLE */}
          <table className="w-[55%] border-2 border-black table-fixed text-sm">
            <tbody>
              <tr>
                  <td className="font-bold px-2 w-[30%] whitespace-nowrap">No. SJ</td>
                  <td className="w-[5%] text-center">:</td>
                  <td className="px-2 break-words w-[65%]">{data.no_sj}</td>
              </tr>
              <tr>
                  <td className="font-bold px-2 w-[30%] whitespace-nowrap">Tanggal</td>
                  <td className="w-[5%] text-center">:</td>
                  <td className="px-2 break-words w-[65%]">{formatTanggal(data.tanggal_surat_jalan)}</td>
              </tr>
              <tr>
                  <td className="font-bold px-2 w-[30%] whitespace-nowrap">No. SO</td>
                  <td className="w-[5%] text-center">:</td>
                  <td className="px-2 break-words w-[65%]">{data.no_so}</td>
              </tr>
              <tr>
                  <td className="font-bold px-2 w-[30%] whitespace-nowrap">No. Mobil</td>
                  <td className="w-[5%] text-center">:</td>
                  <td className="px-2 break-words w-[65%]">{data.no_mobil}</td>
              </tr>
              <tr>
                  <td className="font-bold px-2 w-[30%] whitespace-nowrap">Sopir</td>
                  <td className="w-[5%] text-center">:</td>
                  <td className="px-2 break-words w-[65%]">{data.sopir}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ITEM TABLE */}
        <table className="w-full table-fixed border border-black text-[12px] border-collapse mt-3">
          <thead className="bg-gray-200">
            <tr>
              <th className="border border-black p-1 w-[6%]" rowSpan={2}>No</th>
              <th className="border border-black p-1 w-[8%]" rowSpan={2}>Kode</th>
              <th className="border border-black p-1 w-[18%]" rowSpan={2}>Jenis Kain</th>
              <th className="border border-black p-1 w-[15%]" rowSpan={2}>Warna</th>
              <th className="border border-black p-1 w-[6%]" rowSpan={2}>Grade</th>
              <th className="border border-black p-1 w-[15%]" rowSpan={2}>Lot</th>
              <th className="border border-black p-1 w-[20%] text-center" colSpan={2}>
                  Quantity
              </th>
            </tr>
            <tr>
              <th colspan={2} className="border border-black p-1 w-[24%]">
                {`(Roll / ${data.satuan_unit || 'Meter'})`}
              </th>
            </tr>
          </thead>
          <tbody>
            {/* The map for existing items is already correct */}
            {(data.packing_lists || []).flatMap(pl => pl.items).map((item, i) => (
              <tr key={i}>
                <td className="p-1 text-center">{i + 1}</td>
                <td className="p-1 text-center break-words">{item.corak_kain || "-"}</td>
                <td className="p-1">{item.konstruksi_kain || "-"}</td>
                <td className="p-1 text-center break-words">{item.deskripsi_warna || "-"}</td>
                <td className="p-1 text-center break-words">{item.grade_name || "-"}</td>
                <td className="p-1 text-center break-words">{item.lot || "-"}</td>

                {/* Kolom Quantity Dinamis */}
                <td colspan={2} className="p-1 text-center break-words">
                  {data.satuan_unit === 'Meter' 
                    ? `${(item.rolls || []).length} / ${formatAngka(item.meter_total)}`
                    : `${(item.rolls || []).length} / ${formatAngka(item.yard_total)}`
                  }
                </td>
              </tr>
            ))}

            {/* MODIFICATION: Safely calculate the number of empty rows */}
            {Array.from({ length: 10 - allItems.length }).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="p-1 text-center h-5"></td>
                <td className="p-1 text-center"></td>
                <td className="p-1"></td>
                <td className="p-1 text-center"></td>
                <td className="p-1 text-center"></td>
                <td className="p-1 text-right"></td>
                <td className="p-1 text-right"></td>
              </tr>
            ))}

          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6} className="border border-black text-right font-bold px-2 py-1">
                TOTAL
              </td>
              
              <td colspan={2} className="border border-black px-2 py-1 text-center font-bold">
                  {data.satuan_unit === 'Meter' 
                    ? formatAngka(totalMeter())
                    : formatAngka(totalYard())
                  }
              </td>
            </tr>
            <tr>
              <td colSpan={8} className="border border-black p-2 align-top">
                <div className="font-bold mb-1">NOTE:</div>
                <div className="whitespace-pre-wrap break-words italic">
                  {data.keterangan ?? "-"}
                </div>
              </td>
            </tr>
            <tr>
              <td colSpan={8} className="border border-black">
                <div className="w-full flex justify-between text-[12px] py-5 px-2">
                  <div className="text-center w-1/3">
                    Yang Menerima
                    <br />
                    <br />
                    <br />
                    <br />( ...................... )
                  </div>
                  <div className="text-center w-1/3">
                    Menyetujui
                    <br />
                    <br />
                    <br />
                    <br />( ...................... )
                  </div>
                  <div className="text-center w-1/3">
                    Yang Membuat
                    <br />
                    <br />
                    <br />
                    <br />( ...................... )
                  </div>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
