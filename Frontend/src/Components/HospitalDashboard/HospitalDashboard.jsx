import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './HospitalDashboard.css';
import { BACKEND_API_URL } from '../../util';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';

// --- Sub-component: Header ---
const Header = ({ doctorName, isOnline, onToggleOnline }) => (
    <header className="app-header">
        <div className="title-container">
            <span className="logo-icon">D</span>
            <h1>Doctor's Dashboard</h1>
        </div>
        <div className="header-right">
            <div className="online-status-toggle">
                <span className={`status-text ${isOnline ? 'online' : 'offline'}`}>
                    {isOnline ? '🟢 Online' : '🔴 Offline'}
                </span>
                <label className="toggle-switch">
                    <input 
                        type="checkbox" 
                        checked={isOnline} 
                        onChange={onToggleOnline}
                    />
                    <span className="toggle-slider"></span>
                </label>
            </div>
            <p className="subtitle">Welcome, Dr. {doctorName}</p>
        </div>
    </header>
);

// --- Sub-component: Dashboard Stats ---
const DashboardStats = ({ queueData, appointmentStats }) => {
    // Calculate stats based on the queue data
    const hasAppointments = queueData && queueData.appointments && queueData.appointments.length > 0;
    const waitingCount = hasAppointments ? queueData.appointments.filter(a => a.appointmentNumber > queueData.currentNumber && a.status === 'Scheduled').length : 0;
    const completedCount = appointmentStats?.completed || 0;
    const missedCount = appointmentStats?.missed || 0;
    
    // Only show in progress if there's actually a patient being served
    const currentPatient = hasAppointments ? queueData.appointments.find(a => a.appointmentNumber === queueData.currentNumber && a.status === 'Scheduled') : null;
    const inProgressCount = currentPatient ? 1 : 0;
    
    const nextPatient = hasAppointments ? queueData.appointments.find(a => a.appointmentNumber === queueData.currentNumber + 1 && a.status === 'Scheduled') : null;

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
                <div className="summary-card completed"><p className="summary-value">{completedCount}</p><p className="summary-label">Completed</p></div>
                <div className="summary-card missed"><p className="summary-value">{missedCount}</p><p className="summary-label">Missed</p></div>
            </div>
        </div>
    );
};

// --- Sub-component: Queue List with Marking Options ---
const QueueList = ({ queueData, onMarkAppointment }) => {
    if (!queueData || !queueData.appointments || queueData.appointments.length === 0) {
        return (
            <div className="queue-list-container">
                <h3>Today's Queue</h3>
                <p className="no-patients-message">No patients have booked an appointment yet.</p>
            </div>
        );
    }

    // Only show scheduled appointments that haven't been completed/missed/cancelled
    const activeAppointments = queueData.appointments
        .filter(a => a.status === 'Scheduled' && a.appointmentNumber >= queueData.currentNumber)
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
                        {appointment.appointmentNumber === queueData.currentNumber && (
                            <div className="appointment-actions">
                                <button 
                                    className="mark-btn mark-completed"
                                    onClick={() => onMarkAppointment(appointment._id, 'Completed')}
                                    title="Mark as Completed"
                                >
                                    ✓
                                </button>
                                <button 
                                    className="mark-btn mark-missed"
                                    onClick={() => onMarkAppointment(appointment._id, 'Missed')}
                                    title="Mark as Missed"
                                >
                                    ✗
                                </button>
                            </div>
                        )}
                        {appointment.appointmentNumber === queueData.currentNumber && <div className="status-dot"></div>}
                    </div>
                )) : <p className="no-patients-message">All appointments for today are complete.</p>}
            </div>
        </div>
    );
};

// --- Sub-component: Actions ---
const QuickActions = ({ onCallNext, queueData }) => {
    // Check if queue exists and has appointments
    const hasAppointments = queueData && queueData.appointments && queueData.appointments.length > 0;
    
    // Check if there are any scheduled appointments remaining after current number
    const hasRemainingScheduled = hasAppointments && queueData.appointments.some(
        a => a.status === 'Scheduled' && a.appointmentNumber > queueData.currentNumber
    );
    
    const isQueueEnded = !hasAppointments || queueData.currentNumber > queueData.lastAppointmentNumber || !hasRemainingScheduled;
    
    return (
        <div className="quick-actions-card">
            <h3>Quick Actions</h3>
            <button 
                className="action-btn primary-btn" 
                onClick={onCallNext}
                disabled={!hasAppointments || isQueueEnded}
            >
                {!hasAppointments ? 'No Patients Yet' : (isQueueEnded ? 'End of Queue' : 'Call Next Patient')}
            </button>
        </div>
    );
};

