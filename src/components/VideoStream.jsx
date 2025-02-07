import React, { useState, useRef, useEffect } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

const VideoStream = () => {
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [streamActive, setStreamActive] = useState(false);
  const [detectionActive, setDetectionActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const ws = useRef(null);
  const [deviceId, setDeviceId] = useState(null);
  const [processedImageSrc, setProcessedImageSrc] = useState(null); // Processed image
  const frameTimerRef = useRef(null);

  const [totalPotholes, setTotalPotholes] = useState(0);
  const [previousPotholeCount, setPreviousPotholeCount] = useState(0); // Store the previous pothole count
  const [averageSeveritySum, setAverageSeveritySum] = useState(0);
  const [severityCount, setSeverityCount] = useState(0);
  const [averageSeverity, setAverageSeverity] = useState(0);
  const [totalAverageSeverity, setTotalAverageSeverity] = useState(0);  // New state variable

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

    // Request camera permission if not already granted
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately

    } catch (permissionErr) {
      console.error("Camera permission denied:", permissionErr);
      setError("Camera permission denied. Please allow camera access in your browser settings.");
      return;
    }

    if (!deviceId) {
      // If no deviceId, try getting camera devices again.  If that fails, user probably denied permission.
      await getCameraDevices();
      if (!deviceId) {
        return; // Exit if still no deviceId after re-attempting to get devices.
      }
    }

    // const constraints = {
    //   video: {
    //     deviceId: { exact: deviceId },
    //     width: { ideal: 640 },
    //     height: { ideal: 480 },
    //   },
    // };

    const constraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          facingMode: { ideal: "environment" }, // Request the back camera
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStreamActive(true);
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
    stopDetection();
    console.log("Webcam stopped");
  };

  const startDetection = () => {
    console.log("Detection started");
    connectWebSocket();
  };

  const stopDetection = () => {
    setDetectionActive(false);
    if (ws.current) {
      ws.current.close();
    }
    setProcessedImageSrc(null);
    console.log("Detection stopped");
    clearInterval(frameTimerRef.current);
    frameTimerRef.current = null;
  };

  const connectWebSocket = () => {
    ws.current = new WebSocket(WEBSOCKET_URL);  // Use WEBSOCKET_URL

    ws.current.onopen = () => {
      console.log("WebSocket connected");
      setDetectionActive(true);
    };

    ws.current.onclose = () => {
      console.log("WebSocket disconnected");
      setDetectionActive(false);
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      setError("WebSocket error. Check console.");
      setDetectionActive(false);
      stopWebcam();
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.image) {
          const imageUrl = `data:image/jpeg;base64,${data.image}`;
          setProcessedImageSrc(imageUrl);
        }

        if (data.pothole_count !== undefined && data.average_severity !== undefined) {
          // Total Pothole Count Logic
          const potholeDifference = Math.abs(data.pothole_count - previousPotholeCount);
          setTotalPotholes((prevTotal) => prevTotal + potholeDifference);

          // Average Severity Logic
          if (data.pothole_count === previousPotholeCount) {
            setAverageSeveritySum((prevSum) => prevSum + data.average_severity);
            setSeverityCount((prevCount) => prevCount + 1);
            setAverageSeverity((averageSeveritySum + data.average_severity) / (severityCount + 1));  //Calculate immediately
            // Accumulate totalAverageSeverity only if pothole_count repeats
            setTotalAverageSeverity((prevTotal) => prevTotal + averageSeverity);  // ADD to running total
          } else {
            // Reset average severity calculation
            setAverageSeveritySum(data.average_severity);
            setSeverityCount(1);
            setAverageSeverity(data.average_severity); //Current Average Severity
            setTotalAverageSeverity(0);  // RESET totalAverageSeverity
          }

          //Update the results state

          setResults({
            num_potholes: data.pothole_count,
            average_severity: data.average_severity,
          });

          // Store the current pothole count for the next frame
          setPreviousPotholeCount(data.pothole_count);
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
        console.log("Raw data:", event.data);
        setError("Failed to process data from server");
      }
    };
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
    canvasRef.current.height = 480;

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

  // Helper function to determine the button color based on its state
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
          {streamActive ? "Stop Webcam" : "Start Webcam"}
        </button>

        <button
          onClick={detectionActive ? stopDetection : startDetection}
          className={`w-full  ${getButtonColor(detectionActive, "bg-blue-600")} text-white font-semibold py-3 px-6 rounded-lg mt-4 transition duration-200`}
          disabled={!streamActive}
        >
          {detectionActive ? "Stop Detection" : "Start Detection"}
        </button>

        <div className="flex flex-col items-center md:flex-row mt-4"> {/* Added mt-4 for spacing */}
          <div className="flex flex-col items-center mr-4 mb-4 md:mb-0"> {/* Added responsive margin */}
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

          <div className="flex flex-col items-center">
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
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {error && (
        <div className="mt-4 text-red-400 flex items-center">
          <AlertCircle className="mr-2" />
          <strong>Error:</strong> {error}
        </div>
      )}

      {results && (

        <div className="mt-8 bg-gray-800 p-4 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold mb-2 flex items-center">
            <CheckCircle2 className="mr-2 text-green-400" /> Overall Results
          </h2>
          <p>
            <strong>Potholes Detected:</strong> {results.num_potholes}
          </p>
          <p>
            <strong>Average Severity (for current pothole count):</strong> {averageSeverity.toFixed(2)}
          </p>

          {/* <p> */}
          {/* <strong>Total Average Severity:</strong> {totalAverageSeverity.toFixed(2)} */}
          {/* </p> */}
        </div>
      )}

    </>
  );
};

export default VideoStream;