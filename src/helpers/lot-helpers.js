/** Ambil LOT unik dari sj.items (tanpa filter returned/deleted), urutkan numerik bila mungkin */
export function getLotsFromSJ(sj) {
  const items = Array.isArray(sj?.items) ? sj.items : [];
  const lots = [
    ...new Set(
      items
        .map((it) => (it?.lot ?? "").toString().trim())
        .filter((v) => v !== "" && v.toLowerCase() !== "null" && v.toLowerCase() !== "undefined")
    ),
  ];

  // urutkan: numerik jika keduanya angka, kalau tidak pakai localeCompare
  lots.sort((a, b) => {
    const na = Number(a), nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });

  return lots;
}

/**
 * Hasil untuk ditampilkan di UI:
 * @returns { text: string, tooltip: string }
 * - text: maksimal `maxShow` LOT dipisah koma, jika lebih → tambah ", …"
 * - tooltip: semua LOT dipisah koma (pakai di title=)
 */
export function getLotsLabelTruncated(sj, maxShow = 3) {
  const lots = getLotsFromSJ(sj);
  if (lots.length === 0) return { text: "-", tooltip: "" };

  const shown = lots.slice(0, maxShow).join(", ");
  const text = lots.length > maxShow ? `${shown}, …` : shown;
  const tooltip = lots.join(", ");
  return { text, tooltip };
}
