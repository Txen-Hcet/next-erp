import { createSignal, Show } from "solid-js";

export default function FormSaldoModal(props) {
  const { show, onClose, onSubmit, initialData } = props;

  // SET SIGNALS
  const [customer, setCustomer] = createSignal(initialData?.customer || "");
  const [saldo_awal, setSaldoAwal] = createSignal(initialData?.saldo_awal || 0);
  const [jual, setJual] = createSignal(initialData?.jual || 0);
  const [retur, setRetur] = createSignal(initialData?.retur || 0);
  const [pot_pemb, setPotPemb] = createSignal(initialData?.pot_pemb || 0);
  const [bayar, setBayar] = createSignal(initialData?.bayar || 0);
  const [disc, setDisc] = createSignal(initialData?.disc || 0);
  const [giro, setGiro] = createSignal(initialData?.giro || 0);
  const [saldoAkhir, setSaldoAkhir] = createSignal(
    initialData?.saldoAkhir || 0
  );
  const [saldoGm, setSaldoGm] = createSignal(initialData?.saldo_gm || 0);

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = {
      id: initialData?.id,
      customer: customer(),
      saldo_awal: Number(saldo_awal()),
      jual: Number(jual()),
      retur: Number(retur()),
      pot_pemb: Number(pot_pemb()),
      bayar: Number(bayar()),
      disc: Number(disc()),
      saldo_akhir: Number(saldoAkhir()),
      giro: Number(giro()),
      saldo_gm: Number(saldoGm()),
    };

    onSubmit(payload);
  };

  return (
    <Show when={show}>
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <form
          class="bg-white p-6 rounded-xl w-full max-w-screen mx-20"
          onSubmit={handleSubmit}
        >
          <h3 class="text-lg font-bold mb-4">
            {initialData ? "Edit Saldo Piutang" : "Tambah Saldo Piutang"}
          </h3>

          {/* INPUT GROUP */}
          <div class="w-full flex gap-3">
            <Field label="Customer" value={customer()} onInput={setCustomer} />

            <Field
              label="Saldo Awal"
              type="number"
              value={saldo_awal()}
              onInput={setSaldoAwal}
            />
            <Field
              label="Jual"
              type="number"
              value={jual()}
              onInput={setJual}
            />
            <Field
              label="Retur"
              type="number"
              value={retur()}
              onInput={setRetur}
            />
            <Field
              label="Pot/Pemb"
              type="number"
              value={pot_pemb()}
              onInput={setPotPemb}
            />
            <Field
              label="Bayar"
              type="number"
              value={bayar()}
              onInput={setBayar}
            />
            <Field
              label="Disc/Komisi"
              type="number"
              value={disc()}
              onInput={setDisc}
            />
            <Field
              label="Saldo Akhir"
              type="number"
              value={saldoAkhir()}
              onInput={setSaldoAkhir}
            />
            <Field
              label="Giro Mundur"
              type="number"
              value={giro()}
              onInput={setGiro}
            />
            <Field
              label="Saldo sth GM"
              type="number"
              value={saldoGm()}
              onInput={setSaldoGm}
            />
          </div>

          {/* BUTTONS */}
          <div class="flex justify-end gap-2 mt-5">
            <button
              type="button"
              class="px-4 py-2 bg-gray-300 rounded"
              onClick={onClose}
            >
              Batal
            </button>

            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded"
            >
              {initialData ? "Update" : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </Show>
  );
}

function Field(props) {
  return (
    <div>
      <label class="text-sm font-semibold mb-1 block">{props.label}</label>
      <input
        type={props.type || "text"}
        class="w-full border px-3 py-2 rounded"
        value={props.value}
        onInput={(e) => props.onInput(e.target.value)}
      />
    </div>
  );
}
