import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Master from './pages/Master/Master';
import PurchaseOrder from './pages/ReceivedOrder/PurchaseOrder';
import ReceivedOrder from './pages/ReceivedOrder/ReceivedOrder';
import CheckAndValidation from './pages/CheckAndValidation/CheckAndValidation';
import CheckForDelivery from './pages/CheckForDelivery/CheckForDelivery';
import DispatchPlanning from './pages/DispatchPlanning/DispatchPlanning';
import Packaging from './pages/Packaging/Packaging';
import VehicleLogistic from './pages/VehicleLogistic/VehicleLogistic';
import MakeCallan from './pages/MakeCallan/MakeCallan';
import MakeInvoice from './pages/MakeInvoice/MakeInvoice';
import ConfirmDelivery from './pages/ConfirmDelivery/ConfirmDelivery';
import Payment from './pages/Payment/Payment';
import Production from './pages/ProductionPlanning/Production';
import Setting from './pages/Setting/Setting';

import ProtectedRoute from './components/ProtectedRoute';
import { initializeStorage } from './utils/storageManager';

function App() {
  useEffect(() => {
    initializeStorage();

    // Prevent number inputs from changing value on mouse wheel scroll
    const handleWheel = () => {
      if (document.activeElement && document.activeElement.type === 'number') {
        document.activeElement.blur();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true, capture: true });

    return () => {
      window.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }, []);

  return (
    <div className="bg-white min-h-screen">
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="master" element={<Master />} />
            <Route path="received-order" element={<PurchaseOrder />} />
            <Route path="received-order-history" element={<ReceivedOrder />} />
            <Route path="check-validation" element={<CheckAndValidation />} />
            <Route path="check-delivery" element={<CheckForDelivery />} />
            <Route path="dispatch-planning" element={<DispatchPlanning />} />
            <Route path="packaging" element={<Packaging />} />
            <Route path="vehicle-logistic" element={<VehicleLogistic />} />
            <Route path="make-callan" element={<MakeCallan />} />
            <Route path="make-invoice" element={<MakeInvoice />} />
            <Route path="confirm-delivery" element={<ConfirmDelivery />} />
            <Route path="payment" element={<Payment />} />
            <Route path="production" element={<Production />} />
            <Route path="setting" element={<Setting />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;