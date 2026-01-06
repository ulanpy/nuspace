"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { StaticImageData } from "next/image";

interface FeatureCarouselProps {
    images: (StaticImageData)[];
}

export function FeatureCarousel({ images }: FeatureCarouselProps) {
    const [index, setIndex] = useState(0);

    // Helper to get the src string from either string or StaticImageData
    const getSrc = (img: string | StaticImageData): string => {
        return typeof img === 'string' ? img : img.src;
    };

    useEffect(() => {
        // Preload images to prevent flickering
        images.forEach((img) => {
            const preloadImg = new Image();
            preloadImg.src = getSrc(img);
        });
    }, [images]);

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % images.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [images.length]);

    return (
        <div className="relative w-full h-full overflow-hidden rounded-2xl">
            <AnimatePresence initial={false} mode="popLayout">
                <motion.img
                    key={index}
                    src={getSrc(images[index])}
                    alt="Feature preview"
                    className="absolute inset-0 w-full h-full object-cover"
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "-100%" }}
                    transition={{
                        x: { type: "tween", duration: 0.8, ease: "easeInOut" },
                        opacity: { duration: 0.2 }
                    }}
                />
            </AnimatePresence>

            {/* Overlay gradient to nicer blend with the container if needed, or just let image pop */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        </div>
    );
}
