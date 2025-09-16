import Image from 'next/image';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LandingPageProps {
  onEnter: () => void;
}

export default function LandingPage({ onEnter }: LandingPageProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const handleWheel = (e : WheelEvent) => {
      if (e.deltaY > 0) {
        setIsDarkMode(true);
      } else {
        setIsDarkMode(false);
      }
    };

    window.addEventListener('wheel', handleWheel);
    
    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <div className={`fixed inset-0 z-[200] font-sans transition-all duration-700 ease-in-out overflow-hidden ${
      isDarkMode 
        ? 'bg-[#1d1d1d] text-[#F1ECE4]' 
        : 'bg-[#F1ECE4] text-[#333]'
    }`}>
      {/* Bottom-left Illustration (Hidden on mobile, visible on medium screens and up) */}
      <div className="hidden md:block absolute bottom-[-18rem] left-0 w-[95vw] h-[95vh]">
        <Image
          src="/img/illustration.png"
          alt="Satellite schematic"
          width={852}
          height={996}
          className="w-full h-full object-contain object-left-bottom"
          priority
        />
      </div>

      {/* Right-side Content */}
      <div className="absolute right-0 top-0 h-full w-full md:w-1/2 flex items-center justify-center md:justify-end p-8 md:pr-32">
        <div className="max-w-md md:max-w-none w-full flex flex-col items-start md:items-end">
          <h1 className="font-heading text-6xl sm:text-8xl md:text-[13rem] text-[#FF8200] leading-none font-bold text-left md:text-right">
            TAQNEEQ
          </h1>
          <h1 className="font-heading text-6xl sm:text-8xl md:text-[13rem] text-[#FF8200] leading-none font-bold text-left md:text-right">
            18.0
          </h1>
          {/* Content block */}
          <div className="w-full md:w-[22rem] mt-8 md:mr-[2rem]">
            <p className={`text-base text-left md:text-justify transition-colors duration-700 ${
              isDarkMode ? 'text-[#F1ECE4]' : 'text-gray-700'
            }`}>
              Since the beginning of time, technology has evolved and grown into the beauty we know it to be today. Welcome to MPSTME&apos;s Taqneeq, where aspiring tech enthusiasts, developers, and visionaries come together to compete, learn, and revolutionize the future. With a perfect blend of competitions, workshops, hackathons, and exhibitions, this year&apos;s edition promises to be bigger and better than ever before.
            </p>
            <button
              onClick={onEnter}
              className="mt-8 bg-[#FF8200] text-white w-full px-8 py-3 rounded-md font-semibold hover:bg-[#E67500] transition-colors shadow-lg"
            >
              See Departments
            </button>
            <p className={`mt-4 text-sm underline text-center text-left transition-colors duration-700 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-500'
            }`}>
              <Link href="/classify-ai">Can&apos;t decide which department to choose?</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}