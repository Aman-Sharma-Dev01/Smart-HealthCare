import React, { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import "./PatientVault.css";

const PatientVault = () => {
  const [records, setRecords] = useState([]);
  const [patientId] = useState("patient123"); // Simulated Patient ID

  useEffect(() => {
    // Simulate fetching medical records
    const dummyRecords = [
      { date: "2025-06-10", type: "Blood Test", status: "Available" },
      { date: "2025-06-25", type: "MRI Scan", status: "Available" },
      { date: "2025-07-15", type: "Prescription - Fever", status: "Available" },
    ];
    setRecords(dummyRecords);
  }, []);

  return (
    <div className="vault-container">
      <h2>🔐 Patient Medical Vault</h2>

      <div className="qr-section">
        <h3>Your Unique QR Code</h3>
       <QRCode value={`https://yourserver.com/patient/${patientId}`} />

        <p className="note">
          Doctors can scan this QR code to access your verified medical records instantly.
        </p>
      </div>

      <div className="record-section">
        <h3>📋 Medical Record History</h3>
        <table className="record-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => (
              <tr key={index}>
                <td>{record.date}</td>
                <td>{record.type}</td>
                <td>{record.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PatientVault;
