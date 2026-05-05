const PADDLE_SDK_URL = 'https://cdn.paddle.com/paddle/v2/paddle.js'

let paddleScriptPromise
let paddleInitialized = false

function loadPaddleScript() {
  if (window.Paddle) return Promise.resolve(window.Paddle)
  if (paddleScriptPromise) return paddleScriptPromise

  paddleScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = PADDLE_SDK_URL
    script.async = true
    script.onload = () => resolve(window.Paddle)
    script.onerror = () => reject(new Error('Failed to load Paddle.js'))
    document.head.appendChild(script)
  })

  return paddleScriptPromise
}

function getPaddleEnvironment() {
  return (import.meta.env.VITE_PADDLE_ENV || 'production').toLowerCase()
}

function getRequiredEnv() {
  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN
  const priceId = import.meta.env.VITE_PADDLE_PRICE_ID

  if (!token || !priceId) {
    throw new Error(
      'Missing Paddle environment variables: VITE_PADDLE_CLIENT_TOKEN and VITE_PADDLE_PRICE_ID.',
    )
  }

  return { token, priceId }
}

async function ensurePaddleInitialized() {
  const { token } = getRequiredEnv()
  const Paddle = await loadPaddleScript()

  if (!Paddle) {
    throw new Error('Paddle SDK is unavailable in the current browser.')
  }

  const environment = getPaddleEnvironment()
  if (environment === 'sandbox' && Paddle.Environment?.set) {
    Paddle.Environment.set('sandbox')
  }

  if (!paddleInitialized) {
    Paddle.Initialize({
      token,
      eventCallback(eventData) {
        if (eventData?.name === 'checkout.completed') {
          console.info('Paddle checkout completed.')
        }
      },
    })
    paddleInitialized = true
  }

  return Paddle
}

export async function openPaddleCheckout() {
  const { priceId } = getRequiredEnv()
  const Paddle = await ensurePaddleInitialized()

  Paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    settings: {
      displayMode: 'overlay',
      theme: 'light',
      locale: 'en',
    },
    customData: {
      product: 'dualpos-lifetime-license',
      source: 'abiad.systems',
    },
  })
}

