import React, { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import './HomePage.css';
import { useNavigate } from 'react-router-dom';
import { BACKEND_API_URL } from '../../util';

// --- Configuration ---
const API_BASE_URL = BACKEND_API_URL;
const API_KEY = import.meta.env.VITE_MAP_API; // Using Vite's syntax for environment variables
const LIBRARIES = ['places'];
const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '500px',
  borderRadius: '12px',
  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.1)',
};
const DEFAULT_CENTER = { lat: 28.6139, lng: 77.2090 }; // Default to Delhi

// --- Header Component ---
const Header = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Check local storage for user data on component mount
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setIsLoggedIn(true);
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        setUser(null);
        navigate('/'); // Navigate to home after logout
    };

    return (
        <header className="main-header">
            <div className="logo">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                <span>MediCare+</span>
            </div>
            <nav className="main-nav">
                <a href="#home">Home</a>
                <a href="#services">Services</a>
                <a href="#find-hospitals">Find Hospitals</a>
                <a href="#contact">Contact</a>
            </nav>
            <div className="header-actions">
                {isLoggedIn ? (
                    <>
                        <button onClick={() => navigate('/userprofile')} className="profile-button">
                            <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} alt="avatar" className="profile-avatar"/>
                            <span>{user.name}</span>
                        </button>
                        <button onClick={handleLogout} className="cta-button logout-button">Logout</button>
                    </>
                ) : (
                    <button onClick={() => navigate('/login-register')} className="cta-button login-button">Login / Sign Up</button>
                )}
            </div>
        </header> 
    );
}

// --- Hero Section Component ---
const HeroSection = () => {
  const navigate = useNavigate();
  return (
    <section id="home" className="hero-section">
        <div className="hero-content">
            <h1>Your Health, Our Priority</h1>
            <p>Providing compassionate and comprehensive healthcare for you and your family. Access services, book appointments, and find care near you.</p>
            <button onClick={() => navigate('/appointment-booking')}
            className="cta-button primary-cta">Book an Appointment</button>
        </div>
    </section>
);
}
// UPDATED: ServiceCard now accepts onClick
const ServiceCard = ({ icon, title, description, onClick }) => (
  <div className="service-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
    <div className="service-icon">{icon}</div>
    <h3>{title}</h3>
    <p>{description}</p>
  </div>
);

// UPDATED: Navigate to /vault from Medical Records card
const ServicesSection = () => {
  const navigate = useNavigate();

  return (
    <section id="services" className="services-section">
      <h2>Our Core Services</h2>
      <div className="services-grid">
        <ServiceCard icon="📅" title="Book Appointments" description="Easily schedule visits with our specialized doctors online." onClick={() => navigate('/appointment-booking')} />
        <ServiceCard icon="📄" title="View Medical Records" description="Access your health records and lab results securely anytime." onClick={() => navigate('/vault')} />
        <ServiceCard icon="🚑" title="Emergency Services" description="24/7 emergency care for urgent medical needs." />
        <ServiceCard icon="📊" title="Live Queue Status" description="Check the real-time status of your appointment queue from home." />
      </div>
    </section>
  );
};
// --- Map Section Component ---
const MapSection = () => {
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: API_KEY,
        libraries: LIBRARIES,
    });

    const [hospitals, setHospitals] = useState([]);
    const [currentPosition, setCurrentPosition] = useState(null);
    const [selectedHospital, setSelectedHospital] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHospitals = async (lat, lng) => {
            try {
                const response = await fetch(`${API_BASE_URL}/hospitals/nearby?lat=${lat}&lng=${lng}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch hospitals from the server.');
                }
                const data = await response.json();
                setHospitals(data);
            } catch (err) {
                setError(err.message);
            }
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
                    setCurrentPosition(pos);
                    fetchHospitals(pos.lat, pos.lng);
                },
                () => {
                    setError('Geolocation permission denied. Showing hospitals near default location.');
                    setCurrentPosition(DEFAULT_CENTER);
                    fetchHospitals(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
                }
            );
        } else {
            setError('Browser does not support geolocation. Showing hospitals near default location.');
            setCurrentPosition(DEFAULT_CENTER);
            fetchHospitals(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
        }
    }, []);

    const handleMarkerClick = (hospital) => {
        setSelectedHospital(hospital);
    };

    const renderMap = () => (
        <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={currentPosition || DEFAULT_CENTER}
            zoom={12}
            options={{ disableDefaultUI: true, zoomControl: true }}
        >
            {currentPosition && (
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
            )}
            
            {hospitals.map((hospital) => (
                <Marker
                    key={hospital._id}
                    position={{ 
                        lat: hospital.location.coordinates[1],
                        lng: hospital.location.coordinates[0]
                    }}
                    onClick={() => handleMarkerClick(hospital)}
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
                    <div className="info-window">
                        <h4>{selectedHospital.name}</h4>
                        <p>{selectedHospital.address}</p>
                    </div>
                </InfoWindow>
            )}
        </GoogleMap>
    );

    if (loadError) return <div className="map-feedback">Error loading maps. Please check your API key.</div>;
    if (!isLoaded) return <div className="map-feedback">Loading Maps...</div>;

    return (
        <section id="find-hospitals" className="map-section">
            <h2>Find a Hospital Near You</h2>
            {error && <p className="map-feedback error">{error}</p>}
            <div className="map-container">{renderMap()}</div>
        </section>
    );
};

// --- Footer Component ---
const Footer = () => (
    <footer id="contact" className="main-footer">
        <div className="footer-content">
            <div className="footer-about">
                <h3>MediCare+</h3>
                <p>Committed to providing the best healthcare services with compassion and expertise.</p>
            </div>
            <div className="footer-links">
                <h4>Quick Links</h4>
                <ul>
                    <li><a href="#home">Home</a></li>
                    <li><a href="#services">Services</a></li>
                    <li><a href="#find-hospitals">Find a Doctor</a></li>
                    <li><a href="#contact">Contact Us</a></li>
                </ul>
            </div>
            
        </div>
        <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} MediCare+. All Rights Reserved.</p>
        </div>
    </footer>
);

// --- Main HomePage Component ---
const HomePage = () => {
    return (
        <div className="homepage-container">
            {/* Add styles for new buttons */}
            <style>{`
                .header-actions { display: flex; align-items: center; gap: 1rem; }
                .profile-button { display: flex; align-items: center; gap: 0.5rem; background: #eaf0f7; border: 1px solid #d9e2f1; padding: 8px 12px; border-radius: 20px; cursor: pointer; font-weight: 500;}
                .profile-avatar { width: 24px; height: 24px; border-radius: 50%; }
                .logout-button { background-color: #f44336; border-color: #f44336; }
            `}</style>
            <Header />
            <main>
                <HeroSection />
                <ServicesSection />
                <MapSection />
            </main>
            <Footer />
        </div>
    );
};

export default HomePage;
