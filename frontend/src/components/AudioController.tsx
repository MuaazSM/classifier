"use client"
import { useCallback, useEffect, useRef, useState } from "react"

interface AudioControllerProps {
  trackSrc?: string
  hasPermission: boolean
  onAmplitudeChange: (amplitude: number) => void
  onPlaybackChange: (isPlaying: boolean) => void
}

export default function AudioController({
  trackSrc = "/audio/track2.mp3",
  hasPermission,
  onAmplitudeChange,
  onPlaybackChange
}: AudioControllerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const animationRef = useRef<number | null>(null)

  const [audioInitialized, setAudioInitialized] = useState<boolean>(false)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)

  const startVisualization = useCallback(() => {
    // ... same as before
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    const waveArray = new Uint8Array(analyser.frequencyBinCount);
    let lastAmplitude = 0;
    const smoothingFactor = 0.8; 
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      if (!analyserRef.current) return;
      analyserRef.current.getByteTimeDomainData(waveArray);
      let sum = 0;
      for (let i = 0; i < waveArray.length; i++) {
        const value = (waveArray[i] - 128) / 128.0;
        sum += value * value;
      }
      const rms = Math.sqrt(sum / waveArray.length);
      const newAmplitude = rms * 18;
      const smoothedAmplitude = lastAmplitude * smoothingFactor + newAmplitude * (1 - smoothingFactor);
      lastAmplitude = smoothedAmplitude;
      onAmplitudeChange(smoothedAmplitude);
    };
    draw();
  }, [onAmplitudeChange]);

  const initializeAudio = useCallback(async () => {
    if (audioRef.current && !audioInitialized) {
      try {
        if (!audioCtxRef.current) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          analyserRef.current = audioCtxRef.current.createAnalyser();
          if (!sourceRef.current) {
            sourceRef.current = audioCtxRef.current.createMediaElementSource(audioRef.current!);
            sourceRef.current.connect(analyserRef.current);
            analyserRef.current.connect(audioCtxRef.current.destination);
          }
          analyserRef.current.fftSize = 512;
        }
        if (audioCtxRef.current.state === "suspended") await audioCtxRef.current.resume();
        await audioRef.current!.play();
        setAudioInitialized(true);
        startVisualization();
      } catch (error) {
        console.error("Error initializing audio:", error);
      }
    }
  }, [audioInitialized, startVisualization]);

  const togglePlayPause = async () => {
    if (audioRef.current && hasPermission) {
      if (isPlaying) await audioRef.current.pause();
      else await audioRef.current.play();
    }
  };

  useEffect(() => {
    // Initialize audio as soon as permission is granted from the page
    if (hasPermission) {
      initializeAudio();
    }
  }, [hasPermission, initializeAudio]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.6;
    const handlePlay = () => { setIsPlaying(true); onPlaybackChange(true); };
    const handlePause = () => { setIsPlaying(false); onPlaybackChange(false); };
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handlePause);
    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handlePause);
    };
  }, [onPlaybackChange]);
  
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).toggleAudio = togglePlayPause;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => { delete (window as any).toggleAudio; }
  }, [isPlaying, hasPermission, togglePlayPause]);

  return (
    <audio ref={audioRef} preload="auto" className="hidden" crossOrigin="anonymous" loop>
      <source src={trackSrc} type="audio/mpeg" />
    </audio>
  );
}