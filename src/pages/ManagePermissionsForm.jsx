import { createSignal, onMount, For, createMemo, Show } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import MainLayout from "../layouts/MainLayout";
import {
  getUser,
  getPermissions,
  updateRolePermissions,
  getRoleById,
  createRole,
} from "../utils/auth";
import Swal from "sweetalert2";

export default function ManagePermissionsForm() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const user = getUser();

  const isEdit = !!params.role_id;
  const [roleData, setRoleData] = createSignal({ name: "", id: null });
  const [allPermissions, setAllPermissions] = createSignal([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = createSignal([]);
  const [searchTerm, setSearchTerm] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(true);
  const [expandedGroups, setExpandedGroups] = createSignal({});

  onMount(async () => {
    try {
      if (isEdit) { 
        const [permissionsResponse, roleDataResponse] = await Promise.all([
          getPermissions(user?.token),
          // Panggil API GET Role Permission per ID
          getRoleById(params.role_id, user?.token), 
        ]);
        
        const allPermsData = permissionsResponse.permissions || [];
        setAllPermissions(allPermsData);

        const fetchedRoleData = roleDataResponse;
        if (fetchedRoleData) {
          setRoleData({
            name: fetchedRoleData.name,
            id: fetchedRoleData.id,
          });
          const rolePermissionIds = (fetchedRoleData.permissions || []).map(perm => perm.id);
          setSelectedPermissionIds(rolePermissionIds);

          const initialExpandedState = {};
          const titleCase = (str) => str.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

          // Group Permissions
          const tempGroups = {};
          for (const perm of allPermsData) {
            const parts = perm.name.split('_');
            const groupKey = parts.length > 1 ? parts.slice(1).join('_') : 'Lainnya';
            const groupName = titleCase(groupKey);
            if (!tempGroups[groupName]) {
              tempGroups[groupName] = [];
            }
            tempGroups[groupName].push(perm);
          }

          // Check Group Permissions
          for (const groupName in tempGroups) {
            const permsInGroup = tempGroups[groupName];
            // Expanded Group Permissions jika ada yang terpilih
            const hasSelectedPermission = permsInGroup.some(perm => rolePermissionIds.includes(perm.id));
            if (hasSelectedPermission) {
              initialExpandedState[groupName] = true;
            }
          }
          setExpandedGroups(initialExpandedState);
        }
      // Mode TAMBAH: Hanya ambil semua permission
      } else {
        const permissionsResponse = await getPermissions(user?.token);
        setAllPermissions(permissionsResponse.permissions || []);
      }
    } catch (error) {
      console.error("Gagal memuat data:", error);
      Swal.fire("Error", "Gagal memuat data yang diperlukan.", "error");
    } finally {
      setIsLoading(false);
    }
  });

  const togglePermission = (permissionId) => {
    setSelectedPermissionIds((prevIds) => {
      if (prevIds.includes(permissionId)) {
        return prevIds.filter((id) => id !== permissionId);
      } else {
        return [...prevIds, permissionId];
      }
    });
  };

  // FUNGSI BARU: Untuk membuka/menutup grup
  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Memo untuk filter tetap sama, bekerja pada data mentah
  const filteredPermissions = createMemo(() => {
    const search = searchTerm().toLowerCase();
    if (!search) return allPermissions();
    return allPermissions().filter((perm) =>
      perm.name.toLowerCase().includes(search)
    );
  });

  // MEMO BARU: Untuk mengelompokkan hasil filter
  const groupedPermissions = createMemo(() => {
    const groups = {};
    const titleCase = (str) => str.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

    for (const perm of filteredPermissions()) {
      const parts = perm.name.split('_');
      // Mengambil bagian setelah kata kerja (create, view, edit, delete)
      const groupKey = parts.length > 1 ? parts.slice(1).join('_') : 'Lainnya';
      const groupName = titleCase(groupKey);
      
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(perm);
    }
    return groups;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEdit) {
        await updateRolePermissions(roleData().id, selectedPermissionIds(), user?.token);
      } else {
        // Validasi nama role tidak boleh kosong
        if (!roleData().name.trim()) {
            Swal.fire("Error", "Nama Role tidak boleh kosong.", "error");
            return;
        }
        await createRole(roleData().name, selectedPermissionIds(), user?.token);
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: `Role telah berhasil ${isEdit ? 'diperbarui' : 'dibuat'}.`,
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
      }).then(() => navigate("/manage-permissions"));

    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.message || `Gagal ${isEdit ? 'memperbarui' : 'membuat'} role`,
        showConfirmButton: true,
      });
    }
  };

  return (
    <MainLayout>
      <Show when={!isLoading()} fallback={<div>Loading...</div>}>
        <h1 class="text-2xl font-bold mb-4">
          {isEdit ? `Manage Permissions for Role: ` : "Tambah Role Baru: "}
          <span class="text-blue-600 capitalize">{roleData().name}</span>
        </h1>
        
        <form class="space-y-6" onSubmit={handleSubmit}>
          <Show when={!isEdit}>
            <div>
              <label for="roleName" class="block mb-1 font-medium">Nama Role</label>
              <input
                id="roleName"
                type="text"
                placeholder="Masukkan nama role baru..."
                class="w-full border p-2 rounded"
                value={roleData().name}
                onInput={(e) => setRoleData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
          </Show>

          <div class="border rounded-lg p-4">
             <div class="mb-4">
                <input type="text" placeholder="Cari permission..." class="w-full border p-2 rounded" value={searchTerm()} onInput={(e) => setSearchTerm(e.target.value)} />
             </div>
             <div class="border rounded p-2 max-h-96 overflow-y-auto">
               <For each={Object.entries(groupedPermissions())}>
                  {([groupName, perms]) => (
                    <div class="mb-1">
                      <div class="cursor-pointer font-semibold p-2 rounded hover:bg-gray-100 flex items-center" onClick={() => toggleGroup(groupName)}>
                        <span class="mr-2 transform transition-transform" classList={{ 'rotate-90': expandedGroups()[groupName] }}>▶</span>
                        {groupName} ({perms.length})
                      </div>
                      <Show when={expandedGroups()[groupName]}>
                        <div class="pl-8 pt-2 pb-2 space-y-2">
                          <For each={perms}>
                            {(perm) => (
                              <label class="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" class="h-4 w-4 rounded" checked={selectedPermissionIds().includes(perm.id)} onChange={() => togglePermission(perm.id)} />
                                <span>{perm.name}</span>
                              </label>
                            )}
                          </For>
                        </div>
                      </Show>
                    </div>
                  )}
                </For>
             </div>
           </div>
           <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
             Simpan Perubahan
           </button>
        </form>
      </Show>
    </MainLayout>
  );
}