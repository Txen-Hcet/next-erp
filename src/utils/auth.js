import { users } from "../data/users";

// export function login(username, password) {
//   const user = users.find(
//     (u) => u.username === username && u.password === password
//   );
//   if (user) {
//     localStorage.setItem("user", JSON.stringify(user));
//     return user;
//   } else {
//     return null;
//   }
// }

import { jwtDecode } from "jwt-decode";

export default function getPermissionsFromToken(token) {
  try {
    const decoded = jwtDecode(token);
    return decoded?.role?.permissions || [];
  } catch (err) {
    console.error("Failed to decode token", err);
    return [];
  }
}

// #region LOGIN, REGISTER AND REGISTER
export async function login(username, password) {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Login gagal");
  }

  localStorage.setItem("user", JSON.stringify(data));

  // Ambil permissions dari token
  if (data.token) {
    const perms = getPermissionsFromToken(data.token);
    localStorage.setItem("permissions", JSON.stringify(perms));
  }

  return data;
}

export async function register(
  name,
  username,
  password,
  role_id,
  account_type_id,
  token
) {
  try {
    const response = await fetch(
        //"https://nexttechenterprise.site/api/register",
        `${import.meta.env.VITE_API_URL}/register`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify({
          name,
          username,
          password,
          role_id: parseInt(role_id, 10),
          account_type_id: parseInt(account_type_id, 10),
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Registrasi gagal");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getTokenStatus(token) {
  try {
    const response = await fetch(
        "https://nexttechenterprise.site/api/token-status",
        `${import.meta.env.VITE_API_URL}/token-status`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal mengambil status token");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// #endregion LOGIN, REGISTER AND REGISTER

// #region USERS FUNCTION

export async function getDataUser(id, token) {
  try {
    const response = await fetch(
       //`https://nexttechenterprise.site/api/users/${id}`,
        `${import.meta.env.VITE_API_URL}/users/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal mengambiil data pengguna");
    }

    return data;
  } catch (error) {
    // console.error("Gagal mengambil seluruh data pengguna: ", error.message);
    throw error;
  }
}

// export async function getAllUsers(token) {
//   try {
//     const response = await fetch(
//         //"https://nexttechenterprise.site/api/users",
//         `${import.meta.env.VITE_API_URL}/users`,
//       {
//       method: "GET",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,
//         "ngrok-skip-browser-warning": "any-value",
//       },
//     });

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(data.message || "Gagal mengambiil data pengguna");
//     }

//     return data;
//   } catch (error) {
//     // console.error("Gagal mengambil seluruh data pengguna: ", error.message);
//     throw error;
//   }
// }

export async function getAllUsers(token) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/users`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "any-value",
      },
    });

    const data = await response.json();

    // jangan langsung throw kalau !ok, balikin aja dengan status
    return {
      status: response.status,
      ...data,
    };
  } catch (error) {
    return {
      status: 500,
      message: error.message || "Gagal mengambil data pengguna",
    };
  }
}


export async function updateUser(
  userId,
  name,
  username,
  password,
  role_id,
  account_type_id,
  token
) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/update-user/${userId}`,
        `${import.meta.env.VITE_API_URL}/update-user/${userId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify({
          name,
          username,
          password,
          role_id: parseInt(role_id, 10),
          account_type_id: parseInt(account_type_id, 10),
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `Gagal menghapus data pengguna dengan id: ${userId}`
      );
    }

    return data;
  } catch (error) {
    // console.error("Gagal menghapus pengguna: ", error.message);
    throw error;
  }
}

export async function softDeleteUser(userId, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/delete-user/${userId}`,
        `${import.meta.env.VITE_API_URL}/delete-user/${userId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `Gagal menghapus data pengguna dengan id: ${userId}`
      );
    }

    return data;
  } catch (error) {
    // console.error("Gagal menghapus pengguna: ", error.message);
    throw error;
  }
}

export function saveUser(user) {
  localStorage.setItem("user", JSON.stringify(user));
}

export function getUser() {
  const data = localStorage.getItem("user");
  return data ? JSON.parse(data) : null;
}

// #endregion USERS FUNCTION

// #region ROLE AND PERMISSION
export function hasRole(user, roles = []) {
  if (!user) return false;
  return roles.includes(user.role_id) || roles.includes(user.role_name);
}

export function hasPermission(permissionName) {
  const permissions = JSON.parse(localStorage.getItem("permissions") || "[]");
  return permissions.includes(permissionName);
}

export function hasAnyPermission(permissionNames = []) {
  const permissions = JSON.parse(localStorage.getItem("permissions") || "[]");
  return permissionNames.some((perm) => permissions.includes(perm));
}

export function hasAllPermission(permissionNames = []) {
  const permissions = JSON.parse(localStorage.getItem("permissions") || "[]");
  return permissionNames.every((perm) => permissions.includes(perm));
}

export async function getAllRoles(token) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/roles`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "any-value",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal mengambil data roles");
    }

    return data; // { status: 200, result: [...] }
  } catch (error) {
    throw error;
  }
}

export async function getRoleById(roleId, token) {
  if (!roleId) {
    throw new Error("Role ID tidak boleh kosong.");
  }

  const apiUrl = `${import.meta.env.VITE_API_URL}/roles/${roleId}`;

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "ngrok-skip-browser-warning": "any-value",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Gagal mengambil data untuk role ID ${roleId}.`);
    }

    return data;
  } catch (error) {
    console.error(`Error pada getRoleById untuk ID ${roleId}:`, error);
    throw error;
  }
}

export async function createRole(name, permissionIds, token) {
  const apiUrl = `${import.meta.env.VITE_API_URL}/create-role`;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "ngrok-skip-browser-warning": "any-value",
      },
      body: JSON.stringify({
        name: name,
        permission_ids: permissionIds,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal membuat role baru.");
    }

    return data;
  } catch (error) {
    console.error("Error pada createRole:", error);
    throw error;
  }
}

