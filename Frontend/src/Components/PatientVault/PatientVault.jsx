import React, { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import "./PatientVault.css";

const PatientVault = () => {
  const [records, setRecords] = useState([]);
  const [file, setFile] = useState(null);
  const [type, setType] = useState("");
  const [date, setDate] = useState("");
  const [qrLink, setQrLink] = useState("");
  const [patientId] = useState("patient123");

  useEffect(() => {
    // 🔧 Using dummy data instead of backend
    const dummyRecords = [
      { date: "2025-06-10", type: "Blood Test", status: "Available" },
      { date: "2025-06-25", type: "MRI Scan", status: "Available" },
      { date: "2025-07-15", type: "Prescription - Fever", status: "Available" },
    ];
    setRecords(dummyRecords);
  }, [qrLink]);

  const handleUpload = () => {
    if (!file || !type || !date) {
      alert("Please fill in all fields.");
      return;
    }

    // Simulate upload and QR generation
    const newRecord = { date, type, status: "Available" };
    setRecords((prev) => [...prev, newRecord]);

    const simulatedQrLink = `https://yourdomain.com/api/records/view/${Date.now()}`;
    setQrLink(simulatedQrLink);
    alert("Simulated upload successful!");
  };

  return (
    <div className="vault-container">
      <h2>🔐 Patient Medical Vault</h2>

      <div className="upload-form">
        <h3>📤 Upload New Record (Simulated)</h3>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <input
          type="text"
          placeholder="Record Type (e.g. Blood Test)"
          value={type}
          onChange={(e) => setType(e.target.value)}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button onClick={handleUpload}>Upload & Generate QR</button>
      </div>

      {qrLink && (
        <div className="qr-section">
          <h3>Your Record QR</h3>
          <QRCode value={qrLink} />
          <p className="note">Share this QR with doctors for instant access.</p>
        </div>
      )}

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