// --- Sub-component: Availability Management ---
const AvailabilityManager = ({ availableDates, onAddDate, onRemoveDate, isAvailableToday, onToggleToday }) => {
    const [newDate, setNewDate] = useState('');
    
    // Get minimum date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];
    
    const handleAddDate = () => {
        if (newDate) {
            onAddDate(newDate);
            setNewDate('');
        }
    };

    return (
        <div className="availability-card">
            <h3>Availability Management</h3>
            
            <div className="today-availability">
                <span>Available Today</span>
                <label className="toggle-switch">
                    <input 
                        type="checkbox" 
                        checked={isAvailableToday} 
                        onChange={onToggleToday}
                    />
                    <span className="toggle-slider"></span>
                </label>
            </div>
            
            <div className="add-date-section">
                <h4>Set Available Dates</h4>
                <div className="date-input-group">
                    <input 
                        type="date" 
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        min={minDate}
                        className="date-input"
                    />
                    <button onClick={handleAddDate} className="add-date-btn">+ Add</button>
                </div>
            </div>
            
            <div className="available-dates-section">
                <h4>Your Available Dates</h4>
                {availableDates && availableDates.length > 0 ? (
                    <div className="dates-list">
                        {availableDates.map((date, index) => {
                            const dateObj = new Date(date);
                            const formattedDate = dateObj.toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            });
                            return (
                                <div key={index} className="date-item">
                                    <span>{formattedDate}</span>
                                    <button 
                                        onClick={() => onRemoveDate(date)}
                                        className="remove-date-btn"
                                        title="Remove date"
                                    >
                                        ✕
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="no-dates-message">No available dates set. Patients can only book for today.</p>
                )}
            </div>
        </div>
    );
};


// --- Main DoctorDashboard Component ---
function DoctorDashboard() {
    const [user, setUser] = useState(null);
    const [queueData, setQueueData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isOnline, setIsOnline] = useState(false);
    const [isAvailableToday, setIsAvailableToday] = useState(false);
    const [availableDates, setAvailableDates] = useState([]);
    const [appointmentStats, setAppointmentStats] = useState({ completed: 0, missed: 0 });
    
    const { subscribe, joinQueueRoom, joinDoctorRoom, isConnected } = useSocket();
    const toast = useToast();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const API_BASE_URL = BACKEND_API_URL;

    // Fetch doctor profile and queue
    useEffect(() => {
        const loggedInUser = JSON.parse(localStorage.getItem('user'));
        if (!token || !loggedInUser || loggedInUser.role !== 'doctor') {
            navigate('/login-register');
            return;
        }
        setUser(loggedInUser);
        
        // Join doctor room for personal notifications
        if (isConnected && loggedInUser._id) {
            joinDoctorRoom(loggedInUser._id);
        }

        const fetchData = async () => {
            try {
                // Fetch queue
                const queueResponse = await fetch(`${API_BASE_URL}/queues/my-queue`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (queueResponse.ok) {
                    const data = await queueResponse.json();
                    setQueueData(data);
                }

                // Fetch doctor profile
                const profileResponse = await fetch(`${API_BASE_URL}/doctors/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (profileResponse.ok) {
                    const profileData = await profileResponse.json();
                    // The response has a nested 'doctor' object
                    const doctorInfo = profileData.doctor || profileData;
                    setIsOnline(doctorInfo.isOnline || false);
                    setIsAvailableToday(doctorInfo.isAvailableToday || false);
                    // Filter out past dates
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    const futureDates = (doctorInfo.availableDates || []).filter(date => new Date(date) >= now);
                    setAvailableDates(futureDates);
                }

                // Fetch appointment stats for today
                const statsResponse = await fetch(`${API_BASE_URL}/doctors/appointment-history`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (statsResponse.ok) {
                    const statsData = await statsResponse.json();
                    // The response has appointments array and stats object
                    const appointments = statsData.appointments || statsData;
                    const today = new Date().toDateString();
                    const todayAppointments = Array.isArray(appointments) 
                        ? appointments.filter(apt => new Date(apt.createdAt).toDateString() === today)
                        : [];
                    setAppointmentStats({
                        completed: todayAppointments.filter(a => a.status === 'Completed').length,
                        missed: todayAppointments.filter(a => a.status === 'Missed').length
                    });
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [token, navigate]);

    // Real-time updates with Socket.IO using context
    useEffect(() => {
        if (!queueData?._id || !isConnected) return;

        // Join the queue room
        joinQueueRoom(queueData._id);

        // Listener for when the doctor advances the queue
        const unsubscribeQueueUpdate = subscribe('queue-update', (data) => {
            console.log('Queue update received:', data);
            setQueueData(prev => ({ ...prev, currentNumber: data.currentNumber }));
        });

        // Listener for when a new patient books an appointment
        const unsubscribeNewAppointment = subscribe('new-appointment', (updatedQueue) => {
            console.log('New appointment received, updating queue:', updatedQueue);
            setQueueData(updatedQueue);
        });

        // Listener for when an appointment status changes (completed/missed)
        const unsubscribeStatusChange = subscribe('appointment-status-change', ({ appointmentId, status }) => {
            console.log('Appointment status change:', appointmentId, status);
            setQueueData(prev => {
                if (!prev || !prev.appointments) return prev;
                const updatedAppointments = prev.appointments.map(apt => 
                    apt._id === appointmentId ? { ...apt, status } : apt
                );
                return { ...prev, appointments: updatedAppointments };
            });
            // Update stats when appointment is completed or missed
            if (status === 'Completed' || status === 'Missed') {
                setAppointmentStats(prev => ({
                    ...prev,
                    [status.toLowerCase()]: prev[status.toLowerCase()] + 1
                }));
            }
        });

        return () => {
            unsubscribeQueueUpdate();
            unsubscribeNewAppointment();
            unsubscribeStatusChange();
        };
    }, [queueData?._id, isConnected, joinQueueRoom, subscribe]);

    // Toggle online status
    const handleToggleOnline = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/doctors/profile/toggle-online`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setIsOnline(data.isOnline);
            }
        } catch (err) {
            toast.error('Failed to toggle online status');
        }
    };

    // Toggle today availability
    const handleToggleToday = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/doctors/profile/toggle-today`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setIsAvailableToday(data.isAvailableToday);
            }
        } catch (err) {
            toast.error('Failed to toggle today availability');
        }
    };

    // Add available date
    const handleAddDate = async (date) => {
        try {
            const newDates = [...availableDates, date];
            const response = await fetch(`${API_BASE_URL}/doctors/profile/set-dates`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ dates: newDates })
            });
            if (response.ok) {
                const data = await response.json();
                setAvailableDates(data.availableDates || []);
                toast.success('Date added successfully');
            } else {
                const errorText = await response.text();
                console.error('Failed to add date:', errorText);
                toast.error('Failed to add date');
            }
        } catch (err) {
            console.error('Error adding date:', err);
            toast.error('Failed to add date');
        }
    };

    // Remove available date
    const handleRemoveDate = async (dateToRemove) => {
        try {
            const newDates = availableDates.filter(d => d !== dateToRemove);
            const response = await fetch(`${API_BASE_URL}/doctors/profile/set-dates`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ dates: newDates })
            });
            if (response.ok) {
                const data = await response.json();
                setAvailableDates(data.availableDates || []);
                toast.success('Date removed');
            } else {
                const errorText = await response.text();
                console.error('Failed to remove date:', errorText);
                toast.error('Failed to remove date');
            }
        } catch (err) {
            console.error('Error removing date:', err);
            toast.error('Failed to remove date');
        }
    };

    // Mark appointment as Completed or Missed
    const handleMarkAppointment = async (appointmentId, status) => {
        try {
            const response = await fetch(`${API_BASE_URL}/queues/mark-appointment/${appointmentId}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });
            if (response.ok) {
                // Update local stats
                setAppointmentStats(prev => ({
                    ...prev,
                    [status.toLowerCase()]: prev[status.toLowerCase()] + 1
                }));
                toast.success(`Patient marked as ${status}`);
                // Call next patient automatically after marking
                handleCallNext();
            } else {
                const data = await response.json();
                toast.error(data.message || 'Failed to mark appointment');
            }
        } catch (err) {
            toast.error('Failed to mark appointment');
        }
    };

    const handleCallNext = async () => {
        if (!queueData?._id) {
            toast.warning('No active queue found');
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/queues/next/${queueData._id}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to advance queue.');
            }
            // State updates via the socket event, so no local state change is needed here.
        } catch (err) {
            toast.error(err.message);
        }
    };

    if (isLoading) return <div className="loading-state">Loading Dashboard...</div>;
    if (error) return <div className="error-state">Error: {error}</div>;

    return (
        <div className="app-layout">
            <Header 
                doctorName={user?.name.split(' ').slice(1).join(' ')} 
                isOnline={isOnline}
                onToggleOnline={handleToggleOnline}
            />
            <main className="main-content">
                <div className="left-column">
                    <DashboardStats queueData={queueData} appointmentStats={appointmentStats} />
                    <QueueList queueData={queueData} onMarkAppointment={handleMarkAppointment} />
                </div>
                <div className="right-column">
                    <QuickActions onCallNext={handleCallNext} queueData={queueData} />
                    <AvailabilityManager 
                        availableDates={availableDates}
                        onAddDate={handleAddDate}
                        onRemoveDate={handleRemoveDate}
                        isAvailableToday={isAvailableToday}
                        onToggleToday={handleToggleToday}
                    />
                </div>
            </main>
        </div>
    );
}

export default DoctorDashboard;
