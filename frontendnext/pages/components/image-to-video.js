import { useState } from 'react';
import { createFFmpeg, fetchFile, FFmpeg } from '@ffmpeg/ffmpeg';

const ffmpeg = new FFmpeg();

export default function ImageToVideo() {
  const [videoUrl, setVideoUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const convertImageToVideo = async (file) => {
    setLoading(true);
    if (!ffmpeg.isLoaded()) await ffmpeg.load();

    ffmpeg.FS('writeFile', 'input.jpg', await fetchFile(file));

    await ffmpeg.run(
      '-loop', '1',
      '-i', 'input.jpg',
      '-c:v', 'libx264',
      '-t', '5',
      '-pix_fmt', 'yuv420p',
      '-vf', 'scale=1280:720',
      'output.mp4'
    );

    const data = ffmpeg.FS('readFile', 'output.mp4');
    const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
    setVideoUrl(url);
    setLoading(false);
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => convertImageToVideo(e.target.files[0])}
      />
      {loading && <p>Processing...</p>}
      {videoUrl && <video src={videoUrl} controls />}
    </div>
  );
}
