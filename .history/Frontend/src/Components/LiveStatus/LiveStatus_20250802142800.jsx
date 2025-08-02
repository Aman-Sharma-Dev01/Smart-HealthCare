// src/components/LiveStatus/LiveStatus.jsx
import React from 'react';
import './LiveStatus.css';

const LiveStatus = ({ currentlyServing, yourNumber, estimatedWaitTime, doctorName }) => {
  return (
    <div className="live-status-card">
      <div className="status-item now-serving">
        <span className="status-label">Now Serving</span>
        <span className="status-number">{currentlyServing}</span>
      </div>
      <div className="status-item your-number">
        <span className="status-label">Your Number</span>
        <span className="status-number">{yourNumber}</span>
      </div>
      <div className="info-footer">
        <p>
          Estimated Wait: <strong>{estimatedWaitTime}</strong>
        </p>
        <p>
          Doctor: <strong>{doctorName}</strong>
        </p>
      </div>
    </div>
  );
};

export default LiveStatus;