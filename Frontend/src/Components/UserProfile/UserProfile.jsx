import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './UserProfile.css';

const UserProfile = () => {
  const [documents, setDocuments] = useState([]);
  const [appointment, setAppointment] = useState({
    status: true,
    hospitalName: "Asian Institute of Medical Sciences",
    date: "2025-08-10",
    time: "10:30 AM"
  });

  const navigate = useNavigate();

  const handleDocumentUpload = (e) => {
    const files = Array.from(e.target.files);
    setDocuments(prev => [...prev, ...files]);
  };

  const removeDoc = (index) => {
    const newDocs = [...documents];
    newDocs.splice(index, 1);
    setDocuments(newDocs);
  };

  return (
    <div className="dashboard">
      {/* Profile Info */}
      <div className="card profile-section">
        <div className="profile-header">
          <img
            src="https://via.placeholder.com/100"
            alt="User"
            className="avatar"
          />
          <div>
            <h2>Shivam Yadav</h2>
            <p>ID: SHY1025</p>
            <p>Email: shivam@example.com</p>
            <p>Phone: +91 9876543210</p>
            <button className="edit-btn">Edit Profile</button>
          </div>
        </div>
      </div>

      <div className="grid">
        {/* Upload Section */}
        <div className="card upload-section">
          <h3>📤 Upload Medical Documents</h3>
          <label htmlFor="file-upload" className="upload-box">
            <p>Click or drag files here to upload</p>
            <input
              type="file"
              id="file-upload"
              multiple
              onChange={handleDocumentUpload}
              hidden
            />
          </label>
          <ul className="doc-list">
            {documents.map((doc, idx) => (
              <li key={idx}>
                📄 {doc.name} ({(doc.size / 1024).toFixed(1)} KB)
                <button onClick={() => removeDoc(idx)} className="remove-btn">✖</button>
              </li>
            ))}
          </ul>
        </div>

        {/* Appointment Section */}
        <div className="card appointment-section">
          <h3>📅 Appointment Status</h3>
          {appointment.status ? (
            <div className="appointment-details">
              <span className="badge confirmed">Confirmed</span>
              <p><strong>🏥 Hospital:</strong> {appointment.hospitalName}</p>
              <p><strong>📆 Date:</strong> {appointment.date}</p>
              <p><strong>⏰ Time:</strong> {appointment.time}</p>
              <button className="reschedule-btn">Reschedule</button>
            </div>
          ) : (
            <p className="no-appointment">No appointments scheduled.</p>
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
