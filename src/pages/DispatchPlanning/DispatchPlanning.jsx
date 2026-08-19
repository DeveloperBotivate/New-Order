import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Calendar, RotateCcw } from 'lucide-react';
import { getReceivedOrders, getDeliveryHistory, getDispatchHistory } from '../../utils/storageManager';
import PendingDispatch from './PendingDispatch';
import HistoryDispatch from './HistoryDispatch';
import SearchableDropdown from '../../components/SearchableDropdown';
import { TabSwitcher } from '../../components/StandardButtons';

export default function DispatchPlanning() {
  const [activeTab, setActiveTab] = useState('pending');
  const [orders, setOrders] = useState([]);
  const [deliveryHistory, setDeliveryHistory] = useState([]);
  const [dispatchHistory, setDispatchHistory] = useState([]);
  
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filters, setFilters] = useState({ 
    searchQuery: '', 
    fromDate: '', 
    toDate: '', 
    division: '', 
    partyName: '' 
  });

  const refreshData = () => {
    setOrders(getReceivedOrders() || []);
    setDeliveryHistory(getDeliveryHistory() || []);
    setDispatchHistory(getDispatchHistory() || []);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleClearFilters = () =>
    setFilters({ searchQuery: '', fromDate: '', toDate: '', division: '', partyName: '' });

  // 1. Pending Items: Orders that have 'In Stock' delivery items that are NOT fully dispatched.
  // A delivery can be dispatched across several PARTIAL transactions, so "fully dispatched"
  // must be judged by remaining quantity, not by whether any dispatch record merely exists —
  // otherwise a single partial dispatch would wrongly drop the whole order out of Pending.
  const pendingItems = useMemo(() => {
    return orders.filter(order => {
      // Find all delivery checks for this order that are In Stock
      const orderDeliveries = deliveryHistory.filter(d => d.orderId === order.orderId && d.stockStatus === 'In Stock');
      if (orderDeliveries.length === 0) return false;

      // Keep the order in Pending as long as ANY In-Stock delivery still has a
      // remaining (not-yet-dispatched) quantity greater than zero.
      return orderDeliveries.some(delivery => {
        const availableQty = parseFloat(delivery.approveQty) || parseFloat(delivery.qty) || 0;
        const dispatchedQty = dispatchHistory
          .filter(dh => dh.deliveryApproverId === delivery.deliveryApproverId)
          .reduce((sum, dh) => sum + (parseFloat(dh.dispatchQty) || 0), 0);
        const canceledQty = dispatchHistory
          .filter(dh => dh.deliveryApproverId === delivery.deliveryApproverId)
          .reduce((sum, dh) => sum + (parseFloat(dh.cancelQty) || 0), 0);
        return (availableQty - dispatchedQty - canceledQty) > 0;
      });
    }).reverse();
  }, [orders, deliveryHistory, dispatchHistory]);
  
  // 2. History Items: Orders that HAVE items in dispatchHistory
  // To keep it order-based on top-level, we filter orders that have at least one dispatched item
  const historyItems = useMemo(() => {
    return orders.filter(order => {
      return dispatchHistory.some(dh => dh.orderId === order.orderId);
    }).reverse();
  }, [orders, dispatchHistory]);

  const divisionOptions = useMemo(() =>
    Array.from(new Set(orders.map(i => i.division))).filter(Boolean).sort().map(d => ({ value: d, label: d }))
  , [orders]);

  const partyOptions = useMemo(() =>
    Array.from(new Set(orders.map(i => i.partyName))).filter(Boolean).sort().map(g => ({ value: g, label: g }))
  , [orders]);

  return (
    <div className="p-0 sm:p-1 md:p-3 space-y-2 md:space-y-3 flex flex-col h-full min-h-0">
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 lg:gap-3 w-full pb-2 border-b border-gray-100 px-2 md:px-0">
        
        {/* Standardized Tabs */}
        <TabSwitcher
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={[
            { id: 'pending', label: 'Pending', count: pendingItems.length },
            { id: 'history', label: 'History', count: historyItems.length }
          ]}
        />

        {/* Filters */}
        <div className="flex flex-col lg:flex-row w-full gap-2 lg:gap-3 items-center flex-1">
          <div className="flex items-center gap-2 w-full lg:w-auto lg:flex-[1.5]">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-2.5 top-[9px] lg:top-[11px] text-gray-400" size={14} />
              <input type="text" placeholder="Search Orders..." value={filters.searchQuery}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-lg lg:rounded pl-8 pr-2 py-1.5 focus:outline-none focus:border-indigo-500 text-xs md:text-sm h-[32px] md:h-[38px]"
              />
            </div>
            <button onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`lg:hidden flex items-center justify-center rounded-lg shadow-sm h-[32px] w-[32px] flex-shrink-0 transition ${showMobileFilters ? 'bg-indigo-100 text-indigo-700' : 'bg-white border border-gray-300 text-gray-600'}`}>
              <Filter size={14} />
            </button>
            <button onClick={handleClearFilters}
              className="lg:hidden flex items-center justify-center bg-gray-50 text-gray-500 border border-gray-200 rounded-lg h-[32px] w-[32px] flex-shrink-0">
              <RotateCcw size={14} />
            </button>
          </div>

          <div className={`${showMobileFilters ? 'flex' : 'hidden'} lg:flex flex-col lg:flex-row lg:flex-nowrap gap-2 w-full lg:w-auto lg:flex-[8] items-center`}>
            <div className="flex flex-row gap-2 w-full lg:w-auto lg:contents">
              {['From Date', 'To Date'].map((ph, idx) => (
                <div key={ph} className="flex-1 min-w-0 lg:min-w-[140px] relative">
                  <Calendar className="absolute left-2.5 top-[9px] lg:top-[12px] text-gray-400 pointer-events-none" size={14} />
                  <input type="text" placeholder={ph}
                    onFocus={(e) => (e.target.type = 'date')}
                    onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                    value={idx === 0 ? filters.fromDate : filters.toDate}
                    onChange={(e) => setFilters({ ...filters, [idx === 0 ? 'fromDate' : 'toDate']: e.target.value })}
                    className="w-full bg-white border border-gray-300 rounded pl-8 pr-2 py-1.5 focus:outline-none focus:border-indigo-500 text-[11px] md:text-xs h-[32px] md:h-[38px]"
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-row gap-2 w-full lg:w-auto lg:contents">
              <div className="flex-1 min-w-0 lg:min-w-[120px]">
                <SearchableDropdown options={divisionOptions} value={filters.division}
                  onChange={(val) => setFilters({ ...filters, division: val })}
                  placeholder="All Divisions" className="h-[32px] md:h-[38px]" />
              </div>
              <div className="flex-1 min-w-0 lg:min-w-[150px]">
                <SearchableDropdown options={partyOptions} value={filters.partyName}
                  onChange={(val) => setFilters({ ...filters, partyName: val })}
                  placeholder="All Parties" className="h-[32px] md:h-[38px]" />
              </div>
            </div>
            <button onClick={handleClearFilters}
              className="hidden lg:flex items-center justify-center bg-gray-50 text-gray-500 border border-gray-200 rounded w-[38px] h-[38px] hover:bg-gray-100 shadow-sm">
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {activeTab === 'pending' ? (
          <PendingDispatch data={pendingItems} filters={filters} refresh={refreshData} />
        ) : (
          <HistoryDispatch data={historyItems} filters={filters} refresh={refreshData} />
        )}
      </div>
    </div>
  );
}
