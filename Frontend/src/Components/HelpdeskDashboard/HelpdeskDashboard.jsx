import React, { useState, useEffect, useMemo, useRef } from 'react';
import './HelpdeskDashboard.css';
import { BACKEND_API_URL } from '../../util';
import { useSocket } from '../../context/SocketContext';

// A simple Toast component for notifications
const Toast = ({ message, type, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 3000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return <div className={`toast toast-${type}`}>{message}</div>;
};

const HelpdeskDashboard = () => {
    const [doctors, setDoctors] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [todaysAppointments, setTodaysAppointments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);
    const [hospitalId, setHospitalId] = useState(null);
    

    // Modal State
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [offlinePatientData, setOfflinePatientData] = useState({ patientName: '', patientPhone: '', reasonForVisit: '' });
    const [showManageModal, setShowManageModal] = useState(false);
    const [selectedEmergency, setSelectedEmergency] = useState(null);
    const [manageAction, setManageAction] = useState('');

    const [toast, setToast] = useState({ show: false, message: '', type: '' });

    const { subscribe, joinHospitalEmergencyRoom, isConnected } = useSocket();
    const API_BASE_URL = BACKEND_API_URL;
    const token = localStorage.getItem('token');
    const emergencyAudioRef = useRef(new Audio('/emergency-alert.mp3'));

    useEffect(() => {
        const loggedInUser = JSON.parse(localStorage.getItem('user'));
        if (loggedInUser) {
            setUser(loggedInUser);
        }

        const fetchData = async () => {
            if (!token) {
                setError("Authorization failed. Please log in.");
                setIsLoading(false);
                return;
            }
            try {
                const headers = { 'Authorization': `Bearer ${token}` };
                const [doctorsRes, notificationsRes, appointmentsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/doctors/my-hospital`, { headers }),
                    fetch(`${API_BASE_URL}/notifications/my-hospital`, { headers }),
                    fetch(`${API_BASE_URL}/appointments/by-hospital/today`, { headers })
                ]);
                if (!doctorsRes.ok || !notificationsRes.ok || !appointmentsRes.ok) throw new Error('Failed to fetch initial data.');
                
                setDoctors(await doctorsRes.json());
                setNotifications(await notificationsRes.json());
                setTodaysAppointments(await appointmentsRes.json());
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [token]);

    // Get hospital ID for emergency room
    useEffect(() => {
        if (!user || !user.hospitalName || !token) return;
        
        const getHospitalId = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/hospitals/by-name/${encodeURIComponent(user.hospitalName)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const hospitalData = await res.json();
                    setHospitalId(hospitalData._id);
                }
            } catch (err) {
                console.error("Could not get hospital ID", err);
            }
        };
        getHospitalId();
    }, [user, token]);

    // Join hospital emergency room and listen for new emergencies
    useEffect(() => {
        if (!hospitalId || !isConnected) return;

        // Join the hospital emergency room
        joinHospitalEmergencyRoom(hospitalId);

        // Subscribe to new emergency alerts
        const unsubscribe = subscribe('new-emergency', (newNotification) => {
            console.log('New emergency received:', newNotification);
            setNotifications(prev => [newNotification, ...prev]);
            const audio = emergencyAudioRef.current;
            audio.play().catch(e => console.error("Audio play failed:", e));
            setTimeout(() => { audio.pause(); audio.currentTime = 0; }, 5000);
        });

        return unsubscribe;
    }, [hospitalId, isConnected, joinHospitalEmergencyRoom, subscribe]);

    const filteredDoctors = useMemo(() =>
        doctors.filter(doc =>
            doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.designation.toLowerCase().includes(searchTerm.toLowerCase())
        ), [doctors, searchTerm]);

    const showToast = (message, type = 'success') => setToast({ show: true, message, type });
    
    const handleOpenBookingModal = (doctor) => { setSelectedDoctor(doctor); setShowBookingModal(true); };
    const handleCloseBookingModal = () => { setShowBookingModal(false); setSelectedDoctor(null); setOfflinePatientData({ patientName: '', patientPhone: '', reasonForVisit: '' }); };
    const handleOpenManageModal = (notification) => { setSelectedEmergency(notification); setShowManageModal(true); };
    const handleCloseManageModal = () => { setShowManageModal(false); setSelectedEmergency(null); setManageAction(''); };
    const handleOfflineFormChange = (e) => setOfflinePatientData({ ...offlinePatientData, [e.target.name]: e.target.value });

    const handleOfflineBookingSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...offlinePatientData, doctorId: selectedDoctor._id };
            const response = await fetch(`${API_BASE_URL}/appointments/offline-booking`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Booking failed');
            showToast(`Appointment #${data.appointment.appointmentNumber} booked`);
            setTodaysAppointments(prev => [...prev, data.appointment].sort((a, b) => a.appointmentNumber - b.appointmentNumber));
            handleCloseBookingModal();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    const handleManageEmergencySubmit = async (e) => {
        e.preventDefault();
        if (!manageAction) { showToast('Please enter an action taken.', 'error'); return; }
        try {
            const payload = { action: manageAction };
            const response = await fetch(`${API_BASE_URL}/emergency/manage/${selectedEmergency.emergencyId._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            
            if (!response.ok) throw new Error(data.message || 'Failed to update emergency.');
            setNotifications(prev => prev.map(n => n._id === selectedEmergency._id ? { ...n, emergencyId: data.emergency } : n));
            showToast('Emergency updated successfully!');
            handleCloseManageModal();
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    if (isLoading) return <div className="loading-state">Loading Dashboard...</div>;
    if (error) return <div className="error-state">{error}</div>;

    return (
        <div className="dashboard-wrapper">
            {toast.show && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast({ show: false, message: '', type: '' })} />}
            <header className="dashboard-header">
                <h1>Helpdesk Dashboard</h1>
                <p>{user?.hospitalName || 'Your Hospital'}</p>
            </header>
            <main className="dashboard-main">
                <div className="main-column">
                    <section className="dashboard-section">
                        <h2><i className="fas fa-bell"></i> Emergency Notifications</h2>
                        <div className="notification-list">
                            {notifications.length > 0 ? notifications.map(notif => (
                                <div key={notif._id} className={`notification-item status-${notif.emergencyId?.status || 'sent'}`}>
                                    <div className="notification-icon"><i className="fas fa-exclamation-triangle"></i></div>
                                    <div className="notification-content">
                                        <strong>{notif.emergencyId?.incidentType.toUpperCase()} Alert</strong>
                                        <p>{notif.message}</p>
                                        <small>{new Date(notif.createdAt).toLocaleString()}</small>
                                    </div>
                                    {/* --- UPDATED: Button container --- */}
                                    <div className="notification-actions">
                                        <a
                                            href={`https://www.google.com/maps?q=${notif.emergencyId?.location.coordinates[1]},${notif.emergencyId?.location.coordinates[0]}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn-navigate"
                                        >
                                            <i className="fas fa-location-arrow"></i> Navigate
                                        </a>
                                        <button className="btn-manage" onClick={() => handleOpenManageModal(notif)}>Manage</button>
                                    </div>
                                </div>
                            )) : <p>No active emergencies.</p>}
                        </div>
                    </section>
                    <section className="dashboard-section">
                        <h2><i className="fas fa-calendar-day"></i> Today's Bookings</h2>
                        <div className="appointments-list">
                            {todaysAppointments.length > 0 ? todaysAppointments.map(appt => (
                                <div key={appt._id} className="appointment-item">
                                    <span className="appt-number">#{appt.appointmentNumber}</span>
                                    <div className="appt-details">
                                        <span className="appt-patient">{appt.patientName}</span>
                                        <span className="appt-doctor">Dr. {appt.doctorId?.name || 'N/A'}</span>
                                    </div>
                                    <span className="appt-phone">{appt.patientPhone}</span>
                                </div>
                            )) : <p>No appointments booked for today yet.</p>}
                        </div>
                    </section>
                </div>
                <div className="side-column">
                    <section className="dashboard-section">
                        <h2><i className="fas fa-user-md"></i> Doctor Directory</h2>
                        <div className="search-bar">
                            <input type="text" placeholder="Search by name or designation..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                        <div className="doctor-list">
                            {filteredDoctors.map(doctor => (
                                <div key={doctor._id} className="doctor-card">
                                    <h4>{doctor.name}</h4>
                                    <p>{doctor.designation}</p>
                                    <button onClick={() => handleOpenBookingModal(doctor)} className="btn-book">Book for Patient</button>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
            {showBookingModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button onClick={handleCloseBookingModal} className="modal-close">&times;</button>
                        <h3>Book for Dr. {selectedDoctor?.name}</h3>
                        <form onSubmit={handleOfflineBookingSubmit} className="offline-form">
                            <div className="form-group"><label htmlFor="patientName">Patient Name</label><input type="text" id="patientName" name="patientName" required value={offlinePatientData.patientName} onChange={handleOfflineFormChange} /></div>
                            <div className="form-group"><label htmlFor="patientPhone">Patient Phone</label><input type="tel" id="patientPhone" name="patientPhone" required value={offlinePatientData.patientPhone} onChange={handleOfflineFormChange} /></div>
                            <div className="form-group"><label htmlFor="reasonForVisit">Reason for Visit</label><textarea id="reasonForVisit" name="reasonForVisit" required value={offlinePatientData.reasonForVisit} onChange={handleOfflineFormChange}></textarea></div>
                            <button type="submit" className="btn-primary">Confirm Booking</button>
                        </form>
                    </div>
                </div>
            )}
            {showManageModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button onClick={handleCloseManageModal} className="modal-close">&times;</button>
                        <h3>Manage Emergency</h3>
                        <p className="modal-subtitle"><strong>Incident:</strong> {selectedEmergency?.emergencyId.incidentType}</p>
                        <form onSubmit={handleManageEmergencySubmit} className="offline-form">
                            <div className="form-group">
                                <label htmlFor="action">Action Taken</label>
                                <input type="text" id="action" name="action" placeholder="e.g., Ambulance dispatched" required value={manageAction} onChange={(e) => setManageAction(e.target.value)} />
                            </div>
                            <button type="submit" className="btn-primary">Log Action</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HelpdeskDashboard;
