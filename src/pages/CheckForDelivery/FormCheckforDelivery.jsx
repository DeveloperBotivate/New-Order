import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, Package } from 'lucide-react';
import { saveDeliveryTransaction, getDeliveryHistory } from '../../utils/storageManager';
import toast from 'react-hot-toast';

export default function FormCheckforDelivery({ order, onClose, onSuccess }) {
  const [items, setItems] = useState(() => {
    const history = getDeliveryHistory() || [];
    return order.items?.map((item, idx) => {
      const productNumber = `${order.orderId}-${String(idx + 1).padStart(2, '0')}`;
      const prodHist = history.filter(h => h.orderId === order.orderId && h.productNumber === productNumber);
      
      const hasNoStock = prodHist.some(h => h.stockStatus === 'No Stock');
      const itemApproveQty = prodHist.reduce((sum, h) => sum + (parseFloat(h.approveQty) || 0), 0);
      const itemPendingQty = (parseFloat(item.qty) || 0) - itemApproveQty;

      return {
        ...item,
        productNumber,
        stockStatus: '', // 'In Stock' | 'No Stock'
        availableStock: Math.floor(Math.random() * 500) + 100, // Dummy initial stock
        approveQty: '',
        batchNo: '',
        remarks: '',
        _approvedQty: itemApproveQty,
        _pendingQty: itemPendingQty,
        _isCompleted: hasNoStock || itemPendingQty <= 0
      };
    }).filter(item => !item._isCompleted) || [];
  });

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    if (field === 'stockStatus') {
      if (value === 'No Stock') {
        newItems[index].approveQty = '';
        newItems[index].batchNo = '';
      } else if (value === 'In Stock') {
        // Clear batch number to allow manual input
        newItems[index].batchNo = '';
        // Prefill quantity with Pending Qty
        newItems[index].approveQty = newItems[index]._pendingQty || '';
      }
    }
    setItems(newItems);
  };

  const handleSave = () => {
    // Validate
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.stockStatus) {
        return toast.error(`Please select Stock Status for ${item.productName}`);
      }
      if (item.stockStatus === 'In Stock') {
        if (!item.approveQty || parseFloat(item.approveQty) <= 0) {
          return toast.error(`Please enter valid Approve Qty for ${item.productName}`);
        }
      }
    }

    // Attach order context to each delivered item
    const deliveryItems = items.map(item => ({
      ...item,
      orderId: order.orderId,
      division: order.division,
      poNumber: order.poNumber,
      poDate: order.poDate,
      partyName: order.partyName,
      expectedDeliveryDate: order.expectedDeliveryDate,
    }));

    saveDeliveryTransaction(deliveryItems);
    toast.success('Delivery Check Saved!');
    if (onSuccess) onSuccess();
  };

  return createPortal(
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-start sm:items-center justify-center z-[100] p-2 sm:p-6 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-6xl flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 my-auto"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-indigo-100 bg-indigo-50/50 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Package size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">Check For Delivery</h2>
              <p className="text-[11px] text-gray-500 font-medium leading-tight">Order: {order.orderId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-indigo-100 rounded-lg text-indigo-400 hover:text-indigo-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

          {/* Order Summary Grid */}
          <div className="bg-slate-50 p-4 rounded-xl border border-gray-100">
            <h3 className="text-[10px] uppercase font-bold text-gray-400 mb-3 tracking-wider">Order Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6">
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
                <p className="text-[10px] text-gray-500 font-medium">Party Number</p>
                <p className="text-sm font-bold text-gray-900">{order.partyNumber || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">GST Number</p>
                <p className="text-sm font-bold text-gray-900">{order.gstNumber || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">Expected Delivery Date</p>
                <p className="text-sm font-bold text-gray-900">{order.expectedDeliveryDate}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">Responsible Person Name</p>
                <p className="text-sm font-bold text-gray-900">{order.responsiblePerson || '-'}</p>
              </div>
            </div>
          </div>

          {/* Product Items Table */}
          <div>
            <h3 className="text-[10px] uppercase font-bold text-indigo-600 mb-3 tracking-wider bg-indigo-50 inline-block px-2 py-1 rounded">Delivery Items</h3>
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
              <table className="w-full text-left border-collapse min-w-[1300px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[10px] text-gray-500 uppercase tracking-wider">
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Product Number</th>
                    <th className="px-3 py-3 font-bold whitespace-nowrap">Product Name</th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Qty</th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">UOM</th>
                    <th className="px-3 py-3 font-bold text-right whitespace-nowrap">Price/Rate</th>
                    <th className="px-3 py-3 font-bold text-right whitespace-nowrap">Total Price</th>
                    <th className="px-3 py-3 font-bold text-right whitespace-nowrap">GST %</th>
                    <th className="px-3 py-3 font-bold text-right whitespace-nowrap">GST Value</th>
                    <th className="px-3 py-3 font-bold text-right text-indigo-600 whitespace-nowrap">Grand Total</th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Stock Status</th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Approve Qty</th>
                    <th className="px-3 py-3 font-bold text-center whitespace-nowrap">Batch No.</th>
                    <th className="px-3 py-3 font-bold whitespace-nowrap">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((prod, idx) => {
                    const basic = (parseFloat(prod.qty) || 0) * (parseFloat(prod.priceRate) || 0);
                    const gstPerc = parseFloat(prod.gstPercent || order.globalGstPercent || '0');
                    const gstValue = basic * (gstPerc / 100);
                    const grandTotal = basic + gstValue;

                    return (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-3 py-3 text-xs text-indigo-600 font-bold align-top text-center">{prod.productNumber}</td>
                        <td className="px-3 py-3 text-xs text-gray-800 font-medium align-top">{prod.productName}</td>
                        <td className="px-3 py-3 text-xs text-gray-700 text-center align-top font-bold bg-gray-50">{prod.qty}</td>
                        <td className="px-3 py-3 text-xs text-gray-500 text-center align-top"><span className="bg-gray-100 px-2 py-0.5 rounded">{prod.uom}</span></td>
                        <td className="px-3 py-3 text-xs text-gray-700 text-right align-top font-medium">₹{parseFloat(prod.priceRate || 0).toFixed(2)}</td>
                        <td className="px-3 py-3 text-xs text-gray-700 text-right align-top font-medium">₹{basic.toFixed(2)}</td>
                        <td className="px-3 py-3 text-xs text-gray-700 text-right align-top">{gstPerc}%</td>
                        <td className="px-3 py-3 text-xs text-gray-700 text-right align-top font-medium">₹{gstValue.toFixed(2)}</td>
                        <td className="px-3 py-3 text-xs text-indigo-600 text-right align-top font-bold">₹{grandTotal.toFixed(2)}</td>

                        {/* Input fields */}
                        <td className="px-3 py-2 align-top">
                          <select
                            className="w-full text-xs border border-gray-300 rounded p-1.5 focus:outline-none focus:border-indigo-500 bg-white"
                            value={prod.stockStatus}
                            onChange={(e) => handleItemChange(idx, 'stockStatus', e.target.value)}
                          >
                            <option value="">Select</option>
                            <option value="In Stock">In Stock</option>
                            <option value="No Stock">No Stock</option>
                          </select>
                        </td>

                        <td className="px-3 py-2 align-top">
                          {prod.stockStatus === 'In Stock' ? (
                            <input
                              type="number"
                              className="w-full text-xs border border-gray-300 rounded p-1.5 focus:outline-none focus:border-indigo-500 text-center"
                              placeholder="Qty"
                              value={prod.approveQty}
                              onChange={(e) => handleItemChange(idx, 'approveQty', e.target.value)}
                            />
                          ) : (
                            <span className="text-gray-300 text-xs text-center block py-1.5">-</span>
                          )}
                        </td>

                        <td className="px-3 py-2 align-top">
                          {prod.stockStatus === 'In Stock' ? (
                            <input
                              type="text"
                              className="w-full text-xs border border-gray-300 rounded p-1.5 focus:outline-none focus:border-indigo-500 text-center"
                              placeholder="Batch"
                              value={prod.batchNo}
                              onChange={(e) => handleItemChange(idx, 'batchNo', e.target.value)}
                            />
                          ) : (
                            <span className="text-gray-300 text-xs text-center block py-1.5">-</span>
                          )}
                        </td>

                        <td className="px-3 py-2 align-top">
                          <input
                            type="text"
                            className="w-full text-xs border border-gray-300 rounded p-1.5 focus:outline-none focus:border-indigo-500"
                            placeholder="Remarks..."
                            value={prod.remarks}
                            onChange={(e) => handleItemChange(idx, 'remarks', e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <CheckCircle size={16} /> Save Delivery
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
