// src/App.jsx
import React, { useState } from 'react';
import './App.css';

// --- Sub-component: Header ---
const Header = () => {
  return (
    <header className="app-header">
      <div className="title-container">
        <span className="logo-icon">H</span>
        <h1>MediQueue Hospital Management</h1>
      </div>
      <p className="subtitle">Patient Queue Management System</p>
    </header>
  );
};

// --- Sub-component: Dashboard ---
const Dashboard = ({ waitingCount, inProgressCount, completedCount, currentPatient, patients }) => {
  const nextPatient = patients.find(p => p.status === 'Waiting');

  return (
    <div>
      <div className="current-status-card">
        <div className="live-indicator">
          <span></span> Live
        </div>
        <p className="status-label">Now Being Diagnosed</p>
        <p className="current-number">#{currentPatient ? currentPatient.id : 'N/A'}</p>
        <p className="next-label">Next: #{nextPatient ? nextPatient.id : 'N/A'}</p>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <p className="summary-value">{waitingCount}</p>
          <p className="summary-label">Waiting</p>
        </div>
        <div className="summary-card">
          <p className="summary-value">{inProgressCount}</p>
          <p className="summary-label">In Progress</p>
        </div>
        <div className="summary-card">
          <p className="summary-value">{completedCount}</p>
          <p className="summary-label">Completed</p>
        </div>
      </div>
    </div>
  );
};

// --- Sub-component: QueueList ---
const PatientItem = ({ patient, index }) => {
  const waitingTime = index * 15; // 15 minutes per patient
  const hours = Math.floor(waitingTime / 60);
  const minutes = waitingTime % 60;

  let timeEstimate = '';
  if (patient.status === 'Waiting') {
    if (hours > 0) timeEstimate += `${hours}h `;
    if (minutes > 0 || hours === 0) timeEstimate += `${minutes} minutes`;
  }

  return (
    <div className={`patient-item ${patient.status === 'In Progress' ? 'in-progress' : ''}`}>
      <div className="patient-number">#{patient.id}</div>
      <div className="patient-details">
        <p className="patient-name">{patient.name}</p>
        {patient.status === 'In Progress' ? (
          <p className="patient-status in-progress-text">In Progress</p>
        ) : (
          <p className="patient-status">Position: {index} &nbsp;&middot;&nbsp; ~{timeEstimate}</p>
        )}
      </div>
      {patient.status === 'In Progress' && <div className="status-dot"></div>}
    </div>
  );
};

const QueueList = ({ patients }) => {
  const activePatients = patients.filter(p => p.status === 'In Progress' || p.status === 'Waiting');
  const inProgressPatient = activePatients.find(p => p.status === 'In Progress');
  const waitingPatients = activePatients.filter(p => p.status === 'Waiting');
  const sortedPatients = inProgressPatient ? [inProgressPatient, ...waitingPatients] : waitingPatients;

  return (
    <div className="queue-list-container">
      <h3>Queue Status</h3>
      <div className="queue-items">
        {sortedPatients.map((patient, index) => (
          <PatientItem key={patient.id} patient={patient} index={index} />
        ))}
      </div>
    </div>
  );
};

// --- Sub-component: QuickActions ---
const QuickActions = ({ onAddPatient, onCallNext }) => {
  const [patientName, setPatientName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddPatient(patientName);
    setPatientName('');
  };

  return (
    <div className="quick-actions-card">
      <h3>Quick Actions</h3>
      <div className="action-buttons">
        <button className="action-btn secondary-btn">+ New Patient Check-in</button>
        <button className="action-btn secondary-btn">◎ Full Queue Display</button>
        <button className="action-btn primary-btn" onClick={onCallNext}>
          Call Next Patient
        </button>
      </div>
      <form className="add-patient-form" onSubmit={handleSubmit}>
        <label htmlFor="patientName">Patient Name</label>
        <input
          type="text"
          id="patientName"
          placeholder="Enter patient name"
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
        />
        <button type="submit" className="add-btn">Add Patient</button>
      </form>
    </div>
  );
};

// --- Main App Component ---
function App() {
  const [patients, setPatients] = useState([
    { id: 1, name: 'John Doe', status: 'In Progress' },
    { id: 2, name: 'Jane Smith', status: 'Waiting' },
    { id: 3, name: 'Bob Johnson', status: 'Waiting' },
    { id: 4, name: 'Alice Brown', status: 'Waiting' },
    { id: 5, name: 'Charlie Wilson', status: 'Waiting' },
  ]);
  const [nextId, setNextId] = useState(6);
  const [completedCount, setCompletedCount] = useState(0);

  // Derived state
  const waitingCount = patients.filter(p => p.status === 'Waiting').length;
  const inProgressPatient = patients.find(p => p.status === 'In Progress');

  const handleAddPatient = (name) => {
    if (!name.trim()) return;
    const newPatient = { id: nextId, name, status: 'Waiting' };
    setPatients([...patients, newPatient]);
    setNextId(nextId + 1);
  };

  const handleCallNextPatient = () => {
    let newCompletedCount = completedCount;
    const updatedPatients = [...patients];
    
    const currentPatientIndex = updatedPatients.findIndex(p => p.status === 'In Progress');
    if (currentPatientIndex !== -1) {
      updatedPatients[currentPatientIndex].status = 'Completed';
      newCompletedCount++;
    }

    const firstWaitingPatientIndex = updatedPatients.findIndex(p => p.status === 'Waiting');
    if (firstWaitingPatientIndex !== -1) {
      updatedPatients[firstWaitingPatientIndex].status = 'In Progress';
    }
    
    setCompletedCount(newCompletedCount);
    setPatients(updatedPatients.filter(p => p.status !== 'Completed'));
  };

  return (
    <div className="app-layout">
      <Header />
      <main className="main-content">
        <div className="left-column">
          <Dashboard
            waitingCount={waitingCount}
            inProgressCount={inProgressPatient ? 1 : 0}
            completedCount={completedCount}
            currentPatient={inProgressPatient}
            patients={patients}
          />
          <QueueList patients={patients} />
        </div>
        <div className="right-column">
          <QuickActions
            onAddPatient={handleAddPatient}
            onCallNext={handleCallNextPatient}
          />
        </div>
      </main>
    </div>
  );
}

export default App;