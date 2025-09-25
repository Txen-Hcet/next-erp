import { createEffect, createSignal, onCleanup } from "solid-js";
import {
  getTokenStatus,
  getUser,
  logout,
  hasPermission,
  hasAnyPermission,
  hasAllPermission,
} from "../utils/auth";
import { A, useLocation, useNavigate } from "@solidjs/router";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-solid";
import Swal from "sweetalert2";
import logoNavel from "../assets/img/navelLogo.png";

export default function MainLayout(props) {
  const user = getUser();
  const navigate = useNavigate();
  const tokUser = getUser();
  const location = useLocation();
  const [isOpen, setIsOpen] = createSignal(false);
  const [isTransactionOpen, setTransactionIsOpen] = createSignal(false);
  const [isWarehouseIsOpen, setWarehouseIsOpen] = createSignal(false);
  const [isPurchasingIsOpen, setPurchasingIsOpen] = createSignal(false);
  const [isGreigeOpen, setGreigeIsOpen] = createSignal(false);
  const [isCelupOpen, setCelupIsOpen] = createSignal(false);
  const [isFinishOpen, setFinishIsOpen] = createSignal(false);
  const [isJualBeliOpen, setJualBeliIsOpen] = createSignal(false);
  const [isWarehouseTransactionOpen, setWarehouseTransactionIsOpen] =
    createSignal(false);
  const [isWarehouseGreigeOpen, setWarehouseGreigeIsOpen] = createSignal(false);
  const [isWarehouseCelupOpen, setWarehouseCelupIsOpen] = createSignal(false);
  const [isWarehouseFinishOpen, setWarehouseFinishIsOpen] = createSignal(false);
  const [isWarehouseJualBeliOpen, setWarehouseJualBeliIsOpen] =
    createSignal(false);
  const [sidebarOpen, setSidebarOpen] = createSignal(true);

  // INVOICE
  const [isInvoiceOpen, setInvoiceIsOpen] = createSignal(false);
  
  // RETUR
  const [isReturOpen, setReturOpen] = createSignal(false);
  const [isReturPurchaseOpen, setReturPurchaseOpen] = createSignal(false);
  const [isReturSalesOpen, setReturSalesOpen] = createSignal(false);

  const canAccessFinance = hasAnyPermission([,
    "view_bank",
    "view_payment_methods",
    "view_jenis_potongan",
    "view_jenis_hutang",
  ]);

  const purchasingRoutes = {
    greige: [
      "/beligreige-purchasecontract",
      "/beligreige-purchasecontract/form",
      "/beligreige-purchaseorder",
      "/beligreige-purchaseorder/form",
    ],
    celup: [
      "/ordercelup-purchasecontract",
      "/ordercelup-purchasecontract/form",
      "/ordercelup-purchaseorder",
      "/ordercelup-purchaseorder/form",
    ],
    finish: [
      "/kainjadi-purchasecontract",
      "/kainjadi-purchasecontract/form",
      "/kainjadi-purchaseorder",
      "/kainjadi-purchaseorder/form",
    ],
    jualbeli: ["/jualbeli-purchasecontract", "/jualbeli-purchasecontract/form"],
  };

  const warehouseRoutes = {
    transaction: [
      "/packinglist",
      "/packinglist/form",
      "/deliverynote",
      "/deliverynote/form",
    ],
    greige: ["/beligreige-deliverynote", "/beligreige-deliverynote/form"],
    celup: ["/ordercelup-deliverynote", "/ordercelup-deliverynote/form"],
    finish: ["/kainjadi-deliverynote", "/kainjadi-deliverynote/form"],
    jualbeli: ["/jualbeli-deliverynote", "/jualbeli-deliverynote/form"],
  };

  const invoiceRoutes = {
    transaction: ["/deliverynote-invoice", "/deliverynote-invoice/form"],
    jualbeli: ["jualbeli-invoice", "jualbeli-invoice/form"],
  };

    // ==== RETUR ROUTES (dipisah agar auto-expand submenu tepat) ====
  const returPurchaseRoutes = [
    "/retur-greige",
    "/retur-greige/form",
    "/retur-ordercelup",
    "/retur-ordercelup/form",
    "/retur-kainjadi",
    "/retur-kainjadi/form",
    "/retur-jualbeli",
    "/retur-jualbeli/form",
  ];
  const returSalesRoutes = [
    "/retur-sales",
    "/retur-sales/form",
  ];
  const returRoutes = { retur: [...returPurchaseRoutes, ...returSalesRoutes] };


  createEffect(() => {
    const interval = setInterval(async () => {
      try {
        const result = await getTokenStatus(tokUser?.token);
      } catch (error) {
        console.error("Token check failed:", error.message);
      }
    }, 60 * 60 * 1000);

    function getRouteType(pathname) {
      if (
        [
          "/users",
          "/users/form",
          "/manage-permissions",
          "/manage-permissions/form",
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
          "/grade",
          "/grade/form",
          "/units",
          "/units/form",
          "/agent",
          "/agent/form",
        ].some((p) => pathname.startsWith(p))
      ) {
        return "master";
      }

      if (
        [
          "/salescontract",
          "/salescontract/form",
          "/expor/salescontract",
          "/expor/salescontract/form",
          "/salesorder",
          "/salesorder/form",
        ].some((p) => pathname.startsWith(p))
      ) {
        return "transaction";
      }

      if (
        ["/deliverynote-invoice", "/deliverynote-invoice/form"].some((p) =>
          pathname.startsWith(p)
        )
      ) {
        return "invoice";
      }

      // if (
      //   [
      //     "/packinglist",
      //     "/packinglist/form",
      //     "/deliverynote",
      //     "/deliverynote/form",
      //   ].some((p) => pathname.startsWith(p))
      // ) {
      //   return "warehouse";
      // }

      // purchasing parent route detection
      if (
        Object.values(purchasingRoutes)
          .flat()
          .some((p) => pathname.startsWith(p))
      ) {
        return "purchasing";
      }

      // warehouse parent route detection
      if (
        Object.values(warehouseRoutes)
          .flat()
          .some((p) => pathname.startsWith(p))
      ) {
        return "warehouse";
      }

      if (
        Object.values(invoiceRoutes)
          .flat()
          .some((p) => pathname.startsWith(p))
      ) {
        return "invoice";
      }

      if (
        Object.values(returRoutes)
          .flat()
          .some((p) => pathname.startsWith(p))
      ) {
        return "retur";
      }

      return "unknown";
    }

    // execute logic
    switch (getRouteType(location.pathname)) {
      case "master":
        setIsOpen(true);
        break;
      case "transaction":
        setTransactionIsOpen(true);
        break;
      case "warehouse":
        setWarehouseIsOpen(true);
        if (
          warehouseRoutes.transaction.some((p) =>
            location.pathname.startsWith(p)
          )
        ) {
          setWarehouseTransactionIsOpen(true);
        }

        if (
          warehouseRoutes.greige.some((p) => location.pathname.startsWith(p))
        ) {
          setWarehouseGreigeIsOpen(true);
        }

        if (
          warehouseRoutes.celup.some((p) => location.pathname.startsWith(p))
        ) {
          setWarehouseCelupIsOpen(true);
        }

        if (
          warehouseRoutes.finish.some((p) => location.pathname.startsWith(p))
        ) {
          setWarehouseFinishIsOpen(true);
        }

        if (
          warehouseRoutes.jualbeli.some((p) => location.pathname.startsWith(p))
        ) {
          setWarehouseJualBeliIsOpen(true);
        }
        break;
      case "purchasing":
        setPurchasingIsOpen(true);

        if (
          purchasingRoutes.greige.some((p) => location.pathname.startsWith(p))
        ) {
          setGreigeIsOpen(true);
        }

        if (
          purchasingRoutes.celup.some((p) => location.pathname.startsWith(p))
        ) {
          setCelupIsOpen(true);
        }

        if (
          purchasingRoutes.finish.some((p) => location.pathname.startsWith(p))
        ) {
          setFinishIsOpen(true);
        }

        if (
          purchasingRoutes.jualbeli.some((p) => location.pathname.startsWith(p))
        ) {
          setJualBeliIsOpen(true);
        }
        break;
      case "invoice":
        setInvoiceIsOpen(true);
        break;

      case "retur":
        setReturOpen(true);
        // auto-expand sub-sub sesuai path
        if (returPurchaseRoutes.some((p) => location.pathname.startsWith(p)))
          setReturPurchaseOpen(true);
        if (returSalesRoutes.some((p) => location.pathname.startsWith(p)))
          setReturSalesOpen(true);
        break;
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
            <div class="flex items-center mx-auto">
              <img src={logoNavel} alt="" class="invert-1000 h-8 w-auto" />
              {/* <span class="ml-2 text-lg font-bold">NAVEL ERP</span> */}
            </div>
          )}
        </div>

        {sidebarOpen() && (
          <>
            <nav class="flex-1 overflow-y-auto">
              <ul>
                {/* Main Menu */}
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
                {hasPermission("view_users") && (
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
                )}
                {hasPermission("manage_permissions") && (
                  <li>
                    <A
                      href="/manage-permissions"
                      class={`block p-4 hover:bg-gray-700 ${
                        location.pathname === "/manage-permissions"
                          ? "bg-gray-700 text-white"
                          : ""
                      }`}
                    >
                      Manage Permissions
                    </A>
                  </li>
                )}
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

                {/* SUB MENU MASTER DATA */}
                <li
                  class={`transition-all duration-300 ease-in-out overflow-hidden ${
                    isOpen() ? "max-h-fit opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <ul>
                    {hasPermission("view_suppliers") && (
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
                    )}
                    {hasPermission("view_customers") && (
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
                    )}
                    {hasPermission("view_agent") && (
                      <li>
                        <A
                          href="/agent"
                          class={`block pl-8 pr-4 py-2 hover:bg-gray-700 ${
                            location.pathname === "/agent" ||
                            location.pathname === "/agent/form"
                              ? "bg-gray-700 text-white"
                              : ""
                          }`}
                        >
                          Agent
                        </A>
                      </li>
                    )}
                    {hasPermission("view_bank_account") && (
                      <li>
                        <A
                          href="/bank-account"
                          class={`block pl-8 pr-4 py-2 hover:bg-gray-700 ${
                            location.pathname === "/bank-account" ||
                            location.pathname === "/bank-account/form"
                              ? "bg-gray-700 text-white"
                              : ""
                          }`}
                        >
                          Bank Account
                        </A>
                      </li>
                    )}
                    {hasPermission("view_warna") && (
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
                    )}
                    {hasAllPermission(["view_kain", "create_kain"]) && (
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
                    )}
                    {hasAllPermission(["view_jenis_so", "create_jenis_so"]) && (
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
                    )}
                    {hasAllPermission([
                      "view_customer_types",
                      "create_customer_types",
                    ]) && (
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
                    )}
                    {hasAllPermission([
                      "view_mata_uang",
                      "create_mata_uang",
                    ]) && (
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
                    )}
                    {hasAllPermission(["view_grades", "create_grades"]) && (
                      <li>
                        <A
                          href="/grade"
                          class={`block pl-8 pr-4 py-2 hover:bg-gray-700 ${
                            location.pathname === "/grade" ||
                            location.pathname === "/grade/form"
                              ? "bg-gray-700 text-white"
                              : ""
                          }`}
                        >
                          Grade
                        </A>
                      </li>
                    )}
                    {hasAllPermission([
                      "view_satuan_unit",
                      "create_satuan_unit",
                    ]) && (
                      <li>
                        <A
                          href="/units"
                          class={`block pl-8 pr-4 py-2 hover:bg-gray-700 ${
                            location.pathname === "/units" ||
                            location.pathname === "/units/form"
                              ? "bg-gray-700 text-white"
                              : ""
                          }`}
                        >
                          Satuan Unit
                        </A>
                      </li>
                    )}
                  </ul>
                </li>
                {/* PEMBELIAN */}
                <li>
                  <button
                    class="w-full text-left p-4 font-semibold text-gray-400 uppercase hover:bg-gray-700 flex justify-between items-center"
                    onClick={() => setPurchasingIsOpen(!isPurchasingIsOpen())}
                  >
                    Pembelian
                    <span class="text-xs">
                      {isPurchasingIsOpen() ? "▲" : "▼"}
                    </span>
                  </button>
                </li>

                {/* SUB MENU PEMBELIAN */}
                <li
                  class={`transition-all duration-300 ease-in-out overflow-hidden ${
                    isPurchasingIsOpen()
                      ? "max-h-fit opacity-100"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <ul>
                    {/* Submenu Level 2: Pembelian Greige */}
                    {hasAllPermission([
                      "view_purchase_greige_contract",
                      "view_purchase_greige_order",
                    ]) && (
                      <li>
                        <button
                          class="w-full text-left pl-8 pr-4 py-2 font-semibold text-gray-400 hover:bg-gray-700 flex justify-between items-center"
                          onClick={() => setGreigeIsOpen(!isGreigeOpen())}
                        >
                          Pembelian Greige
                          <span class="text-xs">
                            {isGreigeOpen() ? "▲" : "▼"}
                          </span>
                        </button>
                      </li>
                    )}

                    {/* Submenu Items inside Pembelian Greige */}

                    <li
                      class={`transition-all duration-300 ease-in-out overflow-hidden ${
                        isGreigeOpen()
                          ? "max-h-fit opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <ul>
                        <li>
                          <A
                            href="/beligreige-purchasecontract"
                            class={`block pl-12 pr-4 py-2 hover:bg-gray-700 ${
                              location.pathname ===
                                "/beligreige-purchasecontract" ||
                              location.pathname ===
                                "/beligreige-purchasecontract/form"
                                ? "bg-gray-700 text-white"
                                : ""
                            }`}
                          >
                            Purchase Contract
                          </A>
                        </li>
                        <li>
                          <A
                            href="/beligreige-purchaseorder"
                            class={`block pl-12 pr-4 py-2 hover:bg-gray-700 ${
                              location.pathname ===
                                "/beligreige-purchaseorder" ||
                              location.pathname ===
                                "/beligreige-purchaseorder/form"
                                ? "bg-gray-700 text-white"
                                : ""
                            }`}
                          >
                            Purchase Order
                          </A>
                        </li>
                      </ul>
                    </li>
                  </ul>
                  <ul>
                    {/* Submenu Level 2: Order Celup */}
                    {hasAllPermission([
                      "view_purchase_celup_contract",
                      "view_purchase_celup_order",
                    ]) && (
                      <li>
                        <button
                          class="w-full text-left pl-8 pr-4 py-2 font-semibold text-gray-400 hover:bg-gray-700 flex justify-between items-center"
                          onClick={() => setCelupIsOpen(!isCelupOpen())}
                        >
                          Pembelian Order Celup
                          <span class="text-xs">
                            {isCelupOpen() ? "▲" : "▼"}
                          </span>
                        </button>
                      </li>
                    )}

                    {/* Submenu Items inside Order Celup */}
                    <li
                      class={`transition-all duration-300 ease-in-out overflow-hidden ${
                        isCelupOpen()
                          ? "max-h-fit opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <ul>
                        <li>
                          <A
                            href="/ordercelup-purchasecontract"
                            class={`block pl-12 pr-4 py-2 hover:bg-gray-700 ${
                              location.pathname ===
                                "/ordercelup-purchasecontract" ||
                              location.pathname ===
                                "/ordercelup-purchasecontract/form"
                                ? "bg-gray-700 text-white"
                                : ""
                            }`}
                          >
                            Kontrak Proses
                          </A>
                        </li>
                        <li>
                          <A
                            href="/ordercelup-purchaseorder"
                            class={`block pl-12 pr-4 py-2 hover:bg-gray-700 ${
                              location.pathname ===
                                "/ordercelup-purchaseorder" ||
                              location.pathname ===
                                "/ordercelup-purchaseorder/form"
                                ? "bg-gray-700 text-white"
                                : ""
                            }`}
                          >
                            Order Celup
                          </A>
                        </li>
                      </ul>
                    </li>
                  </ul>
                  <ul>
                    {/* Submenu Level 2: Kain Jadi */}
                    {hasAllPermission([
                      "view_purchase_finish_contract",
                      "view_purchase_finish_order",
                    ]) && (
                      <li>
                        <button
                          class="w-full text-left pl-8 pr-4 py-2 font-semibold text-gray-400 hover:bg-gray-700 flex justify-between items-center"
                          onClick={() => setFinishIsOpen(!isFinishOpen())}
                        >
                          Pembelian Kain Finish
                          <span class="text-xs">
                            {isFinishOpen() ? "▲" : "▼"}
                          </span>
                        </button>
                      </li>
                    )}

                    {/* Submenu Items inside Kain Jadi */}
                    <li
                      class={`transition-all duration-300 ease-in-out overflow-hidden ${
                        isFinishOpen()
                          ? "max-h-fit opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <ul>
                        <li>
                          <A
                            href="/kainjadi-purchasecontract"
                            class={`block pl-12 pr-4 py-2 hover:bg-gray-700 ${
                              location.pathname ===
                                "/kainjadi-purchasecontract" ||
                              location.pathname ===
                                "/kainjadi-purchasecontract/form"
                                ? "bg-gray-700 text-white"
                                : ""
                            }`}
                          >
                            Purchase Order
                          </A>
                        </li>
                        <li>
                          <A
                            href="/kainjadi-purchaseorder"
                            class={`block pl-12 pr-4 py-2 hover:bg-gray-700 ${
                              location.pathname === "/kainjadi-purchaseorder" ||
                              location.pathname ===
                                "/kainjadi-purchaseorder/form"
                                ? "bg-gray-700 text-white"
                                : ""
                            }`}
                          >
                            Order Kain Jadi
                          </A>
                        </li>
                      </ul>
                    </li>
                  </ul>
                  <ul>
                    {/* Submenu Level 2: Kain Jadi */}
                    {hasAllPermission([
                      "view_jual_beli",
                      "create_jual_beli",
                    ]) && (
                      <li>
                        <button
                          class="w-full text-left pl-8 pr-4 py-2 font-semibold text-gray-400 hover:bg-gray-700 flex justify-between items-center"
                          onClick={() => setJualBeliIsOpen(!isJualBeliOpen())}
                        >
                          Jual Beli Kain
                          <span class="text-xs">
                            {isJualBeliOpen() ? "▲" : "▼"}
                          </span>
                        </button>
                      </li>
                    )}

                    {/* Submenu Items inside Kain Jadi */}
                    <li
                      class={`transition-all duration-300 ease-in-out overflow-hidden ${
                        isJualBeliOpen()
                          ? "max-h-fit opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <ul>
                        <li>
                          <A
                            href="/jualbeli-purchasecontract"
                            class={`block pl-12 pr-4 py-2 hover:bg-gray-700 ${
                              location.pathname ===
                                "/jualbeli-purchasecontract" ||
                              location.pathname ===
                                "/jualbeli-purchasecontract/form"
                                ? "bg-gray-700 text-white"
                                : ""
                            }`}
                          >
                            Purchase Order
                          </A>
                        </li>
                      </ul>
                    </li>
                  </ul>
                </li>
                {/* PENJUALAN */}
                {hasAllPermission([
                  "view_sales_contracts",
                  "view_sales_orders",
                ]) && (
                  <li>
                    <button
                      class="w-full text-left p-4 font-semibold text-gray-400 uppercase hover:bg-gray-700 flex justify-between items-center"
                      onClick={() => setTransactionIsOpen(!isTransactionOpen())}
                    >
                      Penjualan
                      <span class="text-xs">
                        {isTransactionOpen() ? "▲" : "▼"}
                      </span>
                    </button>
                  </li>
                )}
                {/* SUB MENU PENJUALAN */}
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
                        Sales Contract (Lokal)
                      </A>
                    </li>
                    {hasPermission("edit_sales_contracts") && (
                      <li>
                        <A
                          href="/expor/salescontract"
                          class={`block pl-8 pr-4 py-2 hover:bg-gray-700 ${
                            location.pathname === "/expor/salescontract" ||
                            location.pathname === "/expor/salescontract/form"
                              ? "bg-gray-700 text-white"
                              : ""
                          }`}
                        >
                          Sales Contract (Ekspor)
                        </A>
                      </li>
                    )}
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

                {/* GUDANG */}
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
                {/* SUB MENU GUDANG */}
                <li
                  class={`transition-all duration-300 ease-in-out overflow-hidden ${
                    isWarehouseIsOpen()
                      ? "max-h-fit opacity-100"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <ul>
                    {/* Submenu Level 2: Penjualan */}
                    {hasAllPermission([
                      "view_packing_lists",
                      "view_surat_jalan",
                    ]) && (
                      <li>
                        <button
                          class="w-full text-left pl-8 pr-4 py-2 font-semibold text-gray-400 hover:bg-gray-700 flex justify-between items-center"
                          onClick={() =>
                            setWarehouseTransactionIsOpen(
                              !isWarehouseTransactionOpen()
                            )
                          }
                        >
                          Penjualan
                          <span class="text-xs">
                            {isWarehouseTransactionOpen() ? "▲" : "▼"}
                          </span>
                        </button>
                      </li>
                    )}

                    {/* Submenu Items inside Transaction */}
                    <li
                      class={`transition-all duration-300 ease-in-out overflow-hidden ${
                        isWarehouseTransactionOpen()
                          ? "max-h-fit opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <ul>
                        <li>
                          <A
                            href="/packinglist"
                            class={`block pl-8 pr-4 py-2 hover:bg-gray-700 ${
                              location.pathname === "/packinglist" ||
                              location.pathname === "/packinglist/form"
                                ? "bg-gray-700 text-white"
                                : ""
                            }`}
                          >
                            Packing List
                          </A>
                        </li>
                        <li>
                          <A
                            href="/deliverynote"
                            class={`block pl-8 pr-4 py-2 hover:bg-gray-700 ${
                              location.pathname === "/deliverynote" ||
                              location.pathname === "/deliverynote/form"
                                ? "bg-gray-700 text-white"
                                : ""
                            }`}
                          >
                            Surat Jalan
                          </A>
                        </li>
                      </ul>
                    </li>
                  </ul>
                  <ul>
                    {/* Submenu Level 2: Pembelian Greige */}
                    {hasPermission("view_purchase_greige_surat_jalan") && (
                      <li>
                        <button
                          class="w-full text-left pl-8 pr-4 py-2 font-semibold text-gray-400 hover:bg-gray-700 flex justify-between items-center"
                          onClick={() =>
                            setWarehouseGreigeIsOpen(!isWarehouseGreigeOpen())
                          }
                        >
                          Pembelian Greige
                          <span class="text-xs">
                            {isWarehouseGreigeOpen() ? "▲" : "▼"}
                          </span>
                        </button>
                      </li>
                    )}

                    {/* Submenu Items inside Pembelian Greige */}
                    <li
                      class={`transition-all duration-300 ease-in-out overflow-hidden ${
                        isWarehouseGreigeOpen()
                          ? "max-h-fit opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <ul>
                        <li>
                          <A
                            href="/beligreige-deliverynote"
                            class={`block pl-12 pr-4 py-2 hover:bg-gray-700 ${
                              location.pathname ===
                                "/beligreige-deliverynote" ||
                              location.pathname ===
                                "/beligreige-deliverynote/form"
                                ? "bg-gray-700 text-white"
                                : ""
                            }`}
                          >
                            Surat Penerimaan Greige
                          </A>
                        </li>
                      </ul>
                    </li>
                  </ul>
                  <ul>
                    {/* Submenu Level 2: Order Celup */}
                    {hasPermission("view_purchase_celup_surat_jalan") && (
                      <li>
                        <button
                          class="w-full text-left pl-8 pr-4 py-2 font-semibold text-gray-400 hover:bg-gray-700 flex justify-between items-center"
                          onClick={() =>
                            setWarehouseCelupIsOpen(!isWarehouseCelupOpen())
                          }
                        >
                          Pembelian Order Celup
                          <span class="text-xs">
                            {isWarehouseCelupOpen() ? "▲" : "▼"}
                          </span>
                        </button>
                      </li>
                    )}

                    {/* Submenu Items inside Order Celup */}
                    <li
                      class={`transition-all duration-300 ease-in-out overflow-hidden ${
                        isWarehouseCelupOpen()
                          ? "max-h-fit opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <ul>
                        <li>
                          <A
                            href="/ordercelup-deliverynote"
                            class={`block pl-12 pr-4 py-2 hover:bg-gray-700 ${
                              location.pathname ===
                                "/ordercelup-deliverynote" ||
                              location.pathname ===
                                "/ordercelup-deliverynote/form"
                                ? "bg-gray-700 text-white"
                                : ""
                            }`}
                          >
                            Surat Penerimaan Order Celup
                          </A>
                        </li>
                      </ul>
                    </li>
                  </ul>
                  <ul>
                    {/* Submenu Level 2: Kain Jadi */}
                    {hasPermission("view_purchase_finish_surat_jalan") && (
                      <li>
                        <button
                          class="w-full text-left pl-8 pr-4 py-2 font-semibold text-gray-400 hover:bg-gray-700 flex justify-between items-center"
                          onClick={() =>
                            setWarehouseFinishIsOpen(!isWarehouseFinishOpen())
                          }
                        >
                          Pembelian Kain Finish
                          <span class="text-xs">
                            {isWarehouseFinishOpen() ? "▲" : "▼"}
                          </span>
                        </button>
                      </li>
                    )}

                    {/* Submenu Items inside Kain Jadi */}
                    <li
                      class={`transition-all duration-300 ease-in-out overflow-hidden ${
                        isWarehouseFinishOpen()
                          ? "max-h-fit opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <ul>
                        <li>
                          <A
                            href="/kainjadi-deliverynote"
                            class={`block pl-12 pr-4 py-2 hover:bg-gray-700 ${
                              location.pathname === "/kainjadi-deliverynote" ||
                              location.pathname ===
                                "/kainjadi-deliverynote/form"
                                ? "bg-gray-700 text-white"
                                : ""
                            }`}
                          >
                            Surat Penerimaan Kain Finish
                          </A>
                        </li>
                      </ul>
                    </li>
                  </ul>
                  <ul>
                    {/* Submenu Level 2: Kain Jadi */}
                    {hasPermission("view_jual_beli_surat_jalan") && (
                      <li>
                        <button
                          class="w-full text-left pl-8 pr-4 py-2 font-semibold text-gray-400 hover:bg-gray-700 flex justify-between items-center"
                          onClick={() =>
                            setWarehouseJualBeliIsOpen(
                              !isWarehouseJualBeliOpen()
                            )
                          }
                          //hidden
                        >
                          Jual Beli Kain
                          <span class="text-xs">
                            {isWarehouseJualBeliOpen() ? "▲" : "▼"}
                          </span>
                        </button>
                      </li>
                    )}

                    {/* Submenu Items inside Kain Jadi */}
                    <li
                      class={`transition-all duration-300 ease-in-out overflow-hidden ${
                        isWarehouseJualBeliOpen()
                          ? "max-h-fit opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <ul>
                        <li>
                          <A
                            href="/jualbeli-deliverynote"
                            class={`block pl-12 pr-4 py-2 hover:bg-gray-700 ${
                              location.pathname === "/jualbeli-deliverynote" ||
                              location.pathname ===
                                "/jualbeli-deliverynote/form"
                                ? "bg-gray-700 text-white"
                                : ""
                            }`}
                          >
                            Surat Penerimaan Jual Beli
                          </A>
                        </li>
                      </ul>
                    </li>
                  </ul>
                </li>

                {/* INVOICE */}
                {hasAllPermission([
                  "print_invoice",
                  "print_invoice_jual_beli",
                ]) && (
                  <li>
                    <button
                      class="w-full text-left p-4 font-semibold text-gray-400 uppercase hover:bg-gray-700 flex justify-between items-center"
                      onClick={() => setInvoiceIsOpen(!isInvoiceOpen())}
                    >
                      Invoice
                      <span class="text-xs">{isInvoiceOpen() ? "▲" : "▼"}</span>
                    </button>
                  </li>
                )}

                {/* SUB MENU INVOICE */}
                <li
                  class={`transition-all duration-300 ease-in-out overflow-hidden ${
                    isInvoiceOpen()
                      ? "max-h-fit opacity-100"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <ul>
                    <li>
                      <A
                        href="/deliverynote-invoice"
                        class={`block pl-8 pr-4 py-2 hover:bg-gray-700 ${
                          location.pathname === "/deliverynote-invoice" ||
                          location.pathname === "/deliverynote-invoice/form"
                            ? "bg-gray-700 text-white"
                            : ""
                        }`}
                      >
                        Invoice Penjualan
                      </A>
                    </li>
                    <li>
                      <A
                        href="/jualbeli-invoice"
                        class={`block pl-8 pr-4 py-2 hover:bg-gray-700 ${
                          location.pathname === "/jualbeli-invoice" ||
                          location.pathname === "/jualbeli-invoice/form"
                            ? "bg-gray-700 text-white"
                            : ""
                        }`}
                      >
                        Invoice Jual Beli
                      </A>
                    </li>
                  </ul>
                </li>

                {/* RETUR (Nested) */}
                {hasAllPermission([
                  "return_purchase_greige",
                  "return_purchase_celup",
                  "return_purchase_finish",
                  "return_jual_beli",
                  "return_sales",
                ]) && (
                  <>
                    <li>
                      <button
                        class="w-full text-left p-4 font-semibold text-gray-400 uppercase hover:bg-gray-700 flex justify-between items-center"
                        onClick={() => setReturOpen(!isReturOpen())}
                      >
                        Retur
                        <span class="text-xs">{isReturOpen() ? "▲" : "▼"}</span>
                      </button>
                    </li>

                    <li
                      class={`transition-all duration-300 ease-in-out overflow-hidden ${
                        isReturOpen() ? "max-h-fit opacity-100" : "max-h-0 opacity-0"
                      }`}
                    >
                      {/* Submenu: Retur Pembelian */}
                      <ul>
                        {hasAllPermission([
                          "return_purchase_greige",
                          "return_purchase_celup",
                          "return_purchase_finish",
                          "return_jual_beli",
                        ]) && (
                          <li>
                            <button
                              class="w-full text-left pl-8 pr-4 py-2 font-semibold text-gray-400 hover:bg-gray-700 flex justify-between items-center"
                              onClick={() => setReturPurchaseOpen(!isReturPurchaseOpen())}
                            >
                              Retur Pembelian
                              <span class="text-xs">{isReturPurchaseOpen() ? "▲" : "▼"}</span>
                            </button>
                          </li>
                        )}

                        <li
                          class={`transition-all duration-300 ease-in-out overflow-hidden ${
                            isReturPurchaseOpen() ? "max-h-fit opacity-100" : "max-h-0 opacity-0"
                          }`}
                        >
                          <ul>
                            <li>
                              <A
                                href="/retur-greige"
                                class={`block pl-12 pr-4 py-2 hover:bg-gray-700 ${
                                  location.pathname === "/retur-greige" ||
                                  location.pathname === "/retur-greige/form"
                                    ? "bg-gray-700 text-white"
                                    : ""
                                }`}
                              >
                                Retur Pembelian Greige
                              </A>
                            </li>
                            <li>
                              <A
                                href="/retur-ordercelup"
                                class={`block pl-12 pr-4 py-2 hover:bg-gray-700 ${
                                  location.pathname === "/retur-ordercelup" ||
                                  location.pathname === "/retur-ordercelup/form"
                                    ? "bg-gray-700 text-white"
                                    : ""
                                }`}
                              >
                                Retur Pembelian Order Celup
                              </A>
                            </li>
                            <li>
                              <A
                                href="/retur-kainjadi"
                                class={`block pl-12 pr-4 py-2 hover:bg-gray-700 ${
                                  location.pathname === "/retur-kainjadi" ||
                                  location.pathname === "/retur-kainjadi/form"
                                    ? "bg-gray-700 text-white"
                                    : ""
                                }`}
                              >
                                Retur Pembelian Kain Jadi
                              </A>
                            </li>
                            <li>
                              <A
                                href="/retur-jualbeli"
                                class={`block pl-12 pr-4 py-2 hover:bg-gray-700 ${
                                  location.pathname === "/retur-jualbeli" ||
                                  location.pathname === "/retur-jualbeli/form"
                                    ? "bg-gray-700 text-white"
                                    : ""
                                }`}
                              >
                                Retur Jual Beli
                              </A>
                            </li>
                          </ul>
                        </li>
                      </ul>

                      {/* Submenu: Retur Penjualan */}
                      <ul>
                        {hasPermission("return_sales") && (
                          <li>
                            <button
                              class="w-full text-left pl-8 pr-4 py-2 font-semibold text-gray-400 hover:bg-gray-700 flex justify-between items-center"
                              onClick={() => setReturSalesOpen(!isReturSalesOpen())}
                            >
                              Retur Penjualan
                              <span class="text-xs">{isReturSalesOpen() ? "▲" : "▼"}</span>
                            </button>
                          </li>
                        )}

                        <li
                          class={`transition-all duration-300 ease-in-out overflow-hidden ${
                            isReturSalesOpen() ? "max-h-fit opacity-100" : "max-h-0 opacity-0"
                          }`}
                        >
                          <ul>
                            <li>
                              <A
                                href="/retur-sales"
                                class={`block pl-12 pr-4 py-2 hover:bg-gray-700 ${
                                  location.pathname === "/retur-sales" ||
                                  location.pathname === "/retur-sales/form"
                                    ? "bg-gray-700 text-white"
                                    : ""
                                }`}
                              >
                                Retur Penjualan (Sales)
                              </A>
                            </li>
                          </ul>
                        </li>
                      </ul>
                    </li>
                  </>
                )}
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
        <header class="bg-white shadow p-4 flex items-center justify-between">
          <div>
            Selamat datang, {user?.name} ({user?.username.toUpperCase()})
          </div>

          <div class="flex items-center gap-3">
            {/* Tampilkan link hanya jika user punya akses finance */}
            {canAccessFinance && (
              <A
                href="/test"   // <-- sesuai route FinanceMainLayout di App.jsx kamu
                class="inline-flex items-center gap-2 rounded px-3 py-2 border border-blue-600 text-blue-700 hover:bg-blue-50"
                title="Masuk ke modul Finance"
              >
                Go to Finance
              </A>
            )}
          </div>
        </header>

        <main class="p-6 bg-gray-100 flex-1 overflow-y-auto">
          {props.children}
        </main>
      </div>
    </div>
  );
}
