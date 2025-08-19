import { createSignal, onMount } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../../layouts/MainLayout";
import {
  createCustomer,
  getAllCustomerTypes,
  getCustomer,
  getCustomerType,
  getUser,
  updateDataCustomer,
} from "../../utils/auth";
import Swal from "sweetalert2";

export default function SuppliersListForm() {
  const [customerTypes, setCustomerTypes] = createSignal([]);
  const [form, setForm] = createSignal({
    id: "",
    kode: "",
    npwp: "",
    nama: "",
    customer_type_id: "",
    no_telp: "",
    no_hp: "",
    alamat: "",
    termin: "",
    limit_kredit: "",
  });
  const [params] = useSearchParams();
  const isEdit = !!params.id;
  const navigate = useNavigate();
  const user = getUser();

  onMount(async () => {
    const customerTypesData = await getAllCustomerTypes(user?.token);
    setCustomerTypes(customerTypesData.data);

    if (isEdit) {
      const customerData = await getCustomer(params.id, user?.token);
      console.log(customerData.customers)
      setForm({
        id: params.id,
        kode: customerData.customers.kode,
        nama: customerData.customers.nama,
        npwp: customerData.customers.npwp,
        customer_type_id: customerData.customers.customer_type_id,
        no_telp: customerData.customers.no_telp,
        no_hp: customerData.customers.no_hp,
        alamat: customerData.customers.alamat,
        termin: customerData.customers.termin,
        limit_kredit: customerData.customers.limit_kredit,
      });
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isEdit) {
        await updateDataCustomer(
          user?.token,
          params.id,
          form().kode,
          form().nama,
          form().npwp,
          form().customer_type_id,
          form().no_telp,
          form().no_hp,
          form().alamat,
          form().termin,
          form().limit_kredit
        );
      } else {
        await createCustomer(
          user?.token,
          form().kode,
          form().nama,
          form().npwp,
          form().customer_type_id,
          form().no_telp,
          form().no_hp,
          form().alamat,
          form().termin,
          form().limit_kredit
        );
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: isEdit
          ? "Berhasil mengubah data customer"
          : "Berhasil mebuat customer baru",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => navigate("/customers"));
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: isEdit
          ? "Gagal mengubah data customer"
          : "Gagal membuat data customer baru",
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      });
    }
  };

  return (
    <MainLayout>
      <h1 class="text-2xl font-bold mb-4">
        {isEdit ? "Edit" : "Tambah"} Customer
      </h1>
      <form class="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-4 gap-4">
          {" "}
          <div>
            <label class="block mb-1 font-medium">Kode</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().kode}
              onInput={(e) => setForm({ ...form(), kode: e.target.value })}
              required
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">Nama</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={form().nama}
              onInput={(e) => setForm({ ...form(), nama: e.target.value })}
              required
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">NPWP</label>
            <input
              type="number"
              class="w-full border p-2 rounded"
              value={form().npwp}
              onInput={(e) => setForm({ ...form(), npwp: e.target.value })}
              required
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">Tipe Customer</label>
            <select
              class="w-full border p-2 rounded"
              value={form().customer_type_id}
              onChange={(e) =>
                setForm({ ...form(), customer_type_id: e.target.value })
              }
              required
            >
              <option value="" disabled hidden={!!form().customer_type_id}>
                Pilih Tipe Customer
              </option>
              {customerTypes().map((type) => (
                <option value={type.id}>{type.jenis}</option>
              ))}
            </select>
          </div>
          <div>
            <label class="block mb-1 font-medium">No Telp</label>
            <input
              type="number"
              class="w-full border p-2 rounded"
              value={form().no_telp}
              onInput={(e) => setForm({ ...form(), no_telp: e.target.value })}
              required
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">No HP</label>
            <input
              type="number"
              class="w-full border p-2 rounded"
              value={form().no_hp}
              onInput={(e) => setForm({ ...form(), no_hp: e.target.value })}
              required
            />
          </div>
          <div>
            <label class="block mb-1 font-medium">Termin</label>
            <div class="relative">
              <input
                type="number"
                class="w-full border p-2 pr-12 rounded"
                value={form().termin}
                onInput={(e) => setForm({ ...form(), termin: e.target.value })}
                required
              />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                /Hari
              </span>
            </div>
          </div>
          <div>
            <label class="block mb-1 font-medium">Limit Kredit</label>
            <input
              type="text"
              class="w-full border p-2 rounded"
              value={
                form().limit_kredit !== null &&
                form().limit_kredit !== undefined
                  ? new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      minimumFractionDigits: 0,
                    }).format(form().limit_kredit)
                  : ""
              }
              onInput={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, ""); // ambil angka aja
                setForm({
                  ...form(),
                  limit_kredit: raw ? parseInt(raw) : null,
                });
              }}
              required
            />
          </div>
        </div>
        <div>
          <label class="block mb-1 font-medium">Alamat</label>
          <textarea
            type="text"
            class="w-full border p-2 rounded"
            value={form().alamat}
            onInput={(e) => setForm({ ...form(), alamat: e.target.value })}
            required
          />
        </div>
        <button class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Simpan
        </button>
      </form>
    </MainLayout>
  );
}
