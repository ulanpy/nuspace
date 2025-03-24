import React from 'react';
import { useNavigate } from 'react-router-dom';

function Feature({ name, url, icon }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(url);
  };

  return (
    <div
      className="flex flex-col items-center cursor-pointer"
      onClick={handleClick}
    >
      <div className="w-16 h-16 border-2 border-blue-700 flex items-center justify-center mb-1">
        {icon}
      </div>
      <div className="text-xs text-center">{name}</div>
    </div>
  );
}

export default Feature;
