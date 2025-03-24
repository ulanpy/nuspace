import React from 'react';
import Feature from './Feature';
import {
    EventsIcon,
    BuySellIcon,
    DormEatsIcon,
    CrushIcon,
    GuideIcon
} from './FeatureIcon.jsx';

const features = [
    { id: 'events', name: 'Events', url: '/events', icon: <EventsIcon /> },
    { id: 'buy-sell', name: 'Купи & Продай', url: '/marketplace', icon: <BuySellIcon /> },
    { id: 'dorm-eats', name: 'Dorm Eats', url: '/food', icon: <DormEatsIcon /> },
    { id: 'find-crush', name: 'Find my crush', url: '/crush', icon: <CrushIcon /> },
    { id: 'guide', name: 'NU Гид', url: '/guide', icon: <GuideIcon /> }
];

export default function Menu() {
    return (
        <div className="mt-5 flex justify-between">
            {features.map(feature => (
                <Feature key={feature.id} feature={feature} />
            ))}
        </div>
    );
}