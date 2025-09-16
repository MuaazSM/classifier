'use client';
import Image from 'next/image';
import Threads from '@/components/Threads';
import Link from 'next/link';

export default function ClassifyVoicePage() {
  return (
    <div className="relative min-h-screen w-full bg-[#F1ECE4] overflow-hidden">
      {/* Background decoration with a subtle blur */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,180,180,0.1),_transparent_40%),_radial-gradient(circle_at_top_left,_rgba(255,200,150,0.15),_transparent_50%),_radial-gradient(circle_at_bottom_right,_rgba(200,200,255,0.1),_transparent_50%)] backdrop-blur-sm"></div>

      {/* Waveform and Logo (Centered Layer) */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        {/* Horizontal Threads component now spans full width */}
        <div className="absolute w-full h-48">
          <Threads
            color={[0.3, 0.3, 0.3]} // Neutral dark grey
            amplitude={2} // Very subtle animation
            distance={0.1}
            enableMouseInteraction={true}
          />
        </div>
        
        {/* Logo */}
        <div className="relative z-10 w-36 h-36 md:w-44 md:h-44">
          <Image
            src="/img/tqlogo.png" // Path to your logo
            alt="Taqneeq Logo"
            layout="fill"
            objectFit="contain"
          />
        </div>
      </div>

      {/* Text Content (Top Layer) */}
      <div className="relative z-20 flex flex-col items-center h-screen text-center p-8">
        {/* Top Heading Area (Takes up ~40% of height) */}
        <div className="flex-grow-[1] flex items-center justify-center">
          <h1 className="text-6xl md:text-7xl font-bold" style={{ color: '#FF8200' }}>
            MEET SIMBA, YOUR
            <br />
            VOICE ASSISTANT.
          </h1>
        </div>
        
        {/* Spacer (Takes up ~20% of height, leaving space for the logo) */}
        <div className="flex-grow-[1]"></div> 

        {/* Bottom Text Area (Takes up ~40% of height) */}
        <div className="flex-grow-[0.5] flex items-start justify-center">
           <p className="text-lg md:text-xl max-w-lg text-gray-600 font-mono">
            Technicals is the department responsible for creating cool websites and apps for Taqneeq Fest. They&apos;re the brains behind it all.
          </p>
        </div>
        <div className="flex-grow-[0] flex items-start justify-center">
          <p className="text-lg md:text-xl max-w-lg text-gray-600 font-mono underline">
            <Link href="/classify-text">try quiz</Link>
          </p>
        </div>
      </div>
    </div>
  );
}