import { Router, Route } from "@solidjs/router";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import OrdersList from "./pages/OrdersList";
import OrderForm from "./pages/OrderForm";
import UsersList from "./pages/UsersList";
import UserForm from "./pages/UserForm";
import ManagePermissionsList from "./pages/ManagePermissionsList";
import ManagePermissionsForm from "./pages/ManagePermissionsForm";
import TransactionsList from "./pages/TransactionsList";
import TransactionForm from "./pages/TransactionForm";
// PURCHASING
// // BELI GREIGE
import BeliGreigePurchaseContractList from "./pages/purchasing/beli_greige/BGPurchaseContractList";
import BeliGreigePurchaseContractForm from "./pages/purchasing/beli_greige/BGPurchaseContractForm";
import BeliGreigePurchaseOrderList from "./pages/purchasing/beli_greige/BGPurchaseOrderList";
import BeliGreigePurchaseOrderForm from "./pages/purchasing/beli_greige/BGPurchaseOrderForm";
import BeliGreigeDeliveryNoteList from "./pages/purchasing/beli_greige/BGDeliveryNoteList";
import BeliGreigeDeliveryNoteForm from "./pages/purchasing/beli_greige/BGDeliveryNoteForm";
import BeliGreigeDeliveryNoteFormV2 from "./pages/purchasing/beli_greige/BGDeliveryNoteFormV2";
// // ORDER CELUP
import OrderCelupPurchaseContractList from "./pages/purchasing/order_celup/OCPurchaseContractList";
import OrderCelupPurchaseContractForm from "./pages/purchasing/order_celup/OCPurchaseContractForm";
import OrderCelupPurchaseOrderList from "./pages/purchasing/order_celup/OCPurchaseOrderList";
import OrderCelupPurchaseOrderForm from "./pages/purchasing/order_celup/OCPurchaseOrderForm";
import OrderCelupDeliveryNoteList from "./pages/purchasing/order_celup/OCDeliveryNoteList";
import OrderCelupDeliveryNoteForm from "./pages/purchasing/order_celup/OCDeliveryNoteForm";
import OrderCelupDeliveryNoteFormV2 from "./pages/purchasing/order_celup/OCDeliveryNoteFormV2";
// // ORDER CELUP X
import OrderCelupXPurchaseOrderList from "./pages/purchasing/order_celup_x/OCXPurchaseOrderList";
import OCXPurchaseOrderForm from "./pages/purchasing/order_celup_x/OCXPurchaseOrderForm";
import OrderCelupXDeliveryNoteList from "./pages/purchasing/order_celup_x/OCXDeliveryNoteList";
import OrderCelupXDeliveryNoteForm from "./pages/purchasing/order_celup_x/OCXDeliveryNoteForm";
import OrderCelupXDeliveryNoteFormV2 from "./pages/purchasing/order_celup_x/OCXDeliveryNoteFormV2";
// // INVENTORY
import InventoryKainList from "./pages/purchasing/inventory/InventoryKainList";
import InventoryAksesorisList from "./pages/purchasing/inventory/InventoryAksesorisList";
import InventoryAksesorisForm from "./pages/purchasing/inventory/InventoryAksesorisForm";
import InventoryKainForm from "./pages/purchasing/inventory/InventoryKainForm";

import InventoryKainPrint from "./utils/inventory/InventoryKainDummyPrint"
import InventoryAksesorisPrint from "./utils/inventory/InventoryAksesorisDummyPrint"

// // PRINT OCX
// import OCXDataDummyPrint from "./utils/buy/order_celup_x/OCXDummyPrint";
// import SJOCXDataDummyPrint from "./utils/buy/order_celup_x/SJOCXDummyPrint";
import OCXPrint from "./utils/buy/order_celup_x/OCXDummyPrint";
import SJOCXPrint from "./utils/buy/order_celup_x/SJOCXDummyPrint";

