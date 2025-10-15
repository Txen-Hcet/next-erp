import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import {
  getBGDeliveryNotes,
  getOCDeliveryNotes,
  getKJDeliveryNotes,
  getJBDeliveryNotes,
  getSalesOrders,
} from '../../utils/auth';

const normalizeDate = (d) => {
  if (!d) return null;
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return null;
  return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
};

const formatTanggalIndo = (s) => {
  if (!s) return "-";
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

const parseNumber = (v) => {
  if (v === undefined || v === null || v === "") return 0;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v).replace(/[^\d\.\-]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

const pick = (...vals) => vals.find(v => v !== undefined && v !== null && v !== "");
const uniqJoin = (arr, sep = ", ") => Array.from(new Set(arr.filter(Boolean))).join(sep);

const refValueFor = (row, mode, blockKey) => {
  if (mode === "penjualan") return row.no_so ?? "-";
  if (blockKey === "jual_beli") return row.no_jb ?? row.no_pc ?? "-";
  return row.no_po ?? row.no_pc ?? "-";
};

const getDetailFetcher = (blockKey) => {
  switch (blockKey) {
    case "greige": return getBGDeliveryNotes;
    case "oc": return getOCDeliveryNotes;
    case "kain_jadi": return getKJDeliveryNotes;
    case "jual_beli": return getJBDeliveryNotes;
    default: return null;
  }
};

export async function exportDeliveryNotesToExcel({ block, token, startDate, endDate, filterLabel }) {
  const title = `Laporan - ${block.label}`;
  const isSales = block.mode === "penjualan";
  const isGreige = block.key === "greige";
  const isKainJadi = block.key === "kain_jadi";

  Swal.fire({
    title: 'Mempersiapkan Laporan...',
    text: 'Mengambil dan memproses data, mohon tunggu.',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    const res = await block.rawFetcher(token);
    let baseRows = res?.suratJalans ?? res?.surat_jalan_list ?? res?.data ?? [];

    const s = normalizeDate(startDate);
    const e = normalizeDate(endDate);
    if (s || e) {
      baseRows = baseRows.filter((r) => {
        const d = normalizeDate(r.created_at);
        if (d === null) return false;
        if (s && d < s) return false;
        if (e && d > e) return false;
        return true;
      });
    }

    if (baseRows.length === 0) {
      Swal.fire("Info", "Tidak ada data untuk diekspor pada rentang tanggal ini.", "info");
      return;
    }

    let enrichedRows;

    if (isSales) {
        enrichedRows = await Promise.all(baseRows.map(async (row) => {
            const soId = row.so_id ?? row.soId ?? null;
            if (!soId) return row;
            try {
                const soRes = await getSalesOrders(soId, token);
                const so = soRes?.order ?? {};
                const items = so.items ?? [];
                
                return {
                    ...row,
                    summary: so.summary ?? row.summary,
                    no_so: so.no_so ?? row.no_so,
                    customer_name: so.customer_name ?? row.customer_name,
                    kode_warna: uniqJoin(items.map(it => it.kode_warna)),
                    grade_name: uniqJoin(items.map(it => it.grade_name)),
                    corak_kain: uniqJoin(items.map(it => it.corak_kain)),
                    harga: items.length > 0 ? items[0].harga : undefined,
                    total: so.summary?.total_akhir ?? so.summary?.subtotal,
                };
            } catch {
                return row;
            }
        }));
    } else {
        const detailFetcher = getDetailFetcher(block.key);
        if (detailFetcher) {
            enrichedRows = await Promise.all(baseRows.map(async (row) => {
              try {
                const det = await detailFetcher(row.id, token);
                const sj = det?.suratJalan ?? det?.order ?? det?.data ?? {};
                const items = sj?.items ?? [];
                
                const harga = items.length > 0 ? items[0].harga : undefined;
                const harga_greige = items.length > 0 ? items[0].harga_greige : undefined;
                const harga_maklun = items.length > 0 ? items[0].harga_maklun : undefined;
                const total = sj?.summary?.total_akhir ?? sj?.summary?.subtotal;

                return {
                    ...row,
                    summary: sj?.summary ?? row.summary,
                    corak_kain: uniqJoin(items.map(it => it.corak_kain)),
                    kode_warna: uniqJoin(items.map(it => it.kode_warna)),
                    grade_name: uniqJoin(items.map(it => it.grade_name)),
                    harga: harga,
                    harga_greige: harga_greige ?? row.harga_greige ?? sj?.summary?.harga_greige,
                    harga_maklun: harga_maklun ?? row.harga_maklun ?? sj?.summary?.harga_maklun,
                    total: total,
                    no_po: sj?.no_po ?? row.no_po,
                    no_pc: sj?.no_pc ?? row.no_pc,
                    no_jb: sj?.no_jb ?? row.no_jb,
                };
              } catch {
                return row;
              }
            }));
        } else {
            enrichedRows = baseRows;
        }
    }

    enrichedRows.sort((a, b) => (normalizeDate(a.created_at) || 0) - (normalizeDate(b.created_at) || 0));

    const styles = {
      title: { font: { bold: true, sz: 16 } },
      subtitle: { font: { italic: true } },
      header: { font: { bold: true }, alignment: { horizontal: 'center' }, fill: { fgColor: { rgb: "EAEAEA" } } },
    };
    
    let worksheetData = [
      [{ v: title, s: styles.title }],
      [{ v: `Periode: ${filterLabel}`, s: styles.subtitle }],
      []
    ];

    const relasiHeader = isSales ? "Customer" : "Supplier";
    const refHeader = refValueFor({}, block.mode, block.key).startsWith('No') ? refValueFor({}, block.mode, block.key) : `No. ${refValueFor({}, block.mode, block.key)}`;
    
    let headers = ['No', 'Tgl', 'No SJ', refHeader, relasiHeader];
    if (!isGreige) headers.push('Warna');
    if (isSales) headers.push('Grade');
    headers.push('Kain', 'Total Meter', 'Total Yard');
    if (isKainJadi) {
        headers.push('Harga Greige', 'Harga Maklun');
    } else {
        headers.push('Harga');
    }
    headers.push('Total');
    
    worksheetData.push(headers.map(h => ({ v: h, s: styles.header })));
    
    let grandTotal = 0;

    enrichedRows.forEach((row, index) => {
        const total = parseNumber(row.total ?? row.summary?.total_akhir ?? row.summary?.subtotal);
        grandTotal += total;

        const dataRow = [
            index + 1,
            formatTanggalIndo(row.created_at),
            row.no_sj || '-',
            refValueFor(row, block.mode, block.key),
            row.customer_name || row.supplier_name || '-',
        ];

        if (!isGreige) dataRow.push(row.kode_warna || '-');
        if (isSales) dataRow.push(row.grade_name || '-');
        
        dataRow.push(
            row.corak_kain || '-',
            parseNumber(row.summary?.total_meter),
            parseNumber(row.summary?.total_yard)
        );

        if (isKainJadi) {
            dataRow.push(parseNumber(row.harga_greige), parseNumber(row.harga_maklun));
        } else {
            dataRow.push(parseNumber(row.harga));
        }
        dataRow.push(total);
        
        worksheetData.push(dataRow);
    });

    const totalRow = new Array(headers.length).fill('');
    const labelIndex = headers.length - 2;
    totalRow[labelIndex] = { v: 'TOTAL AKHIR', s: { font: { bold: true }, alignment: { horizontal: 'right' } } };
    totalRow[labelIndex + 1] = { v: grandTotal, s: { font: { bold: true } } };
    worksheetData.push(totalRow);

    const ws = XLSX.utils.aoa_to_sheet(worksheetData, { cellStyles: true });
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
        { s: { r: worksheetData.length - 1, c: 0 }, e: { r: worksheetData.length - 1, c: labelIndex - 1 } },
    ];
    ws['!cols'] = headers.map(() => ({ wch: 18 }));
    
    const colMap = {};
    headers.forEach((h, i) => colMap[h] = String.fromCharCode(65 + i));
    
    Object.keys(ws).forEach(cellAddress => {
        const cell = ws[cellAddress];
        if (cell && typeof cell.v === 'number' && cellAddress[0] !== 'A') {
            cell.t = 'n';
            const col = cellAddress.replace(/\d+/g, '');
            const meterCol = colMap['Total Meter'];
            const yardCol = colMap['Total Yard'];
            const hargaCols = [colMap['Harga'], colMap['Harga Greige'], colMap['Harga Maklun'], colMap['Total']].filter(Boolean);
            
            if (col === meterCol || col === yardCol) {
                cell.z = '#,##0.00';
            }
            if (hargaCols.includes(col)) {
                cell.z = '"Rp"#,##0.00';
            }
        }
    });

    Swal.close();
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
    const fileName = `Laporan ${block.label} - ${filterLabel}.xlsx`;
    XLSX.writeFile(wb, fileName);

  } catch (error) {
    console.error("Gagal ekspor Laporan Surat Jalan:", error);
    Swal.fire("Error", "Gagal mempersiapkan data untuk ekspor.", "error");
  }
}