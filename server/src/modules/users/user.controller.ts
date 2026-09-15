import type { Request, Response } from 'express'
import * as userService from './user.service.js'

export async function listUsers(_req: Request, res: Response) {
  res.json({ users: await userService.listUsers() })
}

export async function createUser(req: Request, res: Response) {
  const createdById = req.user!.id
  const user = await userService.createUser(req.body, createdById)
  res.status(201).json({ user })
}