// // KAIN JADI/FINISH
import KainJadiPurchaseContractList from "./pages/purchasing/kain_jadi/KJPurchaseContractList";
import KainJadiPurchaseContractForm from "./pages/purchasing/kain_jadi/KJPurchaseContractForm";
import KainJadiPurchaseOrderList from "./pages/purchasing/kain_jadi/KJPurchaseOrderList";
import KainJadiPurchaseOrderForm from "./pages/purchasing/kain_jadi/KJPurchaseOrderForm";
import KainJadiDeliveryNoteList from "./pages/purchasing/kain_jadi/KJDeliveryNoteList";
import KainJadiDeliveryNoteForm from "./pages/purchasing/kain_jadi/KJDeliveryNoteForm";
import KainJadiDeliveryNoteFormV2 from "./pages/purchasing/kain_jadi/KJDeliveryNoteFormV2";
// // JUAL BELI
import JualBeliPurchaseContractList from "./pages/purchasing/jual_beli/JBPurchaseContractList";
import JualBeliPurchaseContractForm from "./pages/purchasing/jual_beli/JBPurchaseContractForm";
import JualBeliDeliveryNoteList from "./pages/purchasing/jual_beli/JBDeliveryNoteList";
import JualBeliDeliveryNoteForm from "./pages/purchasing/jual_beli/JBDeliveryNoteForm";
import JualBeliDeliveryNoteFormV2 from "./pages/purchasing/jual_beli/JBDeliveryNoteFormV2";
// TRANSACTIONS
import ExporSalesContractList from "./pages/transactions/ExporSalesContractList";
import ExporSalesContractForm from "./pages/transactions/ExporSalesContractForm";
import SalesContractForm from "./pages/transactions/SalesContractForm";
import SalesContractList from "./pages/transactions/SalesContractList";
import SalesContractViaList from "./pages/transactions/SalesContractViaList";
import SalesContractViaForm from "./pages/transactions/SalesContractViaForm";
import SalesOrderViaList from "./pages/transactions/SalesOrderViaList";
import SalesOrderViaForm from "./pages/transactions/SalesOrderViaForm";
// MASTER DATA
import CustomerList from "./pages/master_data/CustomersList";
import CustomerForm from "./pages/master_data/CustomerForm";
import SuppliersList from "./pages/master_data/SuppliersList";
import SuppliersListForm from "./pages/master_data/SuppliersListForm";
import ColorsList from "./pages/master_data/ColorsList";
import ColorForm from "./pages/master_data/ColorForm";
import FabricsList from "./pages/master_data/FabricsList";
import FabricForm from "./pages/master_data/FabricForm";
import SOTypesList from "./pages/master_data/SOTypesList";
import SOTypeForm from "./pages/master_data/SOTypeForm";
import CustomerTypesList from "./pages/master_data/CustomerTypesList";
import CustomerTypeForm from "./pages/master_data/CustomerTypeForm";
import CurrenciesList from "./pages/master_data/CurrenciesList";
import CurrencyForm from "./pages/master_data/CurrencyForm";
import SalesOrderList from "./pages/transactions/SalesOrderList";
import SalesOrderForm from "./pages/transactions/SalesOrderForm";
import GradeList from "./pages/master_data/GradeList";
import GradeForm from "./pages/master_data/GradeForm";
import UnitsList from "./pages/master_data/UnitsList";
import UnitsForm from "./pages/master_data/UnitsForm";
import AgentList from "./pages/master_data/AgentList";
import AgentForm from "./pages/master_data/AgentForm";
import BankAccountList from "./pages/master_data/BankAccountList";
import BankAccountForm from "./pages/master_data/BankAccountForm";
// WAREHOUSE
import DeliveryNoteList from "./pages/warehouse/DeliveryNoteList";
import DeliveryNoteForm from "./pages/warehouse/DeliveryNoteForm";
import DeliveryNoteViaList from "./pages/warehouse/DeliveryNoteViaList";
import DeliveryNoteViaForm from "./pages/warehouse/DeliveryNoteViaForm";
import PackingListList from "./pages/warehouse/PackingListList";
import PackingListForm from "./pages/warehouse/PackingListForm";
import PackingListViaList from "./pages/warehouse/PackingListViaList";
import PackingListViaForm from "./pages/warehouse/PackingListViaForm";
// PRINT
// SELL
import SalesContractPrint from "./utils/sell/SalesContractDummyPrint";
import ExporSalesContractPrint from "./utils/sell/ExporSalesContractDummyPrint";
import SalesOrderPrint from "./utils/sell/SalesOrderDummyPrint";
import PackingListPrint from "./utils/sell/PackingListDummyPrint";
import SuratJalanPrint from "./utils/sell/SuratJalanDummyPrint";
// MEMO
import MemoOrderMatchingPrint from "./utils/memo/MemoOrderMatchingDummyPrint";
import DetailMemoOrderMatchingPrint from "./utils/memo/DetailMemoOrderMatchingDummyPrint";
// PRINT
// BUY
// BELI GREIGE
import BGContractPrint from "./utils/buy/beli_greige/BGContractDummyPrint";
import BGOrderPrint from "./utils/buy/beli_greige/BGOrderDummyPrint";
import BGSuratJalanPrint from "./utils/buy/beli_greige/BGSuratJalanDummyPrint";
// KAIN JADI
import KJContractPrint from "./utils/buy/kain_jadi/KJContractDummyPrint";
import KJOrderPrint from "./utils/buy/kain_jadi/KJOrderDummyPrint";
import KJSuratJalanPrint from "./utils/buy/kain_jadi/KJSuratJalanDummyPrint";
// ORDER CELUP
import OCContractPrint from "./utils/buy/order_celup/OCContractDummyPrint";
import OCOrderPrint from "./utils/buy/order_celup/OCOrderDummyPrint";
import OCSuratJalanPrint from "./utils/buy/order_celup/OCSuratJalanDummyPrint";
// JUAL BELI
import JBContractPrint from "./utils/buy/jual_beli/JBContractDummyPrint";
import JBSuratJalanPrint from "./utils/buy/jual_beli/JBSuratJalanDummyPrint";
// INVOICE
import SalesInvoiceList from "./pages/invoice/SalesInvoiceList";
import SalesInvoiceViaList from "./pages/invoice/SalesInvoiceViaList";
import SalesInvoicePrint from "./utils/sell/SalesInvoiceDummyPrint";
import JBInvoiceList from "./pages/invoice/JBInvoiceList";
import JBInvoicePrint from "./utils/buy/jual_beli/JBInvoiceDummyPrint";
// RETUR
import ReturGreigeList from "./pages/retur/ReturGreigeList";
import ReturOrderCelupList from "./pages/retur/ReturOrderCelupList";
import ReturKainJadiList from "./pages/retur/ReturKainJadiList";
import ReturJualBeliList from "./pages/retur/ReturJualBeliList";
import ReturSalesList from "./pages/retur/ReturSalesList";

import ReturGreigeForm from "./pages/retur/ReturGreigeForm";
import ReturOrderCelupForm from "./pages/retur/ReturOrderCelupForm";
import ReturKainJadiForm from "./pages/retur/ReturKainJadiForm";
import ReturJualBeliForm from "./pages/retur/ReturJualBeliForm";
import ReturSalesForm from "./pages/retur/ReturSalesForm";

// RETUR PRINT
import ReturGreigePrint from "./utils/retur/ReturGreigeDummyPrint";
import ReturOrderCelupPrint from "./utils/retur/ReturOrderCelupDummyPrint";
import ReturKainJadiPrint from "./utils/retur/ReturKainJadiDummyPrint";
import ReturJualBeliPrint from "./utils/retur/ReturJualBeliDummyPrint";
import ReturSalesPrint from "./utils/retur/ReturSalesDummyPrint";

// MEMO
import MemoOrderMatchingList from "./pages/memo/MemoOrderMatchingList";
import MemoOrderMatchingForm from "./pages/memo/MemoOrderMatchingForm";

// FINANCE
import FinanceMainLayout from "./layouts/FinanceMainLayout";
import BanksList from "./finance_pages/master_data/banks/BanksList";
import BanksForm from "./finance_pages/master_data/banks/BanksForm";
import PaymentMethodsList from "./finance_pages/master_data/payment_methods/PaymentMethodsList";
import PaymentMethodsForm from "./finance_pages/master_data/payment_methods/PaymentMethodsForm";
import JenisPotonganList from "./finance_pages/master_data/jenis_potongan/JenisPotonganList";
import JenisPotonganForm from "./finance_pages/master_data/jenis_potongan/JenisPotonganForm";
import JenisHutangList from "./finance_pages/master_data/jenis_hutang/JenisHutangList";
import JenisHutangForm from "./finance_pages/master_data/jenis_hutang/JenisHutangForm";
import ExpeditionAccessoriesList from "./finance_pages/purchase/expedition_accessories/ExpeditionAccessoriesList";
import ExpeditionAccessoriesForm from "./finance_pages/purchase/expedition_accessories/ExpeditionAccessoriesForm";
import HutangPurchaseGreigeList from "./finance_pages/payment/hutang_purchase_greige/HutangPurchaseGreigeList";
import HutangPurchaseGreigeForm from "./finance_pages/payment/hutang_purchase_greige/HutangPurchaseGreigeForm";
import HutangPurchaseCelupList from "./finance_pages/payment/hutang_purchase_celup/HutangPurchaseCelupList";
import HutangPurchaseCelupForm from "./finance_pages/payment/hutang_purchase_celup/HutangPurchaseCelupForm";
import HutangPurchaseKainJadiList from "./finance_pages/payment/hutang_purchase_kain_jadi/HutangPurchaseKainJadiList";
import HutangPurchaseKainJadiForm from "./finance_pages/payment/hutang_purchase_kain_jadi/HutangPurchaseKainJadiForm";
import HutangPurchaseJualBeliList from "./finance_pages/payment/hutang_purchase_jual_beli/HutangPurchaseJualBeliList";
import HutangPurchaseJualBeliForm from "./finance_pages/payment/hutang_purchase_jual_beli/HutangPurchaseJualBeliForm";
import HutangPurchaseAksesorisEkspedisiList from "./finance_pages/payment/hutang_purchase_aksesoris_ekspedisi/HutangPurchaseAksesorisEkspedisiList";
import HutangPurchaseAksesorisEkspedisiForm from "./finance_pages/payment/hutang_purchase_aksesoris_ekspedisi/HutangPurchaseAksesorisEkspedisiForm";
import PiutangJualBeliList from "./finance_pages/penerimaan_piutang/piutang_jual_beli/PiutangJualBeliList";
import PiutangJualBeliForm from "./finance_pages/penerimaan_piutang/piutang_jual_beli/PiutangJualBeliForm";
import PiutangSalesList from "./finance_pages/penerimaan_piutang/piutang_sales/PiutangSalesList";
import PiutangSalesForm from "./finance_pages/penerimaan_piutang/piutang_sales/PiutangSalesForm";
import DashboardFinance from "./finance_pages/DashboardFinance";

