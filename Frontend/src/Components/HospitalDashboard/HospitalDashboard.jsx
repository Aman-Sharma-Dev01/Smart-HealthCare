import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from "socket.io-client";
import './HospitalDashboard.css';

// --- Sub-component: Header ---
const Header = ({ doctorName }) => (
    <header className="app-header">
        <div className="title-container">
            <span className="logo-icon">D</span>
            <h1>Doctor's Dashboard</h1>
        </div>
        <p className="subtitle">Welcome, Dr. {doctorName}</p>
    </header>
);

// --- Sub-component: Dashboard Stats ---
const DashboardStats = ({ queueData }) => {
    // Calculate stats based on the queue data
    const waitingCount = queueData ? queueData.appointments.filter(a => a.appointmentNumber > queueData.currentNumber).length : 0;
    const completedCount = queueData ? queueData.currentNumber : 0;
    const inProgressCount = (queueData && queueData.currentNumber > 0 && queueData.currentNumber <= queueData.lastAppointmentNumber) ? 1 : 0;
    
    const currentPatient = queueData?.appointments.find(a => a.appointmentNumber === queueData.currentNumber);
    const nextPatient = queueData?.appointments.find(a => a.appointmentNumber === queueData.currentNumber + 1);

    return (
        <div>
            <div className="current-status-card">
                <div className="live-indicator"><span></span> Live</div>
                <p className="status-label">Now Serving</p>
                <p className="current-number">#{currentPatient ? currentPatient.appointmentNumber : 'N/A'}</p>
                <p className="patient-name-display">{currentPatient ? currentPatient.patientName : 'No Patient'}</p>
                <p className="next-label">Next: #{nextPatient ? nextPatient.appointmentNumber : 'N/A'}</p>
            </div>
            <div className="summary-cards">
                <div className="summary-card"><p className="summary-value">{waitingCount}</p><p className="summary-label">Waiting</p></div>
                <div className="summary-card"><p className="summary-value">{inProgressCount}</p><p className="summary-label">In Progress</p></div>
                <div className="summary-card"><p className="summary-value">{completedCount}</p><p className="summary-label">Completed</p></div>
            </div>
        </div>
    );
};

// --- Sub-component: Queue List ---
const QueueList = ({ queueData }) => {
    if (!queueData || queueData.appointments.length === 0) {
        return (
            <div className="queue-list-container">
                <h3>Today's Queue</h3>
                <p className="no-patients-message">No patients have booked an appointment yet.</p>
            </div>
        );
    }

    const activeAppointments = queueData.appointments
        .filter(a => a.appointmentNumber >= queueData.currentNumber)
        .sort((a, b) => a.appointmentNumber - b.appointmentNumber);

    return (
        <div className="queue-list-container">
            <h3>Today's Queue</h3>
            <div className="queue-items">
                {activeAppointments.length > 0 ? activeAppointments.map((appointment) => (
                    <div key={appointment._id} className={`patient-item ${appointment.appointmentNumber === queueData.currentNumber ? 'in-progress' : ''}`}>
                        <div className="patient-number">#{appointment.appointmentNumber}</div>
                        <div className="patient-details">
                            <p className="patient-name">{appointment.patientName}</p>
                            <p className="patient-status">{appointment.reasonForVisit}</p>
                        </div>
                        {appointment.appointmentNumber === queueData.currentNumber && <div className="status-dot"></div>}
                    </div>
                )) : <p className="no-patients-message">All appointments for today are complete.</p>}
            </div>
        </div>
    );
};

// --- Sub-component: Actions ---
const QuickActions = ({ onCallNext, queueData }) => {
    const isQueueEnded = queueData ? queueData.currentNumber >= queueData.lastAppointmentNumber : true;
    return (
        <div className="quick-actions-card">
            <h3>Quick Actions</h3>
            <button 
                className="action-btn primary-btn" 
                onClick={onCallNext}
                disabled={!queueData || isQueueEnded}
            >
                {isQueueEnded ? 'End of Queue' : 'Call Next Patient'}
            </button>
        </div>
    );
};


// --- Main DoctorDashboard Component ---
function DoctorDashboard() {
    const [user, setUser] = useState(null);
    const [queueData, setQueueData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const API_BASE_URL = 'http://localhost:5000/api';

    useEffect(() => {
        const loggedInUser = JSON.parse(localStorage.getItem('user'));
        if (!token || !loggedInUser || loggedInUser.role !== 'doctor') {
            navigate('/login-register');
            return;
        }
        setUser(loggedInUser);

        const fetchQueue = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/queues/my-queue`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Failed to fetch queue.');
                const data = await response.json();
                setQueueData(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchQueue();
    }, [token, navigate]);

    // Real-time updates with Socket.IO
    useEffect(() => {
        if (!queueData?._id) return;

        const socket = io("http://localhost:5000");
        socket.emit('join-queue-room', queueData._id);

        // Listener for when the doctor advances the queue
        socket.on('queue-update', (data) => {
            setQueueData(prev => ({ ...prev, currentNumber: data.currentNumber }));
        });

        // Listener for when a new patient books an appointment
        socket.on('new-appointment', (updatedQueue) => {
            console.log('New appointment received, updating queue:', updatedQueue);
            setQueueData(updatedQueue);
        });

        return () => socket.disconnect();
    }, [queueData?._id]);

    const handleCallNext = async () => {
        if (!queueData?._id) return;
        try {
            const response = await fetch(`${API_BASE_URL}/queues/next/${queueData._id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to advance queue.');
            }
            // State updates via the socket event, so no local state change is needed here.
        } catch (err) {
            alert(err.message); // Using alert for simple error feedback
        }
    };

    if (isLoading) return <div className="loading-state">Loading Dashboard...</div>;
    if (error) return <div className="error-state">Error: {error}</div>;

    return (
        <div className="app-layout">
            <Header doctorName={user?.name.split(' ').slice(1).join(' ')} />
            <main className="main-content">
                <div className="left-column">
                    <DashboardStats queueData={queueData} />
                    <QueueList queueData={queueData} />
                </div>
                <div className="right-column">
                    <QuickActions onCallNext={handleCallNext} queueData={queueData} />
                </div>
            </main>
        </div>
    );
}

export default DoctorDashboard;
