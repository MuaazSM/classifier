// frontend/src/app/departments/page.tsx - Fixed version
'use client';
import { useState, useEffect } from 'react';
import ElectricBorder from '@/components/ElectricBorder';
import Waves from '@/components/Waves';
import AudioController from '@/components/AudioController';
import { api, Department } from '@/lib/api';
import { Loader2, AlertCircle } from 'lucide-react';

interface DepartmentDisplay {
  name: string;
  subtitle: string;
  videoSrc: string;
  data?: Department; // Make optional since we might not need it
}

export default function DepartmentsPage() {
  // Audio state
  const [amplitude, setAmplitude] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Department data state
  const [departments, setDepartments] = useState<DepartmentDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videoOpacity, setVideoOpacity] = useState(1);

  // Load departments from backend
  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Try to load from API first
      try {
        const response = await api.getDepartments(false);
        
        // Check if we got valid data
        if (response && response.departments && Array.isArray(response.departments) && response.departments.length > 0) {
          // Map backend data to display format
          const mappedDepartments: DepartmentDisplay[] = response.departments.map((dept, index) => ({
            name: dept.name.toUpperCase(),
            subtitle: dept.description.split('.')[0] + '.',
            videoSrc: `/vid/reel${(index % 2) + 1}.mp4`,
            data: dept
          }));

          setDepartments(mappedDepartments);
          setLoading(false);
          return; // Success! Exit early
        } else {
          console.warn('API returned invalid or empty data:', response);
          throw new Error('No departments data received from API');
        }
      } catch (apiError: any) {
        console.warn('API call failed, using fallback data:', apiError.message);
        throw apiError; // Re-throw to trigger fallback
      }
      
    } catch (err: any) {
      // Always use fallback data when API fails
      console.log('Using fallback department data');
      setError(''); // Clear error since we have fallback data
      
      const fallbackDepartments: DepartmentDisplay[] = [
        {
          name: 'TECH AND COLLABORATION',
          subtitle: 'Build and maintain technical solutions.',
          videoSrc: '/vid/reel1.mp4'
        },
        {
          name: 'DIGITAL CREATIVES',
          subtitle: 'Design tomorrow\'s vision.',
          videoSrc: '/vid/reel2.mp4'
        },
        {
          name: 'SOCIAL MEDIA & CONTENT',
          subtitle: 'Telling our story, one post at a time.',
          videoSrc: '/vid/reel1.mp4'
        },
        {
          name: 'EVENTS',
          subtitle: 'Engineering moments, building memories.',
          videoSrc: '/vid/reel2.mp4'
        },
        {
          name: 'MARKETING',
          subtitle: 'Amplifying the message.',
          videoSrc: '/vid/reel1.mp4'
        },
        {
          name: 'HOSPITALITY',
          subtitle: 'The art of welcome.',
          videoSrc: '/vid/reel2.mp4'
        }
      ];
      
      setDepartments(fallbackDepartments);
      setLoading(false);
    }
  };

  const currentDepartment = departments[currentIndex];

  // Audio permission handling
  const handleInitialClick = async () => {
    if (hasPermission) return;
    try {
      const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (tempCtx.state === "suspended") await tempCtx.resume();
      await tempCtx.close();
      setHasPermission(true);
    } catch (error) {
      console.error("Could not get audio permission:", error);
    }
  };

  const togglePlayPause = () => {
    if ((window as any).toggleAudio) {
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

  // Loading state
  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#FF8200] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading Departments</h2>
          <p className="text-gray-600">Fetching the latest department information...</p>
        </div>
      </div>
    );
  }

  // Error state with retry (only show if no fallback data loaded)
  if (error && departments.length === 0) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadDepartments}
            className="bg-[#FF8200] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#E67500] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="relative min-h-screen overflow-hidden bg-white" onClick={handleInitialClick}>
      <AudioController
        hasPermission={hasPermission}
        onAmplitudeChange={setAmplitude}
        onPlaybackChange={setIsPlaying}
      />

      {/* Background waves */}
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

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col justify-center">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-center gap-x-16 px-8">
          {/* Left side - Department info (SIMPLIFIED - removed details) */}
          <div className="flex-1 flex items-center justify-start">
            <div className="flex flex-col">
              <h1 className="text-8xl font-black" style={{ color: '#FF8200' }}>
                {currentDepartment?.name || 'LOADING...'}
              </h1>
              <p className="text-2xl text-gray-700 mt-2 font-sans self-center">
                {currentDepartment?.subtitle || 'Please wait...'}
              </p>
              
              {/* REMOVED: Department details section that was causing issues */}
            </div>
          </div>

          {/* Right side - Video */}
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
              {currentDepartment && (
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
              )}
              
              <button
                onClick={handleNext}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/30 backdrop-blur-sm text-white text-sm px-5 py-2 rounded-full border border-white/20 hover:bg-black/50 transition-colors"
                disabled={departments.length <= 1}
              >
                {departments.length > 1 ? 'Next Department' : 'Loading...'}
              </button>
              
              {/* Department counter */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/30 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">
                {currentIndex + 1} / {departments.length}
              </div>
            </ElectricBorder>
          </div>
        </div>
      </div>

      {/* Status indicators */}
      <div className="absolute top-4 left-4 text-black text-sm opacity-70 pointer-events-none z-20">
        {!hasPermission ? "Click anywhere to enable audio" : !isPlaying ? "Audio paused" : "Audio playing"}
        {error && (
          <div className="mt-1 text-red-600">
            ⚠ Using fallback data
          </div>
        )}
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