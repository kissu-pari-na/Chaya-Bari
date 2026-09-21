import type { Request, Response } from 'express'
import { parsePageParams } from '../../lib/pagination.js'
import * as userService from './user.service.js'

export async function listUsers(req: Request, res: Response) {
  const page = parsePageParams(req, { maxLimit: 100 })
  const { items, total } = await userService.listUsers(page)
  res.json({ users: items, total })
}

export async function createUser(req: Request, res: Response) {
  const createdById = req.user!.id
  const user = await userService.createUser(req.body, createdById)
  res.status(201).json({ user })
}
