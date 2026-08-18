import React, { useState, useEffect } from 'react';
import { Search, Plus, Settings as SettingsIcon, Pencil, Trash2 } from 'lucide-react';
import DataTable from '../../components/DataTable';
import { getUsers, saveUsers } from '../../utils/storageManager';
import FormSetting from './FormSetting';
import toast from 'react-hot-toast';

export default function Setting() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const loadUsers = () => {
    setUsers(getUsers() || []);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        user.name?.toLowerCase().includes(q) ||
        user.id?.toLowerCase().includes(q) ||
        user.division?.toLowerCase().includes(q) ||
        user.role?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDelete = (userId) => {
    if (userId === 'admin') {
      toast.error('Cannot delete the primary admin account.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this user?')) {
      const newUsers = users.filter(u => u.id !== userId);
      saveUsers(newUsers);
      toast.success('User deleted successfully');
      loadUsers();
    }
  };

  const handleSaveUser = (userData) => {
    const existingIndex = users.findIndex(u => u.id === userData.id);
    
    // If we're editing and the ID changed (which shouldn't happen usually, but just in case)
    if (editingUser && existingIndex >= 0 && editingUser.id !== userData.id) {
        toast.error('User ID already exists.');
        return;
    }

    // If creating a new user and ID exists
    if (!editingUser && existingIndex >= 0) {
      toast.error('User ID already exists.');
      return;
    }

    let updatedUsers = [...users];
    if (editingUser) {
      const idx = updatedUsers.findIndex(u => u.id === editingUser.id);
      if (idx !== -1) updatedUsers[idx] = userData;
    } else {
      updatedUsers.push(userData);
    }

    saveUsers(updatedUsers);
    toast.success(editingUser ? 'User updated successfully!' : 'User created successfully!');
    setShowForm(false);
    setEditingUser(null);
    loadUsers();
  };

  const tableHeaders = [
    { label: "Action", className: "sticky left-0 bg-gray-50 z-20 shadow-[1px_0_0_0_#e5e7eb] min-w-[100px]" },
    "User ID / No", "User Name", "Division", "Role", "Pages Access"
  ];

  const renderCard = (user) => (
    <div key={user.id} className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm relative">
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold text-indigo-600">{user.id}</span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
          user.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
        }`}>
          {user.role}
        </span>
      </div>
      <div className="text-sm font-bold text-gray-900 mb-1">{user.name}</div>
      <div className="text-xs text-gray-500 mb-4">{user.division || 'No Division'}</div>
      
      <div className="flex gap-2">
        <button
          onClick={() => { setEditingUser(user); setShowForm(true); }}
          className="flex-1 bg-indigo-50 text-indigo-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1"
        >
          <Pencil size={14} /> Edit
        </button>
        {user.id !== 'admin' && (
          <button
            onClick={() => handleDelete(user.id)}
            className="flex-1 bg-rose-50 text-rose-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors flex items-center justify-center gap-1"
          >
            <Trash2 size={14} /> Delete
          </button>
        )}
      </div>
    </div>
  );

  const renderRow = (user) => (
    <tr key={user.id} className="hover:bg-slate-50 transition-colors border-b border-gray-100">
      <td className="px-4 py-3 whitespace-nowrap sticky left-0 z-10 shadow-[1px_0_0_0_#e5e7eb] bg-white text-center">
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => { setEditingUser(user); setShowForm(true); }}
            className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded transition-colors"
            title="Edit User"
          >
            <Pencil size={14} />
          </button>
          {user.id !== 'admin' && (
            <button
              onClick={() => handleDelete(user.id)}
              className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded transition-colors"
              title="Delete User"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm font-bold text-indigo-600 whitespace-nowrap text-center">{user.id}</td>
      <td className="px-4 py-3 text-sm font-bold text-gray-800 whitespace-nowrap text-center">{user.name}</td>
      <td className="px-4 py-3 text-xs text-gray-600 font-medium whitespace-nowrap text-center">{user.division || '-'}</td>
      <td className="px-4 py-3 text-center whitespace-nowrap">
        <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
          user.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
        }`}>
          {user.role}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 max-w-[300px] truncate" title={user.accessPages?.join(', ')}>
        {user.role === 'ADMIN' ? 'All Pages' : (user.accessPages?.length ? user.accessPages.join(', ') : 'No Access')}
      </td>
    </tr>
  );

  return (
    <div className="p-0 sm:p-1 md:p-3 h-full flex flex-col min-h-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600">
            <SettingsIcon size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Settings</h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5">Manage Users and Access Permissions</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
            />
          </div>
          <button 
            onClick={() => { setEditingUser(null); setShowForm(true); }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 shrink-0 shadow-sm"
          >
            <Plus size={16} /> Add User
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <DataTable
          headers={tableHeaders}
          data={paginatedUsers}
          renderRow={renderRow}
          renderCard={renderCard}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
          totalResults={filteredUsers.length}
          minWidth="800px"
        />
      </div>

      {showForm && (
        <FormSetting 
          user={editingUser}
          onClose={() => { setShowForm(false); setEditingUser(null); }}
          onSubmit={handleSaveUser}
        />
      )}
    </div>
  );
}
