'use client';

import * as React from 'react';
import { useEdgeStore } from '../../lib/edgestore';
import { FFmpeg } from '@ffmpeg/ffmpeg'; // Import FFmpeg
import { fetchFile, toBlobURL } from '@ffmpeg/util'; // Import fetchFile

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

  // FFmpeg related states and ref
  const ffmpegRef = React.useRef<FFmpeg | null>(null);
  const [ffmpegLoaded, setFFmpegLoaded] = React.useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = React.useState(false);
  const [videoGenerationProgress, setVideoGenerationProgress] = React.useState<string>('');

  const [imagesUploaded, setImagesUploaded] = React.useState(false);
  //const [audiosUploaded, setAudiosUploaded] = React.useState(false);

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
        // Note: For ffmpeg-wasm to load correctly, your server (Next.js)
        // must send Cross-Origin-Opener-Policy: same-origin and
        // Cross-Origin-Embedder-Policy: require-corp headers.
        // This is typically configured in next.config.ts.
        // If still facing issues, ensure ffmpeg-core.js, ffmpeg-core.wasm,
        // and ffmpeg-core.worker.js are in your /public/ffmpeg directory.
        await ffmpeg.load({
              coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
              wasmURL: await toBlobURL(
                `${baseURL}/ffmpeg-core.wasm`,
                "application/wasm"
              ),
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
        const newFiles = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/')); // Only accept images
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
      if (imagesUploaded) {
        const newFiles = Array.from(e.target.files).filter(file => file.type.startsWith('audio/')); // Only accept auadio files
        setFiles(newFiles);
        setError(null);
        setUploadComplete(false);
        setUploadProgressMap(new Map());
      } else {
        const newFiles = Array.from(e.target.files).filter(file => file.type.startsWith('image/')); // Only accept images
        setFiles(newFiles);
        setError(null);
        setUploadComplete(false);
        setUploadProgressMap(new Map());
      }
      
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

  const removeAllFiles = () => {
    setFiles([]);
  };

  /*
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
    // Do not clear files here, as they are needed for video generation
    // setFiles([]);
    // setUploadProgressMap(new Map());
  };*/

  // --- Handle Video Generation ---
  const handleGenerateVideo = async () => {
    if (!ffmpegLoaded || !ffmpegRef.current) {
      setError('FFmpeg is not loaded yet. Please wait.');
      return;
    }
    if (files.length === 0) {
      setError('Please select images first to generate a video.');
      return;
    }

    setImagesUploaded(false);
    setAudiosUploaded(false);
    setIsGeneratingVideo(true);
    setError(null);
    setVideoGenerationProgress('');

    try {
      const ffmpeg = ffmpegRef.current;
      const targetExtension = 'jpeg'; // <--- Define your target extension here (e.g., 'png', 'webp')
      const convertedImageNames: string[] = [];

      // Step 1: Convert all uploaded images to the target format
      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          // Give the original file a unique name in FFmpeg's VFS
          const originalFileName = `original_image_${String(i).padStart(3, '0')}.${file.name.split('.').pop()}`;
          // Define the output filename with the target extension
          const convertedFileName = `converted_image_${String(i).padStart(3, '0')}.${targetExtension}`;
          convertedImageNames.push(convertedFileName);

          // Write the original file data to FFmpeg's virtual file system
          // fetchFile can handle File objects directly in newer @ffmpeg/util versions
          await ffmpeg.writeFile(originalFileName, await fetchFile(file));
          console.log(`Wrote original ${originalFileName} to FFmpeg FS`);
          setVideoGenerationProgress(`Converting ${file.name} to ${targetExtension.toUpperCase()}...`);

          await ffmpeg.exec(['-i', originalFileName, '-q:v', '5', convertedFileName]);

          console.log(`Converted ${originalFileName} to ${convertedFileName}`);

          // Optional: Delete the original file from VFS to free up memory
          //await ffmpeg.deleteFile(originalFileName);
          //console.log(`Deleted original ${originalFileName} from FFmpeg FS`);
      }

      removeAllFiles();

      setVideoGenerationProgress(`All images converted to ${targetExtension.toUpperCase()}.`);
      setImagesUploaded(true);

      /*
      const outputFileName = 'output.mp4';
      await ffmpeg.exec([
        '-framerate', '1', // Frames per second for input images
        '-i', `converted_image_%03d.${targetExtension}`, // Input pattern, assuming consistent extension
        '-c:v', 'libx264',
        '-r', '30', // Output video framerate
        '-pix_fmt', 'yuv420p',
        '-vf', 'scale=w=1920:h=1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black', // Ensure even dimensions
        outputFileName,
      ]);

      // Read the output file from FFmpeg's virtual file system
      // Explicitly assert 'data' as Uint8Array to resolve TypeScript error
      const data = await ffmpeg.readFile(outputFileName) as Uint8Array;

      // Create a Blob and download link
      // Use new Uint8Array(data.buffer) to ensure it's a standard ArrayBufferView
      const blob = new Blob([new Uint8Array(data as any)], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outputFileName;
      document.body.appendChild(a);
      a.click();

      console.log('Video generated and downloaded successfully!');
      setVideoGenerationProgress('Video generated and downloaded!');*/
    } catch (err) {
      console.error('Error generating video:', err);
      setError(`Failed to generate video: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGeneratingVideo(false);
      // Clean up files from FFmpeg's virtual file system if needed
      // For simplicity, we're not explicitly clearing FS here, but in a large app, you might want to.
    }
  };

  const handlePutAudio = async () => {
    console.log('Handling audio...');

    try {
      const ffmpeg = ffmpegRef.current;
      const targetExtension = 'jpeg';

      if (files.length > 1) {
        /* Concat the audio */
      } else {
        const audioFile = files[0];

        await ffmpeg!.writeFile(audioFile.name, await fetchFile(audioFile));
        console.log(ffmpeg!.listDir("/"));

        /* Create the video then add the music to the video */
        const videoFileName = 'video.mp4';
        await ffmpeg!.exec([
          '-framerate', '1', // Frames per second for input images
          '-i', `converted_image_%03d.${targetExtension}`, // Input pattern, assuming consistent extension
          '-c:v', 'libx264',
          '-r', '30', // Output video framerate
          '-pix_fmt', 'yuv420p',
          '-vf', 'scale=w=1920:h=1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black', // Ensure even dimensions
          videoFileName,
        ]);

        console.log("created vid");

        console.log(files[0].name);

        const outputFileName = 'output.mp4';
        await ffmpeg!.exec([
          '-i', videoFileName,
          '-i', files[0].name,
          '-map', '0:v',
          '-map', '1:a',
          '-c:v', 'copy',
          '-c:a', 'aac',
          '-b:a', '192k',
          '-shortest', outputFileName
        ]);

        console.log("created vid with audio");

        // Read the output file from FFmpeg's virtual file system
        // Explicitly assert 'data' as Uint8Array to resolve TypeScript error
        const data = await ffmpeg!.readFile(outputFileName) as Uint8Array;

        // Create a Blob and download link
        // Use new Uint8Array(data.buffer) to ensure it's a standard ArrayBufferView
        const blob = new Blob([new Uint8Array(data)], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = outputFileName;
        document.body.appendChild(a);
        a.click();

        console.log('Video with audio generated and downloaded successfully!');
      }

      /*

      // Read the output file from FFmpeg's virtual file system
      // Explicitly assert 'data' as Uint8Array to resolve TypeScript error
      const data = await ffmpeg.readFile(outputFileName) as Uint8Array;

      // Create a Blob and download link
      // Use new Uint8Array(data.buffer) to ensure it's a standard ArrayBufferView
      const blob = new Blob([new Uint8Array(data as any)], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outputFileName;
      document.body.appendChild(a);
      a.click();

      console.log('Video generated and downloaded successfully!');
      setVideoGenerationProgress('Video generated and downloaded!');*/
    } catch (err) {
      console.error('Error generating video:', err);
      setError(`Failed to generate video: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsGeneratingVideo(false);
      // Clean up files from FFmpeg's virtual file system if needed
      // For simplicity, we're not explicitly clearing FS here, but in a large app, you might want to.
    }
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
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">{imagesUploaded ? "Select one or more audio files" : "Select your images"}</h2>

        {/* Regular File Input Area (still needed for click-to-select) */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors duration-200 ease-in-out"
          onClick={() => document.getElementById('file-input')?.click()}
        >{ imagesUploaded ? 
        <input
          id="file-input"
          type="file"
          multiple
          accept="audio/*"
          className="hidden"
          onChange={handleFileChange}
        />
        :
        <input
          id="file-input"
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        }
          
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="mt-2 text-sm text-gray-600">
            <span className="font-medium text-blue-600">Click to select</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">Supports multiple formats</p>
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

        {/* Video Generation Progress/Status */}
        {isGeneratingVideo && (
          <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-md text-sm text-purple-800 text-center">
            <p className="font-semibold">Generating Video...</p>
            <p className="text-xs mt-1">{videoGenerationProgress}</p>
          </div>
        )}
        {!ffmpegLoaded && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800 text-center">
            Loading video tools (FFmpeg)... Please wait.
          </div>
        )}


        {/* Upload Button
        <button
          onClick={handleUpload}
          disabled={files.length === 0 || isUploading || isGeneratingVideo}
          className={`mt-6 w-full py-3 rounded-lg text-white font-semibold transition-colors duration-200 ${
            files.length === 0 || isUploading || isGeneratingVideo ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isUploading ? 'Uploading...' : uploadComplete ? 'Uploaded!' : 'Upload All Files'}
        </button> */}

        {/* Generate Video Button */}
        <button
          onClick={imagesUploaded ? handlePutAudio : handleGenerateVideo}
          disabled={!ffmpegLoaded || files.length === 0 || isGeneratingVideo || isUploading}
          className={`mt-4 w-full py-3 rounded-lg text-white font-semibold transition-colors duration-200 ${
            !ffmpegLoaded || files.length === 0 || isGeneratingVideo || isUploading ? 'bg-purple-300 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          {imagesUploaded ? 'Generate video' : 'Next'}
        </button>
      </div>
    </div>
  );
}
