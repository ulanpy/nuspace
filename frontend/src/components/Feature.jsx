import React from 'react';
import { Link } from 'react-router-dom';

export default function Feature({ feature }) {
    return (
        <Link
            to={feature.url}
            className="flex flex-col items-center justify-center p-2 hover:bg-gray-100 active:bg-gray-200 transition-colors duration-200 flex-1"
        >
            <div className="w-12 h-12 mb-1">
                {feature.icon}
            </div>
            <span className="text-xs text-center text-gray-700">
                {feature.name}
            </span>
        </Link>
    );
}