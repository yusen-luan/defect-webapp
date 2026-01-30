'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { YOLOInference } from '@/lib/yoloInference';
import { Detection } from '@/types/detection';
import { BoundingBoxOverlay } from './BoundingBoxOverlay';

type Status = 'loading' | 'ready' | 'error' | 'no-camera';

export function CameraView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inferenceRef = useRef<YOLOInference | null>(null);
  const animationFrameRef = useRef<number>();

  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [detections, setDetections] = useState<Detection[]>([]);
  const [fps, setFps] = useState<number>(0);
  const [modelLoaded, setModelLoaded] = useState(false);

  // Initialize camera
  const initCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // Prefer rear camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      return true;
    } catch (error) {
      console.error('Camera access error:', error);
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          setErrorMessage('Camera access denied. Please allow camera permissions.');
        } else if (error.name === 'NotFoundError') {
          setErrorMessage('No camera found on this device.');
        } else {
          setErrorMessage(`Camera error: ${error.message}`);
        }
      }
      setStatus('no-camera');
      return false;
    }
  }, []);

  // Initialize YOLO model
  const initModel = useCallback(async () => {
    try {
      inferenceRef.current = new YOLOInference();
      await inferenceRef.current.loadModel();
      setModelLoaded(true);
      return true;
    } catch (error) {
      console.error('Model loading error:', error);
      // Don't set error status - allow camera to work without model
      setModelLoaded(false);
      return false;
    }
  }, []);

  // Run inference loop
  const runInference = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const inference = inferenceRef.current;

    if (!video || !canvas || !inference || !inference.isModelLoaded()) {
      animationFrameRef.current = requestAnimationFrame(runInference);
      return;
    }

    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(runInference);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(runInference);
      return;
    }

    // Set canvas size to match video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    // Draw current frame
    ctx.drawImage(video, 0, 0);

    // Get image data for inference
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    try {
      const startTime = performance.now();
      const result = await inference.detect(imageData);
      const totalTime = performance.now() - startTime;

      setDetections(result.detections);
      setFps(Math.round(1000 / totalTime));
    } catch (error) {
      console.error('Inference error:', error);
    }

    animationFrameRef.current = requestAnimationFrame(runInference);
  }, []);

  // Initialize on mount
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setStatus('loading');

      const cameraOk = await initCamera();
      if (!mounted) return;

      if (!cameraOk) return;

      // Try to load model (optional - camera works without it)
      await initModel();
      if (!mounted) return;

      setStatus('ready');
    };

    init();

    return () => {
      mounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Stop camera stream
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [initCamera, initModel]);

  // Start inference loop when ready
  useEffect(() => {
    if (status === 'ready') {
      runInference();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [status, runInference]);

  return (
    <div className="camera-container">
      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera video feed */}
      <video
        ref={videoRef}
        className="camera-video"
        playsInline
        muted
        autoPlay
      />

      {/* Bounding box overlay */}
      {videoRef.current && (
        <BoundingBoxOverlay
          detections={detections}
          videoWidth={videoRef.current.videoWidth || 0}
          videoHeight={videoRef.current.videoHeight || 0}
        />
      )}

      {/* Status indicator */}
      {status === 'loading' && (
        <div className="status-indicator status-loading">
          Initializing...
        </div>
      )}

      {status === 'no-camera' && (
        <div className="status-indicator status-error">
          {errorMessage}
        </div>
      )}

      {status === 'ready' && !modelLoaded && (
        <div className="status-indicator status-loading">
          Model not loaded - add model.onnx to /public/models/
        </div>
      )}

      {/* FPS counter */}
      {status === 'ready' && modelLoaded && (
        <div className="fps-counter">
          {fps} FPS | {detections.length} detections
        </div>
      )}
    </div>
  );
}
