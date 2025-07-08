'use client';

import * as React from 'react';
import { useEdgeStore } from '../../lib/edgestore';

export default function Page() {
  const [files, setFiles] = React.useState<File[]>([]);
  const [uploadProgressMap, setUploadProgressMap] = React.useState<Map<string, number>>(new Map());
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadComplete, setUploadComplete] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Global drag state: controls the full-page overlay
  const [isPageDragOver, setIsPageDragOver] = React.useState(false);
  // Ref to track nested drag events
  const dragCounter = React.useRef(0);

  const { edgestore } = useEdgeStore();

  // --- Drag & Drop Handlers for the entire page ---
  React.useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current++;
      if (dragCounter.current === 1) { // Only set true on first actual drag enter
        setIsPageDragOver(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current === 0) { // Set false only when no more elements are being dragged over
        setIsPageDragOver(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault(); // Essential to allow dropping
      // No state change here, handled by dragEnter/Leave
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0; // Reset counter on drop
      setIsPageDragOver(false); // Hide overlay immediately
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const newFiles = Array.from(e.dataTransfer.files);
        setFiles(newFiles);
        setError(null);
        setUploadComplete(false);
        setUploadProgressMap(new Map());
      }
    };

    // Attach listeners to the document body
    document.body.addEventListener('dragenter', handleDragEnter);
    document.body.addEventListener('dragleave', handleDragLeave);
    document.body.addEventListener('dragover', handleDragOver);
    document.body.addEventListener('drop', handleDrop);

    // Cleanup listeners on component unmount
    return () => {
      document.body.removeEventListener('dragenter', handleDragEnter);
      document.body.removeEventListener('dragleave', handleDragLeave);
      document.body.removeEventListener('dragover', handleDragOver);
      document.body.removeEventListener('drop', handleDrop);
    };
  }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount

  // --- Internal file selection and upload logic ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles(newFiles);
      setError(null);
      setUploadComplete(false);
      setUploadProgressMap(new Map());
    }
  };

  const removeFile = (fileName: string) => {
    setFiles((prevFiles) => prevFiles.filter((file) => file.name !== fileName));
    setUploadProgressMap((prevMap) => {
      const newMap = new Map(prevMap);
      newMap.delete(fileName);
      return newMap;
    });
    setError(null);
    setUploadComplete(false);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one file to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadComplete(false);

    const uploadPromises = files.map(async (file) => {
      try {
        const res = await edgestore.publicFiles.upload({
          file,
          onProgressChange: (progress) => {
            setUploadProgressMap((prevMap) => {
              const newMap = new Map(prevMap);
              newMap.set(file.name, progress);
              return newMap;
            });
          },
        });
        console.log(`Upload successful for ${file.name}:`, res);
        return { fileName: file.name, success: true, url: res.url };
      } catch (err) {
        console.error(`Upload failed for ${file.name}:`, err);
        setError(`Failed to upload ${file.name}.`);
        return { fileName: file.name, success: false, error: err };
      }
    });

    const results = await Promise.all(uploadPromises);
    console.log('All upload results:', results);

    const allSuccessful = results.every(result => result.success);

    if (allSuccessful) {
      setUploadComplete(true);
    } else {
      setError('One or more files failed to upload. Please check the console for details.');
    }

    setIsUploading(false);
    setFiles([]);
    setUploadProgressMap(new Map());
  };

  const totalProgress = files.length > 0
    ? Array.from(uploadProgressMap.values()).reduce((sum, current) => sum + current, 0) / files.length
    : 0;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Full-page overlay for drag-over effect */}
      <div
        className={`
          fixed inset-0 bg-blue-500 bg-opacity-75 z-50
          flex flex-col items-center justify-center
          text-white text-3xl font-bold transition-opacity duration-300 pointer-events-none
          ${isPageDragOver ? 'opacity-100' : 'opacity-0'}
        `}
      >
        <svg className="mx-auto h-24 w-24 text-white mb-4 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p>Drop your images here!</p>
        <p className="text-lg font-normal mt-2">Release your mouse button to upload.</p>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md z-10 relative"> {/* Ensure content is above overlay */}
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">Upload Your Images</h2>

        {/* Regular File Input Area (still needed for click-to-select) */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors duration-200 ease-in-out"
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="mt-2 text-sm text-gray-600">
            <span className="font-medium text-blue-600">Click to select</span> or drag and drop images
          </p>
          <p className="text-xs text-gray-500">Supports multiple images</p>
        </div>

        {/* Selected Files Display */}
        {files.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
            <p className="font-semibold mb-2">Selected Files ({files.length}):</p>
            <ul className="max-h-40 overflow-y-auto">
              {files.map((file) => (
                <li key={file.name} className="flex items-center justify-between py-1">
                  <span>{file.name}</span>
                  <button
                    onClick={() => removeFile(file.name)}
                    className="text-blue-500 hover:text-blue-700 font-bold ml-2"
                    title="Remove file"
                  >
                    X
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Overall Progress Bar */}
        {isUploading && (
          <div className="mt-6">
            <div className="flex justify-between mb-1">
              <span className="text-base font-medium text-blue-700">Uploading...</span>
              <span className="text-sm font-medium text-blue-700">{totalProgress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${totalProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Upload Success Message */}
        {uploadComplete && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800 text-center">
            All files uploaded successfully! 🎉
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={files.length === 0 || isUploading || uploadComplete}
          className={`mt-6 w-full py-3 rounded-lg text-white font-semibold transition-colors duration-200 ${
            files.length === 0 || isUploading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isUploading ? 'Uploading...' : uploadComplete ? 'Uploaded!' : 'Upload All Files'}
        </button>
      </div>
    </div>
  );
}