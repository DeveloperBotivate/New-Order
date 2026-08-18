import React, { useState } from 'react';
import DataTable from '../../components/DataTable';
import { Truck } from 'lucide-react';
import FormFreightPayment from './FormFreightPayment';
import { savePaymentTransaction } from '../../utils/storageManager';
import toast from 'react-hot-toast';

export default function PendingFreight({ data, filters, onSuccess }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [selectedRecord, setSelectedRecord] = useState(null);
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
        item.poNumber?.toLowerCase().includes(q) ||
        item.partyName?.toLowerCase().includes(q) ||
        item.transportAgency?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const tableHeaders = [
    { label: "Action", className: "sticky left-0 bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[120px]" },
    { label: "Order ID", className: "sticky left-[120px] bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[120px]" },
    "PO Number", "Party Name", "Transporter Name", "Lorry Receipt", 
    "Total Freight Expected", "Freight Paid", 
    { label: "Pending Freight", className: "sticky right-0 bg-gray-50 z-20 shadow-[-1px_0_0_0_#e5e7eb] min-w-[140px]" }
  ];

  const handlePaymentSubmit = (formData) => {
    const paymentRecord = {
      orderId: selectedRecord.orderId,
      paymentType: 'Freight',
      amountPaid: formData.amountPaid,
      paymentDate: formData.paymentDate,
      paymentMode: formData.paymentMode,
      referenceNo: formData.referenceNo,
      remarks: formData.remarks,
    };
    
    savePaymentTransaction([paymentRecord]);
    toast.success('Freight Payment recorded successfully!');
    setShowForm(false);
    setSelectedRecord(null);
    onSuccess();
  };

  const renderCard = (record) => (
    <div key={record.orderId} className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-indigo-600">{record.orderId}</span>
        <span className="text-xs text-gray-500">{record.poDate}</span>
      </div>
      <div className="text-sm text-gray-700 font-medium mb-1">{record.partyName}</div>
      <div className="text-xs text-gray-500 mb-3 flex items-center gap-1">
        <Truck size={12} className="text-amber-500" /> {record.transportAgency}
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div>
          <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Expected</span>
          <span className="text-xs font-bold text-gray-700">₹{record.totalFreightExpected?.toFixed(2)}</span>
        </div>
        <div>
          <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Pending</span>
          <span className="text-xs font-bold text-amber-600">₹{record.pendingAmount?.toFixed(2)}</span>
        </div>
      </div>
      <button
        onClick={() => {
          setSelectedRecord(record);
          setShowForm(true);
        }}
        className="w-full bg-amber-600 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-amber-700 transition-colors"
      >
        <Truck size={16} /> Pay Freight
      </button>
    </div>
  );

  const renderRow = (record) => (
    <tr key={record.orderId} className="hover:bg-slate-50 transition-colors border-b border-gray-100">
      <td className="px-4 py-3 whitespace-nowrap sticky left-0 z-10 shadow-[1px_0_0_0_#e5e7eb] bg-white text-center">
        <button
          onClick={() => {
            setSelectedRecord(record);
            setShowForm(true);
          }}
          className="bg-amber-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-amber-700 transition-colors w-full shadow-sm"
        >
          <Truck size={14} /> Pay Freight
        </button>
      </td>
      <td className="px-4 py-3 whitespace-nowrap sticky left-[120px] z-10 shadow-[1px_0_0_0_#e5e7eb] bg-white">
        <span className="text-xs font-bold text-indigo-600">{record.orderId}</span>
      </td>
      <td className="px-4 py-3 text-xs text-center text-gray-700 font-medium whitespace-nowrap">{record.poNumber}</td>
      <td className="px-4 py-3 text-xs text-center text-gray-800 font-medium whitespace-nowrap">{record.partyName}</td>
      <td className="px-4 py-3 text-xs text-center font-bold text-gray-700 whitespace-nowrap">{record.transportAgency}</td>
      <td className="px-4 py-3 text-xs text-center font-bold text-indigo-600 whitespace-nowrap">{record.lrNumber || '-'}</td>
      <td className="px-4 py-3 text-xs text-center font-bold text-gray-800 whitespace-nowrap bg-gray-50">₹{record.totalFreightExpected?.toFixed(2)}</td>
      <td className="px-4 py-3 text-xs text-center font-bold text-emerald-600 whitespace-nowrap bg-emerald-50/50">₹{(record.totalFreightPaid || 0).toFixed(2)}</td>
      <td className="px-4 py-3 text-xs text-center font-bold text-amber-600 whitespace-nowrap bg-amber-50/50 sticky right-0 z-10 shadow-[-1px_0_0_0_#e5e7eb]">₹{record.pendingAmount?.toFixed(2)}</td>
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
        minWidth="1200px"
      />

      {showForm && selectedRecord && (
        <FormFreightPayment 
          agencyData={selectedRecord}
          onClose={() => {
            setShowForm(false);
            setSelectedRecord(null);
          }}
          onSubmit={handlePaymentSubmit}
        />
      )}
    </>
  );
}
