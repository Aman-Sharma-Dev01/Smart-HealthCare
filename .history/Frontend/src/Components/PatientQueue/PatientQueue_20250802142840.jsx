// src/components/PatientQueue/PatientQueue.jsx
import React from 'react';
import './PatientQueue.css';

const PatientQueue = ({ queue, yourNumber }) => {
  return (
    <div className="queue-container">
      <h2>Upcoming Patients</h2>
      <div className="queue-list">
        {queue.map((patientNumber) => (
          <div
            key={patientNumber}
            className={`queue-item ${patientNumber === yourNumber ? 'is-yours' : ''}`}
          >
            {patientNumber}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PatientQueue;