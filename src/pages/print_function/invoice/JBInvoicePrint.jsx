import { createMemo, createEffect, For, Show } from "solid-js";
import logoNavel from "../../../assets/img/navelLogo.png";
import { splitIntoPagesWithOffsets, createStretch } from "../../../components/PrintUtils";

export default function JBInvoicePrint(props) {
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

  function formatRupiah(v, decimals = 2) {
    if (typeof v !== "number") v = parseFloat(v) || 0;
    if (v === 0) return "Rp 0,00";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(v);
  }

  function formatAngka(v, decimals = 2) {
    if (typeof v !== "number") v = parseFloat(v) || 0;
    if (v === 0) return "0,00";
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(v);
  }

  function formatAngkaNonDecimal(v) {
    if (typeof v !== "number") v = parseFloat(v) || 0;
    return new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v);
  }

  // ===== Totals =====
  const isPPN       = createMemo(() => parseFloat(data().ppn_percent) > 0);
  const totalMeter  = createMemo(() => parseFloat(data().summary?.total_meter || 0));
  const totalYard   = createMemo(() => parseFloat(data().summary?.total_yard  || 0));
  const subTotal    = createMemo(() => Number(data().summary?.subtotal) || 0);
  const dpp         = createMemo(() => subTotal() / 1.11);
  const nilaiLain   = createMemo(() => dpp() * (11 / 12));
  const ppn         = createMemo(() => (isPPN() ? nilaiLain() * 0.12 : 0));
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
  const ROWS_FIRST_PAGE  = 18; // kapasitas item halaman 1
  const ROWS_OTHER_PAGES = 18; // kapasitas item halaman 2+

  const pagesWithOffsets = createMemo(() =>
    splitIntoPagesWithOffsets(data().items || [], ROWS_FIRST_PAGE, ROWS_OTHER_PAGES)
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
          font-family: "Calibri"; monospace !important;
          font-weight: 700;
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
          html, body {
            font-family: "Calibri"; monospace !important;
            font-weight: 500 !important;
            font-size: 11pt !important;
          }
          .page { page-break-after: always; }
          .page:last-child { page-break-after: auto; }
        }
      `}</style>

      <For each={pagesWithOffsets()}>
        {(p, idx) => {
          const pageIndex = idx();
          const count     = pagesWithOffsets().length;
          const isLast    = pageIndex === count - 1;
          return (
            <PrintPage
              data={data()}
              items={p.items}
              startIndex={p.offset}  // Penomoran lanjut saat new page
              pageNo={pageIndex + 1}
              pageCount={count}
              isPPN={isPPN()}
              isLast={isLast}
              totals={totals()}
              formatters={{ formatTanggal, formatRupiah, formatAngka, formatAngkaNonDecimal }}
              logoNavel={logoNavel}
            />
          );
        }}
      </For>
    </>
  );
}

function PrintPage(props) {
  const { data, items, startIndex, pageNo, pageCount, isPPN, isLast, totals, formatters, logoNavel } = props;
  const { formatTanggal, formatRupiah, formatAngka, formatAngkaNonDecimal } = formatters;

  // Inisialisasi stretch lebih dulu, baru effect-nya
  const { extraRows, bind, recalc } = createStretch({ fudge: 40 }); // fudge diperbesar

  createEffect(() => {
    // trigger ulang kalkulasi saat items/isLast berubah
    (items?.length ?? 0);
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
              <td class="p-1 text-right"></td>
              <td class="p-1 text-right"></td>
              <td class="p-1 text-right"></td>
              <td class="p-1 text-right"></td>
            </tr>
          </tbody>
        </table>

        {/* HEADER (ditampilkan di semua halaman) */}
        <img
          className="w-24"
          src={logoNavel}
          alt=""
          onLoad={recalc}
          hidden={!isPPN}
        />

        <h1 className="text-xl uppercase font-bold">
          Invoice Penjualan
        </h1>

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
              <tr>
                <td
                  className="px-2 max-w-[300px] leading-relaxed break-words whitespace-pre-wrap"
                  colSpan={2}
                >
                  {data.alamat}
                </td>
              </tr>
              <tr>
                <td className="px-2 py-1 whitespace-nowrap">Telp: {data.telepon || "-"}</td>
                {/* <td className="px-2 py-1 whitespace-nowrap">Fax:</td> */}
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
                  <td className="px-2 break-words w-[65%]">{formatTanggal(data.created_at )}</td>
              </tr>
              <tr>
                  <td className="font-bold px-2 w-[30%] whitespace-nowrap">No. JB</td>
                  <td className="w-[5%] text-center">:</td>
                  <td className="px-2 break-words w-[65%]">{data.no_jb}</td>
              </tr>
              <tr>
                  <td className="font-bold px-2 w-[30%] whitespace-nowrap">Jenis JB</td>
                  <td className="w-[5%] text-center">:</td>
                  <td className="px-2 break-words w-[65%] capitalize">{data.jenis_jb}</td>
              </tr>
              <tr>
                  <td className="font-bold px-2 w-[30%] whitespace-nowrap">Payment</td>
                  <td className="w-[5%] text-center">:</td>
                  <td className="px-2 break-words w-[65%]">{data.termin == 0 ? "Cash" : data.termin + " Hari"}</td>
              </tr>
              <tr>
                  <td className="font-bold px-2 w-[30%] whitespace-nowrap">Jatuh Tempo</td>
                  <td className="w-[5%] text-center">:</td>
                  <td className="px-2 break-words w-[65%]">{formatTanggal(data.validity_contract)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ITEM TABLE */}
        <table ref={bind("tableRef")} className="w-full table-fixed border border-black text-[12px] border-collapse mt-3">
          <thead ref={bind("theadRef")}>
            {/* thead pakai className="bg-gray-200" kalau mau berwarna */}
            <tr>
                <th className="border border-black p-1 w-[4%]" rowSpan={2}>No</th>
                <th className="border border-black p-1 w-[10%]" rowSpan={2}>Jenis Kain</th>
                <th hidden className="border border-black p-1 w-[15%]" rowSpan={2}>Jenis Kain</th>
                <th className="border border-black p-1 w-[10%]" rowSpan={2}>Warna</th>
                <th className="border border-black p-1 w-[10%]" rowSpan={2}>Lebar Finish</th>
                <th className="border border-black p-1 w-[16%] text-center" colSpan={2}>
                Quantity
                </th>
                <th className="border border-black p-1 w-[18%]" rowSpan={2}>Harga</th>
                <th className="border border-black p-1 w-[18%]" rowSpan={2}>Jumlah</th>
            </tr>
            <tr>
              <th colspan={2} className="border border-black p-1 w-[24%]">
                {/* {`(Roll / ${data.satuan_unit_name || 'Meter'})`} */}
                {data.satuan_unit_name || 'Meter'}
              </th>
            </tr>
          </thead>

          <tbody ref={bind("tbodyRef")}>
            <For each={items}>
              {(item, i) => (
                <tr>
                  {/* nomor lanjut: startIndex + nomor di halaman + 1 */}
                  <td className="p-1 text-center break-words">{startIndex + i() + 1}</td>
                  <td className="p-1 text-center break-words">{item.corak_kain || "-"}</td>
                  <td hidden className="p-1 break-words">{item.konstruksi_kain}</td>
                  <td className="p-1 text-center break-words">{item.deskripsi_warna || "-"}</td>
                  <td className="p-1 text-center break-words">
                  {formatAngkaNonDecimal(item.lebar_kain)}"
                  </td>
                  <td colSpan={2} className="p-1 text-center break-words">
                    {data.satuan_unit_name === "Meter"
                      // ? `${(item.rolls || []).length} / ${formatAngka(item.meter_total)}`
                        // : `${(item.rolls || []).length} / ${formatAngka(item.yard_total)}`
                        ? formatAngka(item.meter_total)
                        : formatAngka(item.yard_total)
                    }
                  </td>
                  <td className="p-1 text-right break-words">{formatRupiah(item.harga)}</td>
                  <td className="p-1 text-right break-words">
                      {(() => {
                          const qty =
                          data.satuan_unit_name === "Meter"
                              ? parseFloat(item.meter_total || 0)
                              : parseFloat(item.yard_total || 0);
                          const harga = parseFloat(item.harga || 0);
                          return harga && qty ? formatRupiah(harga * qty) : "-";
                      })()}
                  </td>
                </tr>
              )}
            </For>

            {/* Tambahin row kosong */}
            {/* <For each={Array.from({ length: extraRows() })}>
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
                </tr>
              )}
            </For> */}
          </tbody>

          <tfoot ref={bind("tfootRef")}>
            {/* Total lengkap hanya di halaman terakhir */}
            <Show when={isLast}>
              <tr>
                <td colSpan={4} className="border border-black font-bold px-2 py-1">Total:</td>
                <td colSpan={2} className="border border-black px-2 py-1 text-center font-bold">
                    {data.satuan_unit_name === 'Meter' 
                      ? formatAngka(totals.totalMeter)
                      : formatAngka(totals.totalYard)
                    }
                </td>
                <td className="border border-black px-2 py-1 text-right font-bold">
                  {isPPN ? 'Sub Total' : 'Grand Total'}
                </td>
                <td className="border border-black px-2 py-1 text-right">
                  {formatRupiah(totals.subTotal)}
                </td>
              </tr>
            <Show when={isPPN}>
              <tr>
                <td colSpan={6} className="px-2 py-1"/>
                <td className="px-2 py-1 text-right font-bold">DPP</td>
                <td className="px-2 py-1 text-right">
                  {formatRupiah(totals.dpp)}
                </td>
              </tr>
              <tr>
                <td colSpan={6} className="px-2 py-1"/>
                <td className="px-2 py-1 text-right font-bold">Nilai Lain</td>
                <td className="px-2 py-1 text-right">
                  {formatRupiah(totals.nilaiLain)}
                </td>
              </tr>
              <tr>
                <td colSpan={6} className="px-2 py-1"/>
                <td className="px-2 py-1 text-right font-bold">PPN</td>
                <td className="px-2 py-1 text-right">
                  {formatRupiah(totals.ppn)}
                </td>
              </tr>
              <tr>
                <td colSpan={6} className="px-2 py-1"/>
                <td className="px-2 py-1 text-right font-bold">Jumlah Total</td>
                <td className="px-2 py-1 text-right">
                  {formatRupiah(totals.grand)}
                </td>
              </tr>
            </Show>
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
                    <div className="text-center w-1/3 pb-3">
                      Yang Menerima
                      <br />
                      <br />
                      <br />
                      <br />( ...................... )
                    </div>
                    <div className="text-center w-1/3">
                      Mengetahui
                      <br />
                      <br />
                      <br />
                      <br />( ...................... )
                    </div>
                    <div className="text-center w-1/3">
                      Dibuat Oleh
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
              <td colSpan={8} className="border border-black px-2 py-1 text-right italic">
                Halaman {pageNo} dari {pageCount}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
