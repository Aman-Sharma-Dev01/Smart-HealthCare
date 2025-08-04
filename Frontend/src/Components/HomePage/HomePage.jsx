// src/components/HomePage/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import './HomePage.css';
import { useNavigate } from 'react-router';
 
 

// The hardcoded hospital data provided by you
const hospitalData = [
  {
    "name": "Asian Institute of Medical Sciences",
    "address": "Badkhal Flyover, Sector 21A, Faridabad, Haryana 121001",
    "location": { "coordinates": [77.3193, 28.3954] }
  },
  {
    "name": "Metro Heart Institute",
    "address": "Sector 16A, Faridabad, Haryana 121002",
    "location": { "coordinates": [77.3178, 28.4089] }
  },
  {
    "name": "Fortis Escorts Hospital",
    "address": "Neelam Bata Rd, New Industrial Township, Faridabad, Haryana 121001",
    "location": { "coordinates": [77.3204, 28.3929] }
  },
  {
    "name": "Sarvodaya Hospital",
    "address": "YMCA Rd, Sector 8, Faridabad, Haryana 121006",
    "location": { "coordinates": [77.3160, 28.3840] }
  },
  {
    "name": "QRG Health City",
    "address": "Sector 16, Faridabad, Haryana 121002",
    "location": { "coordinates": [77.3180, 28.3910] }
  },
  {
    "name": "AIIMS, New Delhi",
    "address": "Ansari Nagar, New Delhi, Delhi 110029",
    "location": { "coordinates": [77.2089, 28.5663] }
  },
  {
    "name": "Safdarjung Hospital",
    "address": "Ansari Nagar, New Delhi, Delhi 110029",
    "location": { "coordinates": [77.2069, 28.5694] }
  },
  {
    "name": "Indraprastha Apollo Hospitals",
    "address": "Sarita Vihar, New Delhi, Delhi 110076",
    "location": { "coordinates": [77.2830, 28.5280] }
  },
  {
    "name": "Max Healthcare Hospital, Saket",
    "address": "Saket Institutional Area, Saket, New Delhi, Delhi 110017",
    "location": { "coordinates": [77.2219, 28.5273] }
  },
  {
    "name": "Medanta - The Medicity",
    "address": "CH Baktawar Singh Rd, Sector 38, Gurugram, Haryana 122001",
    "location": { "coordinates": [77.0427, 28.4357] }
  },
  {
    "name": "Artemis Hospital",
    "address": "Sector 51, Gurugram, Haryana 122001",
    "location": { "coordinates": [77.0697, 28.4353] }
  },
  {
    "name": "Fortis Memorial Research Institute",
    "address": "Sector 44, Gurugram, Haryana 122002",
    "location": { "coordinates": [77.0745, 28.4484] }
  },
  {
    "name": "Kailash Hospital",
    "address": "H-33, H Block, Sector 27, Noida, Uttar Pradesh 201301",
    "location": { "coordinates": [77.3250, 28.5729] }
  },
  {
    "name": "Fortis Hospital, Noida",
    "address": "B-22, Sector 62, Gautam Buddh Nagar, Noida, Uttar Pradesh 201301",
    "location": { "coordinates": [77.3540, 28.5910] }
  },
  {
    "name": "Jaypee Hospital",
    "address": "Sector 128, Noida, Uttar Pradesh 201304",
    "location": { "coordinates": [77.3718, 28.5298] }
  }
];


// CORRECTED: Accessing the environment variable using Vite's syntax
const API_KEY = import.meta.env.VITE_MAP_API;

const LIBRARIES = ['places'];
const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '500px',
  borderRadius: '12px',
  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.1)',
};
const DEFAULT_CENTER = { lat: 28.6139, lng: 77.2090 };

const Header = () => {
  //Hooks
  const navigate = useNavigate();

  const NavigatetoLogin = () => {
  navigate('/login-register');
}

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
      <button onClick={NavigatetoLogin} className="cta-button login-button">Login / Sign Up</button>
    </header> 
  );
}

const HeroSection = () => (
<section id="home" className="hero-section">
    <div className="hero-content">
    <h1>Your Health, Our Priority</h1>
    <p>Providing compassionate and comprehensive healthcare for you and your family. Access services, book appointments, and find care near you.</p>
    <button className="cta-button primary-cta">Book an Appointment</button>
    </div>
</section>
);

const ServiceCard = ({ icon, title, description }) => (
    <div className="service-card">
      <div className="service-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );

const ServicesSection = () => (
<section id="services" className="services-section">
    <h2>Our Core Services</h2>
    <div className="services-grid">
    <ServiceCard icon="📅" title="Book Appointments" description="Easily schedule visits with our specialized doctors online." />
    <ServiceCard icon="📄" title="View Medical Records" description="Access your health records and lab results securely anytime." />
    <ServiceCard icon="🚑" title="Emergency Services" description="24/7 emergency care for urgent medical needs." />
    <ServiceCard icon="📊" title="Live Queue Status" description="Check the real-time status of your appointment queue from home." />
    </div>
</section>
);

const MapSection = ({ hospitals }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: API_KEY,
    libraries: LIBRARIES,
  });

  const [currentPosition, setCurrentPosition] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setCurrentPosition({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => {
          setError('Geolocation permission denied. Centering map on default location.');
          setCurrentPosition(DEFAULT_CENTER);
        }
      );
    } else {
      setError('Browser does not support geolocation. Centering map on default location.');
      setCurrentPosition(DEFAULT_CENTER);
    }
  }, []);

  const handleMarkerClick = (hospital) => {
    setSelectedHospital(hospital);
  };

  const renderMap = () => (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={currentPosition || DEFAULT_CENTER}
      zoom={11}
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
      
      {hospitals.map((hospital, index) => (
        <Marker
          key={`${hospital.name}-${index}`}
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
            <div className="footer-contact">
                <h4>Contact Info</h4>
                <p>123 Health St, Wellness City, 110001</p>
                <p>Email: contact@medicareplus.com</p>
                <p>Phone: (123) 456-7890</p>
            </div>
        </div>
        <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} MediCare+. All Rights Reserved.</p>
        </div>
    </footer>
);

const HomePage = () => {
  return (
    <div className="homepage-container">
      <Header />
      <main>
        <HeroSection />
        <ServicesSection />
        <MapSection hospitals={hospitalData} />
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;
