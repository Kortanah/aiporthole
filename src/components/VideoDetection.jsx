import React, { useState, useRef, useEffect } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

const VideoDetection = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [labeledImage, setLabeledImage] = useState(null);  // Unused but keeping it
  const [streamActive, setStreamActive] = useState(false);
  const [detectionActive, setDetectionActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const ws = useRef(null);
  const [videoFile, setVideoFile] = useState(null); // Local video file state
  const [processedImageSrc, setProcessedImageSrc] = useState(null);
  const frameTimerRef = useRef(null);
  const [videoWidth, setVideoWidth] = useState(640); // default size to work when url is empty
  const [videoHeight, setVideoHeight] = useState(480);
  const API_URL = "https://ai-pothole-detector-app-595422885057.us-central1.run.app";


  const handleVideoUpload = (event) => {
    const file = event.target.files[0];
    setVideoFile(file);
    setResults(null); //clear previous results
    if (file) {
      const videoURL = URL.createObjectURL(file);
      if (videoRef.current) {
        videoRef.current.src = videoURL;
        videoRef.current.onloadedmetadata = () => {
          setVideoWidth(videoRef.current.videoWidth);
          setVideoHeight(videoRef.current.videoHeight);
          setStreamActive(true);
        }
      }
    }
  };

  const startDetection = () => {
    console.log("Detection started");
    setLoading(true); // Start loading state
    connectWebSocket();
  };

  const stopDetection = () => {
    setDetectionActive(false);
    if (ws.current) {
      ws.current.close();
    }
    setProcessedImageSrc(null);
    setLoading(false); // Stop loading state
    console.log("Detection stopped");
    clearInterval(frameTimerRef.current);
    frameTimerRef.current = null;
  };

  const connectWebSocket = () => {
    ws.current = new WebSocket("wss://ai-pothole-detector-app-595422885057.us-central1.run.app/stream");

    ws.current.onopen = () => {
      console.log("WebSocket connected");
      setDetectionActive(true);
    };

    ws.current.onclose = () => {
      console.log("WebSocket disconnected");
      setDetectionActive(false);
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
      setLoading(false);  // Stop loading on close
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      setError("WebSocket error. Check console.");
      setDetectionActive(false);
      stopDetection();
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
      setLoading(false);  // Stop loading on error
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.image) {
          const imageUrl = `data:image/jpeg;base64,${data.image}`;
          setProcessedImageSrc(imageUrl);
          setLoading(false); // Image received, stop loading
        }

        // Make sure the result is not null when the stream is off
        if (data.pothole_count !== undefined && data.average_severity !== undefined) {
          setResults({
            num_potholes: data.pothole_count,
            average_severity: data.average_severity,
          });
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
        setError("Failed to process data from server");
        setLoading(false);  // Stop loading on data processing error
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
    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;

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
    return () => {
      stopDetection();
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;

      if (videoFile) {
        URL.revokeObjectURL(videoRef.current.src);
      }
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
  }, [streamActive, detectionActive, videoWidth, videoHeight]);


  const getButtonColor = (isActive, baseColor) => {
    return `bg-${isActive ? 'red' : baseColor}-600 hover:bg-${isActive ? 'red' : baseColor}-700`;
  };

  return (
    <>
      <h1 className="text-3xl font-extrabold text-center mb-6">Real-Time Video Detection</h1>

      <div className="flex flex-col items-center">
        {/* Video Upload */}
        <label className="flex items-center justify-center bg-gray-800 w-full text-gray-300 rounded-lg p-3 mb-4 cursor-pointer hover:bg-gray-700 transition py-8 border border-gray-600 border-dashed">
          <span>Upload a Video File</span>
          <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
        </label>


        {/* Start/Stop Detection Button */}
        <button
          onClick={detectionActive ? stopDetection : startDetection}
          className={`w-full ${getButtonColor(detectionActive, 'blue')} mb-4 text-white font-semibold py-3 px-6 rounded-lg mt-4 transition duration-200`}
          disabled={!streamActive || loading}
        >
          {detectionActive ? "Stop Detection" : "Start Detection"}
        </button>
        {/* Video Display */}
        <div className="flex flex-col items-center md:flex-row"> {/* Added responsive container */}
          <div className="flex flex-col items-center mr-4 mb-4 md:mb-0"> {/* Added responsive margins */}
            <h3 className="text-sm font-semibold mb-2">Original Stream:</h3>
            <video
              ref={videoRef}
              controls
              playsInline
              className="w-full rounded-lg shadow-md"
              style={{ height: "auto", maxWidth: "400px" }}
              muted
            />
          </div>

          <div className="flex flex-col items-center">
            <h3 className="text-sm font-semibold mb-2">Processed Stream:</h3>
            {loading && <p>Loading...</p>} {/* Show loading message */}
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
      {/* Results Display */}
      {results && (
        <div className="mt-8 bg-gray-800 p-4 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold mb-2 flex items-center">
            <CheckCircle2 className="mr-2 text-green-400" /> Detection Results
          </h2>
          <p>
            <strong>Number of Potholes Detected:</strong> {results?.num_potholes || "N/A"}
          </p>
          <p>
            <strong>Average Severity:</strong> {results?.average_severity || "N/A"}
          </p>
        </div>
      )}
    </>
  );
};

export default VideoDetection;