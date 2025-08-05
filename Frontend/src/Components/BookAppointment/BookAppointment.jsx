import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './BookAppointment.css';

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
    const [reason, setReason] = useState('');
    const [symptoms, setSymptoms] = useState('');
    
    const [isLoading, setIsLoading] = useState(true);
    const [isBooking, setIsBooking] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: '' });

    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const API_BASE_URL = 'http://localhost:5000/api';

    // --- UPDATED: Fetch nearby hospitals based on user's location ---
    useEffect(() => {
        if (!token) {
            navigate('/login-register');
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
                    // NOTE: Ensure your backend has this route: GET /api/doctors/by-hospital/:hospitalName
                    const response = await fetch(`${API_BASE_URL}/doctors/by-hospital/${encodeURIComponent(selectedHospital)}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!response.ok) throw new Error('Could not fetch doctors for this hospital.');
                    setDoctors(await response.json());
                } catch (err) {
                    showToast(err.message, 'error');
                }
            };
            fetchDoctors();
        }
    }, [selectedHospital, token]);

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedHospital || !selectedDoctor || !reason) {
            showToast('Please fill all required fields.', 'error');
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
            const response = await fetch(`${API_BASE_URL}/appointments/book`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Booking failed.');

            showToast(`Appointment #${data.appointmentNumber} confirmed!`);
            setTimeout(() => navigate('/profile'), 2000);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setIsBooking(false);
        }
    };

    if (isLoading) return <div className="loading-state">Getting your location to find nearby hospitals...</div>;

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
                            {doctors.map(d => <option key={d._id} value={d._id}>{d.name} ({d.designation})</option>)}
                        </select>
                    </div>

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
