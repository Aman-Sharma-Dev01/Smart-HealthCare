import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { SocketIO_URL } from '../util';

const SocketContext = createContext(null);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [joinedRooms, setJoinedRooms] = useState(new Set());

    // Initialize socket connection
    useEffect(() => {
        const newSocket = io(SocketIO_URL, {
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });

        newSocket.on('connect', () => {
            console.log('Socket connected:', newSocket.id);
            setIsConnected(true);
            
            // Rejoin rooms on reconnection
            joinedRooms.forEach(room => {
                if (room.type === 'queue') {
                    newSocket.emit('join-queue-room', room.id);
                } else if (room.type === 'user') {
                    newSocket.emit('join-user-room', room.id);
                } else if (room.type === 'hospital-emergency') {
                    newSocket.emit('join-hospital-emergency-room', room.id);
                } else if (room.type === 'doctor') {
                    newSocket.emit('join-doctor-room', room.id);
                }
            });
        });

        newSocket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, []);

    // Join queue room
    const joinQueueRoom = useCallback((queueId) => {
        if (socket && queueId) {
            socket.emit('join-queue-room', queueId);
            setJoinedRooms(prev => new Set(prev).add({ type: 'queue', id: queueId }));
            console.log('Joined queue room:', queueId);
        }
    }, [socket]);

    // Join user room for personal notifications
    const joinUserRoom = useCallback((userId) => {
        if (socket && userId) {
            socket.emit('join-user-room', userId);
            setJoinedRooms(prev => new Set(prev).add({ type: 'user', id: userId }));
            console.log('Joined user room:', userId);
        }
    }, [socket]);

    // Join hospital emergency room (for helpdesk)
    const joinHospitalEmergencyRoom = useCallback((hospitalId) => {
        if (socket && hospitalId) {
            socket.emit('join-hospital-emergency-room', hospitalId);
            setJoinedRooms(prev => new Set(prev).add({ type: 'hospital-emergency', id: hospitalId }));
            console.log('Joined hospital emergency room:', hospitalId);
        }
    }, [socket]);

    // Join doctor room for personal notifications
    const joinDoctorRoom = useCallback((doctorId) => {
        if (socket && doctorId) {
            socket.emit('join-doctor-room', doctorId);
            setJoinedRooms(prev => new Set(prev).add({ type: 'doctor', id: doctorId }));
            console.log('Joined doctor room:', doctorId);
        }
    }, [socket]);

    // Subscribe to an event
    const subscribe = useCallback((event, callback) => {
        if (socket) {
            socket.on(event, callback);
            return () => socket.off(event, callback);
        }
        return () => {};
    }, [socket]);

    // Emit an event
    const emit = useCallback((event, data) => {
        if (socket) {
            socket.emit(event, data);
        }
    }, [socket]);

    const value = {
        socket,
        isConnected,
        joinQueueRoom,
        joinUserRoom,
        joinHospitalEmergencyRoom,
        joinDoctorRoom,
        subscribe,
        emit,
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

export default SocketContext;
