import React from 'react';

// Events Icon
export const EventsIcon = () => (
  <div className="relative w-full h-full flex items-center justify-center">
    <div
      className="w-8 h-8 bg-red-600 absolute top-2"
      style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }}
    ></div>
    <div className="w-6 h-6 bg-blue-700 absolute bottom-1 rounded-sm"></div>
  </div>
);

// Buy & Sell Icon
export const BuySellIcon = () => (
  <div className="w-full h-full flex items-center justify-center">
    <span className="text-3xl font-bold text-green-600">$</span>
  </div>
);

// Dorm Eats Icon
export const DormEatsIcon = () => (
  <div className="w-full h-full flex items-center justify-center">
    <span className="text-2xl font-medium text-blue-700">ρψ</span>
  </div>
);

// Find My Crush Icon
export const CrushIcon = () => (
  <div className="relative w-full h-full flex items-center justify-center">
    <div className="w-8 h-8 bg-red-600 absolute transform rotate-45 rounded-md"></div>
    <div className="w-4 h-6 border-r-2 border-blue-700 absolute transform rotate-45 bottom-2 right-4"></div>
  </div>
);

// NU Guide Icon
export const GuideIcon = () => (
  <div className="w-full h-full flex items-center justify-center">
    <span className="text-3xl font-bold">?</span>
  </div>
);
