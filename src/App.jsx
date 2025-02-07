import React, { useState } from "react";
import ImageDetection from "./components/ImageDetection";
import VideoStream from "./components/VideoStream";
import VideoDetection from "./components/VideoDetection";

const NavButton = ({ label, onClick, isActive }) => {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg py-2 px-4 font-semibold transition-colors duration-200 ${
        isActive
          ? "bg-blue-600 text-white hover:bg-blue-700 focus:ring focus:ring-blue-300 focus:ring-opacity-50"
          : "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white focus:ring focus:ring-gray-500 focus:ring-opacity-50"
      }`}
    >
      {label}
    </button>
  );
};

const App = () => {
  const [activeComponent, setActiveComponent] = useState("image");

  const renderComponent = () => {
    switch (activeComponent) {
      case "image":
        return <ImageDetection />;
      case "videoStream":
        return <VideoStream />;
      case "videoDetection":
        return <VideoDetection />;
      default:
        return <ImageDetection />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 flex flex-col items-center">
      <nav className="w-full flex justify-between items-center p-4 bg-gray-800 rounded-md shadow-md">
        <div className="text-white text-xl font-semibold">Pothole Detection</div>
        <div className="space-x-4">
          <NavButton
            label="Image Detection"
            onClick={() => setActiveComponent("image")}
            isActive={activeComponent === "image"}
          />
          <NavButton
            label="Real-time Detection"
            onClick={() => setActiveComponent("videoStream")}
            isActive={activeComponent === "videoStream"}
          />
          <NavButton
            label="Video Detection"
            onClick={() => setActiveComponent("videoDetection")}
            isActive={activeComponent === "videoDetection"}
          />
        </div>
      </nav>
      <div className="max-w-3xl w-full mt-6">
        {renderComponent()}
      </div>
    </div>
  );
};

export default App;