export async function deleteRole(roleId, token) {
  const apiUrl = `${import.meta.env.VITE_API_URL}/delete-role/${roleId}`;

  try {
    const response = await fetch(apiUrl, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "any-value",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Gagal menghapus role ID ${roleId}.`);
    }
    
    return { success: true, message: "Role berhasil dihapus." };
  } catch (error) {
    console.error(`Error pada deleteRole untuk ID ${roleId}:`, error);
    throw error;
  }
}

export async function getPermissions(token) {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/permissions`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Gagal mengambil permissions");
  }
  return response.json();
}

export async function updateRolePermissions(roleId, permissionIds, token) {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/update-role/${roleId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ permission_ids: permissionIds }),
    }
  );

  if (!response.ok) {
    throw new Error("Gagal update role permissions");
  }
  return response.json();
}

// #endregion ROLE AND PERMISSION

// #region SUPPLIERS FUNCTION

export async function createSupplier(
  token,
  kode,
  nama,
  no_telp,
  no_hp,
  alamat
) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/create-supplier`,
        `${import.meta.env.VITE_API_URL}/create-supplier`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify({
          kode: kode,
          nama: nama,
          no_telp: no_telp,
          no_hp: no_hp,
          alamat: alamat,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal membuat data supplier");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getAllSuppliers(token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/suppliers`,
        `${import.meta.env.VITE_API_URL}/suppliers`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal mengambil data supplier");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getSupplier(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/suppliers/${id}`,
        `${import.meta.env.VITE_API_URL}/suppliers/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `Gagal mengambil supplier dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function updateDataSupplier(
  token,
  id,
  kode,
  nama,
  no_telp,
  no_hp,
  alamat
) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/update-supplier/${id}`,
        `${import.meta.env.VITE_API_URL}/update-supplier/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify({
          kode: kode,
          nama: nama,
          no_telp: no_telp,
          no_hp: no_hp,
          alamat: alamat,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal mengubah data supplier");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function softDeleteSupplier(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/delete-supplier/${id}`,
        `${import.meta.env.VITE_API_URL}/delete-supplier/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `Gagal menghapus data supplier dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// #endregion SUPPLIERS FUNCTION

// #region CUSTOMERS FUNCTION

export async function createCustomer(
  token,
  kode,
  nama,
  npwp,
  customer_type_id,
  no_telp,
  no_hp,
  alamat,
  termin,
  limit_kredit
) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/create-customer`,
        `${import.meta.env.VITE_API_URL}/create-customer`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify({
          kode: kode,
          nama: nama,
          npwp: npwp,
          customer_type_id: parseInt(customer_type_id, 10),
          no_telp: no_telp,
          no_hp: no_hp,
          alamat: alamat,
          termin: termin,
          limit_kredit: Number(limit_kredit),
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal membuat data customer");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getAllCustomers(token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/customers`,
        `${import.meta.env.VITE_API_URL}/customers`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal mengambil data customer");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getCustomer(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/customers/${id}`,
        `${import.meta.env.VITE_API_URL}/customers/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `Gagal mengambil customer dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function updateDataCustomer(
  token,
  id,
  kode,
  nama,
  npwp,
  customer_type_id,
  no_telp,
  no_hp,
  alamat,
  termin,
  limit_kredit
) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/update-customer/${id}`,
        `${import.meta.env.VITE_API_URL}/update-customer/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify({
          kode: kode,
          nama: nama,
          npwp: npwp,
          customer_type_id: parseInt(customer_type_id, 10),
          no_telp: no_telp,
          no_hp: no_hp,
          alamat: alamat,
          termin: termin,
          limit_kredit: Number(limit_kredit),
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal mengubah data customer");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function softDeleteCustomer(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/delete-customer/${id}`,
        `${import.meta.env.VITE_API_URL}/delete-customer/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `Gagal menghapus data customer dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// #endregion CUSTOMERS FUNCTION

// #region COLORS FUNCTION

export async function createColor(token, kode, deskripsi) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/create-warna`,
        `${import.meta.env.VITE_API_URL}/create-warna`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify({ kode: kode, deskripsi: deskripsi }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal membuat data warna");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getAllColors(token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/warna`,
        `${import.meta.env.VITE_API_URL}/warna`,
      {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "any-value",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal mengambil data warna");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getColor(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/warna/${id}`,
        `${import.meta.env.VITE_API_URL}/warna/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = response.json();

    if (!response.ok) {
      throw new Error(data.message || `Gagal mengambil warna dengan id: ${id}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function updateDataColor(token, id, kode, deskripsi) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/update-warna/${id}`,
        `${import.meta.env.VITE_API_URL}/update-warna/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify({ kode: kode, deskripsi: deskripsi }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal mengubah data warna");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function softDeleteColor(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/delete-warna/${id}`,
        `${import.meta.env.VITE_API_URL}/delete-warna/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `Gagal menghapus data warna dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// #endregion COLORS FUNCTION

// #region FABRICS FUNCTION

export async function createFabric(token, corak, konstruksi) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/create-kain`,
        `${import.meta.env.VITE_API_URL}/create-kain`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify({ corak: corak, konstruksi: konstruksi }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal membuat data kain");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getAllFabrics(token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/kain`,
        `${import.meta.env.VITE_API_URL}/kain`,
      {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "any-value",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal mengambil data kain");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getFabric(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/kain/${id}`,
        `${import.meta.env.VITE_API_URL}/kain/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = response.json();

    if (!response.ok) {
      throw new Error(data.message || `Gagal mengambil kain dengan id: ${id}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function updateDataFabric(token, id, corak, konstruksi) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/update-kain/${id}`,
        `${import.meta.env.VITE_API_URL}/update-kain/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify({ corak: corak, konstruksi: konstruksi }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal mengubah data kain");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function softDeleteFabric(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/delete-kain/${id}`,
        `${import.meta.env.VITE_API_URL}/delete-kain/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `Gagal menghapus data kain dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// #endregion FABRICS FUNCTION

// #region SO TYPE FUNCTION

export async function createSOType(token, jenis) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/create-jenis-so`,
        `${import.meta.env.VITE_API_URL}/create-jenis-so`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify({ jenis: jenis }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal membuat data jenis so");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getAllSOTypes(token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/jenis-sos`,
        `${import.meta.env.VITE_API_URL}/jenis-sos`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal mengambil data jenis so");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getSOType(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/jenis-so/${id}`,
        `${import.meta.env.VITE_API_URL}/jenis-so/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `Gagal mengambil jenis so dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function updateDataSOType(token, id, jenis) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/update-jenis-so/${id}`,
        `${import.meta.env.VITE_API_URL}/update-jenis-so/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify({ jenis: jenis }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal mengubah data jenis so");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function softDeleteSOType(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/delete-jenis-so/${id}`,
        `${import.meta.env.VITE_API_URL}/delete-jenis-so/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `Gagal menghapus data jenis so dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// #endregion SO TYPE FUNCTION

// #region CUSTOMER TYPE FUNCTION

export async function createCustomerType(token, jenis) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/create-customer-type`,
        `${import.meta.env.VITE_API_URL}/create-customer-type`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify({ jenis: jenis }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal membuat data jenis so");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// export async function getAllCustomerTypes(token) {
//   try {
//     const response = await fetch(
//         //`https://nexttechenterprise.site/api/customer-types`,
//         `${import.meta.env.VITE_API_URL}/customer-types`,
//       {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//           "ngrok-skip-browser-warning": "any-value",
//         },
//       }
//     );

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(data.message || "Gagal mengambil data jenis so");
//     }

//     return data;
//   } catch (error) {
//     throw error;
//   }
// }

export async function getAllCustomerTypes(token) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/customer-types`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
      }
    );

    const data = await response.json();

    return {
      status: response.status,
      ...data,            
    };
  } catch (error) {
    return {
      status: 500,
      message: error.message || "Gagal mengambil data Customer Type",
    };
  }
}

export async function getCustomerType(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/customer-types/${id}`,
        `${import.meta.env.VITE_API_URL}/customer-types/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `Gagal mengambil jenis so dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function updateDataCustomerType(token, id, jenis) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/update-customer-type/${id}`,
        `${import.meta.env.VITE_API_URL}/update-customer-type/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify({ jenis: jenis }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal mengubah data jenis so");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function softDeleteCustomerType(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/delete-customer-type/${id}`,
        `${import.meta.env.VITE_API_URL}/delete-customer-type/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `Gagal menghapus data jenis so dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// #endregion CUSTOMER TYPE FUNCTION

// #region CURRENCIES FUNCTION

export async function createCurrencies(token, name) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/create-currency`,
        `${import.meta.env.VITE_API_URL}/create-currency`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify({ name: name }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal membuat data jenis so");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// export async function getAllCurrenciess(token) {
//   try {
//     const response = await fetch(
//         //`https://nexttechenterprise.site/api/currencies`,
//         `${import.meta.env.VITE_API_URL}/currencies`,
//       {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//           "ngrok-skip-browser-warning": "any-value",
//         },
//       }
//     );

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(data.message || "Gagal mengambil data jenis so");
//     }

//     return data;
//   } catch (error) {
//     throw error;
//   }
// }

export async function getAllCurrenciess(token) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/currencies`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
      }
    );

    const data = await response.json();

    return {
      status: response.status,
      ...data,            
    };
  } catch (error) {
    return {
      status: 500,
      message: error.message || "Gagal mengambil data Currencies",
    };
  }
}

export async function getCurrencies(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/currencies/${id}`,
        `${import.meta.env.VITE_API_URL}/currencies/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `Gagal mengambil jenis so dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function updateDataCurrencies(token, id, name) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/update-currency/${id}`,
        `${import.meta.env.VITE_API_URL}/update-currency/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify({ name: name }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal mengubah data jenis so");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function softDeleteCurrencies(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/delete-currency/${id}`,
        `${import.meta.env.VITE_API_URL}/delete-currency/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `Gagal menghapus data jenis so dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// #endregion CURRENCIES FUNCTION

// #region SALES CONTRACT FUNCTION

export async function createSalesContract(token, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/create-sales-contract`,
        `${import.meta.env.VITE_API_URL}/create-sales-contract`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    //console.log(payload);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal membuat sales contract");
    }

    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function getAllSalesContracts(token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/sales-contracts`,
        `${import.meta.env.VITE_API_URL}/sales-contracts`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal mengambil data sales contract");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getSalesContracts(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/sales-contracts/${id}`,
        `${import.meta.env.VITE_API_URL}/sales-contracts/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `Gagal mengambil sales contract dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

function cleanObject(obj) {
  if (typeof obj === "string") {
    const cleaned = obj.replace(/[\u00A0\u200B\uFEFF]/g, "").trim();
    return cleaned === "" ? null : cleaned;
  } else if (Array.isArray(obj)) {
    return obj.map(cleanObject);
  } else if (typeof obj === "object" && obj !== null) {
    const cleaned = {};
    for (const key in obj) {
      cleaned[key] = cleanObject(obj[key]);
    }
    return cleaned;
  }
  return obj;
}

export async function updateDataSalesContract(token, id, payload) {
  const cleanedPayload = cleanObject(payload);

  //console.log("PAYLOAD TO SEND:", JSON.stringify(cleanedPayload, null, 2));

  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/update-sales-contract/${id}`,
        `${import.meta.env.VITE_API_URL}/update-sales-contract/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(cleanedPayload),
      }
    );

    const text = await response.text();
    //console.log("RESPONSE TEXT:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("❌ Response is not valid JSON");
      throw new Error("Response is not valid JSON");
    }

    if (!response.ok) {
      throw new Error(data.message || "Gagal mengubah data sales contract");
    }

    return data;
  } catch (error) {
    console.error("❌ Error updateDataSalesContract:", error);
    throw error;
  }
}

export async function softDeleteSalesContract(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/delete-sales-contract/${id}`,
        `${import.meta.env.VITE_API_URL}/delete-sales-contract/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `Gagal menghapus data sales contract dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// #endregion SALES CONTRACT FUNCTION

// #region SALES ORDER FUNCTION

export async function createSalesOrder(token, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/create-sales-order`,
        `${import.meta.env.VITE_API_URL}/create-sales-order`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    //console.log(payload);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal membuat sales order");
    }

    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// export async function getAllSalesOrders(token) {
//   try {
//     const response = await fetch(
//         //`https://nexttechenterprise.site/api/sales-orders`,
//         `${import.meta.env.VITE_API_URL}/sales-orders`,
//       {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//           "ngrok-skip-browser-warning": "any-value",
//         },
//       }
//     );

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(data.message || "Gagal mengambil data sales order");
//     }

//     return data;
//   } catch (error) {
//     throw error;
//   }
// }

export async function getAllSalesOrders(token) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/sales-orders`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
      }
    );

    const data = await response.json();

    return {
      status: response.status,
      ...data,            
    };
  } catch (error) {
    return {
      status: 500,
      message: error.message || "Gagal mengambil data sales order",
    };
  }
}

export async function getSalesOrders(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/sales-orders/${id}`,
        `${import.meta.env.VITE_API_URL}/sales-orders/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `Gagal mengambil jenis sales order dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function updateDataSalesOrder(token, id, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/update-sales-order/${id}`,
        `${import.meta.env.VITE_API_URL}/update-sales-order/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal mengubah dat sales order");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function softDeleteSalesOrder(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/delete-sales-order/${id}`,
        `${import.meta.env.VITE_API_URL}/delete-sales-order/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Gagal menghapus data jenis sales order dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// #endregion SALES ORDER FUNCTION

// #region PACKING LIST FUNCTION

export async function createPackingList(token, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/create-packing-list`,
        `${import.meta.env.VITE_API_URL}/create-packing-list`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    //console.log(payload);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal membuat packing list");
    }

    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// export async function getAllPackingLists(token) {
//   try {
//     const response = await fetch(
//         //`https://nexttechenterprise.site/api/packing-lists`,
//         `${import.meta.env.VITE_API_URL}/packing-lists`,
//       {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//           "ngrok-skip-browser-warning": "any-value",
//         },
//       }
//     );

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(data.message || "Gagal mengambil data packing list");
//     }

//     return data;
//   } catch (error) {
//     throw error;
//   }
// }

export async function getAllPackingLists(token) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/packing-lists`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
      }
    );

    const data = await response.json();

    return {
      status: response.status,
      ...data,            
    };
  } catch (error) {
    return {
      status: 500,
      message: error.message || "Gagal mengambil data Packing List",
    };
  }
}

export async function getPackingLists(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/packing-lists/${id}`,
        `${import.meta.env.VITE_API_URL}/packing-lists/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `Gagal mengambil jenis packing list dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function updateDataPackingList(token, id, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/update-packing-list/${id}`,
        `${import.meta.env.VITE_API_URL}/update-packing-list/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal mengubah data packing list");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function softDeletePackingList(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/delete-packing-list/${id}`,
        `${import.meta.env.VITE_API_URL}/delete-packing-list/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Gagal menghapus data jenis packing list dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// #endregion PACKING LIST FUNCTION

// #region DELIVERY NOTE FUNCTION

export async function createDeliveryNote(token, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/create-surat-jalan`,
        `${import.meta.env.VITE_API_URL}/create-surat-jalan`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal membuat packing list order");
    }

    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// export async function getAllDeliveryNotes(token) {
//   try {
//     const response = await fetch(
//         //`https://nexttechenterprise.site/api/surat-jalan`,
//         `${import.meta.env.VITE_API_URL}/surat-jalan`,
//       {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//           "ngrok-skip-browser-warning": "any-value",
//         },
//       }
//     );

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(
//         data.message || "Gagal mengambil data packing list order"
//       );
//     }

//     return data;
//   } catch (error) {
//     throw error;
//   }
// }

export async function getAllDeliveryNotes(token) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/surat-jalan`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
      }
    );

    const data = await response.json();

    return {
      status: response.status,
      ...data,            
    };
  } catch (error) {
    return {
      status: 500,
      message: error.message || "Gagal mengambil data Surat Jalan Sales",
    };
  }
}

export async function getDeliveryNotes(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/surat-jalan/${id}`,
        `${import.meta.env.VITE_API_URL}/surat-jalan/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Gagal mengambil jenis packing list order dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function updateDataDeliveryNote(token, id, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/update-surat-jalan/${id}`,
        `${import.meta.env.VITE_API_URL}/update-surat-jalan/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal mengubah data packing list order");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function softDeleteDeliveryNote(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/delete-surat-jalan/${id}`,
        `${import.meta.env.VITE_API_URL}/delete-surat-jalan/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Gagal menghapus data jenis packing list order dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// #endregion DELIVERY NOTE FUNCTION

// #region SATUAN UNIT FUNCTION

export async function createSatuanUnit(token, satuan) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/create-satuan-unit`,
        `${import.meta.env.VITE_API_URL}/create-satuan-unit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify({ satuan: satuan }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal membuat satuan unit");
    }

    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function getAllSatuanUnits(token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/satuan-unit`,
        `${import.meta.env.VITE_API_URL}/satuan-unit`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal mengambil data satuan unit");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getSatuanUnits(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/satuan-unit/${id}`,
        `${import.meta.env.VITE_API_URL}/satuan-unit/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `Gagal mengambil jenis satuan unit dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function updateDataSatuanUnit(token, id, satuan) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/update-satuan-unit/${id}`,
        `${import.meta.env.VITE_API_URL}/update-satuan-unit/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify({ satuan: satuan }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal mengubah data satuan unit");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function softDeleteSatuanUnit(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/delete-satuan-unit/${id}`,
        `${import.meta.env.VITE_API_URL}/delete-satuan-unit/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Gagal menghapus data jenis satuan unit dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// #endregion SATUAN UNIT FUNCTION

// #region GRADE FUNCTION

export async function createGrade(token, grade) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/create-grade`,
        `${import.meta.env.VITE_API_URL}/create-grade`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify({ grade: grade }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal membuat grade");
    }

    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// export async function getAllGrades(token) {
//   try {
//     const response = await fetch(
//         //`https://nexttechenterprise.site/api/grades`,
//         `${import.meta.env.VITE_API_URL}/grades`,
//       {
//       method: "GET",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,
//         "ngrok-skip-browser-warning": "any-value",
//       },
//     });

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(data.message || "Gagal mengambil data grade");
//     }

//     return data;
//   } catch (error) {
//     throw error;
//   }
// }

export async function getAllGrades(token) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/grades`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
      }
    );

    const data = await response.json();

    return {
      status: response.status,
      ...data,            
    };
  } catch (error) {
    return {
      status: 500,
      message: error.message || "Gagal mengambil data Grades",
    };
  }
}

export async function getGrades(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/grades/${id}`,
        `${import.meta.env.VITE_API_URL}/grades/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `Gagal mengambil jenis grade dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function updateDataGrade(token, id, grade) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/update-grade/${id}`,
        `${import.meta.env.VITE_API_URL}/update-grade/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify({ grade: grade }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal mengubah data grade");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function softDeleteGrade(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/delete-grade/${id}`,
        `${import.meta.env.VITE_API_URL}/delete-grade/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `Gagal menghapus data jenis grade dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// #endregion GRADE FUNCTION

// #region LAST SEQUENCE FUNCTION

export async function getLastSequence(token, doc, type, ppn) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/last-sequence?doc=${doc}&type=${type}&ppn=${ppn}`,
        `${import.meta.env.VITE_API_URL}/last-sequence?doc=${doc}&type=${type}&ppn=${ppn}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Gagal mengambil nomor sequence terakhir"
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// #endregion LAST SEQUENCE FUNCTION

// #region BELI GREIGE CONTRACT FUNCTION
export async function createBeliGreige(token, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/create-purchase-greige-contract`,
        `${import.meta.env.VITE_API_URL}/create-purchase-greige-contract`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal membuat beli greige contract");
    }

    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// export async function getAllBeliGreiges(token) {
//   try {
//     const response = await fetch(
//         //`https://nexttechenterprise.site/api/purchase-greige-contracts`,
//         `${import.meta.env.VITE_API_URL}/purchase-greige-contracts`,
//       {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//           "ngrok-skip-browser-warning": "any-value",
//         },
//       }
//     );

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(
//         data.message || "Gagal mengambil data beli greige contract"
//       );
//     }

//     return data;
//   } catch (error) {
//     throw error;
//   }
// }

export async function getAllBeliGreiges(token) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/purchase-greige-contracts`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
      }
    );

    const data = await response.json();

    return {
      status: response.status,
      ...data,            
    };
  } catch (error) {
    return {
      status: 500,
      message: error.message || "Gagal mengambil data Greige Contract List",
    };
  }
}

export async function getBeliGreiges(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/purchase-greige-contracts/${id}`,
        `${import.meta.env.VITE_API_URL}/purchase-greige-contracts/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Gagal mengambil jenis beli greige contract dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function updateDataBeliGreige(token, id, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/update-purchase-greige-contract/${id}`,
        `${import.meta.env.VITE_API_URL}/update-purchase-greige-contract/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    //console.log(payload);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Gagal mengubah dat beli greige contract"
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function softDeleteBeliGreige(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/delete-purchase-greige-contract/${id}`,
        `${import.meta.env.VITE_API_URL}/delete-purchase-greige-contract/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Gagal menghapus data jenis beli greige contract dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}
// #endregion BELI GREIGE CONTRACT FUNCTION

// #region BELI GREIGE ORDER FUNCTION
export async function createBeliGreigeOrder(token, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/create-purchase-greige-order`,
        `${import.meta.env.VITE_API_URL}/create-purchase-greige-order`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    //console.log(payload);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal membuat beli greige");
    }

    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// export async function getAllBeliGreigeOrders(token) {
//   try {
//     const response = await fetch(
//         //`https://nexttechenterprise.site/api/purchase-greige-orders`,
//         `${import.meta.env.VITE_API_URL}/purchase-greige-orders`,
//       {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//           "ngrok-skip-browser-warning": "any-value",
//         },
//       }
//     );

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(data.message || "Gagal mengambil data beli greige");
//     }

//     return data;
//   } catch (error) {
//     throw error;
//   }
// }

export async function getAllBeliGreigeOrders(token) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/purchase-greige-orders`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
      }
    );

    const data = await response.json();

    return {
      status: response.status,
      ...data,            
    };
  } catch (error) {
    return {
      status: 500,
      message: error.message || "Gagal mengambil data Purchase Order Greige",
    };
  }
}

export async function getBeliGreigeOrders(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/purchase-greige-orders/${id}`,
        `${import.meta.env.VITE_API_URL}/purchase-greige-orders/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `Gagal mengambil jenis beli greige dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function updateDataBeliGreigeOrder(token, id, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/update-purchase-greige-order/${id}`,
        `${import.meta.env.VITE_API_URL}/update-purchase-greige-order/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    //console.log(payload);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal mengubah dat beli greige");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function softDeleteBeliGreigeOrder(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/delete-purchase-greige-order/${id}`,
        `${import.meta.env.VITE_API_URL}/delete-purchase-greige-order/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Gagal menghapus data jenis beli greige dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}
// #endregion BELI GREIGE ORDER FUNCTION

// #region BELI GREIGE DELIVERY NOTE FUNCTION

export async function createBGDeliveryNote(token, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/create-purchase-greige-surat-jalan`,
        `${import.meta.env.VITE_API_URL}/create-purchase-greige-surat-jalan`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal membuat surat jalan beli greige");
    }

    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// export async function getAllBGDeliveryNotes(token) {
//   try {
//     const response = await fetch(
//         //`https://nexttechenterprise.site/api/purchase-greige-surat-jalan`,
//         `${import.meta.env.VITE_API_URL}/purchase-greige-surat-jalan`,
//       {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//           "ngrok-skip-browser-warning": "any-value",
//         },
//       }
//     );

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(
//         data.message || "Gagal mengambil data surat jalan beli greige"
//       );
//     }

//     return data;
//   } catch (error) {
//     throw error;
//   }
// }

export async function getAllBGDeliveryNotes(token) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/purchase-greige-surat-jalan`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
      }
    );

    const data = await response.json();

    return {
      status: response.status,
      ...data,            
    };
  } catch (error) {
    return {
      status: 500,
      message: error.message || "Gagal mengambil data Surat Penerimaan Greige",
    };
  }
}

export async function getBGDeliveryNotes(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/purchase-greige-surat-jalan/${id}`,
        `${import.meta.env.VITE_API_URL}/purchase-greige-surat-jalan/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Gagal mengambil jenis surat jalan beli greige dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function updateDataBGDeliveryNote(token, id, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/update-purchase-greige-surat-jalan/${id}`,
        `${import.meta.env.VITE_API_URL}/update-purchase-greige-surat-jalan/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Gagal mengubah data surat jalan beli greige"
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function softDeleteBGDeliveryNote(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/delete-purchase-greige-surat-jalan/${id}`,
        `${import.meta.env.VITE_API_URL}/delete-purchase-greige-surat-jalan/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Gagal menghapus data surat jalan beli greige dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// #endregion BELI GREIGE DELIVERY NOTE FUNCTION

// #region ORDER CELUP CONTRACT FUNCTION
export async function createOrderCelup(token, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/create-purchase-celup-contract`,
        `${import.meta.env.VITE_API_URL}/create-purchase-celup-contract`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal membuat order celup contract");
    }

    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// export async function getAllOrderCelups(token) {
//   try {
//     const response = await fetch(
//         //`https://nexttechenterprise.site/api/purchase-celup-contracts`,
//         `${import.meta.env.VITE_API_URL}/purchase-celup-contracts`,
//       {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//           "ngrok-skip-browser-warning": "any-value",
//         },
//       }
//     );

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(
//         data.message || "Gagal mengambil data order celup contract"
//       );
//     }

//     return data;
//   } catch (error) {
//     throw error;
//   }
// }

export async function getAllOrderCelups(token) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/purchase-celup-contracts`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "any-value",
      },
    });

    const data = await response.json();

    return {
      status: response.status,
      ...data,
    };
  } catch (error) {
    return {
      status: 500,
      message: error.message || "Gagal mengambil data kontrak proses",
    };
  }
}

export async function getOrderCelups(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/purchase-celup-contracts/${id}`,
        `${import.meta.env.VITE_API_URL}/purchase-celup-contracts/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Gagal mengambil jenis order celup contract dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function updateDataOrderCelup(token, id, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/update-purchase-celup-contract/${id}`,
        `${import.meta.env.VITE_API_URL}/update-purchase-celup-contract/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    //console.log(payload);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Gagal mengubah dat order celup contract"
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function softDeleteOrderCelup(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/delete-purchase-celup-contract/${id}`,
        `${import.meta.env.VITE_API_URL}/delete-purchase-celup-contract/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Gagal menghapus data jenis order celup contract dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}
// #endregion ORDER CELUP CONTRACT FUNCTION

// #region ORDER CELUP ORDER FUNCTION
export async function createOrderCelupOrder(token, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/create-purchase-celup-order`,
        `${import.meta.env.VITE_API_URL}/create-purchase-celup-order`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    //console.log(payload);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal membuat order celup order");
    }

    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// export async function getAllOrderCelupOrders(token) {
//   try {
//     const response = await fetch(
//         //`https://nexttechenterprise.site/api/purchase-celup-orders`,
//         `${import.meta.env.VITE_API_URL}/purchase-celup-orders`,
//       {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//           "ngrok-skip-browser-warning": "any-value",
//         },
//       }
//     );

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(data.message || "Gagal mengambil data order celup order");
//     }

//     return data;
//   } catch (error) {
//     throw error;
//   }
// }

export async function getAllOrderCelupOrders(token) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/purchase-celup-orders`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "any-value",
      },
    });

    const data = await response.json();

    return {
      status: response.status,
      ...data,
    };
  } catch (error) {
    return {
      status: 500,
      message: error.message || "Gagal mengambil data order celup",
    };
  }
}


export async function getOrderCelupOrders(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/purchase-celup-orders/${id}`,
        `${import.meta.env.VITE_API_URL}/purchase-celup-orders/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Gagal mengambil jenis order celup order dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function updateDataOrderCelupOrder(token, id, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/update-purchase-celup-order/${id}`,
        `${import.meta.env.VITE_API_URL}/update-purchase-celup-order/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    //console.log(payload);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal mengubah dat order celup order");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function softDeleteOrderCelupOrder(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/delete-purchase-celup-order/${id}`,
        `${import.meta.env.VITE_API_URL}/delete-purchase-celup-order/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Gagal menghapus data order celup order dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}
// #endregion ORDER CELUP ORDER FUNCTION

// #region ORDER CELUP DELIVERY NOTE FUNCTION

export async function createOCDeliveryNote(token, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/create-purchase-celup-surat-jalan`,
        `${import.meta.env.VITE_API_URL}/create-purchase-celup-surat-jalan`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal membuat surat jalan order celup");
    }

    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// export async function getAllOCDeliveryNotes(token) {
//   try {
//     const response = await fetch(
//         //`https://nexttechenterprise.site/api/purchase-celup-surat-jalan`,
//         `${import.meta.env.VITE_API_URL}/purchase-celup-surat-jalan`,
//       {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//           "ngrok-skip-browser-warning": "any-value",
//         },
//       }
//     );

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(
//         data.message || "Gagal mengambil data surat jalan order celup"
//       );
//     }

//     return data;
//   } catch (error) {
//     throw error;
//   }
// }

export async function getAllOCDeliveryNotes(token) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/purchase-celup-surat-jalan`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
      }
    );

    const data = await response.json();

    return {
      status: response.status,
      ...data,            
    };
  } catch (error) {
    return {
      status: 500,
      message: error.message || "Gagal mengambil data Surat Penerimaan Order Celup",
    };
  }
}

export async function getOCDeliveryNotes(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/purchase-celup-surat-jalan/${id}`,
        `${import.meta.env.VITE_API_URL}/purchase-celup-surat-jalan/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Gagal mengambil jenis surat jalan order celup dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function updateDataOCDeliveryNote(token, id, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/update-purchase-celup-surat-jalan/${id}`,
        `${import.meta.env.VITE_API_URL}/update-purchase-celup-surat-jalan/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Gagal mengubah data surat jalan order celup"
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function softDeleteOCDeliveryNote(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/delete-purchase-celup-surat-jalan/${id}`,
        `${import.meta.env.VITE_API_URL}/delete-purchase-celup-surat-jalan/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Gagal menghapus data surat jalan order celup dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// #endregion ORDER CELUP DELIVERY NOTE FUNCTION

// #region KAIN JADI CONTRACT FUNCTION
export async function createKainJadi(token, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/create-purchase-finish-contract`,
        `${import.meta.env.VITE_API_URL}/create-purchase-finish-contract`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal membuat kain finish contract");
    }

    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// export async function getAllKainJadis(token) {
//   try {
//     const response = await fetch(
//         //`https://nexttechenterprise.site/api/purchase-finish-contracts`,
//         `${import.meta.env.VITE_API_URL}/purchase-finish-contracts`,
//       {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//           "ngrok-skip-browser-warning": "any-value",
//         },
//       }
//     );

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(
//         data.message || "Gagal mengambil data kain finish contract"
//       );
//     }

//     return data;
//   } catch (error) {
//     throw error;
//   }
// }

export async function getAllKainJadis(token) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/purchase-finish-contracts`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
      }
    );

    const data = await response.json();

    return {
      status: response.status, // ← simpan status asli dari server
      ...data,                 // ← gabung dengan body JSON
    };
  } catch (error) {
    return {
      status: 500,
      message: error.message || "Gagal mengambil data kontrak kain jadi",
    };
  }
}


export async function getKainJadis(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/purchase-finish-contracts/${id}`,
        `${import.meta.env.VITE_API_URL}/purchase-finish-contracts/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Gagal mengambil jenis kain finish contract dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function updateDataKainJadi(token, id, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/update-purchase-finish-contract/${id}`,
        `${import.meta.env.VITE_API_URL}/update-purchase-finish-contract/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    //console.log(payload);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Gagal mengubah dat kain finish contract"
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function softDeleteKainJadi(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/delete-purchase-finish-contract/${id}`,
        `${import.meta.env.VITE_API_URL}/delete-purchase-finish-contract/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Gagal menghapus data jenis kain finish contract dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}
// #endregion KAIN JADI CONTRACT FUNCTION

// #region KAIN JADI ORDER FUNCTION
export async function createKainJadiOrder(token, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/create-purchase-finish-order`,
        `${import.meta.env.VITE_API_URL}/create-purchase-finish-order`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    //console.log(payload);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal membuat kain finish order");
    }

    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// export async function getAllKainJadiOrders(token) {
//   try {
//     const response = await fetch(
//         //`https://nexttechenterprise.site/api/purchase-finish-orders`,
//         `${import.meta.env.VITE_API_URL}/purchase-finish-orders`,
//       {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//           "ngrok-skip-browser-warning": "any-value",
//         },
//       }
//     );

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(data.message || "Gagal mengambil data kain finish order");
//     }

//     return data;
//   } catch (error) {
//     throw error;
//   }
// }

export async function getAllKainJadiOrders(token) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/purchase-finish-orders`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
      }
    );

    const data = await response.json();

    return {
      status: response.status,
      ...data,            
    };
  } catch (error) {
    return {
      status: 500,
      message: error.message || "Gagal mengambil data order kain jadi",
    };
  }
}


export async function getKainJadiOrders(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/purchase-finish-orders/${id}`,
        `${import.meta.env.VITE_API_URL}/purchase-finish-orders/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Gagal mengambil jenis kain finish order dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function updateDataKainJadiOrder(token, id, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/update-purchase-finish-order/${id}`,
        `${import.meta.env.VITE_API_URL}/update-purchase-finish-order/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    //console.log(payload);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal mengubah dat kain finish order");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function softDeleteKainJadiOrder(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/delete-purchase-finish-order/${id}`,
        `${import.meta.env.VITE_API_URL}/delete-purchase-finish-order/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Gagal menghapus data kain finish order dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}
// #endregion KAIN JADI ORDER FUNCTION

// #region KAIN JADI DELIVERY NOTE FUNCTION

export async function createKJDeliveryNote(token, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/create-purchase-finish-surat-jalan`,
        `${import.meta.env.VITE_API_URL}/create-purchase-finish-surat-jalan`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal membuat surat jalan kain finish");
    }

    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// export async function getAllKJDeliveryNotes(token) {
//   try {
//     const response = await fetch(
//         //`https://nexttechenterprise.site/api/purchase-finish-surat-jalan`,
//         `${import.meta.env.VITE_API_URL}/purchase-finish-surat-jalan`,
//       {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//           "ngrok-skip-browser-warning": "any-value",
//         },
//       }
//     );

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(
//         data.message || "Gagal mengambil data surat jalan kain finish"
//       );
//     }

//     return data;
//   } catch (error) {
//     throw error;
//   }
// }

export async function getAllKJDeliveryNotes(token) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/purchase-finish-surat-jalan`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
      }
    );

    const data = await response.json();

    return {
      status: response.status,
      ...data,            
    };
  } catch (error) {
    return {
      status: 500,
      message: error.message || "Gagal mengambil data Surat Penerimaan Kain Finish",
    };
  }
}

export async function getKJDeliveryNotes(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/purchase-finish-surat-jalan/${id}`,
        `${import.meta.env.VITE_API_URL}/purchase-finish-surat-jalan/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Gagal mengambil jenis surat jalan kain finish dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function updateDataKJDeliveryNote(token, id, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/update-purchase-finish-surat-jalan/${id}`,
        `${import.meta.env.VITE_API_URL}/update-purchase-finish-surat-jalan/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Gagal mengubah data surat jalan kain finish"
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function softDeleteKJDeliveryNote(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/delete-purchase-finish-surat-jalan/${id}`,
        `${import.meta.env.VITE_API_URL}/delete-purchase-finish-surat-jalan/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Gagal menghapus data surat jalan kain finish dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// #endregion KAIN JADI DELIVERY NOTE FUNCTION

// #region JUAL BELI CONTRACT FUNCTION
export async function createJualBeli(token, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/create-jual-beli`,
        `${import.meta.env.VITE_API_URL}/create-jual-beli`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal membuat jual beli");
    }

    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// export async function getAllJualBelis(token) {
//   try {
//     const response = await fetch(
//         //`https://nexttechenterprise.site/api/jual-beli`,
//         `${import.meta.env.VITE_API_URL}/jual-beli`,
//       {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//           "ngrok-skip-browser-warning": "any-value",
//         },
//       }
//     );

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(data.message || "Gagal mengambil data jual beli");
//     }

//     return data;
//   } catch (error) {
//     throw error;
//   }
// }

export async function getAllJualBelis(token) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/jual-beli`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
      }
    );

    const data = await response.json();

    return {
      status: response.status,
      ...data,            
    };
  } catch (error) {
    return {
      status: 500,
      message: error.message || "Gagal mengambil data jual beli order",
    };
  }
}

export async function getJualBelis(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/jual-beli/${id}`,
        `${import.meta.env.VITE_API_URL}/jual-beli/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `Gagal mengambil jenis jual beli dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function updateDataJualBeli(token, id, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/update-jual-beli/${id}`,
        `${import.meta.env.VITE_API_URL}/update-jual-beli/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    //console.log(payload);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal mengubah dat jual beli");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function softDeleteJualBeli(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/delete-jual-beli/${id}`,
        `${import.meta.env.VITE_API_URL}/delete-jual-beli/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `Gagal menghapus data jenis jual beli dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}
// #endregion JUAL BELI CONTRACT FUNCTION

// #region JUAL BELI DELIVERY NOTE FUNCTION

export async function createJBDeliveryNote(token, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/create-purchase-finish-surat-jalan`,
        `${import.meta.env.VITE_API_URL}/create-jual-beli-surat-jalan`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal membuat surat jalan jual beli");
    }

    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// export async function getAllJBDeliveryNotes(token) {
//   try {
//     const response = await fetch(
//         //`https://nexttechenterprise.site/api/purchase-finish-surat-jalan`,
//         `${import.meta.env.VITE_API_URL}/jual-beli-surat-jalan`,
//       {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//           "ngrok-skip-browser-warning": "any-value",
//         },
//       }
//     );

//     const data = await response.json();

//     if (!response.ok) {
//       throw new Error(
//         data.message || "Gagal mengambil data surat jalan jual beli"
//       );
//     }

//     return data;
//   } catch (error) {
//     throw error;
//   }
// }

export async function getAllJBDeliveryNotes(token) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/jual-beli-surat-jalan`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
      }
    );

    const data = await response.json();

    return {
      status: response.status,
      ...data,            
    };
  } catch (error) {
    return {
      status: 500,
      message: error.message || "Gagal mengambil data Surat Penerimaan Jual Beli",
    };
  }
}

export async function getJBDeliveryNotes(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/purchase-finish-surat-jalan/${id}`,
        `${import.meta.env.VITE_API_URL}/jual-beli-surat-jalan/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Gagal mengambil jenis surat jalan jual beli dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function updateDataJBDeliveryNote(token, id, payload) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/update-purchase-finish-surat-jalan/${id}`,
        `${import.meta.env.VITE_API_URL}/update-jual-beli-surat-jalan/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Gagal mengubah data surat jalan jual beli"
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function softDeleteJBDeliveryNote(id, token) {
  try {
    const response = await fetch(
        //`https://nexttechenterprise.site/api/delete-purchase-finish-surat-jalan/${id}`,
        `${import.meta.env.VITE_API_URL}/delete-jual-beli-surat-jalan/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-type",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Gagal menghapus data surat jalan jual beli dengan id: ${id}`
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// #endregion JUAL BELI DELIVERY NOTE FUNCTION

// #startregion INVOICE
export async function setInvoiceSales(token, id, payload = {}) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/sales-surat-jalan-set-delivered/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal update status delivered Surat Jalan");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function unsetInvoiceSales(token, id, payload = {}) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/sales-surat-jalan-unset-delivered/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal update status delivered Surat Jalan");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function setInvoiceJB(token, id, payload = {}) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/jual-beli-surat-jalan-set-delivered/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal update status delivered Surat Jalan");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function unsetInvoiceJB(token, id, payload = {}) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/jual-beli-surat-jalan-unset-delivered/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal update status delivered Surat Jalan");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// #endregion INVOICE

export function logout() {
  localStorage.removeItem("user");
  localStorage.removeItem("permissions");
}
