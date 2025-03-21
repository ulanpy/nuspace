import React from 'react';

// Events Icon
export const EventsIcon = () => (
  <div className="relative w-full h-full flex items-center justify-center text-gray-900 bg-gradient-to-r from-teal-200 to-lime-200 hover:bg-gradient-to-l hover:from-teal-200 hover:to-lime-200 focus:ring-4 focus:outline-none focus:ring-lime-200 dark:focus:ring-teal-700">
    <span class="relative px-5 py-2.5 rounded-md">Events</span>
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
