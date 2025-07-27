'use client';

import * as React from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg'; // Import FFmpeg
import { fetchFile, toBlobURL } from '@ffmpeg/util'; // Import fetchFile

export default function Page() {
  const [files, setFiles] = React.useState<File[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  // FFmpeg related states and ref
  const ffmpegRef = React.useRef<FFmpeg | null>(null);
  const [ffmpegLoaded, setFFmpegLoaded] = React.useState(false);
  const [isConvertingImages, setIsConvertingImages] = React.useState(false);
  const [videoGenerationProgress, setVideoGenerationProgress] = React.useState<string>('');

  // --- Load FFmpeg on component mount ---
  React.useEffect(() => {
    const loadFFmpeg = async () => {
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
      try {
        const ffmpeg = new FFmpeg();
        // Set up logging for FFmpeg progress
        ffmpeg.on('log', ({ message }) => {
          if (message.includes('frame=')) {
            setVideoGenerationProgress(message);
          }
        });
        await ffmpeg.load({
              coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
              wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
            });
        ffmpegRef.current = ffmpeg;
        setFFmpegLoaded(true);
        console.log('FFmpeg loaded successfully!');
      } catch (err) {
        console.error('Failed to load FFmpeg:', err);
        setError('Failed to load video processing tools.');
      }
    };

    loadFFmpeg();
  }, []);

  // --- Internal file selection and upload logic ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).filter(file => file.type.startsWith('image/')); // Only accept images
      setFiles(newFiles);
      setError(null);
    }
  };

  // --- Handle Image conversion ---
  const handleConvertImages = async () => {
    if (!ffmpegLoaded || !ffmpegRef.current) {
      setError('FFmpeg is not loaded yet. Please wait.');
      return;
    }
    if (files.length === 0) {
      setError('Please select images first to generate a video.');
      return;
    }

    setIsConvertingImages(true);
    setError(null);
    setVideoGenerationProgress('');

    try {
      const ffmpeg = ffmpegRef.current;
      const targetExtension = 'jpeg'; // <--- Define your target extension here (e.g., 'png', 'webp')
      const convertedImageNames: string[] = [];

      // Convert all uploaded images to the target format
      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          // Give the original file a unique name in FFmpeg's VFS
          const originalFileName = `original_image_${String(i).padStart(3, '0')}.${file.name.split('.').pop()}`;
          // Define the output filename with the target extension
          const convertedFileName = `converted_image_${String(i).padStart(3, '0')}.${targetExtension}`;
          convertedImageNames.push(convertedFileName);

          // Write the original file data to FFmpeg's virtual file system
          await ffmpeg.writeFile(`${originalFileName}`, await fetchFile(file));
          console.log(`Wrote original ${originalFileName} to FFmpeg FS`);

          setVideoGenerationProgress(`Converting ${file.name} to ${targetExtension.toUpperCase()}...`);

          await ffmpeg.exec(['-i', originalFileName, '-q:v', '5', convertedFileName]);     //    <------

          console.log(`Converted ${originalFileName} to ${convertedFileName}`);

          // Delete the original file from VFS to free up memory
          await ffmpeg.deleteFile(originalFileName);
          console.log(`Deleted original ${originalFileName} from FFmpeg FS`);
      }

      setFiles([]);

      setVideoGenerationProgress(`All images converted to ${targetExtension.toUpperCase()}.`);
    } catch (err) {
      console.error('Error converting images:', err);
      setError(`Failed to convert images: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsConvertingImages(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md z-10 relative"> {/* Ensure content is above overlay */}
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">Select your images</h2>

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
            <span className="font-medium text-blue-600">Click to select</span>
          </p>
          <p className="text-xs text-gray-500">Supports multiple formats</p>
        </div>

        {/* Selected Files Display */}
        {files.length > 0 && (
          <div data-testid="selected-files-display" className="selected-files-display mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
            <p className="font-semibold mb-2">Selected Files ({files.length}):</p>
            <ul className="max-h-40 overflow-y-auto">
              {files.map((file) => (
                <li key={file.name} className="flex items-center justify-between py-1">
                  <span>{file.name}</span>
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

        {/* Image conversion Progress/Status */}
        {isConvertingImages && (
          <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md text-sm text-purple-800 text-center">
            <p className="font-semibold">Converting images</p>
            <p className="text-xs mt-1">{videoGenerationProgress}</p>
          </div>
        )}
        {!ffmpegLoaded && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800 text-center">
            Loading video tools (FFmpeg)... Please wait.
          </div>
        )}

        {/* Convert images button */}
        <button
          onClick={handleConvertImages}
          disabled={!ffmpegLoaded || files.length === 0 || isConvertingImages}
          className={`mt-4 w-full py-3 rounded-lg text-white font-semibold transition-colors duration-200 ${
            !ffmpegLoaded || files.length === 0 || isConvertingImages ? 'bg-purple-300 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          Convert images
        </button>
      </div>
    </div>
  );
}
