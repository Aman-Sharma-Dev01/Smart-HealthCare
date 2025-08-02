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

  const [newPatient, setNewPatient] = useState('');

  const callNext = () => {
    setQueue((prevQueue) => {
      const updatedQueue = prevQueue.map((patient, index) => {
        if (index === 0) return { ...patient, status: 'Completed' };
        if (index === 1) return { ...patient, status: 'In Progress', eta: 'Now', position: 0 };
        if (index > 1) return { ...patient, position: patient.position - 1 };
        return patient;
      });

      return updatedQueue;
    });
  };

  const addPatient = () => {
    if (!newPatient.trim()) return;

    const last = queue.filter(p => p.status !== 'Completed').length;
    const newEntry = {
      id: queue.length + 1,
      name: newPatient,
      status: 'Waiting',
      eta: `~${15 * last} minutes`,
      position: last
    };

    setQueue([...queue, newEntry]);
    setNewPatient('');
  };

  const waitingCount = queue.filter(p => p.status === 'Waiting').length;
  const inProgressCount = queue.filter(p => p.status === 'In Progress').length;
  const completedCount = queue.filter(p => p.status === 'Completed').length;

  const current = queue.find(p => p.status === 'In Progress');
  const next = queue.find(p => p.status === 'Waiting');

  return (
    <div className="dashboard">
      <h1>MediQueue Hospital Management</h1>
      <p className="subheading">Patient Queue Management System</p>

      <div className="status-box">
        <h3>Current Status <span className="live-dot" /> Live</h3>
        <p>Now Being Diagnosed</p>
        <h1 className="current-number">#{current?.id || '-'}</h1>
        <p>Next: #{next?.id || '-'}</p>
      </div>

      <div className="stats">
        <div className="stat"><h2>{waitingCount}</h2><p>Waiting</p></div>
        <div className="stat"><h2>{inProgressCount}</h2><p>In Progress</p></div>
        <div className="stat"><h2>{completedCount}</h2><p>Completed</p></div>
      </div>

      <div className="main-content">
        <div className="queue">
          <h3>Queue Status</h3>
          {queue.filter(p => p.status !== 'Completed').map((patient) => (
            <div key={patient.id} className={`queue-card ${patient.status === 'In Progress' ? 'active' : ''}`}>
              <div className="queue-number">#{patient.id}</div>
              <div>
                <h4>{patient.name}</h4>
                <p>{patient.status === 'In Progress' ? 'In Progress' : `Position: ${patient.position}  •  ${patient.eta}`}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="actions">
          <h3>Quick Actions</h3>
          <button className="blue-btn" onClick={() => alert('Check-in form placeholder')}>+ New Patient Check-in</button>
          <button className="blue-btn" onClick={() => alert('Full queue display placeholder')}>Full Queue Display</button>
          <button className="green-btn" onClick={callNext}>Call Next Patient</button>

          <input type="text" value={newPatient} onChange={(e) => setNewPatient(e.target.value)} placeholder="Patient Name" />
          <button className="add-btn" onClick={addPatient}>Add Patient</button>
        </div>
      </div>
    </div>
  );
};

export default HospitalDashboard;
