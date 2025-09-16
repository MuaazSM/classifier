"use client"
import { useState } from "react"
import AudioVisualizer from "./AudioVisualizer"

interface AudioPlayerProps {
  trackSrc?: string
}

export default function AudioPlayer({ trackSrc = "/audio/track2.mp3" }: AudioPlayerProps) {
  const [hasPermission, setHasPermission] = useState<boolean>(false)

  const requestPermission = async () => {
    try {
      // Create a temporary audio context to request permission
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      // Resume the context if it's suspended
      if (audioContext.state === "suspended") {
        await audioContext.resume()
      }

      setHasPermission(true)

      // Close the temporary context
      audioContext.close()
    } catch (error) {
      console.error("Error requesting audio permission:", error)
    }
  }

  return (
    <>
      {/* Permission overlay */}
      {!hasPermission && (
        <div className="fixed inset-0 z-[100] bg-white/80 flex items-center justify-center">
          <div className="text-center bg-white/90 backdrop-blur-sm rounded-lg p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-black mb-4">Enable Audio Visualization</h2>
            <p className="text-black/90 mb-6 text-lg">Click below to activate the waveform visualizer</p>
            <button
              onClick={requestPermission}
              className="bg-[#5227FF] text-white px-8 py-3 rounded-full font-semibold hover:bg-[#4520e6] transition-colors shadow-lg"
            >
              Enable Audio
            </button>
          </div>
        </div>
      )}

      {/* Audio Visualizer */}
      <AudioVisualizer
        hasPermission={hasPermission}
        trackSrc={trackSrc}
        // isMiddlePosition={isMiddlePosition}
      />
    </>
  )
}
