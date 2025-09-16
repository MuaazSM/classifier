'use client';
import { useState } from 'react';
import ElectricBorder from '@/components/ElectricBorder';
import Waves from '@/components/Waves';
import AudioController from '@/components/AudioController';
import { departments } from '../../data/departments';

export default function DepartmentsPage() {
  // All the state and logic from your old home page now lives here
  const [amplitude, setAmplitude] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [videoOpacity, setVideoOpacity] = useState(1);
  const currentDepartment = departments[currentIndex];

  // We need to request permission on this page now
  const handleInitialClick = async () => {
    if (hasPermission) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (tempCtx.state === "suspended") await tempCtx.resume();
      await tempCtx.close();
      setHasPermission(true);
    } catch (error) {
      console.error("Could not get audio permission:", error);
    }
  };

  const togglePlayPause = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).toggleAudio) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).toggleAudio();
    }
  };

  const handleNext = () => {
    setVideoOpacity(0);
    setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % departments.length);
      setVideoOpacity(1);
    }, 500);
  };

  return (
    // Add an onClick handler to the main div to request audio permission
    <div className="relative min-h-screen overflow-hidden bg-white" onClick={handleInitialClick}>
      <AudioController
        hasPermission={hasPermission}
        onAmplitudeChange={setAmplitude}
        onPlaybackChange={setIsPlaying}
      />
      {/* The rest of the page layout is the same as before */}
      <div className="absolute inset-0 z-0">
          <Waves
            lineColor="#FF8200"
            backgroundColor="transparent"
            audioAmp={amplitude}
            waveAmpX={30}
            waveAmpY={15}
            friction={0.95}
            tension={0.005}
          />
      </div>
      <div className="relative z-10 min-h-screen flex flex-col justify-center">
          <div className="w-full max-w-7xl mx-auto flex items-center justify-center gap-x-16 px-8">
            <div className="flex-1 flex items-center justify-start">
              <div className="flex flex-col">
                <h1 className="text-8xl font-black" style={{ color: '#FF8200' }}>
                  {currentDepartment.name}
                </h1>
                <p className="text-2xl text-gray-700 mt-2 font-sans self-center">
                  {currentDepartment.subtitle}
                </p>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-end">
              <ElectricBorder
                color="#FF8200"
                speed={0.2}
                chaos={0.15}
                thickness={2}
                style={{
                  borderRadius: '2.5rem',
                  width: '370px',
                  height: '75vh',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <video
                  key={currentDepartment.videoSrc}
                  src={currentDepartment.videoSrc}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="relative z-[-1] w-full h-full object-cover transition-opacity duration-500"
                  style={{ opacity: videoOpacity }}
                />
                <button
                  onClick={handleNext}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/30 backdrop-blur-sm text-white text-sm px-5 py-2 rounded-full border border-white/20 hover:bg-black/50 transition-colors"
                >
                  Scroll down
                </button>
              </ElectricBorder>
            </div>
          </div>
        </div>
        <div className="absolute top-4 left-4 text-black text-sm opacity-70 pointer-events-none z-20">
          {!hasPermission ? "Click anywhere to enable audio" : !isPlaying ? "Audio paused" : "Audio playing"}
        </div>
        {hasPermission && (
          <button
            onClick={togglePlayPause}
            className="absolute top-4 right-4 text-black text-sm bg-white/50 px-3 py-1 rounded opacity-70 hover:opacity-100 transition-opacity z-20"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
        )}
    </div>
  );
}