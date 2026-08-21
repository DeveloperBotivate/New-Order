import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  Plus, Search, Filter, Eye, X,
  RotateCcw, Trash2, Check, PackagePlus,
  Upload, ChevronDown, ChevronUp, FileText, Info, Boxes
} from 'lucide-react';
import {
  getDivisions, getVendors, saveVendor, getTransportingTypes, getMasterItems, getUOMs,
  getReceivedOrders, saveReceivedOrder, getPersons, getIMSStock, getConfirmDeliveryHistory
} from '../../utils/storageManager';
import { generateId, compressImageFile, validateAttachmentFile, isPdfDataUrl, ATTACHMENT_ACCEPT, MAX_ATTACHMENT_SIZE_MB } from '../../utils/helpers';
import ModalForm from '../../components/ModalForm';
import DataTable from '../../components/DataTable';
import SearchableDropdown from '../../components/SearchableDropdown';
import ModalAlert from '../../components/ModalAlert';
import InfoPopover from '../../components/InfoPopover';
import { TabSwitcher } from '../../components/StandardButtons';

const PAYMENT_TERM_PRESETS = ['30 Days', '60 Days', '90 Days'];

export default function PurchaseOrder() {
  const [activeTab, setActiveTab] = useState('pending');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentTermMode, setPaymentTermMode] = useState('preset');

  const [alertConfig, setAlertConfig] = useState({
    isOpen: false, type: 'success', title: '', message: ''
  });

  // Master Data
  const [divisions, setDivisions] = useState([]);
  const [parties, setParties] = useState([]);
  const [transportingTypes, setTransportingTypes] = useState([]);
  const [masterItems, setMasterItems] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [confirmDeliveryHistory, setConfirmDeliveryHistory] = useState([]);

  // Table interaction state
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');

  const initialItem = {
    productName: '',
    qty: '',
    uom: '',
    priceRate: '',
    gstPercent: '0',
    totalValue: 0
  };

  const [formData, setFormData] = useState({
    division: '',
    poNumber: '',
    poDate: new Date().toISOString().split('T')[0],
    partyName: '',
    partyNumber: '',
    gstNumber: '',
    responsiblePerson: '',
    expectedDeliveryDate: '',
    deliveryAddress: '',
    transportingType: '',
    paymentTerm: '',
    items: [{ ...initialItem }],
    advancePayment: 'No',
    advanceAmount: '',
    orderReceivedBy: '',
    poImage: '',
    remarks: ''
  });

  const [filters, setFilters] = useState({
    searchQuery: '',
    fromDate: '',
    toDate: '',
    division: '',
    partyName: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const loadOrders = () => {
    setOrders(getReceivedOrders());
    setConfirmDeliveryHistory(getConfirmDeliveryHistory());
  };

  useEffect(() => {
    refreshMasterData();
    loadOrders();
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const refreshMasterData = () => {
    setDivisions(getDivisions());
    setParties(getVendors());
    setTransportingTypes(getTransportingTypes());
    setMasterItems(getMasterItems());
    setUoms(getUOMs());
    setUsers(getPersons());
  };

  const handleClearFilters = () => {
    setFilters({ searchQuery: '', fromDate: '', toDate: '', division: '', partyName: '' });
    setCurrentPage(1);
    toast.success('Filters cleared');
  };

  const handlePartyChange = (partyName) => {
    const party = parties.find(p => p.name === partyName);
    if (party) {
      setFormData(prev => ({
        ...prev,
        partyName: party.name,
        partyNumber: party.phone || '',
        gstNumber: party.gst || '',
        responsiblePerson: party.responsiblePerson || '',
        deliveryAddress: party.address || ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        partyName, partyNumber: '', gstNumber: '', responsiblePerson: '', deliveryAddress: ''
      }));
    }
  };

  // "Add New" on the Party Name dropdown: no popup — just drop the typed name
  // straight into the field so the user fills GST/Contact/Address inline below,
  // like any other party. The new party itself gets saved to Party Master on submit.
  const handleAddNewParty = (typedName) => {
    handlePartyChange(typedName || '');
  };

  const calculateItemTotal = (item) => {
    const qty = parseFloat(item.qty) || 0;
    const rate = parseFloat(item.priceRate) || 0;
    const gst = parseFloat(item.gstPercent) || 0;
    const basic = qty * rate;
    const gstAmount = basic * (gst / 100);
    return basic + gstAmount;
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index] };
    item[field] = value;

    if (field === 'productName') {
      const mi = masterItems.find(m => m.name === value);
      if (mi && mi.uom) item.uom = mi.uom;
      // Intentionally not prefilling priceRate as requested
    }

    if (['productName', 'qty', 'priceRate', 'gstPercent'].includes(field)) {
      item.totalValue = calculateItemTotal(item);
    }

    newItems[index] = item;
    setFormData({ ...formData, items: newItems });
  };

  const handleAddItem = () => {
    setFormData({ ...formData, items: [...formData.items, { ...initialItem }] });
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length === 1) return toast.error('At least one item is required');
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeError = validateAttachmentFile(file);
    if (sizeError) return toast.error(sizeError);
    try {
      const base64 = await compressImageFile(file);
      setFormData(prev => ({ ...prev, poImage: base64 }));
      toast.success('Image attached');
    } catch {
      toast.error('Error reading file');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.division) return toast.error('Division is required');
    if (!formData.partyName) return toast.error('Party Name is required');
    if (!formData.poNumber) return toast.error('PO Number is required');
    if (!formData.deliveryAddress) return toast.error('Delivery Address is required');

    // Validate items
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.productName || !item.qty || !item.priceRate) {
        return toast.error(`Please fill Product Name, Qty, and Price for product ${i + 1}`);
      }
    }

    setLoading(true);

    // If the typed Party Name isn't an existing party, register it in Party Master
    // right now using whatever GST/Contact/Address was filled in on this form —
    // no separate popup needed.
    const isNewParty = !parties.some(p => p.name === formData.partyName);
    if (isNewParty) {
      const allVendors = getVendors();
      const newParty = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        vnNo: `VN-${String(allVendors.length + 1).padStart(3, '0')}`,
        name: formData.partyName,
        gst: formData.gstNumber || '',
        email: '',
        phone: formData.partyNumber || '',
        address: formData.deliveryAddress || '',
        locationLink: '',
        responsiblePerson: formData.responsiblePerson || ''
      };
      saveVendor(newParty);
      setParties(getVendors());
      toast.success(`New party "${newParty.name}" added to Party Master.`);
    }

    const allOrders = getReceivedOrders();
    const nextSn = allOrders.length + 1;
    const orderId = `OR-${String(nextSn).padStart(3, '0')}`;
    const timestamp = new Date().toISOString();

    const totalPOValue = formData.items.reduce((sum, item) => sum + item.totalValue, 0);

    const newOrder = {
      id: generateId(),
      orderId,
      timestamp,
      ...formData,
      totalPOValue
    };

    saveReceivedOrder(newOrder);
    setOrders(getReceivedOrders());

    setAlertConfig({
      isOpen: true,
      type: 'success',
      title: 'Purchase Order Saved!',
      message: `Order ${orderId} has been successfully saved.`
    });

    setFormData({
      division: '', poNumber: '', poDate: new Date().toISOString().split('T')[0],
      partyName: '', partyNumber: '', gstNumber: '', responsiblePerson: '',
      expectedDeliveryDate: '', deliveryAddress: '', transportingType: '', paymentTerm: '',
      items: [{ ...initialItem }],
      advancePayment: 'No', advanceAmount: '', orderReceivedBy: '', poImage: '', remarks: ''
    });
    setPaymentTermMode('preset');

    setShowFormModal(false);
    setLoading(false);
  };

  const toggleRow = (id) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleImageView = (base64, e) => {
    e.stopPropagation();
    setSelectedImage(base64);
    setShowImageModal(true);
  };

  // An order is "delivered" once Confirm Delivery has marked it Delivered.
  const deliveredOrderIds = useMemo(() => {
    return new Set(
      confirmDeliveryHistory.filter(ch => ch.deliveryStatus === 'Delivered').map(ch => ch.orderId)
    );
  }, [confirmDeliveryHistory]);

  const pendingOrders = useMemo(
    () => orders.filter(o => !deliveredOrderIds.has(o.orderId)),
    [orders, deliveredOrderIds]
  );

  const historyOrders = useMemo(
    () => orders.filter(o => deliveredOrderIds.has(o.orderId)),
    [orders, deliveredOrderIds]
  );

  const filteredOrders = useMemo(() => {
    const baseList = activeTab === 'history' ? historyOrders : pendingOrders;
    return baseList.filter(item => {
      if (filters.division && item.division !== filters.division) return false;
      if (filters.partyName && item.partyName !== filters.partyName) return false;

      if (filters.fromDate || filters.toDate) {
        const date = item.poDate;
        if (filters.fromDate && date < filters.fromDate) return false;
        if (filters.toDate && date > filters.toDate) return false;
      }

      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        return (
          item.orderId?.toLowerCase().includes(q) ||
          item.poNumber?.toLowerCase().includes(q) ||
          item.partyName?.toLowerCase().includes(q) ||
          (item.gstNumber && item.gstNumber.toLowerCase().includes(q))
        );
      }
      return true;
    }).reverse();
  }, [activeTab, pendingOrders, historyOrders, filters]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const tableHeaders = [
    { label: "Order ID", className: "sticky left-0 bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[120px]" },
    "Division", "PO-Number", "PO Date", "Party Name", "Party Number",
    "GST Number", "Responsible Person Name", "Expected Delivery Date", "Delivery Address", "Transporting Type",
    "Payment Terms", "Total Product", "Total PO Value", "Advance Payment", "Advance Amount", "Remarks",
    { label: "PO Image", className: "sticky right-0 bg-gray-50 z-20 shadow-[-1px_0_0_0_#e5e7eb] min-w-[80px]" }
  ];

  const renderRow = (item) => {
    const isExpanded = expandedRows.has(item.id);
    return (
      <React.Fragment key={item.id}>
        <tr
          onClick={() => toggleRow(item.id)}
          className={`group hover:bg-slate-50 transition-colors border-b border-gray-100 cursor-pointer ${isExpanded ? 'bg-slate-50' : 'bg-white'}`}
        >
          <td className="px-4 py-3 whitespace-nowrap sticky left-0 z-10 shadow-[1px_0_0_0_#e5e7eb] transition-colors bg-white group-hover:bg-slate-50">
            <div className="flex items-center gap-3">
              <button className="text-gray-400 hover:text-indigo-600 transition-colors focus:outline-none">
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <span className="text-xs text-indigo-600 font-bold">{item.orderId}</span>
            </div>
          </td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{item.division}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-700 whitespace-nowrap">{item.poNumber}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{item.poDate}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-700 whitespace-nowrap font-medium">{item.partyName}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-500 whitespace-nowrap">{item.partyNumber || '-'}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-500 whitespace-nowrap">{item.gstNumber || '-'}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-500 whitespace-nowrap">{item.responsiblePerson || '-'}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{item.expectedDeliveryDate}</td>
          <td className="px-4 py-3 text-left text-[11px] text-gray-600 max-w-[200px] truncate" title={item.deliveryAddress}>{item.deliveryAddress || '-'}</td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-600 whitespace-nowrap">{item.transportingType || '-'}</td>
          <td className="px-4 py-3 text-center whitespace-nowrap">
            {item.paymentTerm ? (
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded border border-indigo-100 uppercase">{item.paymentTerm}</span>
            ) : <span className="text-gray-300 text-[11px]">-</span>}
          </td>
          <td className="px-4 py-3 text-center text-[11px] text-gray-700 whitespace-nowrap">
            <span className="bg-indigo-50 font-bold rounded-lg px-2 py-1">{item.items?.length || 0}</span>
          </td>
          <td className="px-4 py-3 text-center text-[11px] text-emerald-600 font-bold whitespace-nowrap">₹{item.totalPOValue?.toFixed(2)}</td>
          <td className="px-4 py-3 text-center whitespace-nowrap">
            <span className={`px-2 py-0.5 rounded text-[9px] uppercase ${item.advancePayment === 'Yes' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
              {item.advancePayment}
            </span>
          </td>
          <td className="px-4 py-3 text-center text-[11px] text-emerald-600 whitespace-nowrap">
            {item.advancePayment === 'Yes' && item.advanceAmount ? `₹${item.advanceAmount}` : '-'}
          </td>
          <td className="px-4 py-3 text-left whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
            {item.remarks ? (
              <InfoPopover items={[item.remarks]} title="Remarks">
                <span className="text-[11px] text-gray-500 flex items-center gap-1 cursor-help hover:text-indigo-600">
                  <Info size={12} /> View
                </span>
              </InfoPopover>
            ) : <span className="text-gray-300">-</span>}
          </td>
          <td className="px-4 py-3 text-center whitespace-nowrap sticky right-0 z-10 shadow-[-1px_0_0_0_#e5e7eb] transition-colors bg-white group-hover:bg-slate-50" onClick={(e) => e.stopPropagation()}>
            {item.poImage ? (
              <button onClick={(e) => handleImageView(item.poImage, e)} className="text-indigo-600 hover:text-indigo-800 flex justify-center w-full focus:outline-none">
                <Eye size={16} />
              </button>
            ) : <span className="text-gray-300">-</span>}
          </td>
        </tr>
        {isExpanded && (
          <tr>
            <td colSpan={18} className="p-0 border-b border-indigo-50 bg-indigo-50/30">
              <div className="sticky left-0 w-[90vw] md:w-[80vw] lg:w-[75vw] max-w-[1200px] p-4 pl-8 md:pl-12 animate-in slide-in-from-top-2 duration-200">
                <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-indigo-50/50 border-b border-indigo-100 text-[10px] text-indigo-800 uppercase tracking-wider">
                        <th className="px-4 py-3 font-bold text-center">Product Number</th>
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
                    <tbody className="divide-y divide-gray-50">
                      {item.items?.map((prod, idx) => {
                        const basic = (parseFloat(prod.qty) || 0) * (parseFloat(prod.priceRate) || 0);
                        const gstPerc = parseFloat(prod.gstPercent || item.globalGstPercent || '0');
                        const gstValue = basic * (gstPerc / 100);
                        return (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 text-[11px] text-indigo-600 font-bold text-center">{`${item.orderId}-${String(idx + 1).padStart(2, '0')}`}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-800 font-medium">{prod.productName}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-center">{prod.qty}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-500 text-center"><span className="bg-gray-100 px-2 py-0.5 rounded">{prod.uom}</span></td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right font-medium">₹{parseFloat(prod.priceRate || 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right font-medium">₹{basic.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right">{gstPerc}%</td>
                            <td className="px-4 py-3 text-[11px] text-gray-700 text-right font-medium">₹{gstValue.toFixed(2)}</td>
                            <td className="px-4 py-3 text-[11px] text-indigo-600 text-right font-bold">₹{parseFloat(prod.totalValue || 0).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  const renderCard = (item) => {
    const isExpanded = expandedRows.has(item.id);
    return (
      <div key={item.id} className="bg-white rounded-lg border border-indigo-50 shadow-sm overflow-hidden">
        <div
          className="p-3 space-y-2 cursor-pointer hover:bg-gray-50/50 transition-colors"
          onClick={() => toggleRow(item.id)}
        >
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] text-indigo-500 uppercase tracking-widest">{item.orderId}</span>
              <h4 className="text-sm text-gray-900 font-bold uppercase mt-0.5">{item.partyName}</h4>
            </div>
            <span className="px-2 py-0.5 rounded text-[8px] uppercase bg-emerald-100 text-emerald-600 font-bold shadow-sm">
              ₹{item.totalPOValue?.toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <p className="text-gray-400 uppercase tracking-tighter text-[8px]">PO Number</p>
              <p className="text-gray-700 truncate">{item.poNumber}</p>
            </div>
            <div>
              <span className="text-gray-400 block uppercase text-[9px]">Products</span>
              <span className="text-indigo-600 font-bold">{item.items?.length || 0} Items</span>
            </div>
          </div>

          {item.deliveryAddress && (
            <div className="text-[10px]">
              <p className="text-gray-400 uppercase tracking-tighter text-[8px]">Delivery Address</p>
              <p className="text-gray-700 truncate">{item.deliveryAddress}</p>
            </div>
          )}

          {item.paymentTerm && (
            <div className="text-[10px]">
              <p className="text-gray-400 uppercase tracking-tighter text-[8px]">Payment Terms</p>
              <span className="inline-block mt-0.5 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-bold rounded border border-indigo-100 uppercase">{item.paymentTerm}</span>
            </div>
          )}

          <div className="flex justify-center pt-1 border-t border-gray-50">
             <span className="text-[10px] text-gray-400 flex items-center gap-1">
               {isExpanded ? <><ChevronUp size={12}/> Hide Products</> : <><ChevronDown size={12}/> View Products</>}
             </span>
          </div>
        </div>

        {isExpanded && (
          <div className="bg-slate-50 border-t border-indigo-100 p-2 space-y-2">
             {item.items?.map((prod, idx) => (
               <div key={idx} className="bg-white p-2 rounded border border-gray-100 shadow-sm">
                 <div className="flex justify-between border-b border-gray-50 pb-1 mb-1">
                   <span className="text-[10px] font-bold text-gray-700">{prod.productName}</span>
                   <span className="text-[10px] text-indigo-600 font-bold">{prod.gstPercent || 0}% GST</span>
                 </div>
                 <div className="flex justify-between text-[9px] text-gray-500">
                   <span>Qty: {prod.qty} {prod.uom}</span>
                   <span>Rate: ₹{prod.priceRate}</span>
                 </div>
               </div>
             ))}
             {item.poImage && (
              <button
                onClick={(e) => handleImageView(item.poImage, e)}
                className="w-full bg-indigo-50 text-indigo-600 py-1.5 rounded-lg text-[10px] flex items-center justify-center gap-2 font-bold"
              >
                <Eye size={14} /> View PO Image
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-0 sm:p-2 md:p-6 space-y-2 md:space-y-6 flex flex-col h-full min-h-0">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2 lg:gap-4 w-full px-2 sm:px-0">
        <div className="flex flex-col lg:flex-row w-full gap-2 lg:gap-3 items-center">
          <TabSwitcher
            activeTab={activeTab}
            onTabChange={(tab) => { setActiveTab(tab); setCurrentPage(1); }}
            tabs={[
              { id: 'pending', label: 'Pending', count: pendingOrders.length },
              { id: 'history', label: 'History', count: historyOrders.length }
            ]}
          />
          <div className="flex items-center gap-2 w-full lg:w-auto lg:flex-[1.5]">
            <div className="flex-1 w-full relative">
              <Search className="absolute left-2.5 top-[9px] lg:top-[11px] text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search Orders..."
                value={filters.searchQuery}
                onChange={(e) => { setFilters({ ...filters, searchQuery: e.target.value }); setCurrentPage(1); }}
                className="w-full bg-white border border-gray-300 rounded-lg lg:rounded pl-8 pr-2 py-1.5 focus:outline-none focus:border-indigo-500 text-xs md:text-sm h-[32px] md:h-[38px]"
              />
            </div>
            <button
               onClick={() => setShowMobileFilters(!showMobileFilters)}
               className={`lg:hidden flex items-center justify-center rounded-lg shadow-sm h-[32px] w-[32px] flex-shrink-0 transition ${showMobileFilters ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
              <Filter size={14} />
            </button>
          </div>
          <div className={`${showMobileFilters ? 'flex' : 'hidden'} lg:flex flex-col lg:flex-row gap-2 w-full lg:w-auto lg:flex-[8]`}>
             <div className="flex-1 min-w-0 lg:min-w-[150px]">
               <SearchableDropdown
                 options={divisions.map(d => ({ value: d.name, label: d.name }))}
                 value={filters.division}
                 onChange={(val) => { setFilters({ ...filters, division: val }); setCurrentPage(1); }}
                 placeholder="All Divisions"
                 className="h-[32px] md:h-[38px]"
               />
             </div>
             <div className="flex-1 min-w-0 lg:min-w-[150px]">
               <SearchableDropdown
                 options={parties.map(p => ({ value: p.name, label: p.name }))}
                 value={filters.partyName}
                 onChange={(val) => { setFilters({ ...filters, partyName: val }); setCurrentPage(1); }}
                 placeholder="All Parties"
                 className="h-[32px] md:h-[38px]"
               />
             </div>
             <button
              onClick={handleClearFilters}
              className="hidden lg:flex items-center justify-center bg-gray-50 text-gray-500 border border-gray-200 rounded lg:rounded-lg w-[38px] h-[38px] hover:bg-gray-100 transition-colors shadow-sm"
              title="Clear Filters"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowFormModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium items-center gap-2 transition shadow-sm h-[38px] flex-shrink-0 flex"
        >
          <Plus size={16} /> Create PO
        </button>
      </div>

      <ModalForm
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title="Purchase Order Details"
        onSubmit={handleSubmit}
        submitText={loading ? 'Saving...' : 'Save Order'}
        maxWidth="max-w-5xl"
      >
        <div className="space-y-6">
          {/* Header & Party Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Division <span className="text-blue-500">*</span></label>
              <SearchableDropdown options={divisions.map(d => ({ value: d.name, label: d.name }))} value={formData.division} onChange={(val) => setFormData({ ...formData, division: val })} placeholder="Select Division" className="h-[38px] text-sm" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">PO Number <span className="text-blue-500">*</span></label>
              <input type="text" value={formData.poNumber} onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. PO-2026-9265" required />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">PO Date <span className="text-blue-500">*</span></label>
              <input type="date" value={formData.poDate} onChange={(e) => setFormData({ ...formData, poDate: e.target.value })} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery <span className="text-blue-500">*</span></label>
              <input type="date" value={formData.expectedDeliveryDate} onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" required />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Party Name <span className="text-blue-500">*</span></label>
              <SearchableDropdown options={parties.map(p => ({ value: p.name, label: p.name }))} value={formData.partyName} onChange={handlePartyChange} onAdd={handleAddNewParty} placeholder="e.g. Acme Industries" className="h-[38px] text-sm" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact No.</label>
              <input type="text" value={formData.partyNumber} onChange={(e) => setFormData({ ...formData, partyNumber: e.target.value })} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Auto-filled, editable" />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">GST Number</label>
              <input type="text" value={formData.gstNumber} onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Auto-filled, editable" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
              <input type="text" value={formData.responsiblePerson} onChange={(e) => setFormData({ ...formData, responsiblePerson: e.target.value })} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Auto-filled, editable" />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Address <span className="text-blue-500">*</span></label>
              <textarea value={formData.deliveryAddress} onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-[38px] resize-none" placeholder="Auto-filled from party, editable" required />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Transporting Type</label>
              <SearchableDropdown options={transportingTypes.map(t => ({ value: t.name, label: t.name }))} value={formData.transportingType} onChange={(val) => setFormData({ ...formData, transportingType: val })} placeholder="Select Type" className="h-[38px] text-sm" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Order Received By</label>
              <SearchableDropdown options={users.map(u => ({ value: u.name, label: u.name }))} value={formData.orderReceivedBy} onChange={(val) => setFormData({ ...formData, orderReceivedBy: val })} placeholder="Select Receiver" className="h-[38px] text-sm" />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms</label>
              <select
                value={paymentTermMode === 'custom' ? 'Custom' : formData.paymentTerm}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'Custom') {
                    setPaymentTermMode('custom');
                    setFormData({ ...formData, paymentTerm: '' });
                  } else {
                    setPaymentTermMode('preset');
                    setFormData({ ...formData, paymentTerm: val });
                  }
                }}
                className="w-full border border-gray-200 bg-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-[38px]"
              >
                <option value="">Select Term</option>
                {PAYMENT_TERM_PRESETS.map(term => <option key={term} value={term}>{term}</option>)}
                <option value="Custom">Custom (Enter Manually)</option>
              </select>
              {paymentTermMode === 'custom' && (
                <input
                  type="text"
                  value={formData.paymentTerm}
                  onChange={(e) => setFormData({ ...formData, paymentTerm: e.target.value })}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm mt-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter custom payment term"
                />
              )}
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Dynamic Items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-700">Products ({formData.items.length})</h3>
              <button type="button" onClick={handleAddItem} className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                <Plus size={16} /> Add Product
              </button>
            </div>

            <div className="space-y-3">
              {formData.items.map((item, index) => (
                <div key={index} className="flex flex-col gap-3 relative border border-gray-100 rounded-lg p-3 bg-slate-50/50">
                  {formData.items.length > 1 && (
                    <button type="button" onClick={() => handleRemoveItem(index)} className="absolute -top-2 -right-2 bg-white text-gray-400 hover:text-red-500 rounded-full border border-gray-200 shadow-sm p-1 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <div className="space-y-1 md:col-span-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-slate-700">Product Name <span className="text-blue-500">*</span></label>
                        {item.productName && (() => {
                          const stock = getIMSStock(item.productName);
                          const isLow = stock !== null && stock < 100;
                          return (
                            <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${isLow ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`} title="Live current stock from IMS">
                              <Boxes size={11} /> IMS Stock: {stock} {item.uom || ''}
                            </span>
                          );
                        })()}
                      </div>
                      <SearchableDropdown options={masterItems.map(m => ({ value: m.name, label: m.name }))} value={item.productName} onChange={(val) => handleItemChange(index, 'productName', val)} placeholder="e.g. Steel Pipe" className="h-[38px] text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Quantity <span className="text-blue-500">*</span></label>
                      <input type="number" value={item.qty} onChange={(e) => handleItemChange(index, 'qty', e.target.value)} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="0" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">UOM</label>
                      <SearchableDropdown options={uoms.map(u => ({ value: u.name, label: u.name }))} value={item.uom} onChange={(val) => handleItemChange(index, 'uom', val)} placeholder="Pcs" className="h-[38px] text-sm" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Price/Rate (₹) <span className="text-blue-500">*</span></label>
                      <input type="number" value={item.priceRate} onChange={(e) => handleItemChange(index, 'priceRate', e.target.value)} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="0.00" />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">GST (%)</label>
                      <select value={item.gstPercent} onChange={(e) => handleItemChange(index, 'gstPercent', e.target.value)} className="w-full border border-gray-200 bg-white rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-[38px]">
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end items-center mt-1 text-sm">
                    <span className="text-slate-500 mr-2">Total:</span>
                    <span className="text-slate-600 mr-2">
                      ₹{((parseFloat(item.qty) || 0) * (parseFloat(item.priceRate) || 0)).toFixed(2)} +
                      ₹{(((parseFloat(item.qty) || 0) * (parseFloat(item.priceRate) || 0)) * ((parseFloat(item.gstPercent) || 0) / 100)).toFixed(2)} (GST {item.gstPercent || 0}%) =
                    </span>
                    <span className="font-bold text-slate-800">₹{item.totalValue.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-end gap-2 py-4 border-t border-gray-100">
              <div className="flex items-center justify-between w-64">
                <span className="text-sm font-medium text-slate-600">Total PO Value:</span>
                <span className="text-sm font-bold text-slate-800">
                  ₹{formData.items.reduce((sum, item) => sum + ((parseFloat(item.qty) || 0) * (parseFloat(item.priceRate) || 0)), 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between w-64">
                <span className="text-sm font-medium text-slate-600">GST Value:</span>
                <span className="text-sm font-bold text-slate-800">
                  ₹{formData.items.reduce((sum, item) => {
                    const basic = (parseFloat(item.qty) || 0) * (parseFloat(item.priceRate) || 0);
                    return sum + (basic * ((parseFloat(item.gstPercent) || 0) / 100));
                  }, 0).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between w-64 pt-2 border-t border-gray-200">
                <span className="text-sm font-bold text-slate-800">Grand Total PO Value:</span>
                <span className="text-lg font-black text-indigo-700">
                  ₹{formData.items.reduce((sum, item) => sum + item.totalValue, 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Footer Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-1">
                 <label className="block text-sm font-medium text-slate-700 mb-1">Advance Payment</label>
                 <select value={formData.advancePayment} onChange={(e) => setFormData({ ...formData, advancePayment: e.target.value, advanceAmount: e.target.value === 'No' ? '' : formData.advanceAmount })} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white">
                   <option value="No">No</option>
                   <option value="Yes">Yes</option>
                 </select>
               </div>
               {formData.advancePayment === 'Yes' && (
                 <div className="space-y-1 animate-in fade-in">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Advance Amount (₹)</label>
                    <input type="number" value={formData.advanceAmount} onChange={(e) => setFormData({ ...formData, advanceAmount: e.target.value })} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="0" />
                 </div>
               )}
             </div>

             <div className="space-y-1">
                <label className="block text-sm font-medium text-blue-600 mb-1">PO Image</label>
                <label className="flex items-center justify-center w-full h-24 border border-dashed border-gray-300 rounded-md hover:bg-slate-50 hover:border-blue-400 cursor-pointer transition-colors bg-white">
                  <div className="text-center flex flex-col items-center">
                    {formData.poImage ? (
                      <span className="text-emerald-500 font-medium text-sm flex items-center gap-1"><Check size={16}/> Image Attached Successfully</span>
                    ) : (
                      <>
                        <Upload size={20} className="text-blue-500 mb-2" />
                        <span className="text-sm font-medium text-blue-600">Upload PO Photo/Scan</span>
                      </>
                    )}
                  </div>
                  <input type="file" className="hidden" accept={ATTACHMENT_ACCEPT} onChange={handleFileChange} />
                </label>
             </div>

             <div className="space-y-1">
                <label className="block text-sm font-medium text-blue-600 mb-1">Remarks / Instructions</label>
                <textarea value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 h-24 resize-none" placeholder="Enter special shipping requests here..."></textarea>
             </div>
          </div>
        </div>
      </ModalForm>

      {orders.length === 0 && activeTab === 'pending' ? (
        <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 border-dashed shadow-sm flex flex-col items-center justify-center p-10 text-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-4">
            <PackagePlus size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Create New Purchase Order</h2>
          <p className="text-gray-500 text-sm max-w-md mb-6">Click the button above or below to open the form and create a new Purchase Order. Once created, it will appear in the table below.</p>
          <button
            onClick={() => setShowFormModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-6 py-3 text-sm font-bold items-center gap-2 transition shadow-md flex"
          >
            <Plus size={18} /> Open PO Form
          </button>
        </div>
      ) : (
        <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <DataTable
            headers={tableHeaders}
            data={paginatedOrders}
            renderRow={renderRow}
            renderCard={renderCard}
            minWidth="1700px"
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
            totalResults={filteredOrders.length}
          />
        </div>
      )}

      {showImageModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setShowImageModal(false)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full p-2 relative shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-3 -right-3 bg-white text-gray-800 rounded-full p-1.5 shadow-lg hover:bg-gray-100 transition-colors z-10 border border-gray-200"
            >
              <X size={20} />
            </button>
            <div className="overflow-auto max-h-[85vh] rounded-xl">
              {isPdfDataUrl(selectedImage) ? (
                <iframe src={selectedImage} title="PDF Preview" className="w-full h-[80vh] rounded-xl bg-white" />
              ) : selectedImage.startsWith('data:image/') ? (
                <img src={selectedImage} alt="Attachment" className="w-full h-auto" />
              ) : (
                <div className="p-10 text-center">
                  <FileText size={48} className="mx-auto text-indigo-200 mb-4" />
                  <p className="text-gray-600">Document Preview Not Available</p>
                  <a href={selectedImage} download className="mt-4 inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg">Download File</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ModalAlert
        isOpen={alertConfig.isOpen} type={alertConfig.type}
        title={alertConfig.title} message={alertConfig.message}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
      />
    </div>
  );
}
