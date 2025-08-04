import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HospitalDashboard from './Components/HospitalDashboard/HospitalDashboard';
import HomePage from './Components/HomePage/HomePage';
import ChatBot from './Components/Chatbot/ChatBot';

const App = () => {
  return (
    <>
      <ChatBot/>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<HospitalDashboard />} />
        {/* Add more routes here */}
      </Routes>
    </>
  );
};

export default App;
