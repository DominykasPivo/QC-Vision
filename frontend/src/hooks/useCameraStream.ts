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
      // Stop existing stream if any
      setStream((prevStream) => {
        if (prevStream) {
          prevStream.getTracks().forEach((track) => track.stop());
        }
        return prevStream;
      });

      // Try progressively lower resolutions in case hardware can't negotiate high resolution
      const resolutionOptions = [
        { width: options.width || 1920, height: options.height || 1080 },
        { width: 1280, height: 720 },
        { width: 640, height: 480 },
        { width: 320, height: 240 },
      ];

      let mediaStream: MediaStream | null = null;

      for (const resolution of resolutionOptions) {
        try {
          const constraints: MediaStreamConstraints = {
            video: {
              width: { ideal: resolution.width },
              height: { ideal: resolution.height },
            },
          };

          if (options.deviceId) {
            (constraints.video as MediaTrackConstraints).deviceId = {
              exact: options.deviceId,
            };
          } else if (options.facingMode) {
            (constraints.video as MediaTrackConstraints).facingMode =
              options.facingMode;
          }

          mediaStream =
            await navigator.mediaDevices.getUserMedia(constraints);
          console.log(
            `✓ MediaStream obtained at ${resolution.width}x${resolution.height}`,
          );
          break; // Successfully got stream, exit retry loop
        } catch (err) {
          console.warn(
            `⚠️ Failed to get camera at ${resolution.width}x${resolution.height}, trying lower resolution...`,
          );
          continue;
        }
      }

      // If all resolution attempts failed, try without resolution constraints
      if (!mediaStream) {
        try {
          const constraints: MediaStreamConstraints = { video: true };

          if (options.deviceId) {
            (constraints.video as MediaTrackConstraints).deviceId = {
              exact: options.deviceId,
            };
          } else if (options.facingMode) {
            (constraints.video as MediaTrackConstraints).facingMode =
              options.facingMode;
          }

          mediaStream =
            await navigator.mediaDevices.getUserMedia(constraints);
          console.log(
            "✓ MediaStream obtained with default constraints",
          );
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to access camera";
          setError(errorMessage);
          setIsActive(false);
          setIsLoading(false);
          return;
        }
      }

      setStream(mediaStream);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to access camera";
      setError(errorMessage);
      setIsActive(false);
      console.error("Camera error:", err);
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

    // Cleanup on unmount
    return () => {
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

        // Monitor stream tracks for disconnection
        const tracks = stream.getTracks();
        tracks.forEach((track) => {
          track.onended = () => {
            console.log("⚠️ Stream track ended - camera disconnected");
            setIsActive(false);
            setError("Camera disconnected");
          };
        });

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
          let frameCheckTimeout: ReturnType<typeof setTimeout> | null = null;
          let isCancelled = false;

          frameCheckTimeout = setTimeout(() => {
            if (isCancelled || !videoRef.current || videoRef.current.srcObject !== stream) {
              return;
            }

            const videoState = {
              paused: videoRef.current.paused,
              currentTime: videoRef.current.currentTime,
              videoWidth: videoRef.current.videoWidth,
              videoHeight: videoRef.current.videoHeight,
              readyState: videoRef.current.readyState,
            };
            console.log("Video element state:", videoState);

            if (videoState.videoWidth === 0 || videoState.videoHeight === 0) {
              console.error(
                "⚠️ Camera device found but not streaming video. Please ensure camera app is running.",
              );
              setError(
                "Camera detected but not streaming. Please ensure camera app is running.",
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
          }, 1000);

          return () => {
            isCancelled = true;
            if (frameCheckTimeout) clearTimeout(frameCheckTimeout);
          };
        } catch (playErr) {
          console.error("Video play failed:", playErr);
        }
      }
    };

    attachStreamToVideo();
  }, [stream, videoRef]);

  // Continuously monitor stream health
  useEffect(() => {
    if (!isActive || !videoRef.current) return;

    let lastCurrentTime = videoRef.current.currentTime;
    let frozenFrameCount = 0;

    const healthCheckInterval = setInterval(() => {
      if (videoRef.current && stream) {
        const video = videoRef.current;
        const currentTime = video.currentTime;
        const tracks = stream.getTracks();
        const hasActiveTracks = tracks.some(
          (track) => track.readyState === "live",
        );

        // Check if tracks are still live
        if (!hasActiveTracks) {
          console.log("⚠️ Stream tracks no longer live");
          setIsActive(false);
          setError("Camera disconnected");
          clearInterval(healthCheckInterval);
          return;
        }

        // Check if video dimensions are still valid
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          console.log("⚠️ Stream lost video dimensions");
          setIsActive(false);
          setError("Camera stream lost");
          clearInterval(healthCheckInterval);
          return;
        }

        // Check if frames are advancing
        if (currentTime === lastCurrentTime) {
          frozenFrameCount++;
          console.log(`⚠️ Stream appears frozen (${frozenFrameCount}/3)`);

          if (frozenFrameCount >= 3) {
            console.log("⚠️ Stream frozen for too long - disconnecting");
            setIsActive(false);
            setError("Camera stream frozen");
            clearInterval(healthCheckInterval);
          }
        } else {
          frozenFrameCount = 0; // Reset if frames are advancing
        }

        lastCurrentTime = currentTime;
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(healthCheckInterval);
  }, [isActive, stream, videoRef]);

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
