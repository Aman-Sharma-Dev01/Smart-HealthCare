import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HospitalDashboard from './Components/HospitalDashboard/HospitalDashboard';
import HomePage from './Components/HomePage/HomePage';

const App = () => {
  return (

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<HospitalDashboard />} />
      </Routes>
    
  );
};

export default App;