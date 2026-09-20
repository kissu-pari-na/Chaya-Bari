import type { Request, Response } from 'express'
import * as pushService from './push.service.js'

/// Public: the VAPID public key the browser needs to subscribe (null when push
/// isn't configured, so the client can hide the feature).
export async function getPublicKey(_req: Request, res: Response) {
  res.json({ publicKey: pushService.publicKey() })
}

export async function subscribe(req: Request, res: Response) {
  await pushService.saveSubscription(req.user!.id, req.body)
  res.status(201).json({ ok: true })
}

export async function unsubscribe(req: Request, res: Response) {
  await pushService.removeSubscription(req.user!.id, req.body.endpoint)
  res.json({ ok: true })
}
