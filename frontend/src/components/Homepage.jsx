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
      <div className="max-w-md m-auto font-sans bg-white min-h-screen flex flex-col">

        <Header />

        <div className="h-px bg-blue-700 mx-4 mb-5"></div>

          <div className="w-96 mt-2 m-auto">
          <Carousel>
          <div class="hidden duration-700 ease-in-out" data-carousel-item>
            <img src="/docs/images/carousel/carousel-1.svg" class="absolute block w-full -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2" alt="..."></img>
        </div>
        <div className="h-56 md:h-96 flex items-center justify-center bg-green-500 text-white">
          Slide 2
        </div>
        <div className="h-56 md:h-96 flex items-center justify-center bg-red-500 text-white">
          Slide 3
        </div>
      </Carousel>
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
