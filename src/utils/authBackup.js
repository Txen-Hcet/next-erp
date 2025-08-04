// import { logout } from "./auth"; // asumsi lu udah punya ini

// export async function fetchWithAuth(
//   url,
//   method = "GET",
//   token,
//   payload = null
// ) {
//   const headers = {
//     "Content-Type": "application/json",
//     Authorization: `Bearer ${token}`,
//     "ngrok-skip-browser-warning": "any-value", // atau bikin optional kalo mau
//   };

//   const options = {
//     method,
//     headers,
//     ...(payload && { body: JSON.stringify(payload) }),
//   };

//   const response = await fetch(url, options);

//   let data;
//   try {
//     data = await response.json();
//   } catch {
//     data = {};
//   }

//   // Global error handling
//   if (
//     response.status === 401 ||
//     data?.message?.includes("Invalid or expired token")
//   ) {
//     logout();
//     throw new Error("Session expired. Logging out.");
//   }

//   if (!response.ok) {
//     throw new Error(data.message || "Something went wrong");
//   }

//   return data;
// }

// export const PackingListAPI = {
//   create: async (token, payload) => {
//     const url = `https://nexttechenterprise.site/api/create-packing-list`;
//     return await fetchWithAuth(url, "POST", token, payload);
//   },

//   getAll: async (token) => {
//     const url = `https://nexttechenterprise.site/api/packing-lists`;
//     return await fetchWithAuth(url, "GET", token);
//   },

//   getById: async (id, token) => {
//     const url = `https://nexttechenterprise.site/api/packing-lists/${id}`;
//     return await fetchWithAuth(url, "GET", token);
//   },

//   update: async (token, id, payload) => {
//     const url = `https://nexttechenterprise.site/api/update-packing-list/${id}`;
//     return await fetchWithAuth(url, "PUT", token, payload);
//   },

//   softDelete: async (id, token) => {
//     const url = `https://nexttechenterprise.site/api/delete-packing-list/${id}`;
//     return await fetchWithAuth(url, "DELETE", token);
//   },
// };
