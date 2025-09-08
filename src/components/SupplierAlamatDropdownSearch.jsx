import { createMemo, For } from "solid-js";

export default function SupplierAlamatDropdownSearch(props) {
  // props:
  // - suppliers: array dari backend getAllSuppliers()
  // - value: id supplier terpilih (number | null | "")
  // - onChange: function(option|null)
  // - disabled: boolean
  // - placeholder: string (opsional)

  const mapSuppliersToOptions = (suppliers) => {
    if (!Array.isArray(suppliers)) return [];
    return suppliers.map((s) => {
      const nama = s?.nama || s?.kode || "Tanpa Nama";
      const alamatOneLine = (s?.alamat || "").replace(/\s+/g, " ").trim();
      return {
        id: s.id,
        nama: s.nama,
        kode: s.kode,
        alamat: s.alamat, // versi asli (multiline) tetap disimpan untuk payload
        label: `${nama} - ${alamatOneLine}`,
      };
    });
  };

  const findSupplierOptionById = (options, id) => {
    const strId = String(id ?? "");
    return options.find((o) => String(o.id) === strId) || null;
  };

  const options = createMemo(() => mapSuppliersToOptions(props.suppliers || []));

  const handleChange = (e) => {
    const raw = e?.target?.value ?? "";
    const id = raw === "" ? null : Number(raw);
    const opt = id === null ? null : findSupplierOptionById(options(), id);
    if (typeof props.onChange === "function") {
      props.onChange(opt || null);
    }
  };

  return (
    <div>
      <select
        class="w-full border p-2 rounded"
        value={props.value ?? ""}
        onInput={handleChange}
        disabled={props.disabled}
        classList={{ "bg-gray-200": props.disabled }}
      >
        <option value="">{props.placeholder || "Pilih Alamat Pengiriman"}</option>
        <For each={options()}>
          {(opt) => (
            <option value={opt.id}>{opt.label}</option>
          )}
        </For>
      </select>
    </div>
  );
}
