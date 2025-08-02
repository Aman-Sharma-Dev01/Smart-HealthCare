import React, { useState } from "react";
import "./PrescriptionUploader.css";

const UploadPrescription = () => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    if (selectedFile) {
      const fileUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(fileUrl);
    }
  };

  const handleUpload = () => {
    if (!file) {
      alert("Please select a prescription to upload.");
      return;
    }
    // Here you can add API call to upload the file to your server or cloud
    console.log("Uploading:", file);
    alert("Prescription uploaded successfully!");
  };

  return (
    <div className="upload-container">
      <h2>Upload Your Prescription</h2>

      <div className="upload-box">
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} />
        {previewUrl && (
          <div className="preview-box">
            {file.type === "application/pdf" ? (
              <iframe src={previewUrl} title="PDF Preview"></iframe>
            ) : (
              <img src={previewUrl} alt="Prescription Preview" />
            )}
          </div>
        )}
        <button className="upload-btn" onClick={handleUpload}>Upload</button>
      </div>
    </div>
  );
};

export default UploadPrescription;
