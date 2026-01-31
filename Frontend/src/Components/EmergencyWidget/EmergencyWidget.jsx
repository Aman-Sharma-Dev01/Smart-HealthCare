import React, { useState, useEffect } from 'react';
import './EmergencyWidget.css';
import { io } from "socket.io-client";
import { BACKEND_API_URL, SocketIO_URL } from '../../util';

// A simple Toast component for notifications
const Toast = ({ message, type, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 4000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return <div className={`toast toast-${type}`}>{message}</div>;
};

const EmergencyWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: '' });
    const [activeEmergency, setActiveEmergency] = useState(null); // To track an ongoing emergency

    // Form state
    const [emergencyType, setEmergencyType] = useState('self');
    const [incidentType, setIncidentType] = useState('accident');
    const [image, setImage] = useState(null);

    const token = localStorage.getItem('token');
    const API_BASE_URL = BACKEND_API_URL;

    useEffect(() => {
        const loggedInUser = JSON.parse(localStorage.getItem('user'));
        // This widget only renders for logged-in patients
        if (loggedInUser && loggedInUser.role === 'patient') {
            setUser(loggedInUser);
        }
    }, []);

    // Effect: Listen for open emergency widget event (from PWA SOS button)
    useEffect(() => {
        const handleOpenWidget = () => {
            setIsOpen(true);
        };

        window.addEventListener('openEmergencyWidget', handleOpenWidget);
        return () => {
            window.removeEventListener('openEmergencyWidget', handleOpenWidget);
        };
    }, []);

    // Effect for real-time updates on an active emergency
    useEffect(() => {
        if (!user) return;

        const socket = io(SocketIO_URL);
        socket.emit('join-user-room', user._id);

        socket.on('emergency-updated', (updatedEmergency) => {
            showToast("Helpdesk has responded to your alert!", "success");
            setActiveEmergency(updatedEmergency);
        });

        return () => socket.disconnect();
    }, [user]);

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
    };

    const resetForm = () => {
        setEmergencyType('self');
        setIncidentType('accident');
        setImage(null);
        setIsOpen(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (!navigator.geolocation) {
            showToast("Geolocation is not supported by your browser.", "error");
            setIsSubmitting(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                sendAlert(latitude, longitude);
            },
            () => {
                showToast("Unable to retrieve your location. Please enable location services.", "error");
                setIsSubmitting(false);
            }
        );
    };

    const sendAlert = async (lat, lng) => {
        const formData = new FormData();
        formData.append('lat', lat);
        formData.append('lng', lng);
        formData.append('emergencyType', emergencyType);
        formData.append('incidentType', incidentType);
        if (image) {
            formData.append('image', image);
        }

        try {
            const response = await fetch(`${API_BASE_URL}/emergency/alert`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to send alert.');
            
            showToast(`Alert sent! Notified ${data.notifiedHospital}. Help is on the way.`);
            setActiveEmergency(data.alert); // Set the active emergency after sending
            resetForm();
        } catch (err) {
            showToast(`Error: ${err.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!user) {
        return null;
    }

    return (
        <>
            {toast.show && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast({ show: false, message: '', type: '' })} />}
            <div className="emergency-widget">
                <button className="sos-button" onClick={() => setIsOpen(true)}>
                    SOS
                </button>

                {isOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <button onClick={() => setIsOpen(false)} className="modal-close">&times;</button>
                            <h3><i className="fas fa-exclamation-triangle"></i> Emergency Alert</h3>
                            <p className="modal-subtitle">Confirm details and send an alert to the nearest hospital.</p>
                            <form onSubmit={handleSubmit} className="emergency-form">
                                <div className="form-group">
                                    <label htmlFor="emergencyType">This emergency is for:</label>
                                    <select id="emergencyType" value={emergencyType} onChange={(e) => setEmergencyType(e.target.value)}>
                                        <option value="self">Myself</option>
                                        <option value="family">A Family Member</option>
                                        <option value="other">Someone Else</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="incidentType">Nature of Emergency:</label>
                                    <select id="incidentType" value={incidentType} onChange={(e) => setIncidentType(e.target.value)}>
                                        <option value="accident">Accident</option>
                                        <option value="heart attack">Heart Attack</option>
                                        <option value="stroke">Stroke</option>
                                        <option value="fire">Fire / Burn</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="image-upload" className="file-label">
                                        <i className="fas fa-camera"></i>
                                        {image ? ` ${image.name}` : ' Add a Photo (Optional)'}
                                    </label>
                                    <input id="image-upload" type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} />
                                </div>
                                <button type="submit" className="send-alert-btn" disabled={isSubmitting}>
                                    {isSubmitting ? 'Sending...' : 'Send Emergency Alert'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Display for an active emergency */}
                {activeEmergency && !isOpen && (
                     <div className="active-emergency-tracker">
                        <h4>Emergency Status: {activeEmergency.status}</h4>
                        <ul className="action-log-list">
                            {activeEmergency.actionLog.length > 0 ? activeEmergency.actionLog.map((log, index) => (
                                <li key={index}>
                                    <i className="fas fa-check-circle"></i>
                                    <span>{log.action}</span>
                                    <small>{new Date(log.timestamp).toLocaleTimeString()}</small>
                                </li>
                            )) : <li><i className="fas fa-hourglass-start"></i><span>Awaiting helpdesk response...</span></li>}
                        </ul>
                        <button onClick={() => setActiveEmergency(null)} className="close-tracker-btn">Close</button>
                    </div>
                )}
            </div>
        </>
    );
};

export default EmergencyWidget;
