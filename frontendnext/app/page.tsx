import Link from "next/link";

// pages/index.js
export default function Home() {
  return (
    <main>
        <h1>Welcome to Edit Generator!</h1>
        <Link href="/about">About</Link>
        <p>   </p>
        <Link href="/pay">Pay with stripe</Link>
        <p>   </p>
        <Link href="/new-upload-files">Upload files</Link>
        <p>   </p>
        <Link href="/create">Write comment</Link>
    </main>
  )
}
