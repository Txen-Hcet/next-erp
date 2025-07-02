import { createEffect, createSignal, onCleanup } from "solid-js";
import { getTokenStatus, getUser, logout } from "../utils/auth";
import { A, useLocation, useNavigate } from "@solidjs/router";

export default function MainLayout(props) {
  const user = getUser();
  const navigate = useNavigate();
  const tokUser = getUser();
  const location = useLocation();
  const [isOpen, setIsOpen] = createSignal(false);
  const [isTransactionOpen, setTransactionIsOpen] = createSignal(false);

  createEffect(() => {
    const interval = setInterval(async () => {
      try {
        const result = await getTokenStatus(tokUser?.token);
      } catch (error) {
        console.error("Token check failed:", error.message);
      }
    }, 60 * 60 * 1000);

    // logic untuk buka sidebar
    // const inMaster =
    //   location.pathname.startsWith("/dashboard") ||
    //   location.pathname.startsWith("/orders") ||
    //   location.pathname.startsWith("/transactions") ||
    //   location.pathname.startsWith("/users") ||
    //   location.pathname.startsWith("/customers") ||
    //   location.pathname.startsWith("/suppliers") ||
    //   location.pathname.startsWith("/colors") ||
    //   location.pathname.startsWith("/fabrics") ||
    //   location.pathname.startsWith("/so-type") ||
    //   location.pathname.startsWith("/customer-type") ||
    //   location.pathname.startsWith("/currencies");

    // const inTransaction =
    //   location.pathname.startsWith("/dashboard") ||
    //   location.pathname.startsWith("/orders");

    // // if (inMaster) {
    // //   setIsOpen(true);
    // // }

    function getRouteType(pathname) {
      if (
        [
          "/users",
          "/customers",
          "/suppliers",
          "/colors",
          "/fabrics",
          "/so-type",
          "/customer-type",
          "/currencies",
        ].some((p) => pathname.startsWith(p))
      ) {
        return "master";
      }

      if (["/dashboard", "/orders"].some((p) => pathname.startsWith(p))) {
        return "transaction";
      }

      return "unknown";
    }

    switch (getRouteType(location.pathname)) {
      case "master":
        setIsOpen(true);
        break;
      case "transaction":
        setTransactionIsOpen(true);
        break;
      default:
      // logic unknown
    }

    // idle detection
    let logoutTimer = null;

    function resetLogoutTimer() {
      if (logoutTimer) clearTimeout(logoutTimer);
      logoutTimer = setTimeout(() => {
        console.log("User idle terlalu lama. Auto logout.");
        handleLogout();
      }, 30 * 60 * 1000); // 30 menit idle
    }

    // async function resetLogoutTimer() {
    //   if (logoutTimer) clearTimeout(logoutTimer);

    //   // refresh token jika perlu
    //   await refreshTokenIfNeeded();

    //   logoutTimer = setTimeout(() => {
    //     console.log("User idle terlalu lama. Auto logout.");
    //     handleLogout();
    //   }, 30 * 60 * 1000);
    // }

    const events = ["mousemove", "click", "keydown", "scroll"];
    events.forEach((event) => {
      window.addEventListener(event, resetLogoutTimer);
    });

    resetLogoutTimer();

    onCleanup(() => {
      clearInterval(interval);
      events.forEach((event) =>
        window.removeEventListener(event, resetLogoutTimer)
      );
      clearTimeout(logoutTimer);
    });
  });

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div class="flex h-screen">
      {/* Sidebar */}
      <aside class="w-64 bg-gray-800 text-white flex flex-col flex-shrink-0">
        <div class="p-4 text-xl font-bold">ERP Textile</div>
        <nav class="flex-1">
          <ul>
            <li>
              <A
                href="/dashboard"
                class={`block p-4 hover:bg-gray-700 ${
                  location.pathname === "/dashboard"
                    ? "bg-gray-700 text-white"
                    : ""
                }`}
              >
                Dashboard
              </A>
            </li>
            <li>
              <A
                href="/orders"
                class={`block p-4 hover:bg-gray-700 ${
                  location.pathname === "/orders"
                    ? "bg-gray-700 text-white"
                    : ""
                }`}
              >
                Pesanan
              </A>
            </li>
            <li>
              <button
                class="w-full text-left p-4 font-semibold text-gray-400 uppercase hover:bg-gray-700 flex justify-between items-center"
                onClick={() => setTransactionIsOpen(!isTransactionOpen())}
              >
                Transaksi
                <span class="text-xs">{isTransactionOpen() ? "▲" : "▼"}</span>
              </button>
            </li>

            {/* Submenu with smooth transition */}
            <li
              class={`transition-all duration-300 ease-in-out overflow-hidden ${
                isTransactionOpen()
                  ? "max-h-fit opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              <ul>
                <li>
                  <A
                    href="/suppliers"
                    class={`block pl-8 pr-4 py-2 hover:bg-gray-700 ${
                      location.pathname === "/suppliers"
                        ? "bg-gray-700 text-white"
                        : ""
                    }`}
                  >
                    Suppliers
                  </A>
                </li>
                <li>
                  <A
                    href="/customers"
                    class={`block pl-8 pr-4 py-2 hover:bg-gray-700 ${
                      location.pathname === "/customers"
                        ? "bg-gray-700 text-white"
                        : ""
                    }`}
                  >
                    Customer
                  </A>
                </li>
              </ul>
            </li>
            <li>
              <A
                href="/users"
                class={`block p-4 hover:bg-gray-700 ${
                  location.pathname === "/users" ? "bg-gray-700 text-white" : ""
                }`}
              >
                Users
              </A>
            </li>

            {/* Master Data Toggle */}
            <li>
              <button
                class="w-full text-left p-4 font-semibold text-gray-400 uppercase hover:bg-gray-700 flex justify-between items-center"
                onClick={() => setIsOpen(!isOpen())}
              >
                Master Data
                <span class="text-xs">{isOpen() ? "▲" : "▼"}</span>
              </button>
            </li>

            {/* Submenu with smooth transition */}
            <li
              class={`transition-all duration-300 ease-in-out overflow-hidden ${
                isOpen() ? "max-h-fit opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <ul>
                <li>
                  <A
                    href="/suppliers"
                    class={`block pl-8 pr-4 py-2 hover:bg-gray-700 ${
                      location.pathname === "/suppliers"
                        ? "bg-gray-700 text-white"
                        : ""
                    }`}
                  >
                    Suppliers
                  </A>
                </li>
                <li>
                  <A
                    href="/customers"
                    class={`block pl-8 pr-4 py-2 hover:bg-gray-700 ${
                      location.pathname === "/customers"
                        ? "bg-gray-700 text-white"
                        : ""
                    }`}
                  >
                    Customer
                  </A>
                </li>
                <li>
                  <A
                    href="/colors"
                    class={`block pl-8 pr-4 py-2 hover:bg-gray-700 ${
                      location.pathname === "/colors"
                        ? "bg-gray-700 text-white"
                        : ""
                    }`}
                  >
                    Warna
                  </A>
                </li>
                <li>
                  <A
                    href="/fabrics"
                    class={`block pl-8 pr-4 py-2 hover:bg-gray-700 ${
                      location.pathname === "/fabrics"
                        ? "bg-gray-700 text-white"
                        : ""
                    }`}
                  >
                    Kain
                  </A>
                </li>
                <li>
                  <A
                    href="/so-type"
                    class={`block pl-8 pr-4 py-2 hover:bg-gray-700 ${
                      location.pathname === "/so-type"
                        ? "bg-gray-700 text-white"
                        : ""
                    }`}
                  >
                    Jenis SO
                  </A>
                </li>
                <li>
                  <A
                    href="/customer-type"
                    class={`block pl-8 pr-4 py-2 hover:bg-gray-700 ${
                      location.pathname === "/customer-type"
                        ? "bg-gray-700 text-white"
                        : ""
                    }`}
                  >
                    Tipe Customer
                  </A>
                </li>
                <li>
                  <A
                    href="/currencies"
                    class={`block pl-8 pr-4 py-2 hover:bg-gray-700 ${
                      location.pathname === "/currencies"
                        ? "bg-gray-700 text-white"
                        : ""
                    }`}
                  >
                    Currencies
                  </A>
                </li>
              </ul>
            </li>
          </ul>
        </nav>
        <div class="p-4 border-t border-gray-700">
          <button onClick={handleLogout} class="w-full bg-red-600 py-2 rounded">
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div class="flex-1 flex flex-col">
        <header class="bg-white shadow p-4 flex justify-between">
          <div>
            Selamat datang, {user?.name} ({user?.username.toUpperCase()})
          </div>
        </header>

        <main class="p-6 bg-gray-100 flex-1 overflow-y-auto">
          {props.children}
        </main>
      </div>
    </div>
  );
}
