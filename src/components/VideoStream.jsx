import React, { useState, useRef, useEffect } from "react";
import { CheckCircle2, AlertCircle, Loader2, Camera } from "lucide-react";

const VideoStream = () => {
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [streamActive, setStreamActive] = useState(false);
  const [cameraActivated, setCameraActivated] = useState(false); // New state for camera activation
  const [detectionActive, setDetectionActive] = useState(false);
  const [detectionLoading, setDetectionLoading] = useState(false); // Added loading state
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const ws = useRef(null);
  const [deviceId, setDeviceId] = useState(null);
  const [processedImageSrc, setProcessedImageSrc] = useState(null);
  const frameTimerRef = useRef(null);

  const [totalPotholes, setTotalPotholes] = useState(0);
  const [previousPotholeCount, setPreviousPotholeCount] = useState(0);
  const [averageSeveritySum, setAverageSeveritySum] = useState(0);
  const [severityCount, setSeverityCount] = useState(0);
  const [averageSeverity, setAverageSeverity] = useState(0);
  const [totalAverageSeverity, setTotalAverageSeverity] = useState(0);

  const WEBSOCKET_URL = "wss://ai-pothole-detector-app-595422885057.us-central1.run.app/stream";

  const getCameraDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === "videoinput");
      if (videoDevices.length === 0) {
        setError("No camera found.");
        return;
      }
      setDeviceId(videoDevices[0].deviceId);
    } catch (err) {
      console.error("Error enumerating devices:", err);
      setError("Error accessing camera devices.");
    }
  };

  const startWebcam = async () => {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());

    } catch (permissionErr) {
      console.error("Camera permission denied:", permissionErr);
      setError("Camera permission denied. Please allow camera access in your browser settings.");
      return;
    }

    if (!deviceId) {
      await getCameraDevices();
      if (!deviceId) {
        return;
      }
    }


    const constraints = {
        video: {
          facingMode: "environment" ,
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
      };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStreamActive(true);
      setCameraActivated(true); // Camera is now activated
      console.log("Webcam started");
    } catch (err) {
      console.error("Error accessing webcam:", err);
      setError("Error accessing webcam.  Make sure no other applications are using it.");
    }
  };

  const stopWebcam = () => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject;
      if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop());
      }
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
    setCameraActivated(false); // Camera is no longer activated
    stopDetection();
    console.log("Webcam stopped");
  };

  const startDetection = async () => {
    console.log("Detection started");
    setDetectionLoading(true); // Start loading
    try {
      await connectWebSocket();
    } catch (error) {
      console.error("Error starting detection:", error);
      setError("Failed to start detection.");
      setDetectionLoading(false); // Stop loading on error
    } finally {
      setDetectionLoading(false); // Ensure loading is stopped after attempt
    }
  };

  const stopDetection = () => {
    setDetectionActive(false);
    setDetectionLoading(false);
    if (ws.current) {
      ws.current.close();
    }
    setProcessedImageSrc(null);
    console.log("Detection stopped");
    clearInterval(frameTimerRef.current);
    frameTimerRef.current = null;
    setPreviousPotholeCount(0);
    setTotalPotholes(0);
    setAverageSeveritySum(0);
    setSeverityCount(0);
    setAverageSeverity(0);
    setTotalAverageSeverity(0);

  };

  const connectWebSocket = () => {
    return new Promise((resolve, reject) => {
      ws.current = new WebSocket(WEBSOCKET_URL);
  
      ws.current.onopen = () => {
        console.log("WebSocket connected");
        setDetectionActive(true);
        resolve();
      };
  
      ws.current.onclose = () => {
        console.log("WebSocket disconnected");
        setDetectionActive(false);
        setDetectionLoading(false);
        clearInterval(frameTimerRef.current);
        frameTimerRef.current = null;
      };
  
      ws.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setError("WebSocket error. Check console.");
        setDetectionActive(false);
        setDetectionLoading(false);
        stopWebcam();
        clearInterval(frameTimerRef.current);
        frameTimerRef.current = null;
        reject(error);
      };
  
      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
  
          if (data.image) {
            const imageUrl = `data:image/jpeg;base64,${data.image}`;
            setProcessedImageSrc(imageUrl);
          }
  
          if (data.pothole_count !== undefined && data.average_severity !== undefined) {
            const potholeDifference = Math.abs(data.pothole_count - previousPotholeCount);
            setTotalPotholes((prevTotal) => prevTotal + potholeDifference);
  
            if (data.pothole_count === previousPotholeCount) {
              setAverageSeveritySum((prevSum) => prevSum + data.average_severity);
              setSeverityCount((prevCount) => prevCount + 1);
              setAverageSeverity((averageSeveritySum + data.average_severity) / (severityCount + 1));
              setTotalAverageSeverity((prevTotal) => prevTotal + averageSeverity);
            } else {
              setAverageSeveritySum(data.average_severity);
              setSeverityCount(1);
              setAverageSeverity(data.average_severity);
              setTotalAverageSeverity(0);
            }
  
            setResults({
              num_potholes: data.pothole_count,
              average_severity: data.average_severity,
            });
  
            setPreviousPotholeCount(data.pothole_count);
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
          console.log("Raw data:", event.data);
          setError("Failed to process data from server");
        }
      };
    });
  };

  const sendFrameToServer = () => {
    if (
      !streamActive ||
      !videoRef.current ||
      !ws.current ||
      ws.current.readyState !== WebSocket.OPEN ||
      !detectionActive
    ) {
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
      return;
    }

    const context = canvasRef.current.getContext("2d");
    canvasRef.current.width = 640;
    canvasRef.current.height = 640;

    context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
    canvasRef.current.toBlob(
      (blob) => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(blob);
        }
      },
      "image/jpeg",
      0.7
    );
  };

  useEffect(() => {
    getCameraDevices();

    return () => {
      stopWebcam();
      stopDetection();
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (streamActive && detectionActive) {
      if (!frameTimerRef.current) {
        frameTimerRef.current = setInterval(sendFrameToServer, 200);
        console.log("Frame timer started");
      }
    } else {
      setProcessedImageSrc(null);
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
      console.log("Frame timer stopped");
    }
  }, [streamActive, detectionActive]);


  const getButtonColor = (isActive, baseColor) => {
    return ` ${isActive ? 'bg-red-600' : baseColor} ${isActive ? 'hover:bg-red-700' : 'hover:bg-blue-700'}`;
  };

  return (
    <>
      <h1 className="text-3xl font-extrabold text-center mb-6">Real-Time Video Detection</h1>
      <div className="flex flex-col items-center">
        <button
          onClick={streamActive ? stopWebcam : startWebcam}
          className={`w-full  ${getButtonColor(streamActive, "bg-green-600")} text-white font-semibold py-3 px-6 rounded-lg mt-4 transition duration-200 bg-green`}
        >
          {streamActive ? "Stop Webcam" : (cameraActivated ? "Start Camera" : "Activate Camera")}
        </button>

        <button
          onClick={detectionActive ? stopDetection : startDetection}
          className={`w-full ${getButtonColor(detectionActive, "bg-blue-600")} text-white font-semibold py-3 px-6 rounded-lg mt-4 transition duration-200`}
          disabled={!streamActive || detectionLoading}
        >
          {detectionLoading ? (
            <>
              <Loader2 className="mr-2 animate-spin inline" />
              Loading...
            </>
          ) : (
            detectionActive ? "Stop Detection" : "Start Detection"
          )}
        </button>

      {results && (
        <div className="mt-8 bg-gray-800 p-4 w-full rounded-lg shadow-lg">
          <h2 className="text-xl font-bold mb-2 flex items-center">
            <CheckCircle2 className="mr-2 text-green-400" /> Overall Results
          </h2>
          <p>
            <strong>Potholes Detected (since start):</strong> {results.num_potholes}
          </p>
          <p>
            <strong>Average Severity (for current pothole count):</strong> {averageSeverity.toFixed(2)}
          </p>
        </div>
      )}

      <div className="flex md:flex-row flex-col items-center mt-4 w-full">
        <div className="w-full md:w-1/2 flex flex-col items-center p-2">
          <h3 className="text-sm font-semibold mb-2">Processed Stream:</h3>
          {processedImageSrc ? (
            <img
              src={processedImageSrc}
              alt="Processed Video"
              className="w-full rounded-lg shadow-md"
              style={{ height: "auto", maxWidth: "400px" }}
            />
          ) : (
            <p>Processed stream will appear here when detection is running.</p>
          )}
        </div>

        <div className="w-full md:w-1/2 flex flex-col items-center p-2">
          <h3 className="text-sm font-semibold mb-2">Original Stream:</h3>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full rounded-lg shadow-md"
            style={{ height: "auto", maxWidth: "400px" }}
            muted
          />
        </div>
      </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {error && (
        <div className="mt-4 text-red-400 flex items-center">
          <AlertCircle className="mr-2" />
          <strong>Error:</strong> {error}
        </div>
      )}
    </>
  );
};

export default VideoStream;