import React, { useState, useEffect } from 'react';
import { io } from "socket.io-client";
import './LiveQueueWidget.css';

const LiveQueueWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [appointment, setAppointment] = useState(null);
    const [queueStatus, setQueueStatus] = useState(null);
    const [user, setUser] = useState(null);
    const [isQueueFinished, setIsQueueFinished] = useState(false); // To track if the turn has passed

    const token = localStorage.getItem('token');
    const API_BASE_URL = 'http://localhost:5000/api';

    // Effect 1: Get user and fetch their latest appointment
    useEffect(() => {
        const loggedInUser = JSON.parse(localStorage.getItem('user'));
        if (loggedInUser && loggedInUser.role === 'patient') {
            setUser(loggedInUser);
        } else {
            return;
        }

        const fetchLatestAppointment = async () => {
            if (!token) return;
            try {
                const res = await fetch(`${API_BASE_URL}/appointments/my-latest`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setAppointment(data);
                }
            } catch (error) {
                console.error("Failed to fetch latest appointment:", error);
            }
        };
        fetchLatestAppointment();
    }, [token]);

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

        const socket = io("http://localhost:5000");
        socket.emit('join-queue-room', queueStatus.queueId);

        socket.on('queue-update', (data) => {
            setQueueStatus(prev => ({ ...prev, currentNumber: data.currentNumber }));
        });

        return () => {
            socket.disconnect();
        };
    }, [queueStatus?.queueId]);

    // Effect 4: Handle the widget's state based on the queue number
    useEffect(() => {
        if (appointment && queueStatus) {
            // Check if the user's turn has passed
            if (queueStatus.currentNumber > appointment.appointmentNumber) {
                setIsQueueFinished(true);
                setIsOpen(true); // Keep the widget open to show the message
            } 
            // Check if it's currently the user's turn
            else if (appointment.appointmentNumber === queueStatus.currentNumber) {
                setIsOpen(true); // Automatically open the widget
            }
        }
    }, [queueStatus, appointment]);


    if (!user || !appointment || !queueStatus) {
        return null;
    }

    const isMyTurn = appointment.appointmentNumber === queueStatus.currentNumber;

    return (
        <div className={`live-queue-widget ${isOpen ? 'open' : ''} ${isMyTurn ? 'my-turn' : ''}`}>
            <button className="widget-toggle-btn" onClick={() => setIsOpen(!isOpen)}>
                <i className={`fas ${isOpen ? 'fa-times' : (isMyTurn ? 'fa-bell' : 'fa-users')}`}></i>
            </button>
            <div className="widget-content">
                {isQueueFinished ? (
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
                            {appointment.doctorId?.name} at {appointment.hospitalId?.name}
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default LiveQueueWidget;
