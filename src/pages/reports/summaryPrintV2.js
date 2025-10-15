import {
  getAllDeliveryNotes,     // sales list
  getAllJBDeliveryNotes,   // jb list
  getDeliveryNotes,        // sales detail
  getJBDeliveryNotes,      // jb detail
} from "../../utils/auth";

export async function printSummaryReport({
  kind,            // 'sales' | 'jual_beli'
  token,
  startDate = "",
  endDate = "",
}) {
  const isSales = kind === "sales";

  // ==== helpers ====
  const normalizeDate = (d) => {
    if (!d) return null;
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return null;
    return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  };
  const formatDateRange = () =>
    (!startDate && !endDate) ? "Semua Data" : `${startDate} s/d ${endDate}`;
  const rowsFromResponse = (res) =>
    res?.suratJalans ?? res?.surat_jalan_list ?? res?.data ?? [];
  const filterByDate = (rows) => {
    const s = normalizeDate(startDate);
    const e = normalizeDate(endDate);
    if (!s && !e) return rows;
    return rows.filter((r) => {
      const d = normalizeDate(r.created_at);
      if (d === null) return false;
      if (s && d < s) return false;
      if (e && d > e) return false;
      return true;
    });
  };
  const uniqJoin = (arr, sep = ", ") =>
    Array.from(new Set(arr.filter(Boolean))).join(sep);
  const fmt2 = (n) =>
    new Intl.NumberFormat("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(+n || 0);

  const fmtRp = (n) => {
    if (n === null || n === undefined || n === "") return "-";
    const num = Number(String(n).replace(/[^\d\.\-]/g, ""));
    if (!Number.isFinite(num)) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const parseNumeric = (v) => {
    if (v === undefined || v === null || v === "") return 0;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    const s = String(v).replace(/[^\d\.\-]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  // ==== ambil LIST sesuai jenis ====
  const listRes = isSales
    ? await getAllDeliveryNotes(token)
    : await getAllJBDeliveryNotes(token);
  const baseRows = filterByDate(rowsFromResponse(listRes));

  // ==== enrich dengan detail (ambil corak dari detail, fallback dari list.items) ====
  const MAX = 5;
  const queue = [...baseRows];
  const rows = [];
  const safeDetailCall = async (fn, id, tok) => {
    try { return await fn(id, tok); }
    catch { try { return await fn(tok, id); } catch { return null; } }
  };

  // extract total money & harga per unit from detail (prefer summary.total_akhir)
  const extractTotalsFromOrder = (order) => {
    // order.summary may contain subtotal, total_akhir
    const summary = order?.summary ?? {};
    const totalAkhir = parseNumeric(summary?.total_akhir ?? summary?.total_akhir ?? summary?.subtotal ?? summary?.total ?? summary?.total_harga ?? summary?.total_price);
    if (totalAkhir && totalAkhir > 0) {
      return { totalMoney: totalAkhir, summary };
    }

    // try items: item.total or item.total (string) or item.harga * qty
    const items = order?.items ?? order?.itemsWithRolls ?? [];
    if (Array.isArray(items) && items.length > 0) {
      // try to sum item.total first
      let sumTotal = 0;
      for (const it of items) {
        const itTotal = parseNumeric(it?.total ?? it?.harga_total ?? it?.subtotal ?? it?.amount);
        if (itTotal > 0) sumTotal += itTotal;
      }
      if (sumTotal > 0) {
        return { totalMoney: sumTotal, summary };
      }
      // fallback compute harga * qty (qty candidates: meter_total/yard_total/kilogram_total)
      let sumFromHargaQty = 0;
      for (const it of items) {
        const harga = parseNumeric(it?.harga ?? it?.harga_satuan ?? it?.unit_price ?? it?.price);
        const qtyMeter = parseNumeric(it?.meter_total ?? it?.total_meter ?? it?.meter);
        const qtyYard = parseNumeric(it?.yard_total ?? it?.total_yard ?? it?.yard);
        const qtyKg = parseNumeric(it?.kilogram_total ?? it?.total_kilogram ?? it?.kilogram);
        const qty = qtyMeter || qtyYard || qtyKg || 0;
        if (harga > 0 && qty > 0) sumFromHargaQty += harga * qty;
      }
      if (sumFromHargaQty > 0) {
        return { totalMoney: sumFromHargaQty, summary };
      }
    }

    return { totalMoney: 0, summary };
  };

  const worker = async () => {
    const row = queue.shift();
    if (!row) return;

    try {
      const det = await safeDetailCall(
        isSales ? getDeliveryNotes : getJBDeliveryNotes,
        row.id,
        token
      );
      const sj = det?.order ?? det?.suratJalan ?? det?.surat_jalan ?? det?.data ?? {};
      const items = (sj?.items ?? sj?.itemsWithRolls ?? row?.items ?? []);
      const corak = uniqJoin(items.map((it) => it?.corak_kain ?? null)) || "-";

      const { totalMoney, summary } = extractTotalsFromOrder(sj);

      // harga per unit preferred: items[0].harga; else compute from totalMoney / qty
      let hargaPerUnit = null;
      if (Array.isArray(items) && items.length > 0) {
        const first = items[0];
        const hargaCandidate = parseNumeric(first?.harga ?? first?.harga_satuan ?? first?.unit_price);
        if (hargaCandidate > 0) hargaPerUnit = hargaCandidate;
      }
      if (hargaPerUnit === null) {
        // compute: prefer meter
        const q = {
          m: parseNumeric(summary?.total_meter ?? items.reduce((s,it)=>s+parseNumeric(it?.meter_total),0)),
          y: parseNumeric(summary?.total_yard ?? items.reduce((s,it)=>s+parseNumeric(it?.yard_total),0)),
          kg: parseNumeric(summary?.total_kilogram ?? items.reduce((s,it)=>s+parseNumeric(it?.kilogram_total),0)),
        };
        if (q.m > 0) hargaPerUnit = totalMoney / q.m;
        else if (q.y > 0) hargaPerUnit = totalMoney / q.y;
        else if (q.kg > 0) hargaPerUnit = totalMoney / q.kg;
      }

      rows.push({
        delivered_status: +row.delivered_status === 1,
        customer_name: sj?.customer_name ?? row?.customer_name ?? "-",
        supplier_name: sj?.supplier_name ?? row?.supplier_name ?? "-",
        corak_kain: corak,
        summary,
        items,
        totalMoney: totalMoney || 0,
        hargaPerUnit: hargaPerUnit && Number.isFinite(hargaPerUnit) ? hargaPerUnit : null,
      });
    } catch {
      const items = row?.items ?? [];
      const corak = uniqJoin(items.map((it) => it?.corak_kain ?? null)) || "-";
      const { totalMoney, summary } = extractTotalsFromOrder(row);
      rows.push({
        delivered_status: +row.delivered_status === 1,
        customer_name: row?.customer_name ?? "-",
        supplier_name: row?.supplier_name ?? "-",
        corak_kain: corak,
        summary,
        items,
        totalMoney: totalMoney || 0,
        hargaPerUnit: null,
      });
    }

    return worker();
  };
  await Promise.all(
    Array.from({ length: Math.min(MAX, queue.length) }, worker)
  );

  // ==== pecah: sudah terbit vs belum ====
  const groups = {
    invoiced: rows.filter((r) => r.delivered_status),
    pending: rows.filter((r) => !r.delivered_status),
  };

  // ==== util qty per baris & total ====
  const qtyCells = (s, items = []) => {
    const summary = s || {};
    const meter = parseNumeric(summary?.total_meter ?? summary?.meter ?? items.reduce((acc,it)=>acc+parseNumeric(it?.meter_total),0));
    const yard  = parseNumeric(summary?.total_yard ?? summary?.yard ?? items.reduce((acc,it)=>acc+parseNumeric(it?.yard_total),0));
    const kg    = parseNumeric(summary?.total_kilogram ?? summary?.kilogram ?? items.reduce((acc,it)=>acc+parseNumeric(it?.kilogram_total),0));
    return { m: meter, y: yard, kg: kg };
  };
  const totalsByUnit = (arr) =>
    arr.reduce(
      (acc, r) => {
        const q = qtyCells(r.summary, r.items);
        acc.meter += q.m;
        acc.yard += q.y;
        acc.kilogram += q.kg;
        acc.amount += +r.totalMoney || 0; // jumlah total uang
        return acc;
      },
      { meter: 0, yard: 0, kilogram: 0, amount: 0 }
    );

  // ==== builder table (header 2 baris; Quantity = 3 subkolom) ====
  // includes Harga (Rp) and Total (Rp). Returns { html, totalAmount }
  const buildTable = (label, data) => {
    const totals = totalsByUnit(data);
    const hideSupplier = isSales;

    const th = `
      <tr>
        <th rowspan="2" style="width:4%;text-align:center">No</th>
        <th rowspan="2" style="width:${hideSupplier ? "20%" : "15%"};">Nama Customer</th>
        ${hideSupplier ? "" : `<th rowspan="2" style="width:15%;">Supplier</th>`}
        <th rowspan="2" style="width:8%;">Corak Kain</th>
        <th colspan="3" style="width:18%;text-align:center">Quantity</th>
        <th rowspan="2" style="width:10%;text-align:center">Harga</th>
        <th rowspan="2" style="width:10%;text-align:center">Total</th>
      </tr>
      <tr>
        <th style="text-align:center;width:6%;">Meter</th>
        <th style="text-align:center;width:6%;">Yard</th>
        <th style="text-align:center;width:6%;">Kilogram</th>
      </tr>`;

    const tb = data
      .map((r, i) => {
        const q = qtyCells(r.summary, r.items);
        const hargaDisplay = r.hargaPerUnit && Number.isFinite(r.hargaPerUnit) && r.hargaPerUnit > 0 ? fmtRp(r.hargaPerUnit) : "-";
        const totalDisplay = r.totalMoney && Number.isFinite(r.totalMoney) && r.totalMoney > 0 ? fmtRp(r.totalMoney) : "-";

        return `
        <tr>
          <td style="text-align:center">${i + 1}</td>
          <td>${r.customer_name}</td>
          ${hideSupplier ? "" : `<td>${r.supplier_name}</td>`}
          <td>${r.corak_kain}</td>
          <td style="text-align:center">${fmt2(q.m)}</td>
          <td style="text-align:center">${fmt2(q.y)}</td>
          <td style="text-align:center">${fmt2(q.kg)}</td>
          <td style="text-align:right;padding-right:6px">${hargaDisplay}</td>
          <td style="text-align:right;padding-right:6px">${totalDisplay}</td>
        </tr>`;
      })
      .join("");

    // Grand Total row
    const nonQtyColspan = hideSupplier ? 3 : 4; // No + Customer + [Supplier] + Corak
    const foot = `
      <tr>
        <td colspan="${nonQtyColspan}" style="text-align:right;font-weight:bold">Grand Total:</td>
        <td style="text-align:center;font-weight:bold">${fmt2(totals.meter)}</td>
        <td style="text-align:center;font-weight:bold">${fmt2(totals.yard)}</td>
        <td style="text-align:center;font-weight:bold">${fmt2(totals.kilogram)}</td>
        <td style="text-align:right;font-weight:bold;padding-right:6px">-</td>
        <td style="text-align:right;font-weight:bold;padding-right:6px">${fmtRp(totals.amount)}</td>
      </tr>`;

    const emptyCols = hideSupplier ? 8 : 9;
    const html = `
      <h3 style="margin:10px 0 6px 0">${label}</h3>
      <table style="border-collapse:collapse;width:100%;table-layout:fixed" border="1" cellspacing="0" cellpadding="3">
        <thead style="background:#DADBDD">${th}</thead>
        <tbody>${tb || `<tr><td colspan="${emptyCols}" style="text-align:center">-</td></tr>`}</tbody>
        <tfoot>${foot}</tfoot>
      </table>
    `;
    return { html, totalAmount: totals.amount };
  };

  // ==== PRINT ====
  const title = `Summary ${isSales ? "Penjualan" : "Jual Beli"}`;
  const style = `
    <style>
      @page { 
        size: A4; 
        margin: 8mm; 
      }
      @media print { 
        html, body { 
            width: 210mm; 
        } 
      }
      body{ 
        font-family:ui-sans-serif,system-ui,Segoe UI,Helvetica,Arial; 
        margin:0; 
        display:flex; 
        justify-content:center; 
      }
      .paper{ 
        width:100%; 
        max-width:calc(210mm - 8mm); 
      }
      h1{ 
        margin:0 0 6mm 0 
      }
      h3{ 
        font-size:12px; 
      }
      table,th,td{ 
        font-size:10px; 
      }

      /* keep header repeated, footer as normal rows (so totals don't repeat) */
      thead { display: table-header-group; }
      tfoot { display: table-row-group; }
      tfoot tr { page-break-inside: avoid; -webkit-column-break-inside: avoid; break-inside: avoid; }
    </style>
  `;
  const header = `
    <h1>${title}</h1>
    <div>Periode: ${formatDateRange()}</div>
    <div>Tanggal cetak: ${new Date().toLocaleString()}</div><br/>
  `;

  // build both tables and collect totals
  const invoicedTbl = buildTable("Sudah Terbit Invoice", groups.invoiced);
  const pendingTbl = buildTable("Belum Terbit Invoice", groups.pending);
  const grandTotalAll = (invoicedTbl.totalAmount || 0) + (pendingTbl.totalAmount || 0);

  // compose HTML and add overall grand total at the end
  const html = `
    <div class="paper">
      ${header}
      ${invoicedTbl.html}
      <br/>
      ${pendingTbl.html}
      <br/>
      
    </div>
  `;

  const w = window.open("", "", "height=700,width=980");
  w.document.write(
    `<html><head><title>${title}</title>${style}</head><body>${html}</body></html>`
  );
  w.document.close();
  w.focus();
  w.print();
}
