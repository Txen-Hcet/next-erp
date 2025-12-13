import { createMemo, For, onMount } from "solid-js";
import logoNavel from "../../../assets/img/navelLogo.png";
import { splitIntoPagesWithOffsets } from "../../../components/PrintUtils";

export default function MemoOrderMatchingPrint(props) {
  const items = createMemo(() => {
    if (Array.isArray(props.data)) return props.data;
    if (Array.isArray(props.data?.data)) return props.data.data;
    return [];
  });

  const ROWS_FIRST_PAGE = 18;
  const ROWS_OTHER_PAGES = 18;

  const pagesWithOffsets = createMemo(() =>
    splitIntoPagesWithOffsets(items(), ROWS_FIRST_PAGE, ROWS_OTHER_PAGES)
  );

  function formatTanggal(s) {
    if (!s) return "-";
    const d = new Date(s);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}-${mm}-${yy}`;
  }

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
          display: flex;
          justify-content: center;
          background: white; /* FIX: putih total */
          font-family: sans-serif;
        }

        .page {
          width: 210mm;
          height: 285mm;
          background: white;
          page-break-after: always;
        }

        .safe {
          padding: 12mm;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        th, td {
          border: 1px solid black;
          padding: 4px;
        }

        th {
          background: #e5e5e5;
        }

        .header {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 12px;
        }

        .header img {
          width: 90px;
        }

        .header h1 {
          font-size: 18px;
          margin-top: 6px;
          font-weight: bold;
        }

        .status-active {
          font-weight: bold;
        }

        .status-deleted {
          color: red;
          font-weight: bold;
        }

        /* Optional: biar pas print benar-benar clean */
        @media print {
          html, body {
            background: white;
          }
        }

        .keterangan-cell {
          vertical-align: top;
          white-space: pre-wrap;
          word-break: break-word;
          line-height: 1.4;
        }
      `}</style>

      <For each={pagesWithOffsets()}>
        {(p, idx) => (
          <PrintPage
            items={p.items}
            startIndex={p.offset}
            pageNo={idx() + 1}
            pageCount={pagesWithOffsets().length}
            logoNavel={logoNavel}
            formatTanggal={formatTanggal}
          />
        )}
      </For>
    </>
  );
}

function PrintPage(props) {
  const { items, startIndex, pageNo, pageCount, logoNavel, formatTanggal } =
    props;

  return (
    <div className="page">
      <div className="safe">
        {/* HEADER */}
        <div className="header">
          <img src={logoNavel} alt="logo" />
          <h1>ORDER MATCHING</h1>
        </div>

        {/* TABLE */}
        <table>
          <thead>
            <tr>
              <th style={{ width: "4%" }}>No</th>
              <th style={{ width: "11%" }}>No MOM</th>
              <th style={{ width: "9%" }}>Tgl</th>
              <th style={{ width: "18%" }}>Supplier</th>
              <th style={{ width: "13%" }}>Kain</th>
              <th style={{ width: "10%" }}>Warna</th>
              <th style={{ width: "12%" }}>Marketing</th>
              <th style={{ width: "17%" }}>Keterangan</th>
              <th style={{ width: "6%" }}>Status</th>
            </tr>
          </thead>

          <tbody>
            <For each={items}>
              {(item, i) => (
                <tr>
                  <td className="text-center">{startIndex + i() + 1}</td>
                  <td className="text-center">{item.no_om}</td>
                  <td className="text-center">
                    {formatTanggal(item.created_at)}
                  </td>
                  <td>{item.nama_supplier}</td>
                  <td className="text-center">{item.corak_kain}</td>
                  <td className="text-center">{item.kode_warna_ex}</td>
                  <td className="text-center">{item.name}</td>

                  {/* KETERANGAN */}
                  <td className="keterangan-cell">{item.keterangan_order_matching || "-"}</td>

                  {/* STATUS */}
                  <td className="text-center">
                    <span
                      className={
                        item.deleted_at ? "status-deleted" : "status-active"
                      }
                    >
                      {item.deleted_at ? "DELETED" : "ACTIVE"}
                    </span>
                  </td>
                </tr>
              )}
            </For>
          </tbody>

          <tfoot>
            <tr>
              <td colSpan={9} className="text-right italic">
                Halaman {pageNo} dari {pageCount}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
