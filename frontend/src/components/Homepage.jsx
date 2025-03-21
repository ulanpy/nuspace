import React from 'react';
import Carousel from './Carousel.jsx';
import { BrowserRouter as Router } from 'react-router-dom';
import FeatureButton from './FeatureButton.jsx';
import Header from './Header.jsx';
import {
  EventsIcon,
  BuySellIcon,
  DormEatsIcon,
  CrushIcon,
  GuideIcon
} from './FeatureIcon.jsx';

const Homepage = () => {
  const featureButtons = [
    { id: 'events', name: 'Events', url: '/events', icon: <EventsIcon /> },
    { id: 'buy-sell', name: 'Купи & Продай', url: '/marketplace', icon: <BuySellIcon /> },
    { id: 'dorm-eats', name: 'Dorm Eats', url: '/food', icon: <DormEatsIcon /> },
    { id: 'find-crush', name: 'Find my crush', url: '/crush', icon: <CrushIcon /> },
    { id: 'guide', name: 'NU Гид', url: '/guide', icon: <GuideIcon /> }
  ];

  return (
    <Router>
      <div className="max-w-md m-auto font-sans bg-amber-50 min-h-screen flex flex-col">

        <Header />

        <div className="h-px bg-blue-700 mx-4 mb-5"></div>

        <div className="mx-4 border-2 border-blue-700 rounded p-4 flex flex-col items-center">
          <div className="w-full mt-2">
          <Carousel>
            <div className="h-40 flex items-center justify-center bg-blue-50 text-blue-700">Event 1: Student Meetup</div>
            <div className="h-40 flex items-center justify-center bg-blue-50 text-blue-700">Event 2: Career Fair</div>
            <div className="h-40 flex items-center justify-center bg-blue-50 text-blue-700">Event 3: Hackathon</div>
          </Carousel>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 p-4">
          {featureButtons.map(({ id, name, url, icon }) => (
            <FeatureButton key={id} name={name} url={url} icon={icon} />
          ))}
        </div>
      </div>
    </Router>
  );
};

export default Homepage;
