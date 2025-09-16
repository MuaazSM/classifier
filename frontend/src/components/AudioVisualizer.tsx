"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import Threads from './Threads'; // Import the Threads component

interface AudioVisualizerProps {
  hasPermission: boolean
  trackSrc?: string
}

export default function AudioVisualizer({ hasPermission, trackSrc = "/audio/track2.mp3" }: AudioVisualizerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const animationRef = useRef<number | null>(null)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [audioInitialized, setAudioInitialized] = useState<boolean>(false)
  const [audioAmplitude, setAudioAmplitude] = useState(0); // State for amplitude

  const startVisualization = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const waveArray = new Uint8Array(analyser.frequencyBinCount);

    let lastAmplitude = 0;
    const smoothingFactor = 0.9; // Higher value = smoother, but less responsive

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteTimeDomainData(waveArray);

      let sum = 0;
      for (let i = 0; i < waveArray.length; i++) {
        const value = (waveArray[i] - 128) / 128.0; // Normalize to -1.0 to 1.0
        sum += value * value;
      }
      const rms = Math.sqrt(sum / waveArray.length);
      // Multiply RMS to make the visual effect more pronounced
      const newAmplitude = rms * 5;

      // Apply smoothing to prevent jittery visuals
      const smoothedAmplitude = lastAmplitude * smoothingFactor + newAmplitude * (1 - smoothingFactor);
      lastAmplitude = smoothedAmplitude;

      setAudioAmplitude(smoothedAmplitude);
    };

    draw();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.volume = 0.6;

    // Audio event listeners
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)
    audio.addEventListener("ended", handleEnded)

    return () => {
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
      audio.removeEventListener("ended", handleEnded)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [])

  // Initialize audio when permission is granted
  useEffect(() => {
    if (hasPermission && audioRef.current && !audioInitialized) {
      const initializeAudio = async () => {
        try {
          console.log("Initializing AudioVisualizer audio...")

          if (!audioCtxRef.current) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
            analyserRef.current = audioCtxRef.current.createAnalyser()
            
            if (!sourceRef.current) {
              sourceRef.current = audioCtxRef.current.createMediaElementSource(audioRef.current!)
              sourceRef.current.connect(analyserRef.current)
              analyserRef.current.connect(audioCtxRef.current.destination)
            }
            
            analyserRef.current.fftSize = 512;
            analyserRef.current.smoothingTimeConstant = 0.7;
          }

          if (audioCtxRef.current.state === "suspended") {
            await audioCtxRef.current.resume()
          }

          await audioRef.current!.play()
          setIsPlaying(true)
          setAudioInitialized(true)

          startVisualization()
        } catch (error) {
          console.error("Error initializing AudioVisualizer:", error)
        }
      }

      initializeAudio()
    }
  }, [hasPermission, audioInitialized, startVisualization])

  // Manual control functions for external use
  const togglePlayPause = async () => {
    if (!audioRef.current || !hasPermission) return

    try {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        if (audioCtxRef.current?.state === "suspended") {
          await audioCtxRef.current.resume()
        }
        await audioRef.current.play()
      }
    } catch (error) {
      console.error("Error toggling audio:", error)
    }
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close()
      }
    }
  }, [])

  return (
    <div className="absolute inset-0 w-full h-full z-50 bg-transparent">
      <Threads
        amplitude={audioAmplitude}
        distance={0.1}
        enableMouseInteraction={true}
        color={[1.0, 0.4, 0.0]} // Bold Orange
      />
      <audio ref={audioRef} preload="auto" className="hidden" crossOrigin="anonymous">
        <source src={trackSrc} type="audio/mpeg" />
        <source src={trackSrc.replace(".mp3", ".wav")} type="audio/wav" />
        <source src={trackSrc.replace(".mp3", ".ogg")} type="audio/ogg" />
        Your browser does not support the audio element.
      </audio>

      {/* Status indicator */}
      <div className="absolute top-4 left-4 text-white text-sm opacity-70 pointer-events-none">
        {!hasPermission ? "Audio disabled" : !isPlaying ? "Audio paused" : "Audio playing"}
      </div>

      {/* Optional: Manual control button */}
      {hasPermission && (
        <button
          onClick={togglePlayPause}
          className="absolute top-4 right-4 text-white text-sm bg-black/50 px-3 py-1 rounded opacity-70 hover:opacity-100 transition-opacity"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
      )}
    </div>
  )
}