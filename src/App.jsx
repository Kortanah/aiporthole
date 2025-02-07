import React, { useState } from "react";
import ImageDetection from "./components/ImageDetection";
import VideoStream from "./components/VideoStream";
import VideoDetection from "./components/VideoDetection";
import { Menu } from 'lucide-react'; // Import the Menu icon


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
  const [isMenuOpen, setIsMenuOpen] = useState(false); // State for mobile menu


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

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 flex flex-col items-center"> {/* Adjusted padding for smaller screens */}
      <nav className="w-full flex flex-wrap justify-between items-center p-4 bg-gray-800 rounded-md shadow-md"> {/* flex-wrap added */}
        <div className="text-white text-xl font-semibold">Pothole Detection</div>

        {/* Mobile Menu Button */}
        <button onClick={toggleMenu} className="md:hidden text-gray-300 hover:text-white focus:outline-none">
          <Menu className="h-6 w-6" />
        </button>

        {/* Navigation Links */}
        <div className={`w-full md:w-auto md:flex space-x-4 ${isMenuOpen ? 'block' : 'hidden'} md:block mt-2 md:mt-0`}> {/* Conditional class for mobile menu */}
          <NavButton
            label="Image Detection"
            onClick={() => {setActiveComponent("image"); setIsMenuOpen(false);}} // Close menu on selection
            isActive={activeComponent === "image"}
          />
          <NavButton
            label="Real-time Detection"
            onClick={() => {setActiveComponent("videoStream"); setIsMenuOpen(false);}} // Close menu on selection
            isActive={activeComponent === "videoStream"}
          />
          <NavButton
            label="Video Detection"
            onClick={() => {setActiveComponent("videoDetection"); setIsMenuOpen(false);}} // Close menu on selection
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