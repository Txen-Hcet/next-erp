import { createMemo, createEffect, For, Show } from "solid-js";
import logoNavel from "../../../assets/img/navelLogo.png";
import {
  splitIntoPagesWithOffsets,
  createStretch,
} from "../../../components/PrintUtils";

export default function ExporSalesContractPrint(props) {
  const data = createMemo(() => props.data ?? { items: [], summary: {} });

  // ===== Formatter =====
  function formatTanggal(s) {
    if (!s) return "-";
    const d = new Date(s);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}-${mm}-${yy}`;
  }

  function formatAngka(v, decimals = 2) {
    const n = typeof v === "number" ? v : parseFloat(v) || 0;
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n);
  }

  function formatAngkaNonDecimal(v) {
    const n = typeof v === "number" ? v : parseFloat(v) || 0;
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  }

  // ===== Currency helpers =====
  const currencyName = createMemo(() => (data().currency_name || "IDR").toUpperCase());

  const formatUSD = (v, decimals = 2) => {
    const n = typeof v === "number" ? v : parseFloat(v) || 0;
    return `USD ${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n)}`;
  };

  const formatIDR = (v, decimals = 2) => {
    const n = typeof v === "number" ? v : parseFloat(v) || 0;
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n);
  };

  const money = (v, decimals = 2) =>
    currencyName() === "USD" ? formatUSD(v, decimals) : formatIDR(v, decimals);

  // ===== Totals =====
  const isPPN = createMemo(() => parseFloat(data().ppn_percent) > 0);
  const totalMeter = createMemo(() =>
    parseFloat(data().summary?.total_meter || 0)
  );
  const totalYard = createMemo(() =>
    parseFloat(data().summary?.total_yard || 0)
  );

  const subTotal = createMemo(() => {
    if (!data().items || data().items.length === 0) {
      return 0;
    }
    
    // Gunakan .reduce() untuk menjumlahkan total dari setiap item
    return data().items.reduce((accumulator, currentItem) => {
      const qty =
        data().satuan_unit_name === "Meter"
          ? parseFloat(currentItem.meter_total || 0)
          : parseFloat(currentItem.yard_total || 0);
      
      const harga = parseFloat(currentItem.harga || 0);
      const itemTotal = qty * harga;
      
      return accumulator + itemTotal;
    }, 0); // Nilai awal accumulator adalah 0
  });

  //const subTotal = createMemo(() => Number(data().summary?.subtotal) || 0);
  const dpp = createMemo(() => subTotal() / 1.11);
  const nilaiLain = createMemo(() => dpp() * (11 / 12));
  const ppn = createMemo(() => (isPPN() ? nilaiLain() * 0.12 : 0));
  const jumlahTotal = createMemo(() => dpp() + ppn());

  const totals = createMemo(() => ({
    subTotal: subTotal(),
    dpp: dpp(),
    nilaiLain: nilaiLain(),
    ppn: ppn(),
    grand: jumlahTotal(),
    totalMeter: totalMeter(),
    totalYard: totalYard(),
  }));

  // ===== Pagination =====
  const ROWS_FIRST_PAGE = 18; // kapasitas item halaman 1
  const ROWS_OTHER_PAGES = 18; // kapasitas item halaman 2+

  const pagesWithOffsets = createMemo(() =>
    splitIntoPagesWithOffsets(
      data().items || [],
      ROWS_FIRST_PAGE,
      ROWS_OTHER_PAGES
    )
  );

  return (
    <>
      <style>{`
        :root { --safe: 10mm; }                    /* zona aman dari tepi printer */

        @page { size: A4 portrait; margin: 0; }
        html, body {
          margin: 0; /* <-- Ubah ke 0 */
          padding: 0;
          height: 100%;
          width: 100%;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          font-family: sans-serif;
          display: flex;
          justify-content: center;
        }
        .page {
          width: 210mm;
          height: 285mm;                           /* sedikit < 297mm agar tidak mepet */
          padding: 0;
          box-sizing: border-box;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .safe {
          width: 100%;
          height: 100%;
          padding: var(--safe);                    /* semua konten di dalam zona aman */
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: center;
        }

        table { page-break-inside: auto; border-collapse: collapse; }
        tr     { page-break-inside: avoid; }
        @media print {
          .page { page-break-after: always; }
          .page:last-child { page-break-after: auto; }
        }
      `}</style>

      <For each={pagesWithOffsets()}>
        {(p, idx) => {
          const pageIndex = idx();
          const count = pagesWithOffsets().length;
          const isLast = pageIndex === count - 1;
          return (
            <PrintPage
              data={data()}
              items={p.items}
              startIndex={p.offset} // Penomoran lanjut saat new page
              pageNo={pageIndex + 1}
              pageCount={count}
              isPPN={isPPN()}
              isLast={isLast}
              totals={totals()}
              formatters={{
                formatTanggal,
                money,
                formatAngka,
                formatAngkaNonDecimal,
              }}
              logoNavel={logoNavel}
            />
          );
        }}
      </For>
    </>
  );
}

/* ==== Komponen Halaman 1 ====== */
function PrintPage(props) {
  const {
    data,
    items,
    startIndex,
    pageNo,
    pageCount,
    isPPN,
    isLast,
    totals,
    formatters,
    logoNavel,
  } = props;
  const { formatTanggal, money, formatAngka, formatAngkaNonDecimal } =
    formatters;

  // Inisialisasi stretch lebih dulu, baru effect-nya
  const { extraRows, bind, recalc } = createStretch({ fudge: 40 }); // fudge diperbesar

  createEffect(() => {
    // trigger ulang kalkulasi saat items/isLast berubah
    items?.length ?? 0;
    isLast;
    requestAnimationFrame(recalc);
  });

  return (
    <div ref={bind("pageRef")} className="page">
      <div className="safe">
        {/* row measurer khusus halaman ini */}
        <table style="position:absolute; top:-10000px; left:-10000px; visibility:hidden;">
          <tbody>
            <tr ref={bind("measureRowRef")}>
              <td class="p-1 text-center h-5"></td>
              <td class="p-1 text-center"></td>
              <td class="p-1"></td>
              <td class="p-1 text-center"></td>
              <td class="p-1 text-center"></td>
              <td class="p-1 text-right" colSpan={2}></td>
            </tr>
          </tbody>
        </table>

        <div className="flex items-center justify-between w-full mb-7">
          <img className="w-32" src={logoNavel} alt="Logo" onLoad={recalc} />

          <div className="text-right">
            <h1 className="text-lg font-bold">PT. NAVEL BERJAYA SEJAHTERA</h1>
            <p className="text-sm">Jl. Laswi No. 127 Manggahang, Baleendah</p>
            <p className="text-sm">Kab. Bandung 40375, Indonesia</p>
            <p className="text-sm">Ph. / Fax. 022 85939779</p>
          </div>
        </div>

        <h1 className="text-xl uppercase font-bold">Sales Contract</h1>

        <div className="w-full flex gap-2 text-sm">
          {/* LEFT */}
          <table className="w-[65%] border-2 border-black text-[13px] table-fixed">
            <tbody>
              <tr>
                <td
                  className="px-2 py-1 max-w-[300px] break-words whitespace-pre-wrap font-bold"
                  colSpan={2}
                >
                  ALI AL SALMAN TEXTILE EST{data.customer_name}
                </td>
              </tr>
              <tr>
                <td
                  className="px-2 max-w-[300px] leading-relaxed break-words whitespace-pre-wrap font-bold"
                  colSpan={2}
                >
                  DAMMAM - SAUDI ARABIA{data.customer_alamat}
                </td>
              </tr>
              <tr class="flex flex-col text-xs mt-5">
                <td className="px-2 py-1 whitespace-nowrap">
                  We confirm having sold to you the following merchandise,
                  subject to the
                </td>
                <td className="px-2 py-1 whitespace-nowrap">
                  following terms and conditions.
                </td>
                <td className="px-2 py-1 whitespace-nowrap">
                  Kindly sign this as a token of your acceptance and fax back to
                  us.
                </td>
              </tr>
            </tbody>
          </table>

          {/* RIGHT */}
          <table className="w-[35%] border-2 border-black table-fixed text-sm">
            <tbody>
              {[
                { label: "Contract No", value: data.no_sc },
                { label: "Date", value: formatTanggal(data.created_at) },
                {
                  label: "Agent",
                  value: data.agent_name || "-",
                },
                {
                  label: "Validity",
                  value: formatTanggal(data.validity_contract) || "-",
                },
              ].map((row) => (
                <tr className="border-b border-black">
                  <td className="font-bold px-2 w-[42%] whitespace-nowrap">
                    {row.label}
                  </td>
                  <td className="w-[5%] text-center">:</td>
                  <td className="px-2 break-words w-[65%]">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div id="table-wrapper">
          {/* ITEM TABLE */}
          <table
            ref={bind("tableRef")}
            className="w-full table-fixed border border-black text-[12px] border-collapse mt-3"
          >
            <thead ref={bind("theadRef")} className="bg-gray-200">
              <tr>
                <th className="border border-black p-1 w-[6%]" rowSpan={2}>No</th>
                <th className="border border-black p-1 w-[13%]" rowSpan={2}>Art No.</th>
                <th className="border border-black p-1 w-[13%]" rowSpan={2}>Design</th>
                <th className="border border-black p-1 w-[30%]" rowSpan={2}>Description of Goods</th>
                <th className="border border-black p-1 w-[16%]" colSpan={1}>Quantity</th>
                <th className="border border-black p-1 w-[20%]" rowSpan={2}>Price</th>
                <th className="border border-black p-1 w-[20%] text-center" rowSpan={2}>Amount</th>
              </tr>
              <tr>
              <th className="border border-black p-1 w-[24%]">
                Yard
              </th>
            </tr>
            </thead>

            <tbody ref={bind("tbodyRef")}>
              <For each={items}>
                {(item, i) => {
                  const qty = (data.satuan_unit_name || "").toLowerCase() === "meter"
                    ? parseFloat(item.meter_total || 0)
                    : parseFloat(item.yard_total || 0);
                  const price = parseFloat(item.harga || 0);
                  const amount = qty * price;

                  return (
                  <tr>
                    {/* nomor lanjut: startIndex + nomor di halaman + 1 */}
                    <td className="p-1 text-center break-words">
                      {startIndex + i() + 1}
                    </td>
                    <td className="p-1 text-center break-words">
                      {item.corak_kain || "-"}
                    </td>
                    <td className="p-1 break-words text-center">
                      {item.design_kode}
                    </td>
                    <td className="p-1 break-words text-center">
                      {item.description_of_goods}
                    </td>
                    <td className="p-1 text-center break-words">
                      {data.satuan_unit_name === "Meter"
                        ? formatAngka(item.meter_total)
                        : formatAngka(item.yard_total)}
                    </td>
                    <td className="p-1 text-center break-words">
                      {money(item.harga)}
                    </td>
                    <td className="p-1 text-right break-words">{amount ? money(amount) : "-"}</td>
                  </tr>
                  );
                }}
              </For>

              {/* ROW KOSONG DINAMIS */}
              <For each={Array.from({ length: extraRows() })}>
                {() => (
                  <tr>
                    <td className="p-1 text-center h-5"></td>
                    <td className="p-1 text-center"></td>
                    <td className="p-1"></td>
                    <td className="p-1 text-center"></td>
                    <td className="p-1 text-center"></td>
                    <td className="p-1 text-right"></td>
                    <td className="p-1 text-right"></td>
                    <td className="p-1 text-right"></td>
                    {/* <td className="p-1 text-right"></td> */}
                  </tr>
                )}
              </For>
            </tbody>

            <tfoot ref={bind("tfootRef")}>
              {/* Total lengkap hanya di halaman terakhir */}
              <Show when={isLast}>
                <tr>
                  <td
                    colSpan={3}
                    className="border border-black font-bold px-2 py-1 text-center"
                  >
                    TOTAL
                  </td>
                  <td
                    colSpan={1}
                    className="border border-black font-bold px-2 py-1 text-center"
                  >
                    About
                  </td>
                  <td className="border border-black px-2 py-1 text-center font-bold">
                    {data.satuan_unit_name === "Meter"
                      ? formatAngka(totals.totalMeter)
                      : formatAngka(totals.totalYard)}
                  </td>
                  <td className="border border-black px-2 py-1 text-right font-bold"></td>
                  <td className="border border-black px-2 py-1 text-right">
                    {money(totals.subTotal)}
                  </td>
                </tr>
                <tr>
                  <td
                    colSpan={8}
                    className="border border-black px-2 py-1 align-top"
                  >
                    <div className="flex items-start gap-2">
                      <div className="font-bold">Percentage Tolerance:</div>
                      <div className="whitespace-pre-wrap break-words italic flex-1">
                        {data.percentage_tolerance ?? "-"}
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td
                    colSpan={8}
                    className="border border-black px-2 py-1 align-top"
                  >
                    <div className="flex items-start gap-2">
                      <div className="font-bold">Piece Length:</div>
                      <div className="whitespace-pre-wrap break-words italic flex-1">
                        {data.piece_length ?? "-"}
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td
                    colSpan={8}
                    className="border border-black px-2 py-1 align-top"
                  >
                    <div className="flex">
                      <div className="flex items-start gap-2 w-1/2 pr-4 border-r border-black">
                        <div className="font-bold">Shipment:</div>
                        <div className="whitespace-pre-wrap break-words italic flex-1">
                          {data.shipment ?? "-"}
                        </div>
                      </div>

                      <div className="flex items-start gap-2 w-1/2 pl-4">
                        <div className="font-bold">Terms of Delivery:</div>
                        <div className="whitespace-pre-wrap break-words italic flex-1">
                          {data.terms_of_delivery ?? "-"}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td
                    colSpan={8}
                    className="border border-black px-2 py-1 align-top"
                  >
                    <div className="flex items-start gap-2">
                      <div className="font-bold">Total Amount:</div>
                      <div className="whitespace-pre-wrap break-words italic flex-1 font-bold">
                        {money(totals.subTotal) ?? "-"}
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td
                    colSpan={8}
                    className="border border-black px-2 py-1 align-top"
                  >
                    <div className="flex items-start gap-2">
                      <div className="font-bold">Payment Terms:</div>
                      <div className="whitespace-pre-wrap break-words italic flex-1">
                        {data.payment_terms ?? "-"}
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td
                    colSpan={8}
                    className="border border-black px-2 py-1 align-top"
                  >
                    <div className="flex items-start gap-2">
                      <div className="font-bold">Negotiation:</div>
                      <div className="whitespace-pre-wrap break-words italic flex-1">
                        {data.negotiation ?? "-"}
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td
                    colSpan={8}
                    className="border border-black px-2 py-1 align-top"
                  >
                    <div className="flex items-start gap-2">
                      <div className="font-bold">Account:</div>
                      <div className="whitespace-pre-wrap break-words italic flex-1">
                        {/* Hapus enter dan gabungkan dalam satu baris, tambahkan koma sebagai pemisah */}
                        {`${data.bank_account_name ?? "-"}, A/C No: ${data.bank_account_number ?? "-"}`}
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td
                    colSpan={8}
                    className="border border-black px-2 py-1 align-top"
                  >
                    <div className="flex items-start gap-2">
                      <div className="font-bold">Remarks:</div>
                      <div className="whitespace-pre-wrap break-words italic flex-1">
                        {data.keterangan ?? "-"}
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td colSpan={8} className="border border-black">
                    <p class="px-2 py-1">
                      Kindly return fax the copy of this sales confirmation
                      signed and accepted
                    </p>
                    <div className="w-full flex justify-between text-[12px] py-5 px-2">
                      <div className="text-center w-1/3 pb-3 font-bold">
                        Accepted By
                        <br />
                        <br />
                        <br />
                        <br />( ...................... )
                      </div>
                      <div className="text-center w-1/3 hidden">
                        Mengetahui
                        <br />
                        <br />
                        <br />
                        <br />( ...................... )
                      </div>
                      <div className="text-center w-1/3 font-bold">
                        Seller
                        <br />
                        <br />
                        <br />
                        <br />( ...................... )
                      </div>
                    </div>
                  </td>
                </tr>
              </Show>
              <tr>
                <td
                  colSpan={8}
                  className="border border-black px-2 py-1 text-right italic"
                >
                  Page {pageNo} from {pageCount}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
