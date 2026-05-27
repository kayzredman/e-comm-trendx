/**
 * Notification templates. Pure functions — no I/O, no env.
 * Returns { sms?: string, email?: { subject, html } } so callers can pick channels.
 */

export type OrderTemplateData = {
  orderId: string
  customerName: string
  total: number | string
  status?: string
  trackingUrl?: string
}

export const templates = {
  orderPlaced: (d: OrderTemplateData) => ({
    sms: `Hi ${d.customerName}, your TrendMarga order #${d.orderId.slice(0, 8)} for GH₵${d.total} has been received. We'll text you when it ships.`,
    email: {
      subject: `Order #${d.orderId.slice(0, 8)} received`,
      html: `<p>Hi ${d.customerName},</p><p>Thanks for shopping with TrendMarga. Your order <strong>#${d.orderId.slice(0, 8)}</strong> totalling <strong>GH₵${d.total}</strong> has been received.</p>${d.trackingUrl ? `<p><a href="${d.trackingUrl}">Track your order</a></p>` : ''}`,
    },
  }),

  orderConfirmed: (d: OrderTemplateData) => ({
    sms: `Good news ${d.customerName}! Order #${d.orderId.slice(0, 8)} is confirmed and being prepared.`,
    email: {
      subject: `Order #${d.orderId.slice(0, 8)} confirmed`,
      html: `<p>Hi ${d.customerName},</p><p>Your order <strong>#${d.orderId.slice(0, 8)}</strong> is confirmed and being prepared.</p>`,
    },
  }),

  orderShipped: (d: OrderTemplateData) => ({
    sms: `Your TrendMarga order #${d.orderId.slice(0, 8)} is out for delivery. Have your phone close by.`,
    email: {
      subject: `Order #${d.orderId.slice(0, 8)} out for delivery`,
      html: `<p>Hi ${d.customerName},</p><p>Your order <strong>#${d.orderId.slice(0, 8)}</strong> is out for delivery today.</p>`,
    },
  }),

  orderDelivered: (d: OrderTemplateData) => ({
    sms: `Order #${d.orderId.slice(0, 8)} delivered. Thank you for shopping with TrendMarga!`,
    email: {
      subject: `Order #${d.orderId.slice(0, 8)} delivered`,
      html: `<p>Hi ${d.customerName},</p><p>Your order <strong>#${d.orderId.slice(0, 8)}</strong> was delivered. We hope you love it!</p>`,
    },
  }),

  orderCancelled: (d: OrderTemplateData) => ({
    sms: `Order #${d.orderId.slice(0, 8)} has been cancelled. Contact us if this is unexpected.`,
    email: {
      subject: `Order #${d.orderId.slice(0, 8)} cancelled`,
      html: `<p>Hi ${d.customerName},</p><p>Your order <strong>#${d.orderId.slice(0, 8)}</strong> has been cancelled.</p>`,
    },
  }),
} as const

export type TemplateName = keyof typeof templates
