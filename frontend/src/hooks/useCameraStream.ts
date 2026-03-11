/**
 * useCameraStream - Hook for managing MediaStream camera access
 *
 * Handles camera stream lifecycle, device selection, and error states.
 * Supports dynamic device switching without re-requesting permissions.
 */

import { useState, useEffect, useRef, useCallback } from "react";

export interface CameraStreamOptions {
  deviceId?: string;
  facingMode?: "environment" | "user";
  width?: number;
  height?: number;
  videoRef?: React.RefObject<HTMLVideoElement>;
}

export function useCameraStream(options: CameraStreamOptions = {}) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const internalVideoRef = useRef<HTMLVideoElement>(null);

  // Use external ref if provided, otherwise use internal ref
  const videoRef = options.videoRef || internalVideoRef;

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsActive(false);

    try {
      // Stop existing stream if any (access stream via state updater)
      setStream((prevStream) => {
        if (prevStream) {
          prevStream.getTracks().forEach((track) => track.stop());
        }
        return prevStream;
      });

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: options.width || 1920 },
          height: { ideal: options.height || 1080 },
        },
      };

      // Use specific device if provided
      if (options.deviceId) {
        (constraints.video as MediaTrackConstraints).deviceId = {
          exact: options.deviceId,
        };
      } else if (options.facingMode) {
        (constraints.video as MediaTrackConstraints).facingMode =
          options.facingMode;
      }

      const mediaStream =
        await navigator.mediaDevices.getUserMedia(constraints);
      console.log(
        "MediaStream obtained:",
        mediaStream,
        "Active tracks:",
        mediaStream.getVideoTracks(),
      );
      setStream(mediaStream);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to access camera";
      setError(errorMessage);
      setIsActive(false);
      console.error("Camera start error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [options.deviceId, options.facingMode, options.width, options.height]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsActive(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream, videoRef]);

  // Auto-start/restart when deviceId changes
  useEffect(() => {
    setIsActive(false); // Reset active status when device changes
    if (options.deviceId) {
      startCamera();
    }

    // Cleanup on unmount - capture stream at effect setup time
    return () => {
      // Access current stream via state
      setStream((currentStream) => {
        if (currentStream) {
          currentStream.getTracks().forEach((track) => track.stop());
        }
        return null;
      });
      setIsActive(false);
    };
  }, [options.deviceId, startCamera]);

  // Separate effect to attach stream to video element once both are ready
  useEffect(() => {
    const attachStreamToVideo = async () => {
      if (stream && videoRef.current) {
        console.log(
          "Attaching stream to video element, ref:",
          videoRef.current,
        );
        videoRef.current.srcObject = stream;

        // Wait for metadata to load
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              console.log(
                "Video metadata loaded, dimensions:",
                videoRef.current?.videoWidth,
                "x",
                videoRef.current?.videoHeight,
              );
              resolve();
            };
            // Fallback in case metadata is already loaded
            if (videoRef.current.readyState >= 1) {
              console.log("Video metadata already loaded");
              resolve();
            }
          }
        });

        // Explicitly play video for DroidCam and other cameras
        try {
          await videoRef.current.play();
          console.log("Video playing successfully");

          // Check if video is actually rendering frames
          setTimeout(() => {
            if (videoRef.current) {
              const videoState = {
                paused: videoRef.current.paused,
                currentTime: videoRef.current.currentTime,
                videoWidth: videoRef.current.videoWidth,
                videoHeight: videoRef.current.videoHeight,
                readyState: videoRef.current.readyState,
              };
              console.log("Video element state:", videoState);

              // Detect if camera isn't actually streaming (green screen issue)
              if (videoState.videoWidth === 0 || videoState.videoHeight === 0) {
                console.error(
                  "⚠️ Camera device found but not streaming video. Is DroidCam app running?",
                );
                setError(
                  "Camera detected but not streaming. Please ensure DroidCam app is running and connected.",
                );
                setStream(null);
                setIsActive(false);
              } else if (!videoState.paused && videoState.currentTime === 0) {
                console.warn("⚠️ Video not advancing. Stream may be inactive.");
                setIsActive(false);
              } else {
                console.log("✓ Camera is actively streaming");
                setIsActive(true);
              }
            }
          }, 1000);
        } catch (playErr) {
          console.error("Video play failed:", playErr);
        }
      }
    };

    attachStreamToVideo();
  }, [stream, videoRef]);

  return {
    stream,
    videoRef,
    isLoading,
    isActive,
    error,
    startCamera,
    stopCamera,
  };
}
