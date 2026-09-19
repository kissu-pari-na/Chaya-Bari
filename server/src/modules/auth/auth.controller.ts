import type { Request, Response } from 'express'
import * as authService from './auth.service.js'

export async function register(req: Request, res: Response) {
  const result = await authService.register(req.body)
  res.status(201).json(result)
}

export async function login(req: Request, res: Response) {
  const result = await authService.login(req.body)
  res.status(200).json(result)
}

export async function googleAuth(req: Request, res: Response) {
  const result = await authService.loginWithGoogle(req.body)
  res.status(200).json(result)
}

export async function verifyEmail(req: Request, res: Response) {
  const result = await authService.verifyEmail(req.body)
  res.status(200).json(result)
}

export async function resendEmail(req: Request, res: Response) {
  await authService.resendEmail(req.body)
  res.status(202).json({ ok: true })
}

export async function forgotPassword(req: Request, res: Response) {
  await authService.forgotPassword(req.body)
  res.status(202).json({ ok: true })
}

export async function resetPassword(req: Request, res: Response) {
  await authService.resetPassword(req.body)
  res.status(200).json({ ok: true })
}

export async function me(req: Request, res: Response) {
  const user = await authService.getCurrentUser(req.user!.id)
  res.status(200).json({ user })
}

export async function updateMe(req: Request, res: Response) {
  const user = await authService.updateProfile(req.user!.id, req.body)
  res.status(200).json({ user })
}
