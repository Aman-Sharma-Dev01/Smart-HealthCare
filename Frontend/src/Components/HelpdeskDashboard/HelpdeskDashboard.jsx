import React, { useState, useEffect, useMemo } from 'react';
import './HelpdeskDashboard.css';
import { io } from "socket.io-client";

const HelpdeskDashboard = () => {
    // State Management
    const [doctors, setDoctors] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);

    // Booking Modal State
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    const [offlinePatientData, setOfflinePatientData] = useState({
        patientName: '',
        patientPhone: '',
        reasonForVisit: ''
    });

    // Emergency Management Modal State
    const [showManageModal, setShowManageModal] = useState(false);
    const [selectedEmergency, setSelectedEmergency] = useState(null);
    const [manageAction, setManageAction] = useState('');

    const API_BASE_URL = 'http://localhost:5000/api';
    const token = localStorage.getItem('token');

    // Effect 1: Get user from localStorage and fetch initial data
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
                const [doctorsRes, notificationsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/doctors/my-hospital`, { headers }),
                    fetch(`${API_BASE_URL}/notifications/my-hospital`, { headers })
                ]);
                if (!doctorsRes.ok || !notificationsRes.ok) throw new Error('Failed to fetch data.');
                
                setDoctors(await doctorsRes.json());
                setNotifications(await notificationsRes.json());
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [token]);

    // Effect 2: For a STABLE Socket.IO connection
    useEffect(() => {
        // Only proceed if we have the user object and their hospital name
        if (!user || !user.hospitalName) {
            return;
        }

        const socket = io("http://localhost:5000");

        // Helper function to get the hospital ID and join the correct room
        const getHospitalIdAndJoinRoom = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/hospitals/by-name/${encodeURIComponent(user.hospitalName)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!res.ok) {
                    console.error("Could not fetch hospital ID.");
                    return;
                }
                const hospitalData = await res.json();
                
                // Use the hospital's _id to join the room
                const hospitalRoomId = hospitalData._id;
                socket.emit('join-hospital-emergency-room', hospitalRoomId);
                console.log(`Socket successfully joined room for hospital ID: ${hospitalRoomId}`);

            } catch (err) {
                console.error("Error joining hospital room:", err);
            }
        };

        getHospitalIdAndJoinRoom();

        // Listen for new emergency events from the server
        socket.on('new-emergency', (newNotification) => {
            console.log('REAL-TIME NOTIFICATION RECEIVED:', newNotification);
            // Add the new notification to the top of the list
            setNotifications(prevNotifications => [newNotification, ...prevNotifications]);
        });

        // This function will be called when the component unmounts
        return () => {
            console.log('Cleaning up socket connection...');
            socket.disconnect();
        };
    }, [user, token]); // This effect now ONLY runs when the user object is available.

    const filteredDoctors = useMemo(() =>
        doctors.filter(doc =>
            doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.designation.toLowerCase().includes(searchTerm.toLowerCase())
        ), [doctors, searchTerm]);

    // Modal Handlers
    const handleOpenBookingModal = (doctor) => {
        setSelectedDoctor(doctor);
        setShowBookingModal(true);
    };
    const handleCloseBookingModal = () => {
        setShowBookingModal(false);
        setSelectedDoctor(null);
        setOfflinePatientData({ patientName: '', patientPhone: '', reasonForVisit: '' });
    };

    const handleOpenManageModal = (notification) => {
        setSelectedEmergency(notification);
        setShowManageModal(true);
    };
    const handleCloseManageModal = () => {
        setShowManageModal(false);
        setSelectedEmergency(null);
        setManageAction('');
    };
    
    const handleOfflineFormChange = (e) => {
        setOfflinePatientData({ ...offlinePatientData, [e.target.name]: e.target.value });
    };

    // API Call Handlers
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
            alert(`Appointment booked for ${data.appointment.patientName} with number ${data.appointment.appointmentNumber}`);
            handleCloseBookingModal();
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleManageEmergencySubmit = async (e) => {
        e.preventDefault();
        if (!manageAction) return alert('Please enter an action taken.');
        try {
            const payload = { status: 'acknowledged', action: manageAction };
            const response = await fetch(`${API_BASE_URL}/emergency/manage/${selectedEmergency.emergencyId._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to update emergency.');
            
            setNotifications(prev => prev.map(n => n._id === selectedEmergency._id ? { ...n, emergencyId: data.emergency } : n));
            alert('Emergency updated successfully!');
            handleCloseManageModal();
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    if (isLoading) return <div className="loading-state">Loading Dashboard...</div>;
    if (error) return <div className="error-state">{error}</div>;
    
    return (
        <div className="dashboard-wrapper">
            <header className="dashboard-header">
                <h1>Helpdesk Dashboard</h1>
                <p>{user?.hospitalName || 'Your Hospital'}</p>
            </header>
            <main className="dashboard-main">
                <section className="dashboard-section">
                    <h2><i className="fas fa-bell"></i> Emergency Notifications</h2>
                    <div className="notification-list">
                        {notifications.length > 0 ? notifications.map(notif => (
                            <div key={notif._id} className={`notification-item status-${notif.emergencyId?.status || 'new'}`}>
                                <div className="notification-icon"><i className="fas fa-exclamation-triangle"></i></div>
                                <div className="notification-content">
                                    <strong>{notif.emergencyId?.incidentType.toUpperCase()} Alert</strong>
                                    <p>{notif.message}</p>
                                    <small>{new Date(notif.createdAt).toLocaleString()}</small>
                                </div>
                                <button className="btn-manage" onClick={() => handleOpenManageModal(notif)}>Manage</button>
                            </div>
                        )) : <p>No active emergencies.</p>}
                    </div>
                </section>

                <section className="dashboard-section">
                    <h2><i className="fas fa-user-md"></i> Doctor Directory</h2>
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Search by name or designation..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
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
