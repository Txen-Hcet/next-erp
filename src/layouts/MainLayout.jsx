import { createEffect, createSignal, onCleanup } from "solid-js";
import { getTokenStatus, getUser, logout } from "../utils/auth";
import { A, useLocation, useNavigate } from "@solidjs/router";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-solid";

export default function MainLayout(props) {
  const user = getUser();
  const navigate = useNavigate();
  const tokUser = getUser();
  const location = useLocation();
  const [isOpen, setIsOpen] = createSignal(false);
  const [isTransactionOpen, setTransactionIsOpen] = createSignal(false);
  const [isWarehouseIsOpen, setWarehouseIsOpen] = createSignal(false);
  const [sidebarOpen, setSidebarOpen] = createSignal(true);

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
          "/users/form",
          "/customers",
          "/customers/form",
          "/suppliers",
          "/suppliers/form",
          "/colors",
          "/colors/form",
          "/fabrics",
          "/fabrics/form",
          "/so-type",
          "/so-type/form",
          "/customer-type",
          "/customer-type/form",
          "/currencies",
          "/currencies/form",
        ].some((p) => pathname.startsWith(p))
      ) {
        return "master";
      }

      if (
        [
          "/salescontract",
          "/salescontract/form",
          "/salesorder",
          "/salesorder/form",
        ].some((p) => pathname.startsWith(p))
      ) {
        return "transaction";
      }

      if (
        ["/packingorder", "/packingorder/form"].some((p) =>
          pathname.startsWith(p)
        )
      ) {
        return "warehouse";
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
      case "warehouse":
        setWarehouseIsOpen(true);
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
    <div class="flex h-screen font-mono">
      {/* Sidebar */}

      <aside
        class={`bg-gray-800 text-white flex flex-col flex-shrink-0 transition-all duration-300 ${
          sidebarOpen() ? "w-64" : "w-16"
        }`}
      >
        <div class="flex items-center justify-left p-2">
          <button
            class="p-2 border-2 border-white/30 hover:bg-gray-700 rounded"
            onClick={() => setSidebarOpen(!sidebarOpen())}
          >
            {sidebarOpen() ? (
              <ChevronLeft class="w-5 h-5" />
            ) : (
              <ChevronRight class="w-5 h-5" />
            )}
          </button>
          {sidebarOpen() && (
            <span class="ml-2 text-lg font-bold">NAVEL ERP</span>
          )}
        </div>

        {sidebarOpen() && (
          <>
            <nav class="flex-1 overflow-y-auto">
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
                    href="/users"
                    class={`block p-4 hover:bg-gray-700 ${
                      location.pathname === "/users"
                        ? "bg-gray-700 text-white"
                        : ""
                    }`}
                  >
                    Users
                  </A>
                </li>
                {/* <li>
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
                </li> */}
                <li>
                  <button
                    class="w-full text-left p-4 font-semibold text-gray-400 uppercase hover:bg-gray-700 flex justify-between items-center"
                    onClick={() => setTransactionIsOpen(!isTransactionOpen())}
                  >
                    Transaksi
                    <span class="text-xs">
                      {isTransactionOpen() ? "▲" : "▼"}
                    </span>
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
                        href="/salescontract"
                        class={`block pl-8 pr-4 py-2 hover:bg-gray-700 ${
                          location.pathname === "/salescontract" ||
                          location.pathname === "/salescontract/form"
                            ? "bg-gray-700 text-white"
                            : ""
                        }`}
                      >
                        Sales Contract
                      </A>
                    </li>
                    <li>
                      <A
                        href="/salesorder"
                        class={`block pl-8 pr-4 py-2 hover:bg-gray-700 ${
                          location.pathname === "/salesorder" ||
                          location.pathname === "/salesorder/form"
                            ? "bg-gray-700 text-white"
                            : ""
                        }`}
                      >
                        Sales Order
                      </A>
                    </li>
                  </ul>
                </li>
                <li>
                  <button
                    class="w-full text-left p-4 font-semibold text-gray-400 uppercase hover:bg-gray-700 flex justify-between items-center"
                    onClick={() => setWarehouseIsOpen(!isWarehouseIsOpen())}
                  >
                    Gudang
                    <span class="text-xs">
                      {isWarehouseIsOpen() ? "▲" : "▼"}
                    </span>
                  </button>
                </li>

                {/* Submenu with smooth transition */}
                <li
                  class={`transition-all duration-300 ease-in-out overflow-hidden ${
                    isWarehouseIsOpen()
                      ? "max-h-fit opacity-100"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <ul>
                    <li>
                      <A
                        href="/packingorder"
                        class={`block pl-8 pr-4 py-2 hover:bg-gray-700 ${
                          location.pathname === "/packingorder" ||
                          location.pathname === "/packingorder/form"
                            ? "bg-gray-700 text-white"
                            : ""
                        }`}
                      >
                        Packing Order
                      </A>
                    </li>
                  </ul>
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
                          location.pathname === "/suppliers" ||
                          location.pathname === "/suppliers/form"
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
                          location.pathname === "/customers" ||
                          location.pathname === "/customers/form"
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
                          location.pathname === "/colors" ||
                          location.pathname === "/colors/form"
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
                          location.pathname === "/fabrics" ||
                          location.pathname === "/fabrics/form"
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
                          location.pathname === "/so-type" ||
                          location.pathname === "/so-type/form"
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
                          location.pathname === "/customer-type" ||
                          location.pathname === "/customer-type/form"
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
                          location.pathname === "/currencies" ||
                          location.pathname === "/currencies/form"
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
              <button
                onClick={handleLogout}
                class="w-full bg-red-600 py-2 rounded flex items-center justify-center gap-2 text-white"
              >
                <LogOut class="w-4 h-4" />
                Logout
              </button>
            </div>
          </>
        )}
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
