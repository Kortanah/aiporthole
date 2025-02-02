import React, { useState } from "react";

const App = () => {
  const [file, setFile] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [labeledImage, setLabeledImage] = useState(null); // Labeled result image

  const handleFileUpload = (e) => {
    setFile(e.target.files[0]);
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
      const response = await fetch("https://zany-lamp-56p55wpr557fp45r-8000.app.github.dev/analyze-pothole", {
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

      setLabeledImage(data.labeled_image_url); // Get the labeled image URL
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-screen-md mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-center">Pothole Detection App</h1>

      <input
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="mb-4 block w-full"
      />

      <button
        onClick={detectPotholes}
        className={`bg-blue-500 text-white py-2 px-4 rounded w-full ${
          loading && "opacity-50 cursor-not-allowed"
        }`}
        disabled={loading}
      >
        {loading ? "Detecting..." : "Detect Potholes"}
      </button>

      {error && (
        <div className="mt-4 text-red-600">
          <strong>Error:</strong> {error}
        </div>
      )}

      {results && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Detection Results:</h2>
          <p><strong>Severity:</strong> {results.severity}</p>
          <p><strong>Number of Potholes Detected:</strong> {results.num_potholes}</p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Unlabeled Image:</h3>
              {file && (
                <img
                  src={URL.createObjectURL(file)}
                  alt="Uploaded File"
                  className="w-full rounded-lg"
                />
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Labeled Image:</h3>
              {labeledImage ? (
                <img
                  src={`https://zany-lamp-56p55wpr557fp45r-8000.app.github.dev${labeledImage}`}
                  alt="Labeled Detection Result"
                  className="w-full rounded-lg"
                />
              ) : (
                <p>No labeled image available.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

