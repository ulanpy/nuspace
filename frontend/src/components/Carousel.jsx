import { useState } from 'react';

export default function Carousel({ children }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const length = children.length;

  const nextSlide = () => setActiveIndex((prev) => (prev + 1) % length);
  const prevSlide = () => setActiveIndex((prev) => (prev - 1 + length) % length);

  return (
    <div className="relative w-full overflow-hidden">
      <div className="flex transition-transform" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
        {children.map((child, index) => (
          <div key={index} className="w-full shrink-0">{child}</div>
        ))}
      </div>

      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2">
        {children.map((_, i) => (
          <span
            key={i}
            className={`block h-2 w-2 cursor-pointer rounded-full border border-blue-700 transition-all ${
              activeIndex === i ? "bg-blue-700" : ""
            }`}
            onClick={() => setActiveIndex(i)}
          />
        ))}
      </div>

      <button
        className="absolute top-1/2 left-2 transform -translate-y-1/2 bg-blue-700 text-white px-2 py-1"
        onClick={prevSlide}
      >
        {"<"}
      </button>
      <button
        className="absolute top-1/2 right-2 transform -translate-y-1/2 bg-blue-700 text-white px-2 py-1"
        onClick={nextSlide}
      >
        {">"}
      </button>
    </div>
  );
}
