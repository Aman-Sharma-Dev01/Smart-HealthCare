import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from "socket.io-client";
import './LiveQueueWidget.css';
import { BACKEND_API_URL, SocketIO_URL } from '../../util';

const LiveQueueWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [appointment, setAppointment] = useState(null);
    const [queueStatus, setQueueStatus] = useState(null);
    const [user, setUser] = useState(null);
    const [isQueueFinished, setIsQueueFinished] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const token = localStorage.getItem('token');
    const API_BASE_URL = BACKEND_API_URL;

    // Ref for the appointment audio alert
    const appointmentAudioRef = useRef(new Audio('/appointment-alert.mp3'));

    // Fetch latest appointment function - made reusable
    const fetchLatestAppointment = useCallback(async () => {
        if (!token) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/appointments/my-latest`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAppointment(data);
                setIsQueueFinished(false); // Reset finished state for new appointment
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

        window.addEventListener('appointmentBooked', handleAppointmentBooked);
        return () => {
            window.removeEventListener('appointmentBooked', handleAppointmentBooked);
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

    // Effect 3: Connect to Socket.IO for real-time updates
    useEffect(() => {
        if (!queueStatus || !queueStatus.queueId) {
            return;
        }

        const socket = io(SocketIO_URL);
        socket.emit('join-queue-room', queueStatus.queueId);

        socket.on('queue-update', (data) => {
            setQueueStatus(prev => ({ ...prev, currentNumber: data.currentNumber }));
        });

        return () => {
            socket.disconnect();
        };
    }, [queueStatus?.queueId]);

    // Effect 4: Handle the widget's state and sound based on the queue number
    useEffect(() => {
        if (appointment && queueStatus) {
            if (queueStatus.currentNumber > appointment.appointmentNumber) {
                setIsQueueFinished(true);
                setIsOpen(true);
            } 
            else if (appointment.appointmentNumber === queueStatus.currentNumber) {
                setIsOpen(true);
                appointmentAudioRef.current.play().catch(e => console.error("Audio play failed:", e));
            }
        }
    }, [queueStatus, appointment]);

    // Don't show widget if user is not a patient
    if (!user) {
        return null;
    }

    const isMyTurn = appointment && queueStatus && appointment.appointmentNumber === queueStatus.currentNumber;
    const hasAppointment = appointment && queueStatus;

    return (
        <div className={`live-queue-widget ${isOpen ? 'open' : ''} ${isMyTurn ? 'my-turn' : ''}`}>
            <button className="widget-toggle-btn" onClick={() => setIsOpen(!isOpen)}>
                <i className={`fas ${isOpen ? 'fa-times' : (isMyTurn ? 'fa-bell' : 'fa-users')}`}></i>
            </button>
            <div className="widget-content">
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
                        <i className="fas fa-check-circle"></i>
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
