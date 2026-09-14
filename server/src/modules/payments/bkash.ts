import { env, isBkashLive } from '../../config/env.js'
import { logger } from '../../lib/logger.js'
import { HttpError } from '../../utils/httpError.js'

/**
 * bKash Tokenized Checkout (PGW) adapter.
 *
 * When every BKASH_* credential is configured it calls the real bKash API
 * (grant token → create payment → execute payment). Otherwise it runs a
 * self-contained **sandbox** that simulates the same three steps so the whole
 * flow works end to end in development; switching to live is only a matter of
 * setting the environment variables — no code change.
 */

export interface BkashCreateResult {
  paymentID: string
  /** URL to redirect the customer to. In sandbox mode this points back to our
   *  own callback route so the flow completes without a real gateway page. */
  bkashURL: string
  mock: boolean
}

export interface BkashExecuteResult {
  trxID: string
  amount: number
  status: 'Completed' | 'Failed'
}

// ---- Token handling (live mode) ----

let cachedToken: { idToken: string; expiresAt: number } | null = null

async function grantToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.idToken

  const res = await fetch(`${env.bkash.baseUrl}/tokenized/checkout/token/grant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      username: env.bkash.username,
      password: env.bkash.password,
    },
    body: JSON.stringify({ app_key: env.bkash.appKey, app_secret: env.bkash.appSecret }),
  })
  const data = (await res.json()) as { id_token?: string; expires_in?: number; statusMessage?: string }
  if (!res.ok || !data.id_token) {
    logger.error('bKash token grant failed', { status: res.status, message: data.statusMessage })
    throw HttpError.badGateway('bKash: could not authenticate with the gateway')
  }
  cachedToken = { idToken: data.id_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 }
  return data.id_token
}

async function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: await grantToken(),
    'X-APP-Key': env.bkash.appKey,
  }
}

// ---- Public adapter ----

/** Create a payment and return the URL to send the customer to. */
export async function createPayment(params: {
  amount: number
  callbackURL: string
  payerReference: string
  merchantInvoiceNumber: string
}): Promise<BkashCreateResult> {
  if (!isBkashLive) {
    // Sandbox: mint a payment id and route the customer back to our callback,
    // which will call execute and complete the (simulated) payment.
    const paymentID = `SB${Date.now()}${Math.floor(Math.random() * 1000)}`
    const url = new URL(params.callbackURL)
    url.searchParams.set('paymentID', paymentID)
    url.searchParams.set('status', 'success')
    return { paymentID, bkashURL: url.toString(), mock: true }
  }

  const res = await fetch(`${env.bkash.baseUrl}/tokenized/checkout/create`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      mode: '0011',
      payerReference: params.payerReference,
      callbackURL: params.callbackURL,
      amount: params.amount.toFixed(2),
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: params.merchantInvoiceNumber,
    }),
  })
  const data = (await res.json()) as { paymentID?: string; bkashURL?: string; statusMessage?: string }
  if (!res.ok || !data.paymentID || !data.bkashURL) {
    logger.error('bKash create failed', { status: res.status, message: data.statusMessage })
    throw HttpError.badGateway('bKash: could not start the payment')
  }
  return { paymentID: data.paymentID, bkashURL: data.bkashURL, mock: false }
}

/** Execute (capture) a previously created payment. */
export async function executePayment(paymentID: string, sandboxAmount?: number): Promise<BkashExecuteResult> {
  if (!isBkashLive) {
    return { trxID: `SBTRX${Math.floor(100000000 + Math.random() * 900000000)}`, amount: sandboxAmount ?? 0, status: 'Completed' }
  }

  const res = await fetch(`${env.bkash.baseUrl}/tokenized/checkout/execute`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ paymentID }),
  })
  const data = (await res.json()) as {
    trxID?: string
    amount?: string
    transactionStatus?: string
    statusMessage?: string
  }
  if (!res.ok || !data.trxID || data.transactionStatus !== 'Completed') {
    logger.error('bKash execute failed', { status: res.status, message: data.statusMessage, txn: data.transactionStatus })
    return { trxID: data.trxID ?? '', amount: Number(data.amount ?? 0), status: 'Failed' }
  }
  return { trxID: data.trxID, amount: Number(data.amount ?? 0), status: 'Completed' }
}

export const bkashMode = isBkashLive ? 'live' : 'sandbox'
