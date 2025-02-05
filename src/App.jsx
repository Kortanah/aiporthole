import React, { useState } from "react";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const App = () => {
  const [file, setFile] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [labeledImage, setLabeledImage] = useState(null);

  const API_URL = "https://pothole-api-595422885057.us-central1.run.app";

  const handleFileUpload = (e) => {
    setFile(e.target.files[0]);
    setLabeledImage(null);
    setResults(null);
  };

  const detectPotholes = async () => {
    if (!file) {
      alert("Please select a file before detecting.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/analyze-pothole`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Detection failed. Please try again.");
      }

      const data = await response.json();

      setResults({
        severity: data.severity,
        num_potholes: data.num_potholes_detected,
      });

      setLabeledImage(data.labeled_image_url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 flex flex-col items-center">
      <div className="max-w-3xl w-full">
        <h1 className="text-3xl font-extrabold text-center mb-6 mt-6">
          Pothole Detection Tool
        </h1>

        <label className="flex items-center justify-center bg-gray-800 text-gray-300
                           rounded-lg p-3 mb-4 cursor-pointer hover:bg-gray-700 transition py-8 border border-gray-600 border-dashed">
          <Upload className="mr-2" />
          {file ? file.name :
           (<span>Select an Image File</span>)}
          
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        <button
          onClick={detectPotholes}
          className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition flex justify-center items-center ${
            loading && "opacity-50 cursor-not-allowed"
          }`}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="animate-spin mr-2" />
          ) : (
            "Detect Potholes"
          )}
        </button>

        {error && (
          <div className="mt-4 text-red-400 flex items-center">
            <AlertCircle className="mr-2" />
            <strong>Error:</strong> {error}
          </div>
        )}

        {results && !loading &&(
          <div className="mt-8 bg-gray-800 p-4 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-2 flex items-center">
              <CheckCircle2 className="mr-2 text-green-400" /> Detection Results
            </h2>
            <p>
              <strong>Severity:</strong> {results.severity}
            </p>
            <p>
              <strong>Number of Potholes Detected:</strong>{" "}
              {results.num_potholes}
            </p>
          </div>
        )}

        {file && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold mb-2">Unlabeled Image:</h3>
              <img
                src={URL.createObjectURL(file)}
                alt="Uploaded"
                className="w-full rounded-lg shadow-md"
              />
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Labeled Image:</h3>
              {labeledImage && 
                <img
                  src={`${API_URL}${labeledImage}`}
                  alt="Labeled Detection Result"
                  className="w-full rounded-lg shadow-md"
                />}
              
                {loading && <p>Loading Image...</p> }
                
                {!loading && file && !results && <p>No Image</p>}
             
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
