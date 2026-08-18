import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FileText,
  Settings,
  LogOut as LogOutIcon,
  X,
  Users,
  Database,
  ClipboardList,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CheckCircle,
  ShoppingCart,
  FilePlus2,
  Search,
  Pencil,
  LayoutGrid,
  FilePlus,
  ClipboardCheck,
  Tags,
  Cpu,
  HelpCircle,
  TrendingUp,
  UserCheck,
  History,
  PackageSearch,
  Truck,
  Package,
  CreditCard,
  Ban,
  Warehouse,
  Coins,
  Receipt,
  Blocks,
  PackageCheck,
  MapPin,
  LayoutDashboard
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { getIndents, getReceivedOrders, getDeliveryHistory, getDispatchHistory, getPackagingHistory, getLogisticHistory, getCallanHistory, getInvoiceHistory, getConfirmDeliveryHistory } from '../utils/storageManager';

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [counts, setCounts] = useState({ 
    management: 0,
    checkValidation: 0,
    checkDelivery: 0,
    dispatch: 0,
    packaging: 0,
    logistic: 0,
    callan: 0,
    invoice: 0,
    confirmDelivery: 0
  });

  useEffect(() => {
    const refreshCounts = () => {
      const indents = getIndents() || [];

      // Flatten indents for multi-item modules
      const flattenedItems = indents.flatMap(indent => 
        (indent.items || []).map(item => ({ ...indent, ...item }))
      );

      // 4. Management Approval: technicalApproval && !managementApproval
      const managementCount = flattenedItems.filter(i => i.technicalApproval && !i.managementApproval).length;

      // 5. Check and Validation: received orders where !isChecked
      const receivedOrders = getReceivedOrders() || [];
      const checkValidationCount = receivedOrders.filter(o => !o.isChecked).length;

      // 6. Check for Delivery: valid orders where pendingQty > 0 and no 'No Stock' status
      const deliveryHistory = getDeliveryHistory() || [];
      const checkDeliveryCount = receivedOrders.filter(order => {
        if (!order.isChecked) return false;
        return order.items?.some((item, idx) => {
          const productNumber = `${order.orderId}-${String(idx + 1).padStart(2, '0')}`;
          const historyForProduct = deliveryHistory.filter(h => h.orderId === order.orderId && h.productNumber === productNumber);
          
          const hasNoStock = historyForProduct.some(h => h.stockStatus === 'No Stock');
          if (hasNoStock) return false;
          
          const totalApproved = historyForProduct.reduce((sum, h) => sum + (parseFloat(h.approveQty) || 0), 0);
          const totalQty = parseFloat(item.qty) || 0;
          return totalQty - totalApproved > 0;
        });
      }).length;

      // 7. Dispatch Planning: orders with 'In Stock' deliveries not yet fully dispatched
      // (a delivery can be dispatched across multiple PARTIAL transactions, so this is
      // judged by remaining quantity, not by whether any dispatch record merely exists)
      const dispatchHistory = getDispatchHistory() || [];
      const dispatchCount = receivedOrders.filter(order => {
        const orderDeliveries = deliveryHistory.filter(d => d.orderId === order.orderId && d.stockStatus === 'In Stock');
        if (orderDeliveries.length === 0) return false;
        return orderDeliveries.some(delivery => {
          const availableQty = parseFloat(delivery.approveQty) || parseFloat(delivery.qty) || 0;
          const dispatchedQty = dispatchHistory
            .filter(dh => dh.deliveryApproverId === delivery.deliveryApproverId)
            .reduce((sum, dh) => sum + (parseFloat(dh.dispatchQty) || 0), 0);
          return (availableQty - dispatchedQty) > 0;
        });
      }).length;

      // 8. Packaging Planning: orders with dispatched items not yet fully packaged (Packaging = Yes).
      // Matched by dispatchId — each dispatch transaction (including partial ones) is
      // packaged independently.
      const packagingHistory = getPackagingHistory() || [];
      const packagingCount = receivedOrders.filter(order => {
        const orderDispatches = dispatchHistory.filter(d => d.orderId === order.orderId);
        if (orderDispatches.length === 0) return false;
        return orderDispatches.some(dispatchItem => {
          return !packagingHistory.some(ph => ph.dispatchId === dispatchItem.dispatchId && ph.packagingStatus === 'Yes');
        });
      }).length;

      // 9. Vehicle Logistic: orders with packaged items not yet in logistic history.
      // Plain 'Ex Factory' orders skip Vehicle Logistic entirely (buyer arranges pickup).
      const logisticHistory = getLogisticHistory() || [];
      const logisticCount = receivedOrders.filter(order => {
        if (!['FOR', 'Ex Factory Transpoter Office'].includes(order.transportingType)) return false;
        const orderPackaged = packagingHistory.filter(ph => ph.orderId === order.orderId && ph.packagingStatus === 'Yes');
        if (orderPackaged.length === 0) return false;
        return orderPackaged.some(packageItem => {
          return !logisticHistory.some(lh => lh.dispatchId === packageItem.dispatchId);
        });
      }).length;

      // 10. Make Callan: orders that are ready for Callan (i.e. in Vehicle Logistic history)
      // but not yet in Callan history
      const callanHistory = getCallanHistory() || [];
      const callanCount = receivedOrders.filter(order => {
        const orderPackaged = packagingHistory.filter(ph => ph.orderId === order.orderId && ph.packagingStatus === 'Yes');
        if (orderPackaged.length === 0) return false;

        const orderLogistic = logisticHistory.filter(lh => lh.orderId === order.orderId);

        return orderPackaged.some(packageItem => {
          const readyForCallan = orderLogistic.some(lh => lh.dispatchId === packageItem.dispatchId);
          const notInCallan = !callanHistory.some(ch => ch.dispatchId === packageItem.dispatchId);
          return readyForCallan && notInCallan;
        });
      }).length;

      // 12. Make Invoice: orders that have a Callan but not yet in Invoice history.
      // Matched by dispatchId — each dispatch transaction, including partial ones, is independent
      const invoiceHistory = getInvoiceHistory() || [];
      const invoiceCount = receivedOrders.filter(order => {
        const orderCallans = callanHistory.filter(ch => ch.orderId === order.orderId);
        if (orderCallans.length === 0) return false;

        return orderCallans.some(callanItem => {
          return !invoiceHistory.some(ih => ih.dispatchId === callanItem.dispatchId);
        });
      }).length;

      // 13. Confirm Delivery: orders that have an Invoice but are not 'Delivered' in confirm delivery history
      // Matched by dispatchId — each dispatch transaction, including partial ones, is independent
      const confirmHistory = getConfirmDeliveryHistory() || [];
      const confirmCount = receivedOrders.filter(order => {
        const orderInvoices = invoiceHistory.filter(ih => ih.orderId === order.orderId);
        if (orderInvoices.length === 0) return false;

        return orderInvoices.some(invoiceItem => {
          const cd = confirmHistory.find(ch => ch.dispatchId === invoiceItem.dispatchId);
          return !cd || cd.deliveryStatus !== 'Delivered';
        });
      }).length;

      setCounts({ 
        management: managementCount,
        checkValidation: checkValidationCount,
        checkDelivery: checkDeliveryCount,
        dispatch: dispatchCount,
        packaging: packagingCount,
        logistic: logisticCount,
        callan: callanCount,
        invoice: invoiceCount,
        confirmDelivery: confirmCount
      });
    };

    refreshCounts();
    const interval = setInterval(refreshCounts, 15000); // More frequent refresh
    window.addEventListener('focus', refreshCounts);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refreshCounts);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const adminMenuItems = [
    { path: '/dashboard',           icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/received-order',      icon: FilePlus,       label: 'Received Order' },
    { path: '/check-validation',    icon: ShieldCheck,    label: 'Check & Validation', count: counts.checkValidation },
    { path: '/check-delivery',      icon: PackageCheck,   label: 'Check For Delivery', count: counts.checkDelivery },
    { path: '/production',          icon: Warehouse,      label: 'Production Planning' },
    { path: '/dispatch-planning',   icon: Truck,          label: 'Dispatch Planning', count: counts.dispatch },
    { path: '/packaging',           icon: Package,        label: 'Packaging', count: counts.packaging },
    { path: '/vehicle-logistic',    icon: Truck,          label: 'Vehicle Logistic', count: counts.logistic },
    { path: '/make-callan',         icon: FileText,       label: 'Make Callan', count: counts.callan },
    { path: '/make-invoice',        icon: Receipt,        label: 'Make Invoice', count: counts.invoice },
    { path: '/confirm-delivery',    icon: CheckCircle,    label: 'Confirm Delivery', count: counts.confirmDelivery },
    { path: '/payment',             icon: Coins,          label: 'Payments' },
    { path: '/setting',             icon: Settings,       label: 'Setting' },
    { path: '/master',              icon: LayoutGrid,     label: 'Master' },
  ];

  const employeeMenuItems = [
    { path: '/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/received-order', icon: FilePlus,   label: 'Received Order' },
    { path: '/check-validation', icon: ShieldCheck, label: 'Check & Validation', count: counts.checkValidation },
    { path: '/check-delivery', icon: PackageCheck, label: 'Check For Delivery', count: counts.checkDelivery },
    { path: '/production',    icon: Warehouse,  label: 'Production Planning' },
    { path: '/dispatch-planning', icon: Truck, label: 'Dispatch Planning', count: counts.dispatch },
    { path: '/packaging', icon: Package, label: 'Packaging', count: counts.packaging },
    { path: '/vehicle-logistic', icon: Truck, label: 'Vehicle Logistic', count: counts.logistic },
    { path: '/make-callan', icon: FileText, label: 'Make Callan', count: counts.callan },
    { path: '/make-invoice', icon: Receipt, label: 'Make Invoice', count: counts.invoice },
    { path: '/confirm-delivery', icon: CheckCircle, label: 'Confirm Delivery', count: counts.confirmDelivery },
    { path: '/payment', icon: Coins, label: 'Payments' },
    { path: '/master',        icon: LayoutGrid, label: 'Master' },
  ];

  const menuItems = user?.role === 'ADMIN' 
    ? adminMenuItems 
    : employeeMenuItems.filter(item => user?.accessPages?.includes(item.path));

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 sm:w-72 lg:w-56 2xl:w-60 bg-white border-r border-indigo-100 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-4 border-b border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Users size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold text-indigo-600 tracking-tight">Botivate</span>
            </div>
            <button onClick={onClose} className="lg:hidden p-2 hover:bg-indigo-100/50 rounded-lg">
              <X size={20} className="text-indigo-600" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
            {menuItems.map((item, idx) => (
              <React.Fragment key={idx}>
                {item.isNested ? (
                  <div className="space-y-1">
                    <button
                      onClick={item.onToggle}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 group hover:bg-indigo-100/50 hover:text-indigo-600 border-l-4 border-transparent`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={20} className="group-hover:scale-110 transition-transform flex-shrink-0" />
                        <span className="font-medium leading-tight whitespace-nowrap">{item.label}</span>
                      </div>
                      {item.isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    
                    {item.isOpen && (
                      <div className="pl-9 space-y-1 animate-in slide-in-from-top-2 duration-200">
                        {item.subItems.map((sub) => (
                          <NavLink
                            key={sub.path}
                            to={sub.path}
                            onClick={onClose}
                            className={({ isActive }) => `
                              flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200
                              ${isActive 
                                ? 'bg-indigo-100/50 text-indigo-600' 
                                : 'text-gray-600 hover:bg-indigo-50/50 hover:text-indigo-600'}
                            `}
                          >
                            <span className="text-sm leading-tight whitespace-nowrap font-black">{sub.label}</span>
                            {sub.count > 0 && (
                              <span className="bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
                                {sub.count}
                              </span>
                            )}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) => `
                      flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 group
                      ${isActive 
                        ? 'bg-indigo-100/50 text-indigo-600 border-l-4 border-indigo-600' 
                        : 'text-gray-700 hover:bg-indigo-50/50 hover:text-indigo-600 border-l-4 border-transparent'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={20} className="group-hover:scale-110 transition-transform flex-shrink-0" />
                      <span className="font-black leading-tight whitespace-nowrap">{item.label}</span>
                    </div>
                    {item.count > 0 && (
                      <span className="bg-indigo-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
                        {item.count}
                      </span>
                    )}
                  </NavLink>
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* User Profile Section */}
          <div className="p-4 border-t border-indigo-100 bg-indigo-50/50">
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-500 hover:text-white transition-all font-semibold shadow-sm"
            >
              <LogOutIcon size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;