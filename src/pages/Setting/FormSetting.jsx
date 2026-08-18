import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, User, Shield, Lock, MapPin, LayoutGrid } from 'lucide-react';
import { getDivisions } from '../../utils/storageManager';

const AVAILABLE_PAGES = [
  { path: '/received-order', label: 'Received Order' },
  { path: '/check-validation', label: 'Check & Validation' },
  { path: '/check-delivery', label: 'Check For Delivery' },
  { path: '/production', label: 'Production Planning' },
  { path: '/dispatch-planning', label: 'Dispatch Planning' },
  { path: '/packaging', label: 'Packaging' },
  { path: '/vehicle-logistic', label: 'Vehicle Logistic' },
  { path: '/make-callan', label: 'Make Callan' },
  { path: '/make-invoice', label: 'Make Invoice' },
  { path: '/confirm-delivery', label: 'Confirm Delivery' },
  { path: '/payment', label: 'Payments' },
  { path: '/master', label: 'Master' },
];

export default function FormSetting({ user, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    id: user?.id || '',
    password: user?.password || '',
    division: user?.division || 'Select',
    role: user?.role || 'USER',
    accessPages: user?.accessPages || [],
  });

  const [errors, setErrors] = useState({});
  const divisions = getDivisions() || [];

  const handlePageToggle = (path) => {
    setFormData(prev => {
      const current = prev.accessPages || [];
      if (current.includes(path)) {
        return { ...prev, accessPages: current.filter(p => p !== path) };
      } else {
        return { ...prev, accessPages: [...current, path] };
      }
    });
  };

  const selectAllPages = () => {
    setFormData(prev => ({ ...prev, accessPages: AVAILABLE_PAGES.map(p => p.path) }));
  };

  const clearAllPages = () => {
    setFormData(prev => ({ ...prev, accessPages: [] }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.id.trim()) newErrors.id = 'User ID / Number is required';
    if (!formData.password.trim()) newErrors.password = 'Password is required';
    if (formData.division === 'Select') newErrors.division = 'Please select a division';
    
    // We only enforce access pages for USER role (Admin usually gets all anyway)
    if (formData.role === 'USER' && (!formData.accessPages || formData.accessPages.length === 0)) {
      newErrors.accessPages = 'Please select at least one page for access';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      const dataToSubmit = { ...formData };
      if (dataToSubmit.role === 'ADMIN') {
        dataToSubmit.accessPages = AVAILABLE_PAGES.map(p => p.path);
      }
      onSubmit(dataToSubmit);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                {user ? 'Edit User' : 'Create New User'}
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Manage user credentials and permissions</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User size={14} className="text-gray-400" />
                User Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium ${errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50/50'}`}
                placeholder="Full Name"
              />
              {errors.name && <p className="text-[10px] text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User size={14} className="text-gray-400" />
                User ID / Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.id}
                onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                disabled={!!user && user.id === 'admin'}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium ${errors.id ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50/50'} ${!!user && user.id === 'admin' ? 'opacity-60 cursor-not-allowed' : ''}`}
                placeholder="Login ID"
              />
              {errors.id && <p className="text-[10px] text-red-500 mt-1">{errors.id}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Lock size={14} className="text-gray-400" />
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium ${errors.password ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50/50'}`}
                placeholder="Login Password"
              />
              {errors.password && <p className="text-[10px] text-red-500 mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <MapPin size={14} className="text-gray-400" />
                Division <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.division}
                onChange={(e) => setFormData(prev => ({ ...prev, division: e.target.value }))}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium ${errors.division ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50/50'}`}
              >
                <option value="Select">Select Division</option>
                {divisions.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
              {errors.division && <p className="text-[10px] text-red-500 mt-1">{errors.division}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Shield size={14} className="text-gray-400" />
                Role <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                disabled={!!user && user.id === 'admin'}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            
            {/* Pages Access Grid */}
            <div className="md:col-span-2 pt-2 border-t border-gray-100 mt-2">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <LayoutGrid size={14} className="text-gray-400" />
                  Pages Access (Sidebar)
                </label>
                {formData.role === 'USER' && (
                  <div className="flex gap-2">
                    <button onClick={selectAllPages} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800">Select All</button>
                    <span className="text-gray-300">|</span>
                    <button onClick={clearAllPages} className="text-[10px] font-bold text-gray-500 hover:text-gray-700">Clear</button>
                  </div>
                )}
              </div>

              {formData.role === 'ADMIN' ? (
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex items-center justify-center gap-2">
                  <Shield size={16} className="text-indigo-500" />
                  <span className="text-sm font-bold text-indigo-700">Admins have full access to all pages</span>
                </div>
              ) : (
                <div className={`grid grid-cols-2 md:grid-cols-3 gap-2 p-3 rounded-xl border ${errors.accessPages ? 'border-red-300 bg-red-50/30' : 'border-gray-200 bg-gray-50/30'}`}>
                  {AVAILABLE_PAGES.map(page => {
                    const isChecked = formData.accessPages?.includes(page.path);
                    return (
                      <label 
                        key={page.path}
                        className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors border ${isChecked ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                      >
                        <div className="relative flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handlePageToggle(page.path)}
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 opacity-0 absolute"
                          />
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}>
                            {isChecked && <CheckCircle size={10} className="text-white" />}
                          </div>
                        </div>
                        <span className={`text-xs font-semibold ${isChecked ? 'text-indigo-700' : 'text-gray-600'}`}>
                          {page.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              {errors.accessPages && formData.role === 'USER' && (
                <p className="text-[10px] text-red-500 mt-1">{errors.accessPages}</p>
              )}
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg font-bold text-sm text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 rounded-lg font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all flex items-center gap-2"
          >
            <CheckCircle size={18} />
            {user ? 'Save Changes' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
