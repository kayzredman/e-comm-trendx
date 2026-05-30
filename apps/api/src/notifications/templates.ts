/**
 * Notification templates. Pure functions — no I/O, no env.
 * Returns { sms?, email?, whatsapp? } so callers can pick channels.
 * WhatsApp supports *bold*, _italic_, newlines, and emojis.
 */

export type OrderTemplateData = {
  orderId: string
  customerName: string
  total: number | string
  status?: string
  trackingUrl?: string
  deliveryCode?: string
}

const short = (id: string) => id.slice(0, 8).toUpperCase()
const brand = 'trendMarga'

export const templates = {
  orderPlaced: (d: OrderTemplateData) => ({
    sms: `Hi ${d.customerName}, your ${brand} order #${short(d.orderId)} for GH₵${d.total} has been received. We'll text you when it ships.`,
    whatsapp:
      `Hi ${d.customerName} 👋\n\n` +
      `Your *${brand}* order *#${short(d.orderId)}* has been received.\n` +
      `Total: *GH₵${d.total}*\n\n` +
      (d.deliveryCode ? `Your delivery PIN: *${d.deliveryCode}*\n_Share with courier on arrival_\n\n` : '') +
      `Reply *TRACK ${short(d.orderId)}* anytime to check status.\n` +
      `Reply *CANCEL ${short(d.orderId)}* within 30 min to cancel.`,
    email: {
      subject: `Order #${short(d.orderId)} received`,
      html: `<p>Hi ${d.customerName},</p><p>Thanks for shopping with ${brand}. Your order <strong>#${short(d.orderId)}</strong> totalling <strong>GH₵${d.total}</strong> has been received.</p>${d.trackingUrl ? `<p><a href="${d.trackingUrl}">Track your order</a></p>` : ''}`,
    },
  }),

  orderConfirmed: (d: OrderTemplateData) => ({
    sms: `Good news ${d.customerName}! Order #${short(d.orderId)} is confirmed and being prepared.`,
    whatsapp:
      `Good news ${d.customerName} ✅\n\n` +
      `Order *#${short(d.orderId)}* is confirmed and being prepared for dispatch.`,
    email: {
      subject: `Order #${short(d.orderId)} confirmed`,
      html: `<p>Hi ${d.customerName},</p><p>Your order <strong>#${short(d.orderId)}</strong> is confirmed and being prepared.</p>`,
    },
  }),

  orderShipped: (d: OrderTemplateData) => ({
    sms: `Your ${brand} order #${short(d.orderId)} is out for delivery. Have your phone close by.`,
    whatsapp:
      `🛵 Your ${brand} order *#${short(d.orderId)}* is on the way!\n\n` +
      (d.deliveryCode ? `Show the rider this PIN on arrival: *${d.deliveryCode}*\n\n` : '') +
      `Please keep your phone close. The rider may call.`,
    email: {
      subject: `Order #${short(d.orderId)} out for delivery`,
      html: `<p>Hi ${d.customerName},</p><p>Your order <strong>#${short(d.orderId)}</strong> is out for delivery today.</p>`,
    },
  }),

  orderDelivered: (d: OrderTemplateData) => ({
    sms: `Order #${short(d.orderId)} delivered. Thank you for shopping with ${brand}!`,
    whatsapp:
      `📦 Delivered — order *#${short(d.orderId)}*\n\n` +
      `Thank you for shopping with *${brand}*, ${d.customerName}!\n` +
      `We hope you love it. Tap your last order link to leave a review. 🙏`,
    email: {
      subject: `Order #${short(d.orderId)} delivered`,
      html: `<p>Hi ${d.customerName},</p><p>Your order <strong>#${short(d.orderId)}</strong> was delivered. We hope you love it!</p>`,
    },
  }),

  orderCancelled: (d: OrderTemplateData) => ({
    sms: `Order #${short(d.orderId)} has been cancelled. Contact us if this is unexpected.`,
    whatsapp:
      `❌ Order *#${short(d.orderId)}* has been cancelled.\n\n` +
      `If this wasn't you, reply to this message and we'll sort it out.`,
    email: {
      subject: `Order #${short(d.orderId)} cancelled`,
      html: `<p>Hi ${d.customerName},</p><p>Your order <strong>#${short(d.orderId)}</strong> has been cancelled.</p>`,
    },
  }),
} as const

export type TemplateName = keyof typeof templates
