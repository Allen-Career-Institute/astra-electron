import React from 'react';
import './Header.css';

interface HeaderProps {
  environment: string;
}

const Header: React.FC<HeaderProps> = ({ environment }) => {
  return (
    <div className='header'>
      <h1>Allen UI Console</h1>
      <div className='header-info'>
        <div className='env-badge'>
          {environment ? environment.toUpperCase() : 'Loading...'}
        </div>
      </div>
    </div>
  );
};

export default Header;
