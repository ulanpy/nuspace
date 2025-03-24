import { useState } from "react";
import {
    HiMiniArrowLeftCircle,
    HiMiniArrowRightCircle
} from "react-icons/hi2";



export default function Carousel({slides}) {
    const imgSlide = slides.map(slide =>
        <img src={slide.img}></img>
    )

    let [current, setCurrent] = useState(0);

    let previousSlide = () => {
        if (current === 0) setCurrent(slides.length - 1);
        else setCurrent(current - 1);
    }

    let nextSlide = () => {
        if (current === slides.length - 1) setCurrent(0);
        else setCurrent(current + 1);
    }

    return (
        <>
        <div className='overflow-hidden relative'>
            <div
                className='flex transition ease-out duration-400'
                style={{
                    transform: `translateX(-${current * 100}%)`,
                }}>
                {imgSlide}
            </div>
            <div className='absolute top-0 h-full w-full justify-between items-center flex text-3xl'>
                <button onClick={previousSlide}>
                    <HiMiniArrowLeftCircle/>
                </button>
                <button onClick={nextSlide}>
                    <HiMiniArrowRightCircle/>
                </button>
            </div>

            <div className="absolute bottom-0 py-4 flex justify-center gap-3 w-full">
                {slides.map((slide, i) => {
                    return (
                        <div
                        onClick={() => setCurrent(i)}
                        key={'circle'+ i}
                        className={`rounded-full w-3 h-3 ${i == current ? 'bg-gray-300' : 'bg-white'}`}
                        ></div>
                    )
                }
                )}
            </div>
        </div>
        </>
    )
}