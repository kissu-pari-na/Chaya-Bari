import type { Request, Response } from 'express'
import * as paymentSettingService from './payment-setting.service.js'

/// Public: the account numbers customers send manual payments to.
export async function getPaymentInfo(_req: Request, res: Response) {
  res.json({ paymentInfo: await paymentSettingService.getPaymentSetting() })
}

/// Admin: update the payment-account settings.
export async function updatePaymentInfo(req: Request, res: Response) {
  res.json({ paymentInfo: await paymentSettingService.updatePaymentSetting(req.body) })
}
