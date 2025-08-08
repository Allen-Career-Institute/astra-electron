import React from 'react';
import './StatusBar.css';

interface StatusBarProps {
  isRecording: boolean;
  statusText: string;
}

const StatusBar: React.FC<StatusBarProps> = ({ isRecording, statusText }) => {
  return (
    <div className='status-bar'>
      <div className={`recording-indicator ${isRecording ? '' : 'hidden'}`}>
        <div className='recording-dot'></div>
        <span>Recording...</span>
      </div>
      <div className='status-text'>{statusText}</div>
    </div>
  );
};

export default StatusBar;
