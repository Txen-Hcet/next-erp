import { Router, Route } from "@solidjs/router";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import OrdersList from "./pages/OrdersList";
import OrderForm from "./pages/OrderForm";
import UsersList from "./pages/UsersList";
import UserForm from "./pages/UserForm";
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
// // ORDER CELUP
import OrderCelupPurchaseContractList from "./pages/purchasing/order_celup/OCPurchaseContractList";
import OrderCelupPurchaseContractForm from "./pages/purchasing/order_celup/OCPurchaseContractForm";
import OrderCelupPurchaseOrderList from "./pages/purchasing/order_celup/OCPurchaseOrderList";
import OrderCelupPurchaseOrderForm from "./pages/purchasing/order_celup/OCPurchaseOrderForm";
import OrderCelupDeliveryNoteList from "./pages/purchasing/order_celup/OCDeliveryNoteList";
import OrderCelupDeliveryNoteForm from "./pages/purchasing/order_celup/OCDeliveryNoteForm";
// // KAIN JADI/FINISH
import KainJadiPurchaseContractList from "./pages/purchasing/kain_jadi/KJPurchaseContractList";
import KainJadiPurchaseContractForm from "./pages/purchasing/kain_jadi/KJPurchaseContractForm";
import KainJadiPurchaseOrderList from "./pages/purchasing/kain_jadi/KJPurchaseOrderList";
import KainJadiPurchaseOrderForm from "./pages/purchasing/kain_jadi/KJPurchaseOrderForm";
import KainJadiDeliveryNoteList from "./pages/purchasing/kain_jadi/KJDeliveryNoteList";
import KainJadiDeliveryNoteForm from "./pages/purchasing/kain_jadi/KJDeliveryNoteForm";
// // JUAL BELI
import JualBeliPurchaseContractList from "./pages/purchasing/jual_beli/JBPurchaseContractList";
import JualBeliPurchaseContractForm from "./pages/purchasing/jual_beli/JBPurchaseContractForm";
import JualBeliDeliveryNoteList from "./pages/purchasing/jual_beli/JBDeliveryNoteList";
import JualBeliDeliveryNoteForm from "./pages/purchasing/jual_beli/JBDeliveryNoteForm";
// TRANSACTIONS
import SalesContractForm from "./pages/transactions/SalesContractForm";
import SalesContractList from "./pages/transactions/SalesContractList";
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
// WAREHOUSE
import DeliveryNoteList from "./pages/warehouse/DeliveryNoteList";
import DeliveryNoteForm from "./pages/warehouse/DeliveryNoteForm";
import PackingListList from "./pages/warehouse/PackingListList";
import PackingListForm from "./pages/warehouse/PackingListForm";
// PRINT
// SELL
import SalesContractPrint from "./utils/sell/SalesContractDummyPrint";
import SalesOrderPrint from "./utils/sell/SalesOrderDummyPrint";
import PackingListPrint from "./utils/sell/PackingListDummyPrint";
import SuratJalanPrint from "./utils/sell/SuratJalanDummyPrint";
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

function App() {
  return (
    <Router>
      <Route path="/" component={LoginPage} />
      <Route path="/dashboard" component={Dashboard} />

      <Route path="/orders" component={OrdersList} />
      <Route path="/orders/form" component={OrderForm} />

      <Route path="/transactions" component={TransactionsList} />
      <Route path="/transactions/form" component={TransactionForm} />

      <Route path="/users" component={UsersList} />
      <Route path="/users/form" component={UserForm} />

      {/* TRANSACTIONS */}
      <Route path="/salescontract" component={SalesContractList} />
      <Route path="/salescontract/form" component={SalesContractForm} />

      <Route path="/salesorder" component={SalesOrderList} />
      <Route path="/salesorder/form" component={SalesOrderForm} />
      {/* TRANSACTIONS */}

      {/* WAREHOUSE */}
      <Route path="/packinglist" component={PackingListList} />
      <Route path="/packinglist/form" component={PackingListForm} />

      <Route path="/deliverynote" component={DeliveryNoteList} />
      <Route path="/deliverynote/form" component={DeliveryNoteForm} />
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
        component={BeliGreigeDeliveryNoteForm}
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
        component={OrderCelupDeliveryNoteForm}
      />
      {/* ORDER CELUP */}

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
        component={KainJadiDeliveryNoteForm}
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
        component={JualBeliDeliveryNoteForm}
      />
      {/* JUAL BELI */}

      {/* PURCHASING */}

      {/* PRINT */}

      {/* SELL */}
      <Route path="/print/salescontract" component={SalesContractPrint} />
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
      {/* PRINT */}

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
      {/* MASTER DATA */}
    </Router>
  );
}

export default App;
