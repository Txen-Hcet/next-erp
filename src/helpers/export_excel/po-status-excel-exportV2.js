import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import {
  getBeliGreigeOrders,
  getOrderCelupOrders,
  getKainJadiOrders,
  getJualBelis,
  getSalesOrders
} from '../../utils/auth';

// ===== Helpers (diadaptasi dari fungsi print) =====
const isFiniteNumber = (v) => v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v));
const parseNumber = (v) => {
  if (v === undefined || v === null || v === "") return 0;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v).replace(/[^\d\.\-]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};
const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
const safe = (s) => (s == null ? "-" : String(s));
const formatNum = (n) => new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(+n || 0);
const formatDatePrint = (d) => {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "-";
  return `${String(x.getDate()).padStart(2, "0")}-${String(x.getMonth() + 1).padStart(2, "0")}-${x.getFullYear()}`;
};
const formatCurrency = (n) => {
  if (!isFiniteNumber(n)) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 2 }).format(+n);
};
async function safeDetailCall(fn, id, token) {
  try { return await fn(id, token); } catch { try { return await fn(token, id); } catch { return null; } }
}

const unitName = (po) => po?.satuan_unit_name || "Meter";
const totalsByUnit = (po) => {
  const u = unitName(po);
  const s = po?.summary || {};
  if (u === "Meter") return { unit: "Meter", total: +(+s.total_meter || 0), masuk: +(+s.total_meter_dalam_proses || 0) };
  if (u === "Yard") return { unit: "Yard", total: +(+s.total_yard || 0), masuk: +(+s.total_yard_dalam_proses || 0) };
  return { unit: "Meter", total: 0, masuk: 0 };
};

const isDone = (po, isGreige) => {
  const { total, masuk } = totalsByUnit(po);
  const sisa = total - masuk;
  if (total <= 0) return false;
  return isGreige ? (sisa <= total * 0.1 + 1e-9) : (sisa <= 1e-9);
};

