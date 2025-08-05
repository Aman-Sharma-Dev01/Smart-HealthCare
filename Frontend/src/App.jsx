import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HospitalDashboard from './Components/HospitalDashboard/HospitalDashboard';
import HomePage from './Components/HomePage/HomePage';
import PrescriptionUploader from './Components/PrescriptionUploader/PrescriptionUploader';
import PatientVault from './Components/PatientVault/PatientVault';
import VisionScanner from './Components/VisionScanner/VisionScanner';
import ChatBot from './Components/ChatBot/ChatBot';
import UserProfile from './Components/UserProfile/UserProfile';


const App = () => {
  return (

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<HospitalDashboard />} />
        <Route path="/summarizer" element={<VisionScanner/>} />
        <Route path="/userprofile" element={<UserProfile/>} />
        <Route path="/chatbot" element={<ChatBot/>} />
        <Route path="/prescription" element={<PrescriptionUploader/>} />
        <Route path="/vault" element={<PatientVault/>} />
      </Routes>
    // <PrescriptionUploader/>
    //  <PatientVault/>
      // <VisionScanner/>
      // <UserProfile/>

      // <ChatBot/>
    

  );
};

export default App;