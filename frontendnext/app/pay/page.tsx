'use client';

import React from 'react'
import { loadStripe } from '@stripe/stripe-js'

const PayPage = () => {
  const handleClick = async () => {
    const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
    const stripe = await stripePromise
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
    })
    const data = await res.json()
    stripe?.redirectToCheckout({ sessionId: data.id })
  }

  return (
    <div>
      <h1>Pay with Stripe</h1>
      <button onClick={handleClick}>Click to pay</button>
    </div>
  )
}

export default PayPage
