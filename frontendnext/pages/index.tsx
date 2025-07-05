import Link from "next/link";
import ImageToVideo from './components/image-to-video.js';

// pages/index.js
export default function Home() {
  return (
    <main>
        <h1>Welcome to Edit Generator!</h1>
        <Link href="/about">About</Link>
        <Link href="/pay">Pay with stripe</Link>
        <ImageToVideo/>
    </main>
  )
}