function App() {
  return (
    <Router>
      <Route path="/" component={LoginPage} />
      <Route path="/dashboard-finance" component={DashboardFinance} />
      {/* <Route path="/dashboard-finance" component={FinanceMainLayout} /> */}
      <Route path="/users" component={UsersList} />
      <Route path="/users/form" component={UserForm} />

      <Route path="/manage-permissions" component={ManagePermissionsList} />
      <Route
        path="/manage-permissions/form"
        component={ManagePermissionsForm}
      />

      <Route path="/dashboard" component={Dashboard} />

      <Route path="/orders" component={OrdersList} />
      <Route path="/orders/form" component={OrderForm} />

      <Route path="/transactions" component={TransactionsList} />
      <Route path="/transactions/form" component={TransactionForm} />

      {/* TRANSACTIONS */}
      <Route path="/salescontract" component={SalesContractList} />
      <Route path="/salescontract/form" component={SalesContractForm} />

      <Route path="/salescontractvia" component={SalesContractViaList} />
      <Route path="/salescontractvia/form" component={SalesContractViaForm} />

      <Route path="/salesordervia" component={SalesOrderViaList} />
      <Route path="/salesordervia/form" component={SalesOrderViaForm} />

      <Route path="/expor/salescontract" component={ExporSalesContractList} />
      <Route
        path="/expor/salescontract/form"
        component={ExporSalesContractForm}
      />

      <Route path="/salesorder" component={SalesOrderList} />
      <Route path="/salesorder/form" component={SalesOrderForm} />
      {/* TRANSACTIONS */}

      {/* WAREHOUSE */}
      <Route path="/packinglist" component={PackingListList} />
      <Route path="/packinglist/form" component={PackingListForm} />

      <Route path="/packinglistvia" component={PackingListViaList} />
      <Route path="/packinglistvia/form" component={PackingListViaForm} />

      <Route path="/deliverynote" component={DeliveryNoteList} />
      <Route path="/deliverynote/form" component={DeliveryNoteForm} />

      <Route path="/deliverynotevia" component={DeliveryNoteViaList} />
      <Route path="/deliverynotevia/form" component={DeliveryNoteViaForm} />

      <Route path="/inventory/kain" component={InventoryKainList} />
      <Route path="/inventory/kain/form" component={InventoryKainForm} />
      <Route path="/inventory/aksesoris" component={InventoryAksesorisList} />
      <Route
        path="/inventory/aksesoris/form"
        component={InventoryAksesorisForm}
      />

      <Route path="/print/inventory-kain" component={InventoryKainPrint}/>
      <Route path="/print/inventory-aksesoris" component={InventoryAksesorisPrint}/>
      {/* WAREHOUSE */}

      {/* PURCHASING */}

      {/* BELI GREIGE */}
      <Route
        path="/beligreige-purchasecontract"
        component={BeliGreigePurchaseContractList}
      />
      <Route
        path="/beligreige-purchasecontract/form"
        component={BeliGreigePurchaseContractForm}
      />

      <Route
        path="/beligreige-purchaseorder"
        component={BeliGreigePurchaseOrderList}
      />
      <Route
        path="/beligreige-purchaseorder/form"
        component={BeliGreigePurchaseOrderForm}
      />

      <Route
        path="/beligreige-deliverynote"
        component={BeliGreigeDeliveryNoteList}
      />
      <Route
        path="/beligreige-deliverynote/form"
        component={BeliGreigeDeliveryNoteFormV2}
      />
      {/* BELI GREIGE */}

      {/* ORDER CELUP */}
      <Route
        path="/ordercelup-purchasecontract"
        component={OrderCelupPurchaseContractList}
      />
      <Route
        path="/ordercelup-purchasecontract/form"
        component={OrderCelupPurchaseContractForm}
      />

      <Route
        path="/ordercelup-purchaseorder"
        component={OrderCelupPurchaseOrderList}
      />
      <Route
        path="/ordercelup-purchaseorder/form"
        component={OrderCelupPurchaseOrderForm}
      />

      <Route
        path="/ordercelup-deliverynote"
        component={OrderCelupDeliveryNoteList}
      />
      <Route
        path="/ordercelup-deliverynote/form"
        component={OrderCelupDeliveryNoteFormV2}
      />
      {/* ORDER CELUP */}

      {/* ORDER CELUP X */}
      <Route
        path="/ordercelup-purchaseocx"
        component={OrderCelupXPurchaseOrderList}
      />
      <Route
        path="/ordercelup-purchaseocx/form"
        component={OCXPurchaseOrderForm}
      />

      <Route path="/sjocx" component={OrderCelupXDeliveryNoteList} />
      <Route path="/sjocx/form" component={OrderCelupXDeliveryNoteFormV2} />

      <Route path="/print/ordercelup-purchaseocx" component={OCXPrint} />
      <Route path="/print/sjocx" component={SJOCXPrint} />
      {/* ORDER CELUP X */}

      {/* KAIN JADI */}
      <Route
        path="/kainjadi-purchasecontract"
        component={KainJadiPurchaseContractList}
      />
      <Route
        path="/kainjadi-purchasecontract/form"
        component={KainJadiPurchaseContractForm}
      />

      <Route
        path="/kainjadi-purchaseorder"
        component={KainJadiPurchaseOrderList}
      />
      <Route
        path="/kainjadi-purchaseorder/form"
        component={KainJadiPurchaseOrderForm}
      />

      <Route
        path="/kainjadi-deliverynote"
        component={KainJadiDeliveryNoteList}
      />
      <Route
        path="/kainjadi-deliverynote/form"
        component={KainJadiDeliveryNoteFormV2}
      />
      {/* KAIN JADI */}

      {/* JUAL BELI */}
      <Route
        path="/jualbeli-purchasecontract"
        component={JualBeliPurchaseContractList}
      />
      <Route
        path="/jualbeli-purchasecontract/form"
        component={JualBeliPurchaseContractForm}
      />

      <Route
        path="/jualbeli-deliverynote"
        component={JualBeliDeliveryNoteList}
      />
      <Route
        path="/jualbeli-deliverynote/form"
        component={JualBeliDeliveryNoteFormV2}
      />
      {/* JUAL BELI */}

      {/* PURCHASING */}

      {/* PRINT */}

      {/* SELL */}
      <Route path="/print/salescontract" component={SalesContractPrint} />
      <Route
        path="/print/expor/salescontract"
        component={ExporSalesContractPrint}
      />
      <Route path="/print/salesorder" component={SalesOrderPrint} />
      <Route path="/print/packinglist" component={PackingListPrint} />
      <Route path="/print/suratjalan" component={SuratJalanPrint} />
      {/* SELL */}

      {/* BUY */}
      {/* BELI GREIGE */}
      <Route path="/print/beligreige/contract" component={BGContractPrint} />
      <Route path="/print/beligreige/order" component={BGOrderPrint} />
      <Route
        path="/print/beligreige/suratjalan"
        component={BGSuratJalanPrint}
      />
      {/* BELI GREIGE */}
      {/* KAIN JADI */}
      <Route path="/print/kainjadi/contract" component={KJContractPrint} />
      <Route path="/print/kainjadi/order" component={KJOrderPrint} />
      <Route path="/print/kainjadi/suratjalan" component={KJSuratJalanPrint} />
      {/* KAIN JADI */}
      {/* ORDER CELUP */}
      <Route path="/print/ordercelup/contract" component={OCContractPrint} />
      <Route path="/print/ordercelup/order" component={OCOrderPrint} />
      <Route
        path="/print/ordercelup/suratjalan"
        component={OCSuratJalanPrint}
      />
      {/* ORDER CELUP */}
      {/* JUAL BELI */}
      <Route path="/print/jualbeli/contract" component={JBContractPrint} />
      <Route path="/print/jualbeli/suratjalan" component={JBSuratJalanPrint} />
      {/* JUAL BELI */}
      {/* BUY */}
      {/* MEMO */}
      <Route path="/print/order-matching" component={MemoOrderMatchingPrint} />
      <Route
        path="/print/detail-order-matching"
        component={DetailMemoOrderMatchingPrint}
      />
      {/* MEMO */}
      {/* PRINT */}

      {/* Invoice */}
      <Route path="/deliverynote-invoice" component={SalesInvoiceList} />
      <Route path="/invoice-via" component={SalesInvoiceViaList} />
      <Route path="/print/deliverynote-invoice" component={SalesInvoicePrint} />
      <Route path="/jualbeli-invoice" component={JBInvoiceList} />
      <Route path="/print/jualbeli-invoice" component={JBInvoicePrint} />
      {/* Invoice */}

      {/* RETUR */}
      <Route path="/retur-greige" component={ReturGreigeList} />
      <Route path="/retur-ordercelup" component={ReturOrderCelupList} />
      <Route path="/retur-kainjadi" component={ReturKainJadiList} />
      <Route path="/retur-jualbeli" component={ReturJualBeliList} />
      <Route path="/retur-sales" component={ReturSalesList} />

      <Route path="/retur-greige/form" component={ReturGreigeForm} />
      <Route path="/retur-ordercelup/form" component={ReturOrderCelupForm} />
      <Route path="/retur-kainjadi/form" component={ReturKainJadiForm} />
      <Route path="/retur-jualbeli/form" component={ReturJualBeliForm} />
      <Route path="/retur-sales/form" component={ReturSalesForm} />
      {/* RETUR */}

      {/* PRINT RETUR */}
      <Route path="/print/retur-greige" component={ReturGreigePrint} />
      <Route path="/print/retur-ordercelup" component={ReturOrderCelupPrint} />
      <Route path="/print/retur-kainjadi" component={ReturKainJadiPrint} />
      <Route path="/print/retur-jualbeli" component={ReturJualBeliPrint} />
      <Route path="/print/retur-sales" component={ReturSalesPrint} />
      {/* PRINT RETUR */}

      {/* MEMO */}
      <Route path="memo-order-matching" component={MemoOrderMatchingList} />
      <Route
        path="memo-order-matching/form"
        component={MemoOrderMatchingForm}
      />

      {/* MASTER DATA */}
      <Route path="/suppliers" component={SuppliersList} />
      <Route path="/suppliers/form" component={SuppliersListForm} />

      <Route path="/customers" component={CustomerList} />
      <Route path="/customers/form" component={CustomerForm} />

      <Route path="/colors" component={ColorsList} />
      <Route path="/colors/form" component={ColorForm} />

      <Route path="/fabrics" component={FabricsList} />
      <Route path="/fabrics/form" component={FabricForm} />

      <Route path="/so-type" component={SOTypesList} />
      <Route path="/so-type/form" component={SOTypeForm} />

      <Route path="/customer-type" component={CustomerTypesList} />
      <Route path="/customer-type/form" component={CustomerTypeForm} />

      <Route path="/currencies" component={CurrenciesList} />
      <Route path="/currencies/form" component={CurrencyForm} />

      <Route path="/grade" component={GradeList} />
      <Route path="/grade/form" component={GradeForm} />

      <Route path="/units" component={UnitsList} />
      <Route path="/units/form" component={UnitsForm} />

      <Route path="/agent" component={AgentList} />
      <Route path="/agent/form" component={AgentForm} />

      <Route path="/bank-account" component={BankAccountList} />
      <Route path="/bank-account/form" component={BankAccountForm} />

      {/* MASTER DATA */}
      {/* ================================================================================================================================================================================================================= */}
      {/* FINANCE MODULE */}
      {/* MASTER DATA */}
      {/* BANKS */}
      <Route path="/banks" component={BanksList} />
      <Route path="/banks/form" component={BanksForm} />
      {/* BANKS */}
      {/* PAYMENT METHODS */}
      <Route path="/payment-methods" component={PaymentMethodsList} />
      <Route path="/payment-methods/form" component={PaymentMethodsForm} />
      {/* PAYMENT METHODS */}
      {/* JENIS POTONGAN */}
      <Route path="/jenis-potongan" component={JenisPotonganList} />
      <Route path="/jenis-potongan/form" component={JenisPotonganForm} />
      {/* JENIS POTONGAN */}
      {/* JENIS HUTANG */}
      <Route path="/jenis-hutang" component={JenisHutangList} />
      <Route path="/jenis-hutang/form" component={JenisHutangForm} />
      {/* JENIS HUTANG */}
      {/* MASTER DATA */}
      {/* PURCHASE */}
      <Route
        path="/expedition-accessories"
        component={ExpeditionAccessoriesList}
      />
      <Route
        path="/expedition-accessories/form"
        component={ExpeditionAccessoriesForm}
      />
      {/* PURCHASE */}
      {/* PAYMENT */}
      {/* BELI GREIGE */}
      <Route
        path="/hutang-purchase-greige"
        component={HutangPurchaseGreigeList}
      />
      <Route
        path="/hutang-purchase-greige/form"
        component={HutangPurchaseGreigeForm}
      />
      {/* BELI GREIGE */}
      {/* BELI CELUP */}
      <Route
        path="/hutang-purchase-celup"
        component={HutangPurchaseCelupList}
      />
      <Route
        path="/hutang-purchase-celup/form"
        component={HutangPurchaseCelupForm}
      />
      {/* BELI CELUP */}
      {/* BELI KAIN JADI */}
      <Route
        path="/hutang-purchase-kain-jadi"
        component={HutangPurchaseKainJadiList}
      />
      <Route
        path="/hutang-purchase-kain-jadi/form"
        component={HutangPurchaseKainJadiForm}
      />
      {/* BELI KAIN JADI */}
      {/* BELI JUAL BELI */}
      <Route
        path="/hutang-purchase-jual-beli"
        component={HutangPurchaseJualBeliList}
      />
      <Route
        path="/hutang-purchase-jual-beli/form"
        component={HutangPurchaseJualBeliForm}
      />
      {/* BELI JUAL BELI */}
      {/* BELI AKSESORIS EKSPEDISI */}
      <Route
        path="/hutang-purchase-aksesoris-ekspedisi"
        component={HutangPurchaseAksesorisEkspedisiList}
      />
      <Route
        path="/hutang-purchase-aksesoris-ekspedisi/form"
        component={HutangPurchaseAksesorisEkspedisiForm}
      />
      {/* BELI AKSESORIS EKSPEDISI */}
      {/* PAYMENT */}

      {/* PIUTANG */}

      {/* Jual Beli */}
      <Route path="/piutang-jual-beli" component={PiutangJualBeliList} />
      <Route path="/piutang-jual-beli/form" component={PiutangJualBeliForm} />
      {/* Jual Beli */}

      {/* Sales */}
      <Route path="/piutang-sales" component={PiutangSalesList} />
      <Route path="/piutang-sales/form" component={PiutangSalesForm} />
      {/* Sales */}

      {/* PIUTANG */}
      {/* FINANCE MODULE */}
    </Router>
  );
}

export default App;
