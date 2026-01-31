import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './BookAppointment.css';
import { BACKEND_API_URL } from '../../util';

// A simple Toast component for notifications
const Toast = ({ message, type, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 3000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return <div className={`toast toast-${type}`}>{message}</div>;
};

const BookAppointment = () => {
    const [hospitals, setHospitals] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [selectedHospital, setSelectedHospital] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [selectedDate, setSelectedDate] = useState('today');
    const [availableDates, setAvailableDates] = useState([]);
    const [doctorAvailability, setDoctorAvailability] = useState({ isOnline: false, isAvailableToday: false });
    const [reason, setReason] = useState('');
    const [symptoms, setSymptoms] = useState('');
    
    const [isLoading, setIsLoading] = useState(true);
    const [isBooking, setIsBooking] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: '' });

    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const API_BASE_URL = BACKEND_API_URL;

    // --- UPDATED: Fetch nearby hospitals based on user's location ---
    useEffect(() => {
        const loggedInUser = JSON.parse(localStorage.getItem('user'));

        if (!token || !loggedInUser) {
            navigate('/login-register');
            return;
        }

        // --- NEW: Redirect if the user is not a patient ---
        if (loggedInUser.role !== 'patient') {
            navigate('*'); // Redirect to homepage
            return;
        }

        const fetchNearbyHospitals = (lat, lng) => {
            fetch(`${API_BASE_URL}/hospitals/nearby?lat=${lat}&lng=${lng}`)
                .then(res => {
                    if (!res.ok) throw new Error('Could not fetch nearby hospitals.');
                    return res.json();
                })
                .then(data => setHospitals(data))
                .catch(err => showToast(err.message, 'error'))
                .finally(() => setIsLoading(false));
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    fetchNearbyHospitals(position.coords.latitude, position.coords.longitude);
                },
                () => {
                    showToast('Location permission denied. Please enable it to find nearby hospitals.', 'error');
                    setIsLoading(false);
                }
            );
        } else {
            showToast('Geolocation is not supported by your browser.', 'error');
            setIsLoading(false);
        }
    }, [token, navigate]);

    // Fetch doctors when a hospital is selected
    useEffect(() => {
        if (selectedHospital) {
            const fetchDoctors = async () => {
                try {
                    const response = await fetch(`${API_BASE_URL}/doctors/by-hospital/${encodeURIComponent(selectedHospital)}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!response.ok) throw new Error('Could not fetch doctors for this hospital.');
                    setDoctors(await response.json());
                    // Reset doctor selection when hospital changes
                    setSelectedDoctor('');
                    setAvailableDates([]);
                    setSelectedDate('today');
                } catch (err) {
                    showToast(err.message, 'error');
                }
            };
            fetchDoctors();
        }
    }, [selectedHospital, token]);

    // Fetch available dates when a doctor is selected
    useEffect(() => {
        if (selectedDoctor) {
            const fetchAvailability = async () => {
                try {
                    const response = await fetch(`${API_BASE_URL}/doctors/available-dates/${selectedDoctor}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        setAvailableDates(data.availableDates || []);
                        setDoctorAvailability({
                            isOnline: data.isOnline || false,
                            isAvailableToday: data.isAvailableToday || false
                        });
                        // Default to today if available, otherwise first available date
                        if (data.isAvailableToday) {
                            setSelectedDate('today');
                        } else if (data.availableDates && data.availableDates.length > 0) {
                            setSelectedDate(data.availableDates[0]);
                        } else {
                            setSelectedDate('');
                        }
                    }
                } catch (err) {
                    console.error('Failed to fetch doctor availability:', err);
                }
            };
            fetchAvailability();
        }
    }, [selectedDoctor, token]);

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedHospital || !selectedDoctor || !reason) {
            showToast('Please fill all required fields.', 'error');
            return;
        }
        if (!selectedDate) {
            showToast('Please select an appointment date.', 'error');
            return;
        }
        setIsBooking(true);

        const hospitalObj = hospitals.find(h => h.name === selectedHospital);
        const doctorObj = doctors.find(d => d._id === selectedDoctor);

        const payload = {
            hospitalId: hospitalObj._id,
            doctorId: doctorObj._id,
            reasonForVisit: reason,
            symptoms,
        };

        try {
            let response;
            if (selectedDate === 'today') {
                // Book for today (existing endpoint)
                response = await fetch(`${API_BASE_URL}/appointments/book`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(payload)
                });
            } else {
                // Book for a specific date (new endpoint)
                response = await fetch(`${API_BASE_URL}/appointments/book-date`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ ...payload, appointmentDate: selectedDate })
                });
            }
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Booking failed.');

            const dateText = selectedDate === 'today' ? 'today' : new Date(selectedDate).toLocaleDateString();
            showToast(`Appointment #${data.appointmentNumber || 'N/A'} confirmed for ${dateText}!`);
            
            // Dispatch custom event to update LiveQueueWidget immediately
            window.dispatchEvent(new CustomEvent('appointmentBooked'));
            
            setTimeout(() => navigate('/profile'), 2000);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setIsBooking(false);
        }
    };

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-card">
                    <div className="loading-visual">
                        <div className="location-pulse">
                            <div className="pulse-ring"></div>
                            <div className="pulse-ring"></div>
                            <div className="pulse-ring"></div>
                            <div className="location-pin">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                    <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div className="loading-content">
                        <h3>Locating You</h3>
                        <p>Finding nearby hospitals based on your current location</p>
                        <div className="loading-progress">
                            <div className="progress-bar"></div>
                        </div>
                        <div className="loading-steps">
                            <div className="step active">
                                <div className="step-icon">✓</div>
                                <span>Getting GPS coordinates</span>
                            </div>
                            <div className="step">
                                <div className="step-icon"><div className="mini-spinner"></div></div>
                                <span>Searching hospitals nearby</span>
                            </div>
                            <div className="step">
                                <div className="step-icon">3</div>
                                <span>Loading available doctors</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="booking-wrapper">
            {toast.show && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast({ show: false, message: '', type: '' })} />}
            <div className="booking-card">
                <div className="booking-header">
                    <h2>Book an Appointment</h2>
                    <p>Fill in the details below to schedule your visit.</p>
                </div>
                <form onSubmit={handleSubmit} className="booking-form">
                    <div className="form-group">
                        <label htmlFor="hospital">Select Nearby Hospital</label>
                        <select id="hospital" value={selectedHospital} onChange={(e) => setSelectedHospital(e.target.value)} required>
                            <option value="" disabled>-- Choose a hospital --</option>
                            {hospitals.length > 0 ? (
                                hospitals.map(h => <option key={h._id} value={h.name}>{h.name}</option>)
                            ) : (
                                <option disabled>No hospitals found nearby.</option>
                            )}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="doctor">Select Doctor</label>
                        <select id="doctor" value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)} required disabled={!selectedHospital}>
                            <option value="" disabled>-- Choose a doctor --</option>
                            {doctors.map(d => (
                                <option key={d._id} value={d._id}>
                                    {d.name} ({d.designation}) {d.isOnline ? '🟢' : '🔴'}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedDoctor && (
                        <div className="form-group">
                            <label htmlFor="appointmentDate">Select Appointment Date</label>
                            {!doctorAvailability.isAvailableToday && availableDates.length === 0 ? (
                                <div className="no-dates-warning">
                                    <span>⚠️</span>
                                    <p>This doctor has no available dates set. Please choose another doctor or check back later.</p>
                                </div>
                            ) : (
                                <div className="date-selection">
                                    {doctorAvailability.isAvailableToday && (
                                        <label className={`date-option ${selectedDate === 'today' ? 'selected' : ''}`}>
                                            <input 
                                                type="radio" 
                                                name="appointmentDate" 
                                                value="today"
                                                checked={selectedDate === 'today'}
                                                onChange={(e) => setSelectedDate(e.target.value)}
                                            />
                                            <div className="date-option-content">
                                                <span className="date-day">Today</span>
                                                <span className="date-label">Available Now</span>
                                            </div>
                                        </label>
                                    )}
                                    {availableDates.map((date, index) => {
                                        const dateObj = new Date(date);
                                        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                                        const dayNum = dateObj.getDate();
                                        const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
                                        return (
                                            <label key={index} className={`date-option ${selectedDate === date ? 'selected' : ''}`}>
                                                <input 
                                                    type="radio" 
                                                    name="appointmentDate" 
                                                    value={date}
                                                    checked={selectedDate === date}
                                                    onChange={(e) => setSelectedDate(e.target.value)}
                                                />
                                                <div className="date-option-content">
                                                    <span className="date-day">{dayName}</span>
                                                    <span className="date-num">{dayNum}</span>
                                                    <span className="date-month">{monthName}</span>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="reason">Reason for Visit</label>
                        <input type="text" id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g., Annual Checkup, Fever" required />
                    </div>

                    <div className="form-group">
                        <label htmlFor="symptoms">Symptoms (Optional)</label>
                        <textarea id="symptoms" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="Describe your symptoms..."></textarea>
                    </div>

                    <button type="submit" className="btn-submit" disabled={isBooking}>
                        {isBooking ? 'Confirming...' : 'Confirm Appointment'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default BookAppointment;
