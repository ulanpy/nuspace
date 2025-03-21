import { useState } from 'react';

export default function Carousel({ children }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const length = children.length;

  const nextSlide = () => setActiveIndex((prev) => (prev + 1) % length);
  const prevSlide = () => setActiveIndex((prev) => (prev - 1 + length) % length);

  return (
    <div className="relative w-full overflow-hidden rounded-lg">
      {/* Carousel Wrapper */}
      <div
        className="flex transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {children.map((child, index) => (
          <div
            key={index}
            className="w-full flex-shrink-0 transition-transform duration-700 ease-in-out"
          >
            {child}
          </div>
        ))}
      </div>

      {/* Slider Indicators */}
      <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 space-x-2">
        {children.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`h-3 w-3 rounded-full transition-all ${
              activeIndex === i ? 'bg-blue-700' : 'bg-white/50 hover:bg-white'
            }`}
            aria-label={`Slide ${i + 1}`}
            onClick={() => setActiveIndex(i)}
          />
        ))}
      </div>

      {/* Slider Controls */}
      <button
        type="button"
        className="absolute top-1/2 left-4 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/30 hover:bg-white/50 focus:outline-none focus:ring-4 focus:ring-white dark:bg-gray-800/30 dark:hover:bg-gray-800/60 dark:focus:ring-gray-800/70"
        onClick={prevSlide}
        aria-label="Previous Slide"
      >
        <svg
          className="h-4 w-4 text-white dark:text-gray-800"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 6 10"
        >
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5 1 1 5l4 4"
          />
        </svg>
      </button>
      <button
        type="button"
        className="absolute top-1/2 right-4 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/30 hover:bg-white/50 focus:outline-none focus:ring-4 focus:ring-white dark:bg-gray-800/30 dark:hover:bg-gray-800/60 dark:focus:ring-gray-800/70"
        onClick={nextSlide}
        aria-label="Next Slide"
      >
        <svg
          className="h-4 w-4 text-white dark:text-gray-800"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 6 10"
        >
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="m1 9 4-4-4-4"
          />
        </svg>
      </button>
    </div>
  );
}