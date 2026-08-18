import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, ShieldCheck } from 'lucide-react';
import { updateReceivedOrder } from '../../utils/storageManager';
import toast from 'react-hot-toast';

export default function CheckForm({ order, onClose, onSuccess, isReadOnly = false }) {
  const [checklist, setChecklist] = useState({
    catalogPricing: order.validationChecklist?.catalogPricing || false,
    gstCompliance: order.validationChecklist?.gstCompliance || false,
    transportationType: order.validationChecklist?.transportationType || false,
    remarks: order.validationChecklist?.remarks || ''
  });

  const handleSave = () => {
    // Validate if required
    const updatedOrder = {
      ...order,
      isChecked: true,
      validationChecklist: checklist,
      validatedAt: new Date().toISOString()
    };

    updateReceivedOrder(updatedOrder);
    toast.success('Validation Checklist Saved!');
    if (onSuccess) onSuccess();
  };

  return createPortal(
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-start sm:items-center justify-center z-[100] p-2 sm:p-6 overflow-y-auto" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl w-full max-w-4xl flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 my-auto" 
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-indigo-100 bg-indigo-50/50 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <ShieldCheck size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">Check & Validation</h2>
              <p className="text-[11px] text-gray-500 font-medium leading-tight">Order: {order.orderId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-indigo-100 rounded-lg text-indigo-400 hover:text-indigo-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          
          {/* Summary Grid */}
          <div className="bg-slate-50 p-4 rounded-xl border border-gray-100">
            <h3 className="text-[10px] uppercase font-bold text-gray-400 mb-3 tracking-wider">Order Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
              <div>
                <p className="text-[10px] text-gray-500 font-medium">Order ID</p>
                <p className="text-sm font-bold text-gray-900">{order.orderId}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">Division</p>
                <p className="text-sm font-bold text-gray-900">{order.division}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">PO Number</p>
                <p className="text-sm font-bold text-gray-900">{order.poNumber}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">PO Date</p>
                <p className="text-sm font-bold text-gray-900">{order.poDate}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">Party Name</p>
                <p className="text-sm font-bold text-gray-900">{order.partyName}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">GST Number</p>
                <p className="text-sm font-bold text-gray-900">{order.gstNumber || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">GST %</p>
                <p className="text-sm font-bold text-gray-900">{order.globalGstPercent || '0'}%</p>
              </div>
            </div>
          </div>

          {/* Product Details Table */}
          <div>
             <h3 className="text-[10px] uppercase font-bold text-gray-400 mb-3 tracking-wider">Product Details</h3>
             <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-[10px] text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3 font-bold">Product Number</th>
                      <th className="px-4 py-3 font-bold">Product Name</th>
                      <th className="px-4 py-3 font-bold text-center">Qty</th>
                      <th className="px-4 py-3 font-bold text-center">UOM</th>
                      <th className="px-4 py-3 font-bold text-right">Price/Rate</th>
                      <th className="px-4 py-3 font-bold text-right">Total Price</th>
                      <th className="px-4 py-3 font-bold text-right">GST %</th>
                      <th className="px-4 py-3 font-bold text-right">GST Value</th>
                      <th className="px-4 py-3 font-bold text-right text-indigo-600">Grand Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {order.items?.map((prod, idx) => {
                      const basic = (parseFloat(prod.qty) || 0) * (parseFloat(prod.priceRate) || 0);
                      const gstPerc = parseFloat(prod.gstPercent || order.globalGstPercent || '0');
                      const gstValue = basic * (gstPerc / 100);
                      return (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-xs text-indigo-600 font-bold">{`${order.orderId}-${String(idx + 1).padStart(2, '0')}`}</td>
                          <td className="px-4 py-3 text-xs text-gray-800 font-medium">{prod.productName}</td>
                          <td className="px-4 py-3 text-xs text-gray-700 text-center">{prod.qty}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 text-center">{prod.uom}</td>
                          <td className="px-4 py-3 text-xs text-gray-700 text-right">₹{parseFloat(prod.priceRate || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-xs text-gray-700 text-right">₹{basic.toFixed(2)}</td>
                          <td className="px-4 py-3 text-xs text-gray-700 text-right">{gstPerc}%</td>
                          <td className="px-4 py-3 text-xs text-gray-700 text-right">₹{gstValue.toFixed(2)}</td>
                          <td className="px-4 py-3 text-xs text-indigo-600 text-right font-bold">₹{parseFloat(prod.totalValue || 0).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                    {/* Financial Summary Rows */}
                    <tr className="bg-gray-50/50 border-t-2 border-gray-200">
                      <td colSpan={7} className="px-4 py-2 text-xs font-bold text-gray-600 text-right">Total PO Value:</td>
                      <td colSpan={2} className="px-4 py-2 text-xs font-bold text-gray-900 text-right">₹{order.totalPOValue?.toFixed(2)}</td>
                    </tr>
                    <tr className="bg-gray-50/50">
                      <td colSpan={7} className="px-4 py-2 text-xs font-bold text-gray-600 text-right">Advance Payment:</td>
                      <td colSpan={2} className="px-4 py-2 text-xs font-bold text-gray-900 text-right">{order.advancePayment}</td>
                    </tr>
                    {order.advancePayment === 'Yes' && (
                      <tr className="bg-gray-50/50">
                        <td colSpan={7} className="px-4 py-2 text-xs font-bold text-gray-600 text-right">Advance Amount:</td>
                        <td colSpan={2} className="px-4 py-2 text-xs font-bold text-gray-900 text-right">₹{order.advanceAmount}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
             </div>
          </div>

          {/* Checklist */}
          <div>
            <h3 className="text-[10px] uppercase font-bold text-indigo-600 mb-3 tracking-wider bg-indigo-50 inline-block px-2 py-1 rounded">Technical & Commercial Validation Checklist</h3>
            <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-200">
              
              <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${checklist.catalogPricing ? 'border-indigo-500 bg-indigo-50/30' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input 
                  type="checkbox" 
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  checked={checklist.catalogPricing}
                  onChange={(e) => !isReadOnly && setChecklist({...checklist, catalogPricing: e.target.checked})}
                  disabled={isReadOnly}
                />
                <span className={`text-sm font-medium ${checklist.catalogPricing ? 'text-indigo-900' : 'text-gray-700'}`}>Catalog Pricing Compliance</span>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${checklist.gstCompliance ? 'border-indigo-500 bg-indigo-50/30' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input 
                  type="checkbox" 
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  checked={checklist.gstCompliance}
                  onChange={(e) => !isReadOnly && setChecklist({...checklist, gstCompliance: e.target.checked})}
                  disabled={isReadOnly}
                />
                <span className={`text-sm font-medium ${checklist.gstCompliance ? 'text-indigo-900' : 'text-gray-700'}`}>GST Tax Compliance</span>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${checklist.transportationType ? 'border-indigo-500 bg-indigo-50/30' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input 
                  type="checkbox" 
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  checked={checklist.transportationType}
                  onChange={(e) => !isReadOnly && setChecklist({...checklist, transportationType: e.target.checked})}
                  disabled={isReadOnly}
                />
                <span className={`text-sm font-medium ${checklist.transportationType ? 'text-indigo-900' : 'text-gray-700'}`}>Transportation Type Validated</span>
              </label>

              {/* Remarks Field */}
              <div className="pt-2">
                <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">Remarks</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:border-indigo-500 bg-white disabled:bg-gray-50 disabled:text-gray-500"
                  rows="3"
                  placeholder="Enter your validation remarks..."
                  value={checklist.remarks}
                  onChange={(e) => !isReadOnly && setChecklist({...checklist, remarks: e.target.value})}
                  disabled={isReadOnly}
                />
              </div>

            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            {isReadOnly ? 'Close' : 'Cancel'}
          </button>
          {!isReadOnly && (
            <button
              onClick={handleSave}
              className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <CheckCircle size={16} /> Save Validation
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
