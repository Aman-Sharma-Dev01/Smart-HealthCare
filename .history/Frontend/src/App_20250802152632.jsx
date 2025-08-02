// src/App.jsx
import React, { useState } from 'react';
import './App.css';
import Header from './components/Header/Header';
import LiveStatus from './components/LiveStatus/LiveStatus';
import PatientQueue from './components/PatientQueue/PatientQueue';

function App() {
  // --- Mock Data ---
  // In a real app, this data would come from your backend API
  const [liveData] = useState({
    currentlyServing: 25,
    yourNumber: 30,
    estimatedWaitTime: "25 mins", // Example: calculated from (yourNumber - currentlyServing) * avgTimePerPatient
    doctorName: "Dr. Anya Sharma",
  });

  const [queue] = useState([26, 27, 28, 29, 30, 31, 32, 33]);
  // --- End Mock Data ---

  return (
    <div className="app-container">
      
      <Header />
      <main>
        <LiveStatus
          currentlyServing={liveData.currentlyServing}
          yourNumber={liveData.yourNumber}
          estimatedWaitTime={liveData.estimatedWaitTime}
          doctorName={liveData.doctorName}
        />
        <PatientQueue queue={queue} yourNumber={liveData.yourNumber} />
      </main>
    </div>
  );
}

export default App;