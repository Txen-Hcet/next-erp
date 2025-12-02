// FinanceMainLayout.jsx
import { createEffect, createSignal, onCleanup } from "solid-js";
import { A, useLocation, useNavigate } from "@solidjs/router";
import { ChevronLeft, ChevronRight, LogOut, ArrowLeft } from "lucide-solid";
import Swal from "sweetalert2";
import logoNavel from "../assets/img/navelLogo.png";
import { User } from "../utils/financeAuth";
import { logout } from "../utils/auth";

export default function FinanceMainLayout(props) {
  const [sidebarOpen, setSidebarOpen] = createSignal(true);
  const user = User.getUser();
  const navigate = useNavigate();

  // state buat toggle menu group
  const [isMasterOpen, setMasterOpen] = createSignal(false);
  const [isPurchaseOpen, setPurchaseOpen] = createSignal(false);
  const [isPaymentOpen, setPaymentOpen] = createSignal(false);
  const [isPiutangOpen, setPiutangOpen] = createSignal(false);

  const location = useLocation();

  const canBackToERP = true;

  const financeRoutes = {
    master: [
      "/payment-methods",
      "/payment-methods/form",
      "/banks",
      "/banks/form",
      "/jenis-potongan",
      "/jenis-potongan/form",
      "/jenis-hutang",
      "/jenis-hutang/form",
    ],
    purchase: ["/expedition-accessories", "/expedition-accessories/form"],
    payment: [
      "/hutang-purchase-greige",
      "/hutang-purchase-greige/form",
      "/hutang-purchase-celup",
      "/hutang-purchase-celup/form",
      "/hutang-purchase-kain-jadi",
      "/hutang-purchase-kain-jadi/form",
      "/hutang-purchase-jual-beli",
      "/hutang-purchase-jual-beli/form",
      "/hutang-purchase-aksesoris-ekspedisi",
      "/hutang-purchase-aksesoris-ekspedisi/form",
    ],
    piutang: [
      "/piutang-jual-beli",
      "/piutang-jual-beli/form",
      "/piutang-sales",
      "/piutang-sales/form",
    ],
  };

  function getFinanceRouteType(pathname) {
    if (financeRoutes.master.some((p) => pathname.startsWith(p))) {
      return "master";
    }
    if (financeRoutes.purchase.some((p) => pathname.startsWith(p))) {
      return "purchase";
    }
    if (financeRoutes.payment.some((p) => pathname.startsWith(p))) {
      return "payment";
    }
    if (financeRoutes.piutang.some((p) => pathname.startsWith(p))) {
      return "piutang";
    }
    return "unknown";
  }

  createEffect(() => {
    switch (getFinanceRouteType(location.pathname)) {
      case "master":
        setMasterOpen(true);
        break;
      case "purchase":
        setPurchaseOpen(true);
        break;
      case "payment":
        setPaymentOpen(true);
        break;
      case "piutang":
        setPiutangOpen(true);
        break; 
    }

    let logoutTimer = null;

    function resetLogoutTimer() {
      if (logoutTimer) clearTimeout(logoutTimer);
      logoutTimer = setTimeout(() => {
        console.log("User idle terlalu lama. Auto logout Finance.");
        handleLogout();
      }, 30 * 60 * 1000);
    }

    const events = ["mousemove", "click", "keydown", "scroll"];
    events.forEach((event) => {
      window.addEventListener(event, resetLogoutTimer);
    });

    resetLogoutTimer();

    onCleanup(() => {
      events.forEach((event) =>
        window.removeEventListener(event, resetLogoutTimer)
      );
      clearTimeout(logoutTimer);
    });
  });

  const handleLogout = () => {
    Swal.fire({
      icon: "warning",
      title: "Logout",
      text: "Apakah Anda yakin akan keluar?",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6e7881",
      confirmButtonText: "Ya",
      cancelButtonText: "Tidak",
    }).then((result) => {
      if (result.isConfirmed) {
        logout();
        navigate("/", { replace: true });
      }
    });
  };

  return (
    <div class="flex h-screen font-mono">
      {/* Sidebar */}
      <aside
        class={`bg-green-900 text-white flex flex-col flex-shrink-0 transition-all duration-300 ${
          sidebarOpen() ? "w-64" : "w-16"
        }`}
      >
        {/* Toggle button + logo */}
        <div class="flex items-center justify-left p-2">
          <button
            class="p-2 border-2 border-white/30 hover:bg-green-800 rounded"
            onClick={() => setSidebarOpen(!sidebarOpen())}
          >
            {sidebarOpen() ? (
              <ChevronLeft class="w-5 h-5" />
            ) : (
              <ChevronRight class="w-5 h-5" />
            )}
          </button>
          {sidebarOpen() && (
            <div class="flex items-center mx-auto">
              <img src={logoNavel} alt="Logo" class="invert-1000 h-8 w-auto" />
            </div>
          )}
        </div>

        {/* Navigation */}
        {sidebarOpen() && (
          <nav class="flex-1 overflow-y-auto">
            {" "}
            {/* Main Menu */}
            <li>
              <A
                href="/dashboard-finance"
                class={`block p-4 hover:bg-gray-700 ${
                  location.pathname === "/dashboard=finance"
                    ? "bg-gray-700 text-white"
                    : ""
                }`}
              >
                Dashboard
              </A>
            </li>
            <ul>
              {/* Master Data */}
              <li>
                <button
                  class="w-full text-left p-4 font-semibold text-gray-300 uppercase hover:bg-green-800 flex justify-between items-center"
                  onClick={() => setMasterOpen(!isMasterOpen())}
                >
                  Master Data
                  <span class="text-xs">{isMasterOpen() ? "▲" : "▼"}</span>
                </button>
              </li>
              <li
                class={`transition-all duration-300 ease-in-out overflow-hidden ${
                  isMasterOpen() ? "max-h-fit opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <ul>
                  <li>
                    <A
                      href="/payment-methods"
                      class={`block pl-8 pr-4 py-2 hover:bg-green-800 ${
                        location.pathname.startsWith("/payment-methods")
                          ? "bg-green-800 text-white"
                          : ""
                      }`}
                    >
                      Payment Methods
                    </A>
                  </li>
                  <li>
                    <A
                      href="/banks"
                      class={`block pl-8 pr-4 py-2 hover:bg-green-800 ${
                        location.pathname.startsWith("/banks")
                          ? "bg-green-800 text-white"
                          : ""
                      }`}
                    >
                      Banks
                    </A>
                  </li>
                  <li>
                    <A
                      href="/jenis-potongan"
                      class={`block pl-8 pr-4 py-2 hover:bg-green-800 ${
                        location.pathname.startsWith("/jenis-potongan")
                          ? "bg-green-800 text-white"
                          : ""
                      }`}
                    >
                      Jenis Potongan
                    </A>
                  </li>
                  {/* <li>
                    <A
                      href="/jenis-hutang"
                      class={`block pl-8 pr-4 py-2 hover:bg-green-800 ${
                        location.pathname.startsWith("/jenis-hutang")
                          ? "bg-green-800 text-white"
                          : ""
                      }`}
                    >
                      Jenis Hutang
                    </A>
                  </li> */}
                </ul>
              </li>

              {/* Purchase */}
              <li>
                <button
                  class="w-full text-left p-4 font-semibold text-gray-300 uppercase hover:bg-green-800 flex justify-between items-center"
                  onClick={() => setPurchaseOpen(!isPurchaseOpen())}
                >
                  Purchase
                  <span class="text-xs">{isPurchaseOpen() ? "▲" : "▼"}</span>
                </button>
              </li>
              <li
                class={`transition-all duration-300 ease-in-out overflow-hidden ${
                  isPurchaseOpen()
                    ? "max-h-fit opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <ul>
                  <li>
                    <A
                      href="/expedition-accessories"
                      class={`block pl-8 pr-4 py-2 hover:bg-green-800 ${
                        location.pathname.startsWith("/expedition-accessories")
                          ? "bg-green-800 text-white"
                          : ""
                      }`}
                    >
                      Purchase Aksesoris Ekspedisi
                    </A>
                  </li>
                </ul>
              </li>

              {/* Payment */}
              <li>
                <button
                  class="w-full text-left p-4 font-semibold text-gray-300 uppercase hover:bg-green-800 flex justify-between items-center"
                  onClick={() => setPaymentOpen(!isPaymentOpen())}
                >
                  Payment
                  <span class="text-xs">{isPaymentOpen() ? "▲" : "▼"}</span>
                </button>
              </li>
              <li
                class={`transition-all duration-300 ease-in-out overflow-hidden ${
                  isPaymentOpen()
                    ? "max-h-fit opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <ul>
                  <li>
                    <A
                      href="/hutang-purchase-greige"
                      class={`block pl-8 pr-4 py-2 hover:bg-green-800 ${
                        location.pathname.startsWith("/hutang-purchase-greige")
                          ? "bg-green-800 text-white"
                          : ""
                      }`}
                    >
                      Pembayaran Hutang Purchase Greige
                    </A>
                  </li>
                </ul>
                <ul>
                  <li>
                    <A
                      href="/hutang-purchase-celup"
                      class={`block pl-8 pr-4 py-2 hover:bg-green-800 ${
                        location.pathname.startsWith("/hutang-purchase-celup")
                          ? "bg-green-800 text-white"
                          : ""
                      }`}
                    >
                      Pembayaran Hutang Purchase Celup
                    </A>
                  </li>
                </ul>
                <ul>
                  <li>
                    <A
                      href="/hutang-purchase-kain-jadi"
                      class={`block pl-8 pr-4 py-2 hover:bg-green-800 ${
                        location.pathname.startsWith(
                          "/hutang-purchase-kain-jadi"
                        )
                          ? "bg-green-800 text-white"
                          : ""
                      }`}
                    >
                      Pembayaran Hutang Purchase Kain Jadi
                    </A>
                  </li>
                </ul>
                <ul>
                  <li>
                    <A
                      href="/hutang-purchase-jual-beli"
                      class={`block pl-8 pr-4 py-2 hover:bg-green-800 ${
                        location.pathname.startsWith(
                          "/hutang-purchase-jual-beli"
                        )
                          ? "bg-green-800 text-white"
                          : ""
                      }`}
                    >
                      Pembayaran Hutang Purchase Jual Beli
                    </A>
                  </li>
                </ul>
                <ul>
                  <li>
                    <A
                      href="/hutang-purchase-aksesoris-ekspedisi"
                      class={`block pl-8 pr-4 py-2 hover:bg-green-800 ${
                        location.pathname.startsWith(
                          "/hutang-purchase-aksesoris-ekspedisi"
                        )
                          ? "bg-green-800 text-white"
                          : ""
                      }`}
                    >
                      Pembayaran Hutang Purchase Aksesoris Ekspedisi
                    </A>
                  </li>
                </ul>
              </li>
              {/* Piutang */}
              <li>
                <button
                  class="w-full text-left p-4 font-semibold text-gray-300 uppercase hover:bg-green-800 flex justify-between items-center"
                  onClick={() => setPiutangOpen(!isPiutangOpen())}
                >
                  Piutang
                  <span class="text-xs">{isPiutangOpen() ? "▲" : "▼"}</span>
                </button>
              </li>
              <li
                class={`transition-all duration-300 ease-in-out overflow-hidden ${
                  isPiutangOpen()
                    ? "max-h-fit opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <ul>
                  <li>
                    <A
                      href="/piutang-jual-beli"
                      class={`block pl-8 pr-4 py-2 hover:bg-green-800 ${
                        location.pathname.startsWith("/piutang-jual-beli")
                          ? "bg-green-800 text-white"
                          : ""
                      }`}
                    >
                      Penerimaan Piutang Jual Beli
                    </A>
                  </li>
                </ul>
                <ul>
                  <li>
                    <A
                      href="/piutang-sales"
                      class={`block pl-8 pr-4 py-2 hover:bg-green-800 ${
                        location.pathname.startsWith("/piutang-sales")
                          ? "bg-green-800 text-white"
                          : ""
                      }`}
                    >
                      Penerimaan Piutang Penjualan (Sales)
                    </A>
                  </li>
                </ul>                
              </li>  
            </ul>
          </nav>
        )}

        {/* Logout */}
        {sidebarOpen() && (
          <div class="p-4 border-t border-green-800">
            <button 
              onClick={handleLogout}
              class="w-full bg-red-600 py-2 rounded flex items-center justify-center gap-2 text-white">
              <LogOut class="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div class="flex-1 flex flex-col">
        <header class="bg-green-900 text-white shadow p-4 flex items-center justify-between">
          <div>
            Selamat datang, {user?.name} ({user?.username.toUpperCase()}) -
            Finance
          </div>

          {/* Tombol balik ke ERP/Main */}
          {canBackToERP && (
            <A
              href="/dashboard"
              class="inline-flex items-center gap-2 rounded px-3 py-2 border border-white/60 text-white hover:bg-white/10"
              title="Kembali ke modul ERP"
            >
              <ArrowLeft class="w-4 h-4" />
              Back to ERP
            </A>
          )}
        </header>

        <main class="p-6 bg-gray-100 flex-1 overflow-y-auto">
          {props.children}
        </main>
      </div>
    </div>
  );
}
