import React from 'react';
import { Router,  Routes, Route } from 'react-router-dom';
import HospitalDashboard from './Components/HospitalDashboard/HospitalDashboard';
import HomePage from './Components/HomePage/HomePage';
import PrescriptionUploader from './Components/PrescriptionUploader/PrescriptionUploader';
import PatientVault from './Components/PatientVault/PatientVault';
import VisionScanner from './Components/VisionScanner/VisionScanner';
import ChatBot from './Components/ChatBot/ChatBot';
import UserProfile from './Components/UserProfile/UserProfile';

import Login from './Components/Login/Login';
import HelpdeskDashboard from './Components/HelpdeskDashboard/HelpdeskDashboard';
import BookAppointment from './Components/BookAppointment/BookAppointment';
import LiveQueueWidget from './Components/LiveQueueWidget/LiveQueueWidget';
const App = () => {
  return (
    <>
  <ChatBot/>
  <LiveQueueWidget/>
 <Routes>
        <Route path="*" element={<HomePage />} />
        <Route path="/dashboard" element={<HospitalDashboard />} />
        <Route path="/summarizer" element={<VisionScanner/>} />
        <Route path="/userprofile" element={<UserProfile/>} />
        <Route path="/prescription" element={<PrescriptionUploader/>} />
        <Route path="/vault" element={<PatientVault/>} />
        <Route path="/login-register" element={<Login/>} />
        <Route path="/helpdesk-dashboard" element={<HelpdeskDashboard/>} />
        <Route path="/appointment-booking" element={<BookAppointment/>} />

      </Routes>
    {/* // <PrescriptionUploader/>
    //  <PatientVault/>
      // <VisionScanner/>
      // <UserProfile/>

      // <ChatBot/> */}
    

</>
  );
};

export default App;
