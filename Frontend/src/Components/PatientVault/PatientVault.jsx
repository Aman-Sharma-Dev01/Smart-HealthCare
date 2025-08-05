import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './PatientVault.css';
import { BACKEND_API_URL } from '../../util';

const PatientVault = () => {
    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const API_BASE_URL = BACKEND_API_URL;

    useEffect(() => {
        const loggedInUser = JSON.parse(localStorage.getItem('user'));

        if (!token || !loggedInUser) {
            navigate('/login'); // Redirect if not authenticated
            return;
        }

        // --- NEW: Redirect if the user is not a patient ---
        if (loggedInUser.role !== 'patient') {
            navigate('/'); // Redirect to homepage for non-patients
            return;
        }

        const fetchRecords = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/records/my-records`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch medical records.');
                }
                const data = await response.json();
                setRecords(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRecords();
    }, [token, navigate]);

    const getIconForRecordType = (type) => {
        switch (type.toLowerCase()) {
            case 'prescription': return 'fas fa-file-prescription';
            case 'lab test': return 'fas fa-vial';
            case 'x-ray': return 'fas fa-x-ray';
            case 'scan report': return 'fas fa-scanner-image';
            default: return 'fas fa-file-medical';
        }
    };

    const filteredRecords = useMemo(() =>
        records.filter(record =>
            record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.recordType.toLowerCase().includes(searchTerm.toLowerCase())
        ), [records, searchTerm]);

    if (isLoading) return <div className="vault-loading">Loading Medical Vault...</div>;
    if (error) return <div className="vault-error">{error}</div>;

    return (
        <div className="vault-wrapper">
            <div className="vault-header">
                <h1>🔐 Patient Medical Vault</h1>
                <p>A secure and centralized location for all your medical documents.</p>
            </div>

            <div className="vault-controls">
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search records by title or type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="records-grid">
                {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                        <div key={record._id} className="record-card">
                            <div className="record-icon">
                                <i className={getIconForRecordType(record.recordType)}></i>
                            </div>
                            <div className="record-info">
                                <h3 className="record-title">{record.title}</h3>
                                <p className="record-type">{record.recordType}</p>
                                <p className="record-date">
                                    Uploaded on: {new Date(record.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            <a href={record.filePath} target="_blank" rel="noopener noreferrer" className="view-btn">
                                View Document
                            </a>
                        </div>
                    ))
                ) : (
                    <p className="no-records">No medical records found.</p>
                )}
            </div>
        </div>
    );
};

export default PatientVault;
