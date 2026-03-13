import React, { useState, useEffect, useRef, useCallback } from 'react';
import './LiveQueueWidget.css';
import { BACKEND_API_URL } from '../../util';

const LiveQueueWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [appointment, setAppointment] = useState(null);
    const [doctorRating, setDoctorRating] = useState(null);
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const token = localStorage.getItem('token');
    const API_BASE_URL = BACKEND_API_URL;

    const appointmentAudioRef = useRef(new Audio('/appointment-alert.mp3'));

    const fetchDoctorRating = useCallback(async (doctorId) => {
        if (!token || !doctorId) {
            setDoctorRating(null);
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/appointments/my-history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                setDoctorRating(null);
                return;
            }

            const history = await res.json();
            const ratedAppointment = (history || []).find(
                (appt) => appt?.doctorId?._id === doctorId && appt?.feedback?.rating
            );

            setDoctorRating(ratedAppointment?.feedback?.rating ?? null);
        } catch (error) {
            console.error('Failed to fetch doctor rating:', error);
            setDoctorRating(null);
        }
    }, [token, API_BASE_URL]);

    // Fetch latest appointment function - made reusable
    const fetchLatestAppointment = useCallback(async () => {
        if (!token) {
            setIsLoading(false);
            setAppointment(null);
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/appointments/my-latest`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data && data._id) {
                    setAppointment(data);
                    fetchDoctorRating(data?.doctorId?._id);
                } else {
                    setAppointment(null);
                    setDoctorRating(null);
                }
            } else {
                setAppointment(null);
                setDoctorRating(null);
            }
        } catch (error) {
            console.error("Failed to fetch latest appointment:", error);
            setAppointment(null);
            setDoctorRating(null);
        } finally {
            setIsLoading(false);
        }
    }, [token, API_BASE_URL, fetchDoctorRating]);

    // Effect 1: Get user and fetch their latest appointment
    useEffect(() => {
        const loggedInUser = JSON.parse(localStorage.getItem('user'));
        if (loggedInUser && loggedInUser.role === 'patient') {
            setUser(loggedInUser);
            fetchLatestAppointment();
        } else {
            setUser(null);
            setIsLoading(false);
        }
    }, [fetchLatestAppointment]);

    // Effect: Listen for appointment booked event
    useEffect(() => {
        const handleAppointmentBooked = () => {
            fetchLatestAppointment();
        };

        const handleAppointmentUpdated = () => {
            fetchLatestAppointment();
        };

        window.addEventListener('appointmentBooked', handleAppointmentBooked);
        window.addEventListener('appointmentUpdated', handleAppointmentUpdated);
        return () => {
            window.removeEventListener('appointmentBooked', handleAppointmentBooked);
            window.removeEventListener('appointmentUpdated', handleAppointmentUpdated);
        };
    }, [fetchLatestAppointment]);

    // Effect: Listen for open queue widget event (from HomePage service card)
    useEffect(() => {
        const handleOpenWidget = () => {
            fetchLatestAppointment();
            setIsOpen(true);
        };

        window.addEventListener('openQueueWidget', handleOpenWidget);
        return () => {
            window.removeEventListener('openQueueWidget', handleOpenWidget);
        };
    }, [fetchLatestAppointment]);

    // Play an attention sound when opening appointment details from the action card
    useEffect(() => {
        if (isOpen && appointment?._id) {
            appointmentAudioRef.current.play().catch(() => {});
        }
    }, [isOpen, appointment?._id]);

    if (!user) {
        return null;
    }

    const hasAppointment = !!(appointment && appointment._id);

    const getStatusClass = (status) => {
        const value = (status || '').toLowerCase();
        if (value === 'completed') return 'completed';
        if (value === 'cancelled' || value === 'missed') return 'cancelled';
        return 'scheduled';
    };

    const ratingStars = doctorRating
        ? `${'★'.repeat(doctorRating)}${'☆'.repeat(5 - doctorRating)}`
        : '☆☆☆☆☆';

    return (
        <div className={`live-queue-widget ${isOpen ? 'open' : ''}`}>
            <button className="widget-toggle-btn" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                )}
            </button>
            <div className="widget-content">
                {/* Close button inside widget content */}
                <button className="widget-close-btn" onClick={() => setIsOpen(false)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                {isLoading ? (
                    <div className="queue-loading-state">
                        <div className="mini-spinner"></div>
                        <p>Loading appointment details...</p>
                    </div>
                ) : !hasAppointment ? (
                    <div className="no-appointment-state">
                        <div className="no-appointment-icon">📅</div>
                        <h4>No Active Appointment</h4>
                        <p>You don't have any upcoming appointments right now.</p>
                        <a href="/appointment-booking" className="book-now-btn">Book Appointment</a>
                    </div>
                ) : (
                    <>
                        <h4>Appointment Details</h4>

                        <div className="details-grid">
                            <div className="detail-box">
                                <span className="detail-label">Doctor</span>
                                <span className="detail-value">Dr. {appointment.doctorId?.name || '--'}</span>
                            </div>
                            <div className="detail-box">
                                <span className="detail-label">Specialization</span>
                                <span className="detail-value">{appointment.doctorId?.designation || '--'}</span>
                            </div>
                            <div className="detail-box">
                                <span className="detail-label">Hospital</span>
                                <span className="detail-value">{appointment.hospitalId?.name || '--'}</span>
                            </div>
                            <div className="detail-box">
                                <span className="detail-label">Token Number</span>
                                <span className="detail-value">#{appointment.appointmentNumber ?? '--'}</span>
                            </div>
                            <div className="detail-box">
                                <span className="detail-label">Appointment Date</span>
                                <span className="detail-value">{appointment.appointmentDate || '--'}</span>
                            </div>
                            <div className="detail-box full-width">
                                <span className="detail-label">Status</span>
                                <span className={`status-chip ${getStatusClass(appointment.status)}`}>
                                    {appointment.status || 'Scheduled'}
                                </span>
                            </div>
                            <div className="detail-box full-width">
                                <span className="detail-label">Reason for Visit</span>
                                <span className="detail-value">{appointment.reasonForVisit || '--'}</span>
                            </div>
                            <div className="detail-box full-width">
                                <span className="detail-label">Symptoms</span>
                                <span className="detail-value">{appointment.symptoms || 'Not provided'}</span>
                            </div>
                            <div className="detail-box full-width">
                                <span className="detail-label">Your Rating</span>
                                <span className="detail-value rating-text">{ratingStars}</span>
                            </div>
                            <div className="detail-box full-width">
                                <span className="detail-label">Your Feedback</span>
                                <span className="detail-value">{appointment.feedback?.comment || 'No feedback submitted yet.'}</span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default LiveQueueWidget;
