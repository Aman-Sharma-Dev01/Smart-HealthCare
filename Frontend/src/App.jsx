import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import HospitalDashboard from './Components/HospitalDashboard/HospitalDashboard';
import HomePage from './Components/HomePage/HomePage';
import PatientVault from './Components/PatientVault/PatientVault';
import VisionScanner from './Components/VisionScanner/VisionScanner';
import UserProfile from './Components/UserProfile/UserProfile';
import Login from './Components/Login/Login';
import HelpdeskDashboard from './Components/HelpdeskDashboard/HelpdeskDashboard';
import BookAppointment from './Components/BookAppointment/BookAppointment';
import LiveQueueWidget from './Components/LiveQueueWidget/LiveQueueWidget';
import EmergencyWidget from './Components/EmergencyWidget/EmergencyWidget';
import ChatBot from './Components/Chatbot/ChatBot';
import InstallPWA from './Components/InstallPWA/InstallPWA';
import PWAApp from './Components/PWAApp/PWAApp';

// Detect if app is running as standalone PWA
const isStandalonePWA = () => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://') ||
    window.location.search.includes('source=pwa')
  );
};

const App = () => {
  const [isPWA, setIsPWA] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Check if running as PWA
    setIsPWA(isStandalonePWA());

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e) => setIsPWA(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Routes that should always use the full page (not PWA interface)
  const fullPageRoutes = [
    '/doctor-dashboard',
    '/helpdesk-dashboard',
    '/login-register'
  ];

  const shouldShowPWAInterface = isPWA && 
    !fullPageRoutes.some(route => location.pathname.startsWith(route));

  // If running as PWA and on a patient-facing route, show PWA interface
  if (shouldShowPWAInterface) {
    return (
      <>
        <Routes>
          <Route path="/login-register" element={<Login />} />
          <Route path="/doctor-dashboard" element={<HospitalDashboard />} />
          <Route path="/helpdesk-dashboard" element={<HelpdeskDashboard />} />
          <Route path="/appointment-booking" element={<BookAppointment />} />
          <Route path="/vault" element={<PatientVault />} />
          <Route path="/userprofile" element={<UserProfile />} />
          <Route path="/summarizer" element={<VisionScanner />} />
          <Route path="*" element={<PWAApp />} />
        </Routes>
      </>
    );
  }

  // Regular website view
  return (
    <>
      <InstallPWA />
      <EmergencyWidget />
      <ChatBot />
      <LiveQueueWidget />
      <Routes>
        <Route path="*" element={<HomePage />} />
        <Route path="/doctor-dashboard" element={<HospitalDashboard />} />
        <Route path="/summarizer" element={<VisionScanner />} />
        <Route path="/userprofile" element={<UserProfile />} />
        <Route path="/vault" element={<PatientVault />} />
        <Route path="/login-register" element={<Login />} />
        <Route path="/helpdesk-dashboard" element={<HelpdeskDashboard />} />
        <Route path="/appointment-booking" element={<BookAppointment />} />
      </Routes>
    </>
  );
};

export default App;
