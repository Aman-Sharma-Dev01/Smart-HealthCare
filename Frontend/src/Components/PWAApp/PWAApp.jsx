import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import './PWAApp.css';
import { BACKEND_API_URL } from '../../util';
import EmergencyWidget from '../EmergencyWidget/EmergencyWidget';

const API_KEY = import.meta.env.VITE_MAP_API;
const LIBRARIES = ['places'];
const API_BASE_URL = BACKEND_API_URL;

const PWAApp = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('home');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [latestAppointment, setLatestAppointment] = useState(null);
    const [appointmentHistory, setAppointmentHistory] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [currentPosition, setCurrentPosition] = useState(null);
    const [selectedHospital, setSelectedHospital] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const token = localStorage.getItem('token');

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: API_KEY,
        libraries: LIBRARIES,
    });

    // Check authentication
    useEffect(() => {
        const loggedInUser = JSON.parse(localStorage.getItem('user'));
        if (loggedInUser) {
            setUser(loggedInUser);
        }
    }, []);

    // Fetch latest appointment
    const fetchLatestAppointment = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE_URL}/appointments/my-latest`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setLatestAppointment(data);
            }
        } catch (error) {
            console.error("Failed to fetch latest appointment:", error);
        }
    }, [token]);

    // Fetch appointment history
    const fetchAppointmentHistory = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE_URL}/appointments/my-history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAppointmentHistory(data);
            }
        } catch (error) {
            console.error("Failed to fetch appointment history:", error);
        }
    }, [token]);

    // Fetch nearby hospitals
    const fetchNearbyHospitals = useCallback(async (lat, lng) => {
        try {
            const response = await fetch(`${API_BASE_URL}/hospitals/nearby?lat=${lat}&lng=${lng}`);
            if (response.ok) {
                const data = await response.json();
                setHospitals(data);
            }
        } catch (err) {
            console.error("Failed to fetch hospitals:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Get current location and fetch data
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
                    setCurrentPosition(pos);
                    fetchNearbyHospitals(pos.lat, pos.lng);
                },
                () => {
                    const defaultPos = { lat: 28.6139, lng: 77.2090 };
                    setCurrentPosition(defaultPos);
                    fetchNearbyHospitals(defaultPos.lat, defaultPos.lng);
                }
            );
        }
        fetchLatestAppointment();
        fetchAppointmentHistory();
    }, [fetchNearbyHospitals, fetchLatestAppointment, fetchAppointmentHistory]);

    // Listen for appointment booked event
    useEffect(() => {
        const handleAppointmentBooked = () => {
            fetchLatestAppointment();
            fetchAppointmentHistory();
        };
        window.addEventListener('appointmentBooked', handleAppointmentBooked);
        return () => window.removeEventListener('appointmentBooked', handleAppointmentBooked);
    }, [fetchLatestAppointment, fetchAppointmentHistory]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
        setIsMenuOpen(false);
        navigate('/');
    };

    const handleSOS = () => {
        window.dispatchEvent(new CustomEvent('openEmergencyWidget'));
    };

    const handleQueueClick = () => {
        window.dispatchEvent(new CustomEvent('openQueueWidget'));
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'completed': return '#28a745';
            case 'scheduled': return '#007bff';
            case 'cancelled': return '#dc3545';
            default: return '#6c757d';
        }
    };

    // Header Component
    const Header = () => (
        <header className="pwa-header">
            <div className="pwa-logo">
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#4a7dfc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                </svg>
                <span>Medicare+</span>
            </div>
            <button className="pwa-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4a7dfc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>

            {/* Side Menu */}
            <div className={`pwa-side-menu ${isMenuOpen ? 'open' : ''}`}>
                <div className="pwa-menu-header">
                    <span>Menu</span>
                    <button onClick={() => setIsMenuOpen(false)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div className="pwa-menu-content">
                    {user ? (
                        <>
                            <div className="pwa-user-info">
                                <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`} alt="avatar" />
                                <div>
                                    <h4>{user?.name}</h4>
                                    <p>{user?.email}</p>
                                </div>
                            </div>
                            <button onClick={() => { navigate('/userprofile'); setIsMenuOpen(false); }} className="pwa-menu-item">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                My Profile
                            </button>
                            <button onClick={() => { navigate('/vault'); setIsMenuOpen(false); }} className="pwa-menu-item">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                Medical Vault
                            </button>
                            <button onClick={handleLogout} className="pwa-menu-item logout">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                Logout
                            </button>
                        </>
                    ) : (
                        <button onClick={() => { navigate('/login-register'); setIsMenuOpen(false); }} className="pwa-menu-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
                            Login / Sign Up
                        </button>
                    )}
                </div>
            </div>
            <div className={`pwa-overlay ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(false)}></div>
        </header>
    );

    // Home Tab Content
    const HomeContent = () => {
        // Get doctor illustration based on gender
        const getDoctorIllustration = () => {
            const doctorGender = latestAppointment?.doctorId?.gender;
            if (doctorGender === 'female') {
                return '/doctor-illustration-female.jpeg';
            }
            return '/doctor-illustration-male.jpeg';
        };

        return (
        <div className="pwa-home-content">
            {/* Appointments Section */}
            <section className="pwa-section appointments-section">
                <h2 className="pwa-section-title">Appointments</h2>
                <div className="pwa-appointment-card">
                    {latestAppointment ? (
                        <>
                            <div className="appointment-main">
                                <div className="appointment-info">
                                    <div className="appointment-header">
                                        <span className="calendar-icon">🗓️</span>
                                        <h3>Dr. {latestAppointment.doctorId?.name} · {formatDate(latestAppointment.createdAt)}</h3>
                                    </div>
                                    <p className="doctor-specialty">Dr. {latestAppointment.doctorId?.name} ({latestAppointment.doctorId?.designation || 'General'})</p>
                                    <p className="hospital-name">
                                        <span className="location-icon">📍</span>
                                        {latestAppointment.hospitalId?.name || 'Hospital'}
                                    </p>
                                    <div className="appointment-actions">
                                        <button className="btn-reschedule" onClick={() => navigate('/appointment-booking')}>Reschedule</button>
                                        <button className="btn-details" onClick={handleQueueClick}>View Details</button>
                                    </div>
                                </div>
                                <div className="appointment-image">
                                    <img src={getDoctorIllustration()} alt="Doctor" />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="no-appointment">
                            <div className="no-appointment-illustration">
                                <img src="/doctor-illustration-male.jpeg" alt="Doctor" />
                            </div>
                            <p>No upcoming appointments</p>
                            <button className="btn-book" onClick={() => navigate('/appointment-booking')}>Book Now</button>
                        </div>
                    )}
                </div>
            </section>

            {/* Quick Actions */}
            <section className="pwa-quick-actions">
                <div className="quick-action-card" onClick={() => navigate('/appointment-booking')}>
                    <div className="action-icon book">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="M9 16l2 2 4-4"></path></svg>
                    </div>
                    <span>Book<br/>Appointment</span>
                </div>
                <div className="quick-action-card" onClick={() => navigate('/vault')}>
                    <div className="action-icon records">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                    </div>
                    <span>View<br/>Records</span>
                </div>
                <div className="quick-action-card" onClick={handleSOS}>
                    <div className="action-icon emergency">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
                    </div>
                    <span>Emergency<br/>Help</span>
                </div>
                <div className="quick-action-card" onClick={handleQueueClick}>
                    <div className="action-icon queue">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                    </div>
                    <span>Live<br/>Queue</span>
                </div>
            </section>

            {/* Doctor Info Banner */}
            {latestAppointment && (
                <section className="pwa-doctor-banner">
                    <div className="doctor-banner-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                    </div>
                    <div className="doctor-banner-info">
                        <span>Doctor Switch Doctor</span>
                    </div>
                    <div className="doctor-banner-rating">
                        <span>— 9.5 •</span>
                    </div>
                </section>
            )}

            {/* Nearby Hospitals Section */}
            <section className="pwa-section hospitals-section">
                <h2 className="pwa-section-title">Find Nearby Hospitals</h2>
                
                {/* Map */}
                {isLoaded && currentPosition && (
                    <div className="pwa-map-container">
                        <GoogleMap
                            mapContainerStyle={{ width: '100%', height: '200px', borderRadius: '12px' }}
                            center={currentPosition}
                            zoom={13}
                            options={{ disableDefaultUI: true, zoomControl: true }}
                        >
                            <Marker 
                                position={currentPosition}
                                icon={{
                                    path: window.google.maps.SymbolPath.CIRCLE,
                                    scale: 8,
                                    fillColor: "#4285F4",
                                    fillOpacity: 1,
                                    strokeWeight: 2,
                                    strokeColor: "white",
                                }}
                            />
                            {hospitals.map((hospital) => (
                                <Marker
                                    key={hospital._id}
                                    position={{ 
                                        lat: hospital.location.coordinates[1],
                                        lng: hospital.location.coordinates[0]
                                    }}
                                    onClick={() => setSelectedHospital(hospital)}
                                    icon={{
                                        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                                                <circle cx="12" cy="12" r="10" fill="#dc3545"/>
                                                <path d="M12 6v12M6 12h12" stroke="white" stroke-width="2"/>
                                            </svg>
                                        `),
                                        scaledSize: new window.google.maps.Size(32, 32),
                                    }}
                                />
                            ))}
                            {selectedHospital && (
                                <InfoWindow
                                    position={{ 
                                        lat: selectedHospital.location.coordinates[1], 
                                        lng: selectedHospital.location.coordinates[0] 
                                    }}
                                    onCloseClick={() => setSelectedHospital(null)}
                                >
                                    <div>
                                        <strong>{selectedHospital.name}</strong>
                                        <p>{selectedHospital.address}</p>
                                    </div>
                                </InfoWindow>
                            )}
                        </GoogleMap>
                    </div>
                )}

                {/* Hospital List */}
                <div className="pwa-hospital-list">
                    {hospitals.slice(0, 3).map((hospital) => (
                        <div key={hospital._id} className="pwa-hospital-card">
                            <div className="hospital-avatar">
                                <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${hospital.name}`} alt={hospital.name} />
                            </div>
                            <div className="hospital-info">
                                <h4>{hospital.name}</h4>
                                <div className="hospital-rating">
                                    <span className="stars">★★★★☆</span>
                                    <span className="rating-value">{(Math.random() * 2 + 3).toFixed(2)}</span>
                                </div>
                                <p className="hospital-hours">
                                    <span className="open-badge">Open until 6:27 PM</span>
                                    <span className="beds">{hospital.beds || '11'}AC</span>
                                </p>
                                <a href={`tel:${hospital.phone || '120 29603'}`} className="hospital-phone">
                                    📞 {hospital.phone || '120 29603'}
                                </a>
                            </div>
                            <div className="hospital-distance">
                                <span className="distance-badge">📍 {(Math.random() * 3 + 0.5).toFixed(1)} km</span>
                                <span className="hospital-id">{hospital.phone || '120 29603'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
    };

    // Appointment History Tab Content
    const AppointmentHistoryContent = () => (
        <div className="pwa-history-content">
            <h2 className="pwa-section-title">Appointment History</h2>
            {appointmentHistory.length > 0 ? (
                <div className="history-list">
                    {appointmentHistory.map((appt, index) => (
                        <div key={appt._id || index} className="history-card">
                            <div className="history-date">
                                <span className="date-day">{new Date(appt.createdAt).getDate()}</span>
                                <span className="date-month">{new Date(appt.createdAt).toLocaleDateString('en-US', { month: 'short' })}</span>
                            </div>
                            <div className="history-info">
                                <h4>Dr. {appt.doctorId?.name || 'Unknown'}</h4>
                                <p>{appt.hospitalId?.name || 'Hospital'}</p>
                                <p className="history-reason">{appt.reasonForVisit || 'General Checkup'}</p>
                            </div>
                            <div className="history-status" style={{ backgroundColor: getStatusColor(appt.status) }}>
                                {appt.status || 'Scheduled'}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="no-history">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <p>No appointment history yet</p>
                    <button onClick={() => { setActiveTab('home'); navigate('/appointment-booking'); }}>
                        Book Your First Appointment
                    </button>
                </div>
            )}
        </div>
    );

    // Records Tab Content
    const RecordsContent = () => {
        const [records, setRecords] = useState([]);
        const [loadingRecords, setLoadingRecords] = useState(true);

        useEffect(() => {
            const fetchRecords = async () => {
                if (!token) {
                    setLoadingRecords(false);
                    return;
                }
                try {
                    const response = await fetch(`${API_BASE_URL}/records/my-records`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        setRecords(data);
                    }
                } catch (err) {
                    console.error("Failed to fetch records:", err);
                } finally {
                    setLoadingRecords(false);
                }
            };
            fetchRecords();
        }, []);

        if (loadingRecords) {
            return <div className="pwa-loading">Loading records...</div>;
        }

        return (
            <div className="pwa-records-content">
                <h2 className="pwa-section-title">Medical Records</h2>
                {records.length > 0 ? (
                    <div className="records-list">
                        {records.map((record) => (
                            <div key={record._id} className="record-item">
                                <div className="record-icon">
                                    📄
                                </div>
                                <div className="record-info">
                                    <h4>{record.title}</h4>
                                    <p>{record.recordType}</p>
                                    <span className="record-date">{new Date(record.createdAt).toLocaleDateString()}</span>
                                </div>
                                <a href={record.filePath} target="_blank" rel="noopener noreferrer" className="view-record-btn">
                                    View
                                </a>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="no-records">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        <p>No medical records found</p>
                    </div>
                )}
            </div>
        );
    };

    // Bottom Navigation
    const BottomNav = () => (
        <>
            <nav className="pwa-bottom-nav">
                <button 
                    className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
                    onClick={() => setActiveTab('home')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                    <span>Home</span>
                </button>
                <button 
                    className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <span>Doctors</span>
                </button>
                <button 
                    className={`nav-item ${activeTab === 'records' ? 'active' : ''}`}
                    onClick={() => setActiveTab('records')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    <span>Records</span>
                </button>
                {/* Embedded SOS Button */}
                <div className="sos-nav-container">
                    <button className="sos-nav-button" onClick={handleSOS}>
                        <span>SOS</span>
                    </button>
                    <span className="sos-nav-label">Alerts</span>
                </div>
            </nav>
        </>
    );

    return (
        <div className="pwa-app">
            <EmergencyWidget />
            <Header />
            <main className="pwa-main">
                {activeTab === 'home' && <HomeContent />}
                {activeTab === 'history' && <AppointmentHistoryContent />}
                {activeTab === 'records' && <RecordsContent />}
            </main>
            <BottomNav />
        </div>
    );
};

export default PWAApp;
