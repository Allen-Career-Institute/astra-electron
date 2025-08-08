import React from 'react';
import './Header.css';

interface HeaderProps {
  environment: string;
  onOpenSecondWindow: () => void;
  onOpenThirdWindow: () => void;
}

const Header: React.FC<HeaderProps> = ({
  environment,
  onOpenSecondWindow,
  onOpenThirdWindow,
}) => {
  return (
    <div className='header'>
      <h1>Allen UI Console</h1>
      <div className='header-info'>
        <div className='env-badge'>
          {environment ? environment.toUpperCase() : 'Loading...'}
        </div>
        <div className='controls'>
          <button className='btn' onClick={onOpenSecondWindow}>
            Open Second Window
          </button>
          <button className='btn' onClick={onOpenThirdWindow}>
            Open Third Window
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;