export async function exportPOStatusToExcel({ block, status, filterLabel, token, poRows, isGreige, PO_DETAIL_FETCHER }) {
  const title = `Rekap ${block.label} - ${status === 'done' ? 'Selesai' : 'Belum Selesai'}`;

  if (!poRows || poRows.length === 0) {
    Swal.fire("Info", "Tidak ada data PO/SO untuk diekspor.", "info");
    return;
  }

  const filteredPOs = poRows.filter(po => (status === "done" ? isDone(po, isGreige) : !isDone(po, isGreige)));
  
  if (filteredPOs.length === 0) {
    Swal.fire("Info", `Tidak ada data PO/SO yang ${status === 'done' ? 'Selesai' : 'Belum Selesai'}.`, "info");
    return;
  }
  
  const isSales = block.mode === 'penjualan';
  const isKainJadi = block.key === 'kain_jadi';
  const relasiHeader = isSales ? "Customer" : "Supplier";
  const refHeader = isSales ? "No. SO" : "No. PO";

  Swal.fire({
    title: 'Mempersiapkan Laporan...',
    text: 'Mengambil data detail, mohon tunggu.',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  const poDetailFetcher = PO_DETAIL_FETCHER[block.key];
  const enrichedRows = await Promise.all(filteredPOs.map(async (po) => {
    let corak = "-", warna = "-", ketWarna = "";
    let hargaRow = null;

    if (poDetailFetcher) {
        try {
            const dres = await safeDetailCall(poDetailFetcher, po.id, token);
            const order = dres?.order || dres?.data || {};
            const items = order?.items || [];
            corak = uniq(items.map(it => it?.corak_kain)).join(", ") || "-";
            warna = uniq(items.map(it => it?.kode_warna ?? it?.warna_kode ?? it?.warna)).join(", ") || "-";
            ketWarna = uniq(items.map(it => it?.keterangan_warna)).join(", ");

            const subtotal = order?.summary?.subtotal ?? (items.length > 0 ? items.reduce((sum, it) => sum + (parseNumber(it.total) || 0), 0) : null);
            
            if (isFiniteNumber(subtotal)) {
                hargaRow = { subtotal };
                const { total } = totalsByUnit(po);
                if (total > 0) {
                    hargaRow.harga_satuan = subtotal / total;
                }
                if (isKainJadi && items.length > 0) {
                    hargaRow.harga_greige = parseNumber(items[0]?.harga_greige);
                    hargaRow.harga_maklun = parseNumber(items[0]?.harga_maklun);
                }
            }
        } catch {}
    }
    
    const { unit, total, masuk } = totalsByUnit(po);
    const sisa = Math.max(0, +(total - masuk).toFixed(4));
    
    return {
        po, unit, total, masuk, sisa,
        relasi: po.customer_name || po.supplier_name || '-',
        ref: po.no_so || po.no_po || '-',
        corak, warna, ketWarna,
        hargaRow
    };
  }));

  enrichedRows.sort((a,b) => (new Date(a.po.created_at)) - (new Date(b.po.created_at)));
  
  const styles = {
    title: { font: { bold: true, sz: 16 } },
    subtitle: { font: { italic: true } },
    header: { font: { bold: true }, alignment: { horizontal: 'center' }, fill: { fgColor: { rgb: "EAEAEA" } } },
    totalLabel: { font: { bold: true }, alignment: { horizontal: 'right' } },
  };

  let worksheetData = [
    [{ v: title, s: styles.title }],
    [{ v: `Periode: ${filterLabel}`, s: styles.subtitle }],
    []
  ];

  let headers = ['No', refHeader, `Nama ${relasiHeader}`, 'Tanggal', 'Corak Kain', 'Warna', 'Keterangan Warna', 'QTY PO', 'QTY Masuk', 'Sisa PO'];
  if (isKainJadi) {
    headers.push('Harga Greige', 'Harga Maklun');
  } else {
    headers.push('Harga');
  }
  headers.push('Total');

  worksheetData.push(headers.map(h => ({ v: h, s: styles.header })));

  let grandTotal = 0;
  enrichedRows.forEach((row, index) => {
    const subtotal = row.hargaRow?.subtotal ?? 0;
    grandTotal += subtotal;
    
    const dataRow = [
      index + 1,
      row.ref,
      row.relasi,
      formatDatePrint(row.po.created_at),
      row.corak,
      row.warna,
      row.ketWarna,
      `${formatNum(row.total)} ${row.unit}`,
      `${formatNum(row.masuk)} ${row.unit}`,
      `${formatNum(row.sisa)} ${row.unit}`,
    ];

    if (isKainJadi) {
        dataRow.push(row.hargaRow?.harga_greige ?? 0);
        dataRow.push(row.hargaRow?.harga_maklun ?? 0);
    } else {
        dataRow.push(row.hargaRow?.harga_satuan ?? 0);
    }
    dataRow.push(subtotal);
    
    worksheetData.push(dataRow);
  });

  const totalRow = new Array(headers.length).fill('');
  const labelIndex = headers.length - 2;
  totalRow[labelIndex] = { v: 'TOTAL AKHIR', s: styles.totalLabel };
  totalRow[labelIndex + 1] = { v: grandTotal, s: { font: { bold: true } } };
  worksheetData.push(totalRow);

  const ws = XLSX.utils.aoa_to_sheet(worksheetData, { cellStyles: true });
  ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
      { s: { r: worksheetData.length - 1, c: 0 }, e: { r: worksheetData.length - 1, c: labelIndex - 1 } },
  ];
  ws['!cols'] = headers.map(() => ({ wch: 18 }));
  
  Object.keys(ws).forEach(cellAddress => {
    const cell = ws[cellAddress];
    if (cell && typeof cell.v === 'number' && cellAddress[0] !== 'A' && !/^[A-Z]+\d+$/.test(cellAddress.match(/[A-Z]+/)[0])) {
        const col = cellAddress.replace(/\d+/g, '');
        // Periksa apakah sel berada di kolom harga atau total
        if (headers.slice(10).some((h, i) => String.fromCharCode(65 + 10 + i) === col)) {
            cell.t = 'n';
            cell.z = '"Rp"#,##0.00';
        }
    }
  });
  
  Swal.close();
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
  const fileName = `${title} - ${filterLabel}.xlsx`;
  XLSX.writeFile(wb, fileName);
}