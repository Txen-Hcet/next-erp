export async function printPOStatus({
  blockKey, 
  mode, 
  status, 
  poRows, 
  startDate, 
  endDate, 
  userToken,
  SJ_LIST_FETCHER, 
  SJ_DETAIL_FETCHER, 
  PO_DETAIL_FETCHER,
}) {
  const isGreige = blockKey === "greige";
  const isSales  = mode === "penjualan" || blockKey === "sales";
  const relasiHeader = (isSales || blockKey === "jual_beli") ? "Customer" : "Supplier";

  // ==== CONFIG: ubah lebar kolom di sini ====
  const COL_WIDTHS = {
    no: "4%",
    relasi: "14%",
    ref: "12%",
    tanggal: "9%",
    corak: "9%",
    warna: "10%",
    ketWarna: "10%",
    qtyPO: "8%",
    qtyIn: "8%",
    qtySisa: "8%",
    pengiriman: "7%",
    harga: "12%",
    harga_greige: "10%",
    harga_maklun: "10%",
    subtotal: "18%",
  };
  // =========================================

  // ==== helpers qty dari PO
  const unitName = (po) => po?.satuan_unit_name || "Meter";
  const totalsByUnit = (po) => {
    const u = unitName(po);
    const s = po?.summary || {};
    if (u === "Meter")    return { unit: "Meter",    total: +(+s.total_meter || 0),    masuk: +(+s.total_meter_dalam_proses || 0) };
    if (u === "Yard")     return { unit: "Yard",     total: +(+s.total_yard || 0),     masuk: +(+s.total_yard_dalam_proses || 0) };
    if (u === "Kilogram") return { unit: "Kilogram", total: +(+s.total_kilogram || 0), masuk: +(+s.total_kilogram_dalam_proses || 0) };
    return { unit: "Meter", total: 0, masuk: 0 };
  };
  const isDone = (po) => {
    const { total, masuk } = totalsByUnit(po);
    const sisa = total - masuk;
    if (total <= 0) return false;
    return isGreige ? (sisa <= total * 0.1 + 1e-9) : (sisa <= 0 + 1e-9);
  };

  const filteredPOs = poRows.filter(po => (status === "done" ? isDone(po) : !isDone(po)));

  // ==== mapping nomor referensi
  const refKey     = (bk, md) => (bk === "jual_beli" ? "no_jb" : (md === "penjualan" || bk === "sales" ? "no_so" : "no_po"));
  const refHeader  = (bk, md) => (bk === "jual_beli" ? "No JB" : (md === "penjualan" || bk === "sales" ? "No SO" : "No PO"));
  const getRefValue = (row, bk, md) => row[refKey(bk, md)] ?? "-";

  // ==== index Tgl Pengiriman / Tgl SJ terbaru
  const sjListFetcher   = SJ_LIST_FETCHER[blockKey];
  const sjDetailFetcher = SJ_DETAIL_FETCHER[blockKey] || null;
  const normDT = (d) => { if (!d) return null; const x = new Date(d); return Number.isNaN(x.getTime()) ? null : x; };

  // SALES: tanggal SJ = created_at; Non-sales: tanggal pengiriman = tanggal_kirim
  const pickFromList = (row) => isSales ? normDT(row?.created_at ?? null)
                                        : normDT(row?.tanggal_kirim ?? null);
  const pickFromDetail = (sj) => isSales ? normDT(sj?.created_at ?? null)
                                         : normDT(sj?.tanggal_kirim ?? null);

  const sjDateIndex = {}; // refNo => Date
  try {
    if (sjListFetcher) {
      const sjListRes = await sjListFetcher(userToken);
      const baseRows = (sjListRes?.suratJalans ?? sjListRes?.surat_jalan_list ?? sjListRes?.data ?? []);

      // Prefill dari LIST (berfungsi walau tidak ada detail fetcher)
      for (const row of baseRows) {
        const ref = row?.no_jb ?? row?.no_po ?? row?.no_so ?? null;
        const tgl = pickFromList(row);
        if (ref && tgl && (!sjDateIndex[ref] || tgl > sjDateIndex[ref])) sjDateIndex[ref] = tgl;
      }

      // Jika ada detail fetcher, refine pakai detail
      if (sjDetailFetcher) {
        const queue = [...baseRows];
        const MAX = 5;
        const worker = async () => {
          const row = queue.shift(); if (!row) return;
          try {
            const det = await safeDetailCall(sjDetailFetcher, row.id, userToken);
            const sj  = det?.suratJalan || det?.surat_jalan || det?.data || {};
            const ref = sj?.no_jb ?? sj?.no_po ?? sj?.no_so ?? row?.no_jb ?? row?.no_po ?? row?.no_so ?? null;
            const tgl = pickFromDetail(sj);
            if (ref && tgl && (!sjDateIndex[ref] || tgl > sjDateIndex[ref])) sjDateIndex[ref] = tgl;
          } catch {}
          return worker();
        };
        await Promise.all(Array.from({ length: Math.min(MAX, queue.length) }, worker));
      }
    }
  } catch {}

  // ==== detail PO → Corak / Warna / Ket Warna + harga/subtotal
  const poDetailFetcher = PO_DETAIL_FETCHER[blockKey];
  const collectKetWarna = (items) => {
    const vals = items.map(it => (it?.keterangan_warna ?? ""));
    const nonEmpty = Array.from(new Set(vals.filter(v => String(v).trim() !== "")));
    return nonEmpty.length ? nonEmpty.join(", ") : "";
  };

  // utility: cari nilai harga/subtotal dari berbagai kemungkinan struktur
  function extractMoneyFromOrder(order) {
    // 1) cek field ringkasan di order
    const s = order?.summary || order || {};
    const possibleSubtotal = s?.subtotal ?? s?.total_harga ?? s?.total_price ?? s?.grand_total ?? s?.total;
    if (isFiniteNumber(possibleSubtotal)) return +possibleSubtotal;

    // 2) jika ada items, coba hitung dari item.harga/harga_satuan * qty (dengan banyak fallback)
    const items = order?.items || [];
    if (items.length) {
      let sum = 0;
      for (const it of items) {
        const q = +(it?.qty ?? it?.quantity ?? it?.jumlah ?? it?.meter_total ?? 0) || 0;
        // harga kandidat
        const h = it?.harga_total ?? it?.subtotal ?? it?.harga ?? it?.harga_satuan ?? it?.unit_price ?? it?.price;
        if (isFiniteNumber(h)) {
          // jika harga total (sudah * qty) atau harga satuan: kita ambil asumsi:
          // - kalau ada field harga_total atau subtotal di item, anggap itu sudah total
          if (it?.harga_total || it?.subtotal) {
            sum += +h;
          } else {
            sum += (+h) * q;
          }
        }
      }
      if (sum > 0) return +sum;
    }

    // 3) fallback ke order.total_harga atau po-level summary terkadang berada di luar order
    if (isFiniteNumber(order?.total_harga)) return +order.total_harga;
    if (isFiniteNumber(order?.total_price)) return +order.total_price;

    return null;
  }
  function isFiniteNumber(v) { return v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v)); }

  // ---- Fixed helper: extract harga_greige & harga_maklun (prefer per-unit)
  function extractGreigeMaklunFromOrder(order) {
    // Return per-unit values (not totals). Fields:
    // { harga_greige_per_unit: number|null, harga_maklun_per_unit: number|null, harga_greige_total: number|null, harga_maklun_total: number|null }
    const res = { harga_greige_per_unit: null, harga_maklun_per_unit: null, harga_greige_total: null, harga_maklun_total: null };

    const s = order?.summary || {};
    // 1) prefer explicit per-unit fields at order/summary level
    if (isFiniteNumber(s?.harga_greige_per_unit)) res.harga_greige_per_unit = +s.harga_greige_per_unit;
    if (isFiniteNumber(s?.harga_maklun_per_unit)) res.harga_maklun_per_unit = +s.harga_maklun_per_unit;
    if (isFiniteNumber(order?.harga_greige_per_unit)) res.harga_greige_per_unit = res.harga_greige_per_unit ?? +order.harga_greige_per_unit;
    if (isFiniteNumber(order?.harga_maklun_per_unit)) res.harga_maklun_per_unit = res.harga_maklun_per_unit ?? +order.harga_maklun_per_unit;

    // 2) collect per-item per-unit (weighted average) if present
    const items = order?.items || [];
    if (items.length) {
      let accQtyG = 0, accValG = 0, accQtyM = 0, accValM = 0;
      for (const it of items) {
        const q = +(it?.meter_total ?? it?.qty ?? it?.quantity ?? it?.jumlah ?? 0) || 0;
        if (isFiniteNumber(it?.harga_greige)) {
          // treat it.harga_greige as per-unit (most common)
          accQtyG += q || 1; // if q===0 still count once to average single-item values
          accValG += (+it.harga_greige) * (q || 1);
        }
        if (isFiniteNumber(it?.harga_maklun)) {
          accQtyM += q || 1;
          accValM += (+it.harga_maklun) * (q || 1);
        }
        // also capture total-like fields if present
        if (isFiniteNumber(it?.harga_greige_total)) {
          res.harga_greige_total = (res.harga_greige_total || 0) + (+it.harga_greige_total);
        }
        if (isFiniteNumber(it?.harga_maklun_total)) {
          res.harga_maklun_total = (res.harga_maklun_total || 0) + (+it.harga_maklun_total);
        }
      }
      if (accQtyG > 0) res.harga_greige_per_unit = res.harga_greige_per_unit ?? (accValG / accQtyG);
      if (accQtyM > 0) res.harga_maklun_per_unit = res.harga_maklun_per_unit ?? (accValM / accQtyM);
    }

    if (res.harga_greige_per_unit == null) {
      const totalG = s?.harga_greige_total ?? order?.harga_greige_total ?? res.harga_greige_total ?? null;
      
      const totalUnits = Number(
        s?.total_meter ?? 
        s?.total_yard ?? 
        s?.total_kilogram ?? 
        items.reduce((a, it) => a + (Number(it?.meter_total || 0)), 0) ?? 
        0
      );

      if (isFiniteNumber(totalG) && totalUnits > 0) {
        res.harga_greige_per_unit = +totalG / totalUnits;
      } else if (isFiniteNumber(s?.harga_greige) && totalUnits > 0) {
        res.harga_greige_per_unit = +s.harga_greige / totalUnits;
      }
    }

    if (res.harga_maklun_per_unit == null) {
      const totalM = s?.harga_maklun_total ?? order?.harga_maklun_total ?? res.harga_maklun_total ?? null;
      
      const totalUnits = Number(
        s?.total_meter ?? 
        s?.total_yard ?? 
        s?.total_kilogram ?? 
        items.reduce((a, it) => a + (Number(it?.meter_total || 0)), 0) ?? 
        0
      );
      
      if (isFiniteNumber(totalM) && totalUnits > 0) {
        res.harga_maklun_per_unit = +totalM / totalUnits;
      } else if (isFiniteNumber(s?.harga_maklun) && totalUnits > 0) {
        res.harga_maklun_per_unit = +s.harga_maklun / totalUnits;
      }
    }

    if (isFiniteNumber(s?.harga_greige)) res.harga_greige_total = res.harga_greige_total ?? +s.harga_greige;
    if (isFiniteNumber(s?.harga_maklun)) res.harga_maklun_total = res.harga_maklun_total ?? +s.harga_maklun;
    if (isFiniteNumber(order?.harga_greige)) res.harga_greige_total = res.harga_greige_total ?? +order.harga_greige;
    if (isFiniteNumber(order?.harga_maklun)) res.harga_maklun_total = res.harga_maklun_total ?? +order.harga_maklun;

    return res;
  }

  const rowsEnriched = [];
  if (poDetailFetcher) {
    const queue = [...filteredPOs];
    const MAX = 5;
    const worker = async () => {
      const po = queue.shift(); if (!po) return;

      let corak = "-", warna = "-", ketWarna = "";
      let hargaRow = null;
      try {
        const dres  = await safeDetailCall(poDetailFetcher, po.id, userToken);
        const order = dres?.order || dres?.data || {};
        const items = order?.items || [];
        const coraks = uniq(items.map(it => it?.corak_kain ?? null));
        const warnas = uniq(items.map(it => it?.kode_warna ?? it?.warna_kode ?? it?.warna ?? null));
        if (coraks.length) corak = coraks.join(", ");
        if (!isGreige && warnas.length) warna = warnas.join(", ");
        ketWarna = collectKetWarna(items);

        const subtotalExtracted = extractMoneyFromOrder(order);
        if (isFiniteNumber(subtotalExtracted)) {
          hargaRow = { subtotal: +subtotalExtracted };
          const { unit, total } = totalsByUnit(po);
          if (total > 0) {
            hargaRow.harga_satuan = +(subtotalExtracted / total);
          }
        }

        const gm = extractGreigeMaklunFromOrder(order);
        if (isFiniteNumber(gm.harga_greige_per_unit)) hargaRow = { ...(hargaRow || {}), harga_greige_per_unit: +gm.harga_greige_per_unit };
        if (isFiniteNumber(gm.harga_maklun_per_unit)) hargaRow = { ...(hargaRow || {}), harga_maklun_per_unit: +gm.harga_maklun_per_unit };
        if (isFiniteNumber(gm.harga_greige_total)) hargaRow = { ...(hargaRow || {}), harga_greige_total: +gm.harga_greige_total };
        if (isFiniteNumber(gm.harga_maklun_total)) hargaRow = { ...(hargaRow || {}), harga_maklun_total: +gm.harga_maklun_total };

        if (blockKey === "kain_jadi") {
          if (!isFiniteNumber(hargaRow?.harga_greige_per_unit) || !isFiniteNumber(hargaRow?.harga_maklun_per_unit)) {
            let sumQty = 0, accGreige = 0, accMaklun = 0, foundAny = false;
            for (const it of items) {
              const q = +(it?.meter_total ?? it?.qty ?? it?.quantity ?? it?.jumlah ?? 0) || 0;
              const hg = isFiniteNumber(it?.harga_greige) ? Number(it.harga_greige) : null;
              const hm = isFiniteNumber(it?.harga_maklun) ? Number(it.harga_maklun) : null;
              if (hg !== null) { accGreige += (hg * (q || 1)); foundAny = true; sumQty += (q || 1); }
              if (hm !== null) { accMaklun += (hm * (q || 1)); foundAny = true; /* sumQty same as above */ }
            }
            if (foundAny && sumQty > 0) {
              if (!isFiniteNumber(hargaRow?.harga_greige_per_unit) && accGreige > 0) hargaRow.harga_greige_per_unit = accGreige / sumQty;
              if (!isFiniteNumber(hargaRow?.harga_maklun_per_unit) && accMaklun > 0) hargaRow.harga_maklun_per_unit = accMaklun / sumQty;
            }
          }
        }
      } catch {}

      const { unit, total, masuk } = totalsByUnit(po);
      const sisa = Math.max(0, +(total - masuk).toFixed(4));
      const ref  = getRefValue(po, blockKey, mode);
      const pengiriman = sjDateIndex[ref] ? formatDatePrint(sjDateIndex[ref]) : "-";

      rowsEnriched.push({
        po, unit, total, masuk, sisa, pengiriman,
        relasi: (isSales || blockKey === "jual_beli") ? (po?.customer_name ?? po?.customer ?? "-")
                                                      : (po?.supplier_name ?? po?.supplier ?? "-"),
        corak, warna, ketWarna, ref,
        hargaRow,
      });
      return worker();
    };
    await Promise.all(Array.from({ length: Math.min(MAX, queue.length) }, worker));
  }

  const finalRows = rowsEnriched.length
    ? rowsEnriched
    : filteredPOs.map(po => {
        const { unit, total, masuk } = totalsByUnit(po);
        const sisa = Math.max(0, +(total - masuk).toFixed(4));
        const ref  = getRefValue(po, blockKey, mode);
        const pengiriman = sjDateIndex[ref] ? formatDatePrint(sjDateIndex[ref]) : "-";

        let hargaRow = null;
        const poSubtotal = po?.summary?.total_harga ?? po?.total_harga ?? po?.total_price ?? po?.subtotal;
        if (isFiniteNumber(poSubtotal)) {
          hargaRow = { subtotal: +poSubtotal };
          if (total > 0) hargaRow.harga_satuan = +(poSubtotal / total);
        }

        if (isFiniteNumber(po?.summary?.harga_greige_per_unit)) hargaRow = { ...(hargaRow || {}), harga_greige_per_unit: +po.summary.harga_greige_per_unit };
        if (isFiniteNumber(po?.summary?.harga_maklun_per_unit)) hargaRow = { ...(hargaRow || {}), harga_maklun_per_unit: +po.summary.harga_maklun_per_unit };
        if (isFiniteNumber(po?.summary?.harga_greige)) hargaRow = { ...(hargaRow || {}), harga_greige_total: +po.summary.harga_greige };
        if (isFiniteNumber(po?.summary?.harga_maklun)) hargaRow = { ...(hargaRow || {}), harga_maklun_total: +po.summary.harga_maklun };
        if (isFiniteNumber(po?.harga_greige)) hargaRow = { ...(hargaRow || {}), harga_greige_total: +po.harga_greige };
        if (isFiniteNumber(po?.harga_maklun)) hargaRow = { ...(hargaRow || {}), harga_maklun_total: +po.harga_maklun };

        return {
          po, unit, total, masuk, sisa, pengiriman,
          relasi: (isSales || blockKey === "jual_beli") ? (po?.customer_name ?? po?.customer ?? "-")
                                                        : (po?.supplier_name ?? po?.supplier ?? "-"),
          corak: po?.corak_kain ?? "-",
          warna: isGreige ? "-" : (po?.kode_warna ?? "-"),
          ketWarna: "",
          ref,
          hargaRow,
        };
      });

  const grandTotal = finalRows.reduce((acc, r) => {
    const s = r.hargaRow?.subtotal;
    return acc + (isFiniteNumber(s) ? +s : 0);
  }, 0);

  // ==== PRINT ====
  const kindLabel = isSales ? "Penjualan" : "Pembelian";
  const blockLabel = mapBlockLabel(blockKey); // bisa "-" atau "Penjualan", "Greige", dsb.
  const title = `Rekap ${kindLabel}${blockLabel && blockLabel !== kindLabel ? " " + blockLabel : ""} - ${status === "done" ? "Selesai" : "Belum Selesai"}`;

  const showWarna    = !isGreige;
  const showKet      = !isGreige;
  const showTanggal  = !isSales;
  const pengirimanTh = isSales ? "Tgl Surat Jalan" : "Tgl Kirim";

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
      table{ 
        border-collapse:collapse; 
        width:100%; 
        table-layout:fixed; 
        margin:0 auto; 
      }
      col { /* allow widths from colgroup to apply */ }
      th,td{ 
        border:1px solid #000; 
        padding:3px 4px; 
        font-size:10px; 
        word-wrap:break-word; 
        vertical-align:middle;
      }
      th{ 
        background:#DADBDD; 
        text-align:left;
      }
      td.num, th.num { 
        text-align:center; 
      }
      td.cur, th.cur {
        text-align:center;
        padding-right:6px;
      }

      thead { display: table-header-group; }
      tfoot { display: table-row-group; }

      .grand-total-row { page-break-inside: avoid; -webkit-column-break-inside: avoid; break-inside: avoid; }
      .grand-total-cell { font-weight:700; background:#EFEFEF; padding:6px 8px; text-align:right; }

      tfoot td {
        font-weight:700;
        background:#EFEFEF;
      }
    </style>
  `;

  const headerHtml = `
    <h1>${title}</h1>
    <div>Periode: ${(!startDate && !endDate) ? "Semua Data" : `${startDate} s/d ${endDate}`}</div>
    <div>Tanggal cetak: ${new Date().toLocaleString()}</div><br/>
  `;

  // thead dinamis (untuk kain_jadi: ganti 1 kolom Harga jadi 2 kolom Harga Greige & Harga Maklun)
  const baseHead = [
    { key: "no", label: "No", num: true },
    { key: "relasi", label: `Nama ${relasiHeader}` },
    { key: "ref", label: refHeader(blockKey, mode) },
    ...(showTanggal ? [{ key: "tanggal", label: "Tanggal", num: true }] : []),
    { key: "corak", label: "Corak Kain" },
    ...(showWarna ? [{ key: "warna", label: "Warna", num: true }] : []),
    ...(showKet ? [{ key: "ketWarna", label: "Keterangan Warna" }] : []),
    { key: "qtyPO", label: "QTY PO", num: true },
    { key: "qtyIn", label: "QTY Masuk", num: true },
    { key: "qtySisa", label: "Sisa PO", num: true },
    { key: "pengiriman", label: pengirimanTh, num: true },
  ];

  let headCells;
  if (blockKey === "kain_jadi") {
    headCells = [
      ...baseHead,
      { key: "harga_greige", label: "Harga Greige", num: true },
      { key: "harga_maklun", label: "Harga Maklun", num: true },
      { key: "subtotal", label: "Total", num: true },
    ];
  } else {
    headCells = [
      ...baseHead,
      { key: "harga", label: "Harga", num: true },
      { key: "subtotal", label: "Total", num: true },
    ];
  }

  const thead = `<tr>${headCells.map(h => `<th class="${h.num?'num':''}">${h.label}</th>`).join("")}</tr>`;

  // buat colgroup sesuai headCells & COL_WIDTHS
  const colgroup = `<colgroup>${
    headCells.map(h => `<col style="width:${(COL_WIDTHS[h.key] || 'auto')}" />`).join("")
  }</colgroup>`;

  // tbody dinamis
  const tbodyRowsHtml = finalRows
    .sort((a,b) => (new Date(a.po.created_at)) - (new Date(b.po.created_at)))
    .map((r, i) => {
      const qtyPO   = `${formatNum(r.total)} ${r.unit}`;
      const qtyIn   = `${formatNum(r.masuk)} ${r.unit}`;
      const qtySisa = `${formatNum(r.sisa)} ${r.unit}`;
      const tglPO   = formatDatePrint(r.po.created_at);

      const hargaSatuan = r.hargaRow?.harga_satuan;
      const subtotalVal = r.hargaRow?.subtotal;

      // ambil greige & maklun per-unit jika ada (prioritas)
      const hargaGreigePerUnit = r.hargaRow?.harga_greige_per_unit;
      const hargaMaklunPerUnit = r.hargaRow?.harga_maklun_per_unit;
      // fallback: sometimes only totals present -> compute per-unit if possible
      let hargaGreigeDisplay = null;
      let hargaMaklunDisplay = null;

      if (blockKey === "kain_jadi") {
        if (isFiniteNumber(hargaGreigePerUnit)) hargaGreigeDisplay = formatCurrency(hargaGreigePerUnit);
        else if (isFiniteNumber(r.hargaRow?.harga_greige_total) && r.total > 0) hargaGreigeDisplay = formatCurrency(r.hargaRow.harga_greige_total / r.total);
        else hargaGreigeDisplay = isFiniteNumber(hargaSatuan) ? formatCurrency(hargaSatuan) : "-";

        if (isFiniteNumber(hargaMaklunPerUnit)) hargaMaklunDisplay = formatCurrency(hargaMaklunPerUnit);
        else if (isFiniteNumber(r.hargaRow?.harga_maklun_total) && r.total > 0) hargaMaklunDisplay = formatCurrency(r.hargaRow.harga_maklun_total / r.total);
        else hargaMaklunDisplay = "-";
      }

      let hargaCells = [];
      if (blockKey === "kain_jadi") {
        hargaCells.push({ v: hargaGreigeDisplay, num: false, cur: true });
        hargaCells.push({ v: hargaMaklunDisplay, num: false, cur: true });
      } else {
        const hargaDisplay = isFiniteNumber(hargaSatuan) ? formatCurrency(hargaSatuan) : "-";
        hargaCells.push({ v: hargaDisplay, num: false, cur: true });
      }

      const subtotalDisplay = isFiniteNumber(subtotalVal) ? formatCurrency(subtotalVal) : "-";

      const baseCells = [
        { v: i+1, num: true },
        { v: safe(r.relasi) },
        { v: safe(r.ref) },
        ...(showTanggal ? [{ v: tglPO, num: true }] : []),
        { v: safe(r.corak) },
        ...(showWarna ? [{ v: safe(r.warna), num: true }] : []),
        ...(showKet ? [{ v: safe(r.ketWarna) }] : []),
        { v: qtyPO,   num: true },
        { v: qtyIn,   num: true },
        { v: qtySisa, num: true },
        { v: r.pengiriman, num: true },
      ];

      const cells = [
        ...baseCells,
        ...hargaCells,
        { v: subtotalDisplay, num: false, cur: true },
      ];

      return `<tr>${cells.map(c => `<td class="${c.num?'num':''} ${c.cur?'cur':''}">${c.v}</td>`).join("")}</tr>`;
    }).join("");

  // tfoot dengan total akhir (grandTotal). Kalau grandTotal = 0 => tampilkan "-"
  const totalCellsCount = headCells.length;
  const grandTotalDisplay = grandTotal > 0 ? formatCurrency(grandTotal) : "-";
  const footerColsBefore = totalCellsCount - 1; // taruh total di kolom terakhir (subtotal)
  const tfoot = `
    <tfoot>
      <tr class="grand-total-row">
        <td colspan="${footerColsBefore}" style="text-align:right" class="grand-total-cell">TOTAL AKHIR</td>
        <td class="cur grand-total-cell">${grandTotalDisplay}</td>
      </tr>
    </tfoot>
  `;

  const html = `
    <html>
      <head><title>${title}</title>${style}</head>
      <body><div class="paper">
        ${headerHtml}
        <table>
          ${colgroup}
          <thead>${thead}</thead>
          <tbody>${tbodyRowsHtml}</tbody>
          ${tfoot}
        </table>
      </div></body>
    </html>
  `;

  const w = window.open("", "", "height=700,width=980");
  w.document.write(html);
  w.document.close(); w.focus(); w.print();
}

/* utils */
const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));
function safe(s) { return (s == null ? "-" : String(s)); }
function formatNum(n) {
  return new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(+n || 0);
}
function formatDatePrint(d) {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "-";
  const dd = String(x.getDate()).padStart(2, "0");
  const mm = String(x.getMonth()+1).padStart(2, "0");
  const yy = x.getFullYear();
  return `${dd}-${mm}-${yy}`;
}
async function safeDetailCall(fn, id, token) {
  try { return await fn(id, token); } catch { try { return await fn(token, id); } catch { return null; } }
}
function mapBlockLabel(key) {
  if (key === "greige") return "Greige";
  if (key === "oc") return "Order Celup";
  if (key === "kain_jadi") return "Kain Jadi";
  if (key === "jual_beli") return "Jual Beli";
  if (key === "sales") return "Penjualan";
  return "-";
}
function formatCurrency(n){
  if (!isFiniteNumber(n)) return "-";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(+n);
}
function isFiniteNumber(v) { return v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v)); }
