import React, { useState, useCallback } from "react";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useDropzone } from 'react-dropzone';

const ImageDetection = () => {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const imagesPerPage = 5;
  const [singleImageResult, setSingleImageResult] = useState(null); // Holds the single image result
  const [labeledImage, setLabeledImage] = useState(null); // Holds the single labeled image URL

  // API URL
  const API_URL = "https://ai-pothole-detector-app-595422885057.us-central1.run.app";


    const onDrop = useCallback((acceptedFiles) => {
        setFiles(acceptedFiles);
        setResults([]); // Clear previous results when new files are dropped
        setSingleImageResult(null); //Clear single image when new files uploaded
        setLabeledImage(null)
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: true,
        accept: 'image/*', // Accept only image files
        maxFiles: 10,
    });



  const detectPotholes = async (image) => {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", image);

    try {
      const response = await fetch(`${API_URL}/analyze-pothole`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Detection failed. Please try again.");
      }

      const data = await response.json();

      return {
        unlabeledImage: URL.createObjectURL(image),
        labeledImage: `${API_URL}${data.labeled_image_url}`,
        severity: data.severity,
        num_potholes: data.num_potholes_detected,
      };
    } catch (err) {
      setError(err.message);
      return null; // Indicate failure
    } finally {
      setLoading(false);
    }
  };

  const processAllImages = async () => {
      if (files.length === 1) {
          // Handle single image upload
          setLoading(true);
          setError(null);
          try {
              const result = await detectPotholes(files[0]);
              if (result) {
                  setSingleImageResult({ ...result });
                  setLabeledImage(result.labeledImage); // Set the labeled image URL
              }
          } catch (err) {
              setError(err.message);
          } finally {
              setLoading(false);
          }
      } else {
          // Handle multiple images
          setLoading(true);
          setError(null);
          setResults([]);

          const newResults = [];
          for (let i = 0; i < files.length; i++) {
              try {
                  const result = await detectPotholes(files[i]);
                  if (result) {
                      newResults.push({ id: i + 1, ...result });
                  }
              } catch (err) {
                  setError(`Error processing image ${i + 1}: ${err.message}`);
                  // Continue processing other images even if one fails
              }
          }

          setResults(newResults);
          setLoading(false);
      }
  };


  // Pagination Logic
  const indexOfLastImage = currentPage * imagesPerPage;
  const indexOfFirstImage = indexOfLastImage - imagesPerPage;
  const currentImages = results.slice(indexOfFirstImage, indexOfLastImage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const hasResults = files.length === 1 && singleImageResult !== null
    const hasMultiResults = files.length > 1 && results.length > 0;
    const showUploadMessage = !loading && files.length === 0;

  return (
    <>
      <h1 className="text-3xl font-extrabold text-center mb-6">Pothole Detection Tool</h1>

        <div {...getRootProps()} className={`flex items-center justify-center bg-gray-800 text-gray-300 rounded-lg p-3 mb-4 cursor-pointer hover:bg-gray-700 transition py-8 border border-gray-600 border-dashed ${isDragActive ? 'border-blue-500 bg-gray-700' : ''}`}>
            <input {...getInputProps()} />
            <Upload className="mr-2" />
            {files.length > 0 ? (
                <span>Selected {files.length} images</span>
            ) : (
                <span>Drag and drop some images here, or click to select files</span>
            )}
        </div>

      <button
        onClick={processAllImages}
        className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition flex justify-center items-center ${
          loading && "opacity-50 cursor-not-allowed"
        }`}
        disabled={loading || files.length === 0}
      >
        {loading ? <Loader2 className="animate-spin mr-2" /> : "Detect Potholes"}
      </button>

      {error && (
        <div className="mt-4 text-red-400 flex items-center">
          <AlertCircle className="mr-2" />
          <strong>Error:</strong> {error}
        </div>
      )}
        {/* Single Image Result */}
        {files.length === 1 && singleImageResult && !loading && (
            <div className="mt-8 bg-gray-800 p-4 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold mb-2 flex items-center">
                    <CheckCircle2 className="mr-2 text-green-400" /> Detection Results
                </h2>
                <p>
                    <strong>Severity:</strong> {singleImageResult.severity}
                </p>
                <p>
                    <strong>Number of Potholes Detected:</strong> {singleImageResult.num_potholes}
                </p>
            </div>
        )}

        {files.length === 1 && files[0] && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-sm font-semibold mb-2">Unlabeled Image:</h3>
                    <img src={singleImageResult?.unlabeledImage ?? URL.createObjectURL(files[0])} alt="Uploaded" className="w-full rounded-lg shadow-md" />
                </div>

                <div>
                    <h3 className="text-sm font-semibold mb-2">Labeled Image:</h3>
                    {labeledImage && (
                        <img
                            src={labeledImage}
                            alt="Labeled Detection Result"
                            className="w-full rounded-lg shadow-md"
                        />
                    )}
                    {loading && <p>Loading Image...</p>}
                    {!loading && !labeledImage && singleImageResult && <p>No Labeled Image</p>}

                </div>
            </div>
        )}

      {/* Results Table */}
      {files.length > 1 && results.length > 0 && (
        <div className="overflow-x-auto mt-8">
          <table className="min-w-full bg-gray-800 rounded-lg shadow-lg">
            <thead className="bg-gray-700">
              <tr>
                <th className="py-3 px-6 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  ID
                </th>
                <th className="py-3 px-6 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Unlabeled Image
                </th>
                <th className="py-3 px-6 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Labeled Image
                </th>
                <th className="py-3 px-6 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Severity
                </th>
                <th className="py-3 px-6 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Potholes Detected
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-600">
              {currentImages.map((result) => (
                <tr key={result.id}>
                  <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-300">{result.id}</td>
                  <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-300">
                    <img
                      src={result.unlabeledImage}
                      alt="Unlabeled"
                      className="w-20 h-20 object-cover rounded"
                    />
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-300">
                    <img
                      src={result.labeledImage}
                      alt="Labeled"
                      className="w-20 h-20 object-cover rounded"
                    />
                  </td>
                  <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-300">{result.severity}</td>
                  <td className="py-4 px-6 whitespace-nowrap text-sm text-gray-300">{result.num_potholes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {files.length > 1 && results.length > imagesPerPage && (
        <div className="mt-4 flex justify-center">
          {Array.from({ length: Math.ceil(results.length / imagesPerPage) }, (_, i) => i + 1).map(
            (number) => (
              <button
                key={number}
                onClick={() => paginate(number)}
                className={`mx-1 px-3 py-1 rounded-full ${
                  currentPage === number ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {number}
              </button>
            )
          )}
        </div>
      )}
    </>
  );
};

export default ImageDetection;