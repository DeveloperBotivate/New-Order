import React, { useState } from 'react';
import DataTable from '../../components/DataTable';
import { CreditCard } from 'lucide-react';
import FormVendorPayment from './FormVendorPayment';
import { savePaymentTransaction } from '../../utils/storageManager';
import toast from 'react-hot-toast';

export default function PendingVendor({ data, filters, onSuccess }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const filteredData = data.filter(item => {
    if (filters.fromDate || filters.toDate) {
      const date = item.poDate;
      if (filters.fromDate && date < filters.fromDate) return false;
      if (filters.toDate && date > filters.toDate) return false;
    }
    
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      return (
        item.orderId.toLowerCase().includes(q) ||
        item.poNumber.toLowerCase().includes(q) ||
        item.partyName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const tableHeaders = [
    { label: "Action", className: "sticky left-0 bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[120px]" },
    { label: "Order ID", className: "sticky left-[120px] bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[120px]" },
    "Division", "PO Number", "PO Date", "Party Name", "Delivery Date", "Transport", "Total Product", 
    "PO Value", "Advance Paid", "Vendor Paid", 
    { label: "Pending Balance", className: "sticky right-0 bg-gray-50 z-20 shadow-[-1px_0_0_0_#e5e7eb] min-w-[140px]" }
  ];

  const handlePaymentSubmit = (formData) => {
    const paymentRecord = {
      orderId: selectedOrder.orderId,
      paymentType: 'Vendor',
      amountPaid: formData.amountPaid,
      paymentDate: formData.paymentDate,
      paymentMode: formData.paymentMode,
      referenceNo: formData.referenceNo,
      remarks: formData.remarks,
    };
    
    savePaymentTransaction([paymentRecord]);
    toast.success('Vendor Payment recorded successfully!');
    setShowForm(false);
    setSelectedOrder(null);
    onSuccess();
  };

  const renderCard = (order) => (
    <div key={order.orderId} className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-indigo-600">{order.orderId}</span>
        <span className="text-xs text-gray-500">{order.poDate}</span>
      </div>
      <div className="text-sm text-gray-700 font-medium mb-3">{order.partyName}</div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div>
          <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Total PO Value</span>
          <span className="text-xs font-bold text-gray-700">₹{order.totalPOValue?.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Pending</span>
          <span className="text-xs font-bold text-red-600">₹{order.pendingAmount.toFixed(2)}</span>
        </div>
      </div>
      <button
        onClick={() => {
          setSelectedOrder(order);
          setShowForm(true);
        }}
        className="w-full bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors"
      >
        <CreditCard size={16} /> Pay Vendor
      </button>
    </div>
  );

  const renderRow = (order) => (
    <tr key={order.orderId} className="hover:bg-slate-50 transition-colors border-b border-gray-100">
      <td className="px-4 py-3 whitespace-nowrap sticky left-0 z-10 shadow-[1px_0_0_0_#e5e7eb] bg-white text-center">
        <button
          onClick={() => {
            setSelectedOrder(order);
            setShowForm(true);
          }}
          className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors w-full shadow-sm"
        >
          <CreditCard size={14} /> Pay Vendor
        </button>
      </td>
      <td className="px-4 py-3 whitespace-nowrap sticky left-[120px] z-10 shadow-[1px_0_0_0_#e5e7eb] bg-white">
        <span className="text-xs font-bold text-indigo-600">{order.orderId}</span>
      </td>
      <td className="px-4 py-3 text-xs text-center text-gray-600 whitespace-nowrap">{order.division}</td>
      <td className="px-4 py-3 text-xs text-center text-gray-700 font-medium whitespace-nowrap">{order.poNumber}</td>
      <td className="px-4 py-3 text-xs text-center text-gray-600 whitespace-nowrap">{order.poDate}</td>
      <td className="px-4 py-3 text-xs text-center text-gray-800 font-medium whitespace-nowrap">{order.partyName}</td>
      <td className="px-4 py-3 text-xs text-center text-gray-600 whitespace-nowrap">{order.expectedDeliveryDate}</td>
      <td className="px-4 py-3 text-xs text-center text-gray-600 whitespace-nowrap">{order.transportingType}</td>
      <td className="px-4 py-3 text-xs text-center font-bold text-gray-800 whitespace-nowrap bg-gray-50">{order.items?.length || 0}</td>
      <td className="px-4 py-3 text-xs text-center font-bold text-emerald-600 whitespace-nowrap">₹{order.totalPOValue?.toFixed(2)}</td>
      <td className="px-4 py-3 text-xs text-center font-bold text-amber-600 whitespace-nowrap bg-amber-50/50">₹{(order.totalAdvancePaid || 0).toFixed(2)}</td>
      <td className="px-4 py-3 text-xs text-center font-bold text-emerald-600 whitespace-nowrap bg-emerald-50/50">₹{(order.totalVendorPaid || 0).toFixed(2)}</td>
      <td className="px-4 py-3 text-xs text-center font-bold text-red-600 whitespace-nowrap bg-red-50/50 sticky right-0 z-10 shadow-[-1px_0_0_0_#e5e7eb]">₹{order.pendingAmount.toFixed(2)}</td>
    </tr>
  );

  return (
    <>
      <DataTable
        headers={tableHeaders}
        data={paginatedData}
        renderRow={renderRow}
        renderCard={renderCard}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
        totalResults={filteredData.length}
        minWidth="1400px"
      />

      {showForm && selectedOrder && (
        <FormVendorPayment 
          order={selectedOrder}
          onClose={() => {
            setShowForm(false);
            setSelectedOrder(null);
          }}
          onSubmit={handlePaymentSubmit}
        />
      )}
    </>
  );
}
