// File: HospitalDashboard.jsx
import React, { useState } from 'react';
import './HospitalDashboard.css';

const HospitalDashboard = () => {
  const [queue, setQueue] = useState([
    { id: 1, name: 'John Doe', status: 'In Progress', eta: 'Now', position: 0 },
    { id: 2, name: 'Jane Smith', status: 'Waiting', eta: '~15 minutes', position: 1 },
    { id: 3, name: 'Bob Johnson', status: 'Waiting', eta: '~30 minutes', position: 2 },
    { id: 4, name: 'Alice Brown', status: 'Waiting', eta: '~45 minutes', position: 3 },
    { id: 5, name: 'Charlie Wilson', status: 'Waiting', eta: '~1h 0m', position: 4 },
  ]);

  const [input, setInput] = useState('');

  const callNext = () => {
    setQueue((prevQueue) => {
      const updatedQueue = prevQueue.map((patient, index) => {
        if (index === 0) return { ...patient, status: 'Completed' };
        if (index === 1) return { ...patient, status: 'In Progress', eta: 'Now', position: 0 };
        return { ...patient, position: patient.position - 1 };
      });
      return updatedQueue.slice(1);
    });
  };

  const addPatient = () => {
    if (!input) return;
    const newPatient = {
      id: queue.length + 1,
      name: input,
      status: 'Waiting',
      eta: `~${(queue.length) * 15} minutes`,
      position: queue.length,
    };
    setQueue([...queue, newPatient]);
    setInput('');
  };

  const current = queue.find(p => p.status === 'In Progress');
  const waitingCount = queue.filter(p => p.status === 'Waiting').length;
  const completedCount = queue.filter(p => p.status === 'Completed').length;

  return (
    <div className="dashboard">
      <h1>MediQueue Hospital Management</h1>
      <p className="subtitle">Patient Queue Management System</p>

      <div className="status-section">
        <div className="current-status">
          <h3>Current Status <span className="live">• Live</span></h3>
          <p className="now-diagnosed">Now Being Diagnosed</p>
          <h2>#{current?.id || 1}</h2>
          <p>Next: #{queue[1]?.id || '-'}</p>
        </div>

        <div className="stats">
          <div className="stat-box">{waitingCount} <span>Waiting</span></div>
          <div className="stat-box">1 <span>In Progress</span></div>
          <div className="stat-box">{completedCount} <span>Completed</span></div>
        </div>
      </div>

      <div className="queue-actions">
        <div className="queue-status">
          <h3>Queue Status</h3>
          <ul>
            {queue.map((patient) => (
              <li key={patient.id} className={patient.status === 'In Progress' ? 'active' : ''}>
                <div className="token">#{patient.id}</div>
                <div className="info">
                  <strong>{patient.name}</strong>
                  <span>{patient.status === 'Waiting' ? `Position: ${patient.position}  •  ${patient.eta}` : patient.status}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="quick-actions">
          <button className="btn checkin">+ New Patient Check-in</button>
          <button className="btn">Full Queue Display</button>
          <button className="btn call" onClick={callNext}>Call Next Patient</button>
          <input
            type="text"
            placeholder="Patient Name"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button className="btn add" onClick={addPatient}>Add Patient</button>
        </div>
      </div>
    </div>
  );
};

export default HospitalDashboard;
