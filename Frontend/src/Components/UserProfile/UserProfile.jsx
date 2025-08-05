import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './UserProfile.css';

// A simple Toast component for notifications
const Toast = ({ message, type, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 3000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return <div className={`toast toast-${type}`}>{message}</div>;
};

const UserProfile = () => {
    const [user, setUser] = useState(null);
    const [appointment, setAppointment] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    // State for the upload form
    const [fileToUpload, setFileToUpload] = useState(null);
    const [documentTitle, setDocumentTitle] = useState('');
    const [documentType, setDocumentType] = useState('Prescription'); // Default value
    const [isUploading, setIsUploading] = useState(false);

    const [toast, setToast] = useState({ show: false, message: '', type: '' });

    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const API_BASE_URL = 'http://localhost:5000/api';

    useEffect(() => {
        const loggedInUser = JSON.parse(localStorage.getItem('user'));

        if (!token || !loggedInUser) {
            navigate('/login'); // Redirect if not authenticated
            return;
        }
        setUser(loggedInUser);

        const fetchAppointmentData = async () => {
            try {
                // This is a placeholder for a real API endpoint to get the user's latest appointment
                // For now, we simulate a fetch. Replace with your actual API call.
                // const response = await fetch(`${API_BASE_URL}/appointments/my-latest`, { headers: { 'Authorization': `Bearer ${token}` }});
                // if (!response.ok) throw new Error('Could not fetch appointment.');
                // const data = await response.json();
                // setAppointment(data);

                // --- SIMULATED DATA (Remove when you have the real API) ---
                setAppointment({
                    status: 'Scheduled',
                    hospitalName: "AIIMS, New Delhi",
                    doctorName: "Dr. Rohan Mehra",
                    date: "2025-08-10",
                    appointmentNumber: 12 // Added appointment number
                });
                // --- END SIMULATED DATA ---

            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAppointmentData();

    }, [token, navigate]);

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFileToUpload(e.target.files[0]);
        }
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
            // Reset form
            setFileToUpload(null);
            setDocumentTitle('');
            setDocumentType('Prescription');
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
            
            {/* Profile Info */}
            <div className="card profile-section">
                <div className="profile-header">
                    <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || 'User'}`} alt="User Avatar" className="avatar" />
                    <div>
                        <h2>{user?.name}</h2>
                        <p>ID: {user?._id.slice(-6).toUpperCase()}</p>
                        <p>Email: {user?.email}</p>
                        <p>Phone: {user?.phone}</p>
                    </div>
                </div>
            </div>

            <div className="grid">
                {/* Upload Section */}
                <div className="card upload-section">
                    <h3>📤 Upload Medical Document</h3>
                    <form onSubmit={handleDocumentUpload}>
                        <div className="form-group">
                            <input type="text" placeholder="Document Title (e.g., Blood Report)" value={documentTitle} onChange={(e) => setDocumentTitle(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                                <option>Prescription</option>
                        <option>Lab Test</option>
                        <option>X-Ray</option>
                        <option>ECG</option>
                        <option>MRI</option>
                        <option>CT Scan</option>
                        <option>Ultrasound</option>
                        <option>Discharge Summary</option>
                        <option>Pathology Report</option>
                        <option>Vaccination Record</option>
                        <option>Other</option>
                            </select>
                        </div>
                        <label htmlFor="file-upload" className="upload-box">
                            <p className='upload-label'>{fileToUpload ? `Selected: ${fileToUpload.name}` : 'Click to select a file'}</p>
                            <input type="file" id="file-upload" onChange={handleFileSelect} hidden />
                        </label>
                        <button type="submit" className="upload-btn" disabled={isUploading}>
                            {isUploading ? 'Uploading...' : 'Upload Document'}
                        </button>
                    </form>
                </div>

                {/* Appointment Section */}
                <div className="card appointment-section">
                    <h3>📅 Your Next Appointment</h3>
                    {appointment ? (
                        <div className="appointment-details">
                            <span className={`badge ${appointment.status?.toLowerCase()}`}>{appointment.status}</span>
                            <p><strong>#️⃣ Appointment No:</strong> {appointment.appointmentNumber}</p>
                            <p><strong>🏥 Hospital:</strong> {appointment.hospitalName}</p>
                            <p><strong>👨‍⚕️ Doctor:</strong> {appointment.doctorName}</p>
                            <p><strong>📆 Date:</strong> {new Date(appointment.date).toLocaleDateString()}</p>
                        </div>
                    ) : (
                        <p className="no-appointment">No upcoming appointments scheduled.</p>
                    )}
                </div>

                {/* Vault Shortcut */}
                <div className="card shortcut-section" onClick={() => navigate('/vault')}>
                    <h3>🔐 Patient Vault</h3>
                    <p>Securely access all your uploaded records</p>
                </div>

                {/* Summarizer Shortcut */}
                <div className="card shortcut-section" onClick={() => navigate('/summarizer')}>
                    <h3>📝 Report Summarizer</h3>
                    <p>Summarize your medical reports using AI</p>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
