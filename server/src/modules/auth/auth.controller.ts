import type { Request, Response } from 'express'
import * as authService from './auth.service.js'

export async function googleAuth(req: Request, res: Response) {
  const result = await authService.loginWithGoogle(req.body)
  res.status(200).json(result)
}

export async function me(req: Request, res: Response) {
  const user = await authService.getCurrentUser(req.user!.id)
  res.status(200).json({ user })
}

export async function updateMe(req: Request, res: Response) {
  const user = await authService.updateProfile(req.user!.id, req.body)
  res.status(200).json({ user })
}
