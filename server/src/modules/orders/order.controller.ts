import type { Request, Response } from 'express'
import { requireCustomerId } from './customer.js'
import * as addressService from './address.service.js'
import * as orderService from './order.service.js'
import * as orderingService from './ordering.service.js'

// ---- Ordering window (any authenticated user; customers need it at checkout) ----

export async function getWindow(_req: Request, res: Response) {
  const window = await orderingService.getOrderingWindow()
  res.json({ window })
}

// ---- Addresses (customer's own) ----

export async function listAddresses(req: Request, res: Response) {
  const customerId = await requireCustomerId(req.user!.id)
  res.json({ addresses: await addressService.listAddresses(customerId) })
}

export async function createAddress(req: Request, res: Response) {
  const customerId = await requireCustomerId(req.user!.id)
  const address = await addressService.createAddress(customerId, req.body)
  res.status(201).json({ address })
}

export async function updateAddress(req: Request, res: Response) {
  const customerId = await requireCustomerId(req.user!.id)
  const address = await addressService.updateAddress(customerId, req.params.id, req.body)
  res.json({ address })
}

export async function deleteAddress(req: Request, res: Response) {
  const customerId = await requireCustomerId(req.user!.id)
  await addressService.deleteAddress(customerId, req.params.id)
  res.status(204).send()
}

// ---- Orders (customer's own) ----

export async function checkout(req: Request, res: Response) {
  const customerId = await requireCustomerId(req.user!.id)
  const order = await orderService.checkout(customerId, req.body)
  res.status(201).json({ order })
}

// ---- Guest checkout (no account) ----

export async function guestCheckout(req: Request, res: Response) {
  const order = await orderService.guestCheckout(req.body)
  res.status(201).json({ order })
}

export async function listMyOrders(req: Request, res: Response) {
  const customerId = await requireCustomerId(req.user!.id)
  res.json({ orders: await orderService.listMyOrders(customerId) })
}

export async function getMyOrder(req: Request, res: Response) {
  const customerId = await requireCustomerId(req.user!.id)
  res.json({ order: await orderService.getMyOrder(customerId, req.params.id) })
}

// ---- Admin ordering settings ----

export async function getSetting(_req: Request, res: Response) {
  const setting = await orderingService.getOrderingSetting()
  res.json({
    setting: {
      cutoffTime: setting.cutoffTime,
      minAdvanceDays: setting.minAdvanceDays,
      defaultDeliveryCost: Number(setting.defaultDeliveryCost),
      timezone: setting.timezone,
    },
  })
}

export async function updateSetting(req: Request, res: Response) {
  const setting = await orderingService.updateOrderingSetting(req.body)
  res.json({
    setting: {
      cutoffTime: setting.cutoffTime,
      minAdvanceDays: setting.minAdvanceDays,
      defaultDeliveryCost: Number(setting.defaultDeliveryCost),
      timezone: setting.timezone,
    },
  })
}
