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

// #region LOGIN, REGISTER AND REGISTER

export async function login(username, password) {
  try {
    const response = await fetch("https://nexttechenterprise.site/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    localStorage.setItem("user", JSON.stringify(data));

    if (!response.ok) {
      throw new Error(data.message || "Login gagal");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function register(name, username, password, role_id, token) {
  try {
    const response = await fetch(
      "https://nexttechenterprise.site/api/register",
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
      `https://nexttechenterprise.site/api/users/${id}`,
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

export async function getAllUsers(token) {
  try {
    const response = await fetch("https://nexttechenterprise.site/api/users", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "any-value",
      },
    });

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

export async function updateUser(userId, name, username, role_id, token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/update-user/${userId}`,
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
          role_id: parseInt(role_id, 10),
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
      `https://nexttechenterprise.site/api/delete-user/${userId}`,
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

export function getUser() {
  return JSON.parse(localStorage.getItem("user"));
}

// #endregion USERS FUNCTION

// #region SUPPLIERS FUNCTION

export async function createSupplier(
  token,
  kode,
  alias,
  nama,
  no_telp,
  no_hp,
  alamat
) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/create-supplier`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify({
          kode: kode,
          alias: alias,
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
      `https://nexttechenterprise.site/api/suppliers`,
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
      `https://nexttechenterprise.site/api/suppliers/${id}`,
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
  alias,
  nama,
  no_telp,
  no_hp,
  alamat
) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/update-supplier/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify({
          kode: kode,
          alias: alias,
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
      `https://nexttechenterprise.site/api/delete-supplier/${id}`,
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
  alias,
  nama,
  customer_type_id,
  no_telp,
  no_hp,
  alamat,
  termin,
  limit_kredit
) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/create-customer`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify({
          kode: kode,
          alias: alias,
          nama: nama,
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
      `https://nexttechenterprise.site/api/customers`,
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
      `https://nexttechenterprise.site/api/customers/${id}`,
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
  alias,
  nama,
  customer_type_id,
  no_telp,
  no_hp,
  alamat,
  termin,
  limit_kredit
) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/update-customer/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify({
          kode: kode,
          alias: alias,
          nama: nama,
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
      `https://nexttechenterprise.site/api/delete-customer/${id}`,
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

export async function createColor(token, kode, jenis) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/create-warna`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify({ kode: kode, jenis: jenis }),
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
    const response = await fetch(`https://nexttechenterprise.site/api/warna`, {
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
      `https://nexttechenterprise.site/api/warna/${id}`,
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

export async function updateDataColor(token, id, kode, jenis) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/update-warna/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify({ kode: kode, jenis: jenis }),
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
      `https://nexttechenterprise.site/api/delete-warna/${id}`,
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

export async function createFabric(token, kode, jenis) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/create-kain`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify({ kode: kode, jenis: jenis }),
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
    const response = await fetch(`https://nexttechenterprise.site/api/kain`, {
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
      `https://nexttechenterprise.site/api/kain/${id}`,
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

export async function updateDataFabric(token, id, kode, jenis) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/update-kain/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "any-value",
        },
        body: JSON.stringify({ kode: kode, jenis: jenis }),
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
      `https://nexttechenterprise.site/api/delete-kain/${id}`,
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
      `https://nexttechenterprise.site/api/create-jenis-so`,
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
      `https://nexttechenterprise.site/api/jenis-sos`,
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
      `https://nexttechenterprise.site/api/jenis-so/${id}`,
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
      `https://nexttechenterprise.site/api/update-jenis-so/${id}`,
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
      `https://nexttechenterprise.site/api/delete-jenis-so/${id}`,
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
      `https://nexttechenterprise.site/api/create-customer-type`,
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

export async function getAllCustomerTypes(token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/customer-types`,
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

export async function getCustomerType(id, token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/customer-types/${id}`,
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
      `https://nexttechenterprise.site/api/update-customer-type/${id}`,
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
      `https://nexttechenterprise.site/api/delete-customer-type/${id}`,
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
      `https://nexttechenterprise.site/api/create-currency`,
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

export async function getAllCurrenciess(token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/currencies`,
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

export async function getCurrencies(id, token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/currencies/${id}`,
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
      `https://nexttechenterprise.site/api/update-currency/${id}`,
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
      `https://nexttechenterprise.site/api/delete-currency/${id}`,
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
      `https://nexttechenterprise.site/api/create-sales-contract`,
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
      `https://nexttechenterprise.site/api/sales-contracts`,
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

export async function getLatestSalesContractNumber(token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/last-sales-contract`,
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
        data.message || "Gagal mengambil data nomor sales contract terakhir"
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getSalesContracts(id, token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/sales-contracts/${id}`,
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

  console.log("PAYLOAD TO SEND:", JSON.stringify(cleanedPayload, null, 2));

  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/update-sales-contract/${id}`,
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
    console.log("RESPONSE TEXT:", text);

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
      `https://nexttechenterprise.site/api/delete-sales-contract/${id}`,
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
      `https://nexttechenterprise.site/api/create-sales-order`,
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

    console.log(payload);

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

export async function getAllSalesOrders(token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/sales-orders`,
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
      throw new Error(data.message || "Gagal mengambil data sales order");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getSalesOrders(id, token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/sales-orders/${id}`,
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
      `https://nexttechenterprise.site/api/update-sales-order/${id}`,
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
      `https://nexttechenterprise.site/api/delete-sales-order/${id}`,
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
      `https://nexttechenterprise.site/api/create-packing-list`,
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

    console.log(payload);

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

export async function getAllPackingLists(token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/packing-lists`,
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
      throw new Error(data.message || "Gagal mengambil data packing list");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getPackingLists(id, token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/packing-lists/${id}`,
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
      `https://nexttechenterprise.site/api/update-packing-list/${id}`,
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
      `https://nexttechenterprise.site/api/delete-packing-list/${id}`,
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

export async function getLastPackingList(token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/last-packing-list`,
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
        data.message || "Gagal mengambil data terakhir packing list"
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
      `https://nexttechenterprise.site/api/create-surat-jalan`,
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

export async function getAllDeliveryNotes(token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/surat-jalan`,
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
        data.message || "Gagal mengambil data packing list order"
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getDeliveryNotes(id, token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/surat-jalan/${id}`,
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
      `https://nexttechenterprise.site/api/update-surat-jalan/${id}`,
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
      `https://nexttechenterprise.site/api/delete-surat-jalan/${id}`,
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
      `https://nexttechenterprise.site/api/create-satuan-unit`,
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
      `https://nexttechenterprise.site/api/satuan-unit`,
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
      `https://nexttechenterprise.site/api/satuan-unit/${id}`,
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
      `https://nexttechenterprise.site/api/update-satuan-unit/${id}`,
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
      `https://nexttechenterprise.site/api/delete-satuan-unit/${id}`,
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
      `https://nexttechenterprise.site/api/create-grade`,
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

export async function getAllGrades(token) {
  try {
    const response = await fetch(`https://nexttechenterprise.site/api/grades`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "any-value",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Gagal mengambil data grade");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getGrades(id, token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/grades/${id}`,
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
      `https://nexttechenterprise.site/api/update-grade/${id}`,
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
      `https://nexttechenterprise.site/api/delete-grade/${id}`,
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
      `https://nexttechenterprise.site/api/last-sequence?doc=${doc}&type=${type}&ppn=${ppn}`,
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
      `https://nexttechenterprise.site/api/create-purchase-greige-contract`,
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

export async function getAllBeliGreiges(token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/purchase-greige-contracts`,
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
        data.message || "Gagal mengambil data beli greige contract"
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getBeliGreiges(id, token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/purchase-greige-contracts/${id}`,
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
      `https://nexttechenterprise.site/api/update-purchase-greige-contract/${id}`,
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

    console.log(payload);

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
      `https://nexttechenterprise.site/api/delete-purchase-greige-contract/${id}`,
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
      `https://nexttechenterprise.site/api/create-purchase-greige-order`,
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

    console.log(payload);

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

export async function getAllBeliGreigeOrders(token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/purchase-greige-orders`,
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
      throw new Error(data.message || "Gagal mengambil data beli greige");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getBeliGreigeOrders(id, token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/purchase-greige-orders/${id}`,
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
      `https://nexttechenterprise.site/api/update-purchase-greige-order/${id}`,
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

    console.log(payload);

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
      `https://nexttechenterprise.site/api/delete-purchase-greige-order/${id}`,
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
      `https://nexttechenterprise.site/api/create-purchase-greige-surat-jalan`,
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

export async function getAllBGDeliveryNotes(token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/purchase-greige-surat-jalan`,
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
        data.message || "Gagal mengambil data surat jalan beli greige"
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getBGDeliveryNotes(id, token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/purchase-greige-surat-jalan/${id}`,
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
      `https://nexttechenterprise.site/api/update-purchase-greige-surat-jalan/${id}`,
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
      `https://nexttechenterprise.site/api/delete-purchase-greige-surat-jalan/${id}`,
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
      `https://nexttechenterprise.site/api/create-purchase-celup-contract`,
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

export async function getAllOrderCelups(token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/purchase-celup-contracts`,
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
        data.message || "Gagal mengambil data order celup contract"
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getOrderCelups(id, token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/purchase-celup-contracts/${id}`,
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
      `https://nexttechenterprise.site/api/update-purchase-celup-contract/${id}`,
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

    console.log(payload);

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
      `https://nexttechenterprise.site/api/delete-purchase-celup-contract/${id}`,
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
      `https://nexttechenterprise.site/api/create-purchase-celup-order`,
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

    console.log(payload);

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

export async function getAllOrderCelupOrders(token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/purchase-celup-orders`,
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
      throw new Error(data.message || "Gagal mengambil data order celup order");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getOrderCelupOrders(id, token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/purchase-celup-orders/${id}`,
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
      `https://nexttechenterprise.site/api/update-purchase-celup-order/${id}`,
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

    console.log(payload);

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
      `https://nexttechenterprise.site/api/delete-purchase-celup-order/${id}`,
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
      `https://nexttechenterprise.site/api/create-purchase-celup-surat-jalan`,
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

export async function getAllOCDeliveryNotes(token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/purchase-celup-surat-jalan`,
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
        data.message || "Gagal mengambil data surat jalan order celup"
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getOCDeliveryNotes(id, token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/purchase-celup-surat-jalan/${id}`,
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
      `https://nexttechenterprise.site/api/update-purchase-celup-surat-jalan/${id}`,
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
      `https://nexttechenterprise.site/api/delete-purchase-celup-surat-jalan/${id}`,
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
      `https://nexttechenterprise.site/api/create-purchase-finish-contract`,
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

export async function getAllKainJadis(token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/purchase-finish-contracts`,
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
        data.message || "Gagal mengambil data kain finish contract"
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getKainJadis(id, token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/purchase-finish-contracts/${id}`,
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
      `https://nexttechenterprise.site/api/update-purchase-finish-contract/${id}`,
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

    console.log(payload);

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
      `https://nexttechenterprise.site/api/delete-purchase-finish-contract/${id}`,
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
      `https://nexttechenterprise.site/api/create-purchase-finish-order`,
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

    console.log(payload);

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

export async function getAllKainJadiOrders(token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/purchase-finish-orders`,
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
      throw new Error(data.message || "Gagal mengambil data kain finish order");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getKainJadiOrders(id, token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/purchase-finish-orders/${id}`,
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
      `https://nexttechenterprise.site/api/update-purchase-finish-order/${id}`,
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

    console.log(payload);

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
      `https://nexttechenterprise.site/api/delete-purchase-finish-order/${id}`,
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
      `https://nexttechenterprise.site/api/create-purchase-finish-surat-jalan`,
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

export async function getAllKJDeliveryNotes(token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/purchase-finish-surat-jalan`,
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
        data.message || "Gagal mengambil data surat jalan kain finish"
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getKJDeliveryNotes(id, token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/purchase-finish-surat-jalan/${id}`,
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
      `https://nexttechenterprise.site/api/update-purchase-finish-surat-jalan/${id}`,
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
      `https://nexttechenterprise.site/api/delete-purchase-finish-surat-jalan/${id}`,
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
      `https://nexttechenterprise.site/api/create-purchase-finish-contract`,
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

export async function getAllJualBelis(token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/purchase-finish-contracts`,
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
        data.message || "Gagal mengambil data kain finish contract"
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getJualBelis(id, token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/purchase-finish-contracts/${id}`,
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

export async function updateDataJualBeli(token, id, payload) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/update-purchase-finish-contract/${id}`,
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

    console.log(payload);

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

export async function softDeleteJualBeli(id, token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/delete-purchase-finish-contract/${id}`,
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
// #endregion JUAL BELI CONTRACT FUNCTION

// #region JUAL BELI DELIVERY NOTE FUNCTION

export async function createJBDeliveryNote(token, payload) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/create-purchase-finish-surat-jalan`,
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

export async function getAllJBDeliveryNotes(token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/purchase-finish-surat-jalan`,
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
        data.message || "Gagal mengambil data surat jalan kain finish"
      );
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getJBDeliveryNotes(id, token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/purchase-finish-surat-jalan/${id}`,
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

export async function updateDataJBDeliveryNote(token, id, payload) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/update-purchase-finish-surat-jalan/${id}`,
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

export async function softDeleteJBDeliveryNote(id, token) {
  try {
    const response = await fetch(
      `https://nexttechenterprise.site/api/delete-purchase-finish-surat-jalan/${id}`,
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

// #endregion JUAL BELI DELIVERY NOTE FUNCTION

export function logout() {
  localStorage.removeItem("user");
}
