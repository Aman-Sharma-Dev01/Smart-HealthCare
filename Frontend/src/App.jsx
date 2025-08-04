import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HospitalDashboard from './Components/HospitalDashboard/HospitalDashboard';
import HomePage from './Components/HomePage/HomePage';
import ChatBot from './Components/Chatbot/ChatBot';
import Login from './Components/Login/Login';
import HelpdeskDashboard from './Components/HelpdeskDashboard/HelpdeskDashboard';

const App = () => {
  return (
    <>
      <ChatBot/>
     
      <Routes>
        {/* <Route path="/" element={<HomePage />} /> */}
        <Route path="/dashboard" element={<HospitalDashboard />} />
        <Route path="/login-register" element={<Login />} />
        <Route path="/helpdesk-dashboard" element={<HelpdeskDashboard />} />
        <Route path="*" element={<HomePage />} />
      </Routes>



    </>
  );
};

export default App;
