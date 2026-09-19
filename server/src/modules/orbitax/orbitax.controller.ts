import type { Request, Response } from 'express'
import * as orbitaxService from './orbitax.service.js'

/// The signed-in Orbitax user's combined billing summary.
export async function getAccount(req: Request, res: Response) {
  res.json({ account: await orbitaxService.getAccount(req.user!.id) })
}

/// Pay a lump amount against the combined outstanding balance (allocated across
/// unpaid orders as claims that admins verify).
export async function pay(req: Request, res: Response) {
  const result = await orbitaxService.payOutstanding(req.user!.id, req.body)
  res.status(201).json(result)
}
