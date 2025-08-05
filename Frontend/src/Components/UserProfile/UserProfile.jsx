import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './UserProfile.css';
import { BACKEND_API_URL } from '../../util';

// A simple Toast component for notifications
const Toast = ({ message, type, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 3000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return <div className={`toast toast-${type}`}>{message}</div>;
};

// --- Sub-components for different roles moved outside the main component ---

const PatientDashboard = ({ 
    documentTitle, setDocumentTitle, documentType, setDocumentType, 
    fileToUpload, setFileToUpload, isUploading, handleDocumentUpload,
    handleFileSelect, handleDocumentTitleChange, appointment, navigate 
}) => (
    <div className="grid">
        <div className="card upload-section">
            <h3>📤 Upload Medical Document</h3>
            <form onSubmit={handleDocumentUpload}>
                <div className="form-group">
                    <input 
                        type="text" 
                        placeholder="Document Title" 
                        value={documentTitle} 
                        onChange={handleDocumentTitleChange} 
                        required 
                    />
                </div>
                <div className="form-group">
                    <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                        <option>Prescription</option>
                        <option>Lab Test</option>
                        <option>X-Ray</option>
                        <option>Other</option>
                    </select>
                </div>
                <label htmlFor="file-upload" className="upload-box">
                    <p>{fileToUpload ? `Selected: ${fileToUpload.name}` : 'Click to select a file'}</p>
                    <input type="file" id="file-upload" onChange={handleFileSelect} hidden />
                </label>
                <button type="submit" className="upload-btn" disabled={isUploading}>{isUploading ? 'Uploading...' : 'Upload Document'}</button>
            </form>
        </div>
        <div className="card appointment-section">
            <h3>📅 Your Next Appointment</h3>
            {appointment ? (
                <div className="appointment-details">
                    <span className={`badge ${appointment.status?.toLowerCase()}`}>{appointment.status}</span>
                    <p><strong>#️⃣ Appointment No:</strong> {appointment.appointmentNumber}</p>
                    <p><strong>🏥 Hospital:</strong> {appointment.hospitalId?.name}</p>
                    <p><strong>👨‍⚕️ Doctor:</strong> {appointment.doctorId?.name}</p>
                    <p><strong>📆 Date:</strong> {new Date(appointment.createdAt).toLocaleDateString()}</p>
                </div>
            ) : <p className="no-appointment">No upcoming appointments scheduled.</p>}
        </div>
        <div className="card shortcut-section" onClick={() => navigate('/vault')}><h3>🔐 Patient Vault</h3><p>Securely access all your uploaded records</p></div>
        <div className="card shortcut-section" onClick={() => navigate('/summarizer')}><h3>📝 Report Summarizer</h3><p>Summarize your medical reports using AI</p></div>
    </div>
);

const StaffDashboardLink = ({ role, navigate }) => {
    const details = {
        doctor: {
            title: "Doctor Dashboard",
            description: "Manage your appointments, view patient queues, and update schedules.",
            icon: "fas fa-user-md",
            path: "/doctor-dashboard"
        },
        helpdesk: {
            title: "Helpdesk Dashboard",
            description: "Manage hospital doctors, book offline appointments, and handle emergency alerts.",
            icon: "fas fa-headset",
            path: "/helpdesk-dashboard"
        }
    };
    const roleDetails = details[role];

    return (
        <div className="dashboard-link-card" onClick={() => navigate(roleDetails.path)}>
            <div className="dashboard-link-icon">
                <i className={roleDetails.icon}></i>
            </div>
            <div className="dashboard-link-info">
                <h3>{roleDetails.title}</h3>
                <p>{roleDetails.description}</p>
            </div>
            <div className="dashboard-link-arrow">
                <i className="fas fa-arrow-right"></i>
            </div>
        </div>
    );
};

// --- Main component ---

const UserProfile = () => {
    const [user, setUser] = useState(null);
    const [appointment, setAppointment] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    // State for the upload form
    const [fileToUpload, setFileToUpload] = useState(null);
    const [documentTitle, setDocumentTitle] = useState('');
    const [documentType, setDocumentType] = useState('Prescription');
    const [isUploading, setIsUploading] = useState(false);

    const [toast, setToast] = useState({ show: false, message: '', type: '' });

    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const API_BASE_URL = BACKEND_API_URL;

    useEffect(() => {
        const loggedInUser = JSON.parse(localStorage.getItem('user'));

        if (!token || !loggedInUser) {
            navigate('/login-register');
            return;
        }
        setUser(loggedInUser);

        if (loggedInUser.role === 'patient') {
            const fetchAppointmentData = async () => {
                try {
                    const response = await fetch(`${API_BASE_URL}/appointments/my-latest`, { 
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!response.ok) console.error('Could not fetch appointment.');
                    const data = await response.json();
                    setAppointment(data);
                } catch (err) {
                    setError(err.message);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchAppointmentData();
        } else {
            setIsLoading(false);
        }
    }, [token, navigate, API_BASE_URL]); // Added API_BASE_URL to dependency array

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFileToUpload(e.target.files[0]);
        }
    };

    const handleDocumentTitleChange = (e) => {
        setDocumentTitle(e.target.value);
    };

    const handleDocumentUpload = async (e) => {
        e.preventDefault();
        if (!fileToUpload || !documentTitle || !documentType) {
            showToast('Please provide a title, type, and select a file.', 'error');
            return;
        }
        setIsUploading(true);
        const formData = new FormData();
        formData.append('title', documentTitle);
        formData.append('recordType', documentType);
        formData.append('record', fileToUpload);

        try {
            const response = await fetch(`${API_BASE_URL}/records/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Upload failed');
            showToast('Document uploaded successfully!');
            setFileToUpload(null);
            setDocumentTitle('');
        } catch (err) {
            showToast(`Error: ${err.message}`, 'error');
        } finally {
            setIsUploading(false);
        }
    };

    if (isLoading) return <div className="loading-state">Loading Profile...</div>;
    if (error) return <div className="error-state">{error}</div>;

    return (
        <div className="dashboard">
            {toast.show && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast({ show: false, message: '', type: '' })} />}
            
            <div className="card profile-section">
                <div className="profile-header">
                    <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || 'User'}`} alt="User Avatar" className="avatar" />
                    <div>
                        <h2>{user?.name}</h2>
                        <p>ID: {user?._id.slice(-6).toUpperCase()}</p>
                        <p>Email: {user?.email}</p>
                        <p>Phone: {user?.phone}</p>
                        {(user?.role === 'doctor' || user?.role === 'helpdesk') && (
                            <p className="hospital-info"><strong>🏥 Hospital:</strong> {user.hospitalName}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Conditionally render the dashboard based on user role */}
            {user?.role === 'patient' && (
                <PatientDashboard 
                    documentTitle={documentTitle}
                    setDocumentTitle={setDocumentTitle}
                    documentType={documentType}
                    setDocumentType={setDocumentType}
                    fileToUpload={fileToUpload}
                    setFileToUpload={setFileToUpload}
                    isUploading={isUploading}
                    handleDocumentUpload={handleDocumentUpload}
                    handleFileSelect={handleFileSelect}
                    handleDocumentTitleChange={handleDocumentTitleChange}
                    appointment={appointment}
                    navigate={navigate}
                />
            )}
            {user?.role === 'doctor' && <StaffDashboardLink role="doctor" navigate={navigate} />}
            {user?.role === 'helpdesk' && <StaffDashboardLink role="helpdesk" navigate={navigate} />}
        </div>
    );
};

export default UserProfile;