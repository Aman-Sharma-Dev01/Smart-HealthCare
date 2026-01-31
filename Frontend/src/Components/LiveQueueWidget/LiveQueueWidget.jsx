import React, { useState, useEffect, useRef, useCallback } from 'react';
import './LiveQueueWidget.css';
import { BACKEND_API_URL } from '../../util';
import { useSocket } from '../../context/SocketContext';

const LiveQueueWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [appointment, setAppointment] = useState(null);
    const [queueStatus, setQueueStatus] = useState(null);
    const [user, setUser] = useState(null);
    const [isQueueFinished, setIsQueueFinished] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const { subscribe, joinQueueRoom, isConnected } = useSocket();
    const token = localStorage.getItem('token');
    const API_BASE_URL = BACKEND_API_URL;

    // Ref for the appointment audio alert
    const appointmentAudioRef = useRef(new Audio('/appointment-alert.mp3'));

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
                // Handle null or empty response
                if (data && data._id) {
                    setAppointment(data);
                    // Check if appointment is already completed/missed/cancelled
                    if (['Completed', 'Missed', 'Cancelled'].includes(data.status)) {
                        setIsQueueFinished(true);
                    } else {
                        setIsQueueFinished(false);
                    }
                } else {
                    setAppointment(null);
                }
            } else {
                setAppointment(null);
            }
        } catch (error) {
            console.error("Failed to fetch latest appointment:", error);
            setAppointment(null);
        } finally {
            setIsLoading(false);
        }
    }, [token, API_BASE_URL]);

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
            setIsOpen(true);
        };

        window.addEventListener('openQueueWidget', handleOpenWidget);
        return () => {
            window.removeEventListener('openQueueWidget', handleOpenWidget);
        };
    }, []);

    // Effect 2: Fetch initial queue status once an appointment is found
    useEffect(() => {
        if (appointment && appointment.doctorId?._id) {
            const fetchQueueStatus = async () => {
                try {
                    const res = await fetch(`${API_BASE_URL}/queues/status/${appointment.doctorId._id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        setQueueStatus(await res.json());
                    }
                } catch (error) {
                    console.error("Failed to fetch queue status:", error);
                }
            };
            fetchQueueStatus();
        }
    }, [appointment, token]);

    // Effect 3: Connect to Socket.IO for real-time updates using context
    useEffect(() => {
        if (!queueStatus || !queueStatus.queueId || !isConnected) {
            return;
        }

        // Join the queue room
        joinQueueRoom(queueStatus.queueId);

        // Subscribe to queue updates
        const unsubscribeQueueUpdate = subscribe('queue-update', (data) => {
            console.log('Queue update received:', data);
            setQueueStatus(prev => ({ ...prev, currentNumber: data.currentNumber }));
        });

        // Subscribe to appointment status changes
        const unsubscribeStatusChange = subscribe('appointment-status-change', ({ appointmentId, status }) => {
            console.log('Appointment status changed in queue widget:', appointmentId, status);
            if (appointment && appointment._id === appointmentId) {
                if (['Completed', 'Missed', 'Cancelled'].includes(status)) {
                    setIsQueueFinished(true);
                    // Refetch to get next appointment
                    fetchLatestAppointment();
                }
            }
        });

        return () => {
            unsubscribeQueueUpdate();
            unsubscribeStatusChange();
        };
    }, [queueStatus?.queueId, isConnected, joinQueueRoom, subscribe, appointment, fetchLatestAppointment]);

    // Effect 4: Handle the widget's state and sound based on the queue number
    useEffect(() => {
        if (appointment && queueStatus) {
            // Don't play sound or auto-open if appointment is already finished
            const isFinished = isQueueFinished || ['Completed', 'Missed', 'Cancelled'].includes(appointment.status);
            
            if (queueStatus.currentNumber > appointment.appointmentNumber) {
                setIsQueueFinished(true);
            } 
            else if (appointment.appointmentNumber === queueStatus.currentNumber && !isFinished) {
                setIsOpen(true);
                appointmentAudioRef.current.play().catch(e => console.error("Audio play failed:", e));
            }
        }
    }, [queueStatus, appointment, isQueueFinished]);

    // Don't show widget if user is not a patient
    if (!user) {
        return null;
    }

    const isMyTurn = appointment && queueStatus && appointment.appointmentNumber === queueStatus.currentNumber;
    const hasAppointment = appointment && appointment._id && queueStatus;

    return (
        <div className={`live-queue-widget ${isOpen ? 'open' : ''} ${isMyTurn ? 'my-turn' : ''}`}>
            <button className="widget-toggle-btn" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                ) : isMyTurn ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
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
                        <p>Loading queue status...</p>
                    </div>
                ) : !hasAppointment ? (
                    <div className="no-appointment-state">
                        <div className="no-appointment-icon">📅</div>
                        <h4>No Active Appointment</h4>
                        <p>You don't have any upcoming appointments. Book one to see your queue status here!</p>
                        <a href="/appointment-booking" className="book-now-btn">Book Appointment</a>
                    </div>
                ) : isQueueFinished ? (
                    <div className="queue-finished-message">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        <h4>Appointment Complete</h4>
                        <p>Your turn has passed. There are no more active appointments for you at this time.</p>
                    </div>
                ) : (
                    <>
                        <h4>{isMyTurn ? "It's Your Turn Now!" : "Live Queue Status"}</h4>
                        <div className="queue-display">
                            <div className="queue-box">
                                <span className="queue-label">Currently Serving</span>
                                <span className="queue-number current">{queueStatus.currentNumber}</span>
                            </div>
                            <div className="queue-box">
                                <span className="queue-label">Your Number</span>
                                <span className="queue-number your">{appointment.appointmentNumber}</span>
                            </div>
                        </div>
                        <p className="doctor-info">
                            Dr. {appointment.doctorId?.name} at {appointment.hospitalId?.name}
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default LiveQueueWidget;
