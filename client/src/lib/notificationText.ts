import { pick } from './i18n'
import { formatBdt } from './format'
import { paymentMethodLabel } from './paymentLabels'
import type { PaymentMethod } from '../types/payment'
import type { AppNotification, NotificationData } from './notifications'

/// Localized notification text. Notifications are generated server-side (with no
/// per-user language), so the server stores a message `key` + params in `data`
/// and a Bengali fallback in title/body. Here we render the text in the active
/// UI language from that key, falling back to the stored strings for anything we
/// don't have a template for (e.g. older notifications with no `data`).

interface Rendered {
  title: string
  body: string
}

function amt(d: NotificationData): string {
  return formatBdt(d.amount ?? 0)
}

function method(d: NotificationData): string {
  if (!d.method) return ''
  return paymentMethodLabel[d.method as PaymentMethod] ?? d.method
}

const catalog: Record<string, (d: NotificationData) => Rendered> = {
  'order.placed': (d) => ({
    title: pick('অর্ডার পেয়েছি ✅', 'Order received ✅'),
    body: pick(
      `ধন্যবাদ! আপনার অর্ডার ${d.orderNumber} সফলভাবে গ্রহণ করা হয়েছে। শীঘ্রই এটি নিশ্চিত করা হবে।`,
      `Thank you! Your order ${d.orderNumber} has been placed successfully. We'll confirm it shortly.`,
    ),
  }),
  'order.new_admin': (d) => ({
    title: pick('নতুন অর্ডার এসেছে 🛎️', 'New order received 🛎️'),
    body: pick(
      `নতুন অর্ডার ${d.orderNumber} এসেছে। প্রক্রিয়া শুরু করতে বিস্তারিত দেখুন।`,
      `New order ${d.orderNumber} has arrived. Open it to start processing.`,
    ),
  }),
  'order.confirmed': (d) => ({
    title: pick('অর্ডার নিশ্চিত হয়েছে ✅', 'Order confirmed ✅'),
    body: pick(
      `আপনার অর্ডার ${d.orderNumber} নিশ্চিত করা হয়েছে। শীঘ্রই খাবার তৈরি শুরু হবে।`,
      `Your order ${d.orderNumber} has been confirmed. Cooking will start soon.`,
    ),
  }),
  'order.preparing': (d) => ({
    title: pick('রান্না শুরু হয়েছে 👨‍🍳', 'Cooking started 👨‍🍳'),
    body: pick(
      `আপনার অর্ডার ${d.orderNumber}-এর খাবার এখন আমাদের রান্নাঘরে তৈরি হচ্ছে।`,
      `Your order ${d.orderNumber} is now being prepared in our kitchen.`,
    ),
  }),
  'order.ready': (d) => ({
    title: pick('খাবার প্রস্তুত 🍱', 'Food is ready 🍱'),
    body: pick(
      `আপনার অর্ডার ${d.orderNumber}-এর খাবার তৈরি হয়ে গেছে। এখন প্যাক করা হবে।`,
      `Your order ${d.orderNumber} is ready and will be packed now.`,
    ),
  }),
  'order.packed': (d) => ({
    title: pick('প্যাকিং সম্পন্ন 📦', 'Packed 📦'),
    body: pick(
      `আপনার অর্ডার ${d.orderNumber} প্যাক করা হয়েছে এবং ডেলিভারির জন্য প্রস্তুত।`,
      `Your order ${d.orderNumber} is packed and ready for delivery.`,
    ),
  }),
  'order.out_for_delivery': (d) => ({
    title: pick('অর্ডার পথে রয়েছে 🛵', 'Out for delivery 🛵'),
    body: pick(
      `আপনার অর্ডার ${d.orderNumber} ডেলিভারির জন্য রওনা হয়েছে। অনুগ্রহ করে ফোন সচল রাখুন।`,
      `Your order ${d.orderNumber} is on the way. Please keep your phone reachable.`,
    ),
  }),
  'order.delivered': (d) => ({
    title: pick('অর্ডার ডেলিভার হয়েছে 🎉', 'Order delivered 🎉'),
    body: pick(
      `আপনার অর্ডার ${d.orderNumber} পৌঁছে দেওয়া হয়েছে। ছায়া বাড়ির সাথে থাকার জন্য ধন্যবাদ!`,
      `Your order ${d.orderNumber} has been delivered. Thank you for choosing Chaya Bari!`,
    ),
  }),
  'order.cancelled': (d) => ({
    title: pick('অর্ডার বাতিল হয়েছে', 'Order cancelled'),
    body: pick(
      `আপনার অর্ডার ${d.orderNumber} বাতিল করা হয়েছে। কোনো প্রশ্ন থাকলে আমাদের সাথে যোগাযোগ করুন।`,
      `Your order ${d.orderNumber} has been cancelled. Contact us if you have any questions.`,
    ),
  }),
  'review.invite': (d) => ({
    title: pick('আপনার মতামত জানান ⭐', 'Share your feedback ⭐'),
    body: pick(
      `আপনার অর্ডার ${d.orderNumber}-এর খাবার কেমন ছিল জানান। রিভিউ ও রেটিং দিতে ট্যাপ করুন — আপনার মতামত আমাদের কাছে গুরুত্বপূর্ণ।`,
      `How was your order ${d.orderNumber}? Tap to leave a review and rating — your feedback means a lot to us.`,
    ),
  }),
  'payment.received.customer': (d) => ({
    title: pick('পেমেন্ট গৃহীত হয়েছে 💳', 'Payment received 💳'),
    body: pick(
      `আপনার অর্ডার ${d.orderNumber}-এর জন্য ${amt(d)} পেমেন্ট গ্রহণ করা হয়েছে। ধন্যবাদ!`,
      `We've received your ${amt(d)} payment for order ${d.orderNumber}. Thank you!`,
    ),
  }),
  'payment.received.admin': (d) => ({
    title: pick('পেমেন্ট গৃহীত', 'Payment recorded'),
    body: pick(
      `অর্ডার ${d.orderNumber}-এর জন্য ${amt(d)} পেমেন্ট রেকর্ড হয়েছে।`,
      `A ${amt(d)} payment for order ${d.orderNumber} has been recorded.`,
    ),
  }),
  'payment.submitted.admin': (d) => ({
    title: pick('পেমেন্ট যাচাই করুন', 'Verify a payment'),
    body: pick(
      `গ্রাহক অর্ডার ${d.orderNumber}-এর জন্য ${amt(d)} (${method(d)}) পরিশোধের তথ্য জমা দিয়েছেন। অনুগ্রহ করে যাচাই করুন।`,
      `A customer submitted a ${amt(d)} (${method(d)}) payment for order ${d.orderNumber}. Please verify it.`,
    ),
  }),
  'payment.verified': (d) => ({
    title: pick('পেমেন্ট নিশ্চিত হয়েছে ✅', 'Payment confirmed ✅'),
    body: pick(
      `আপনার অর্ডার ${d.orderNumber}-এর ${amt(d)} পেমেন্ট যাচাই করে নিশ্চিত করা হয়েছে। ধন্যবাদ!`,
      `Your ${amt(d)} payment for order ${d.orderNumber} has been verified and confirmed. Thank you!`,
    ),
  }),
  'payment.rejected': (d) => ({
    title: pick('পেমেন্ট যাচাই করা যায়নি', 'Payment not verified'),
    body: pick(
      `আপনার অর্ডার ${d.orderNumber}-এর ${amt(d)} পেমেন্ট যাচাই করা যায়নি। অনুগ্রহ করে সঠিক তথ্য দিয়ে আবার জমা দিন।`,
      `We couldn't verify your ${amt(d)} payment for order ${d.orderNumber}. Please resubmit with the correct details.`,
    ),
  }),
}

/// Render a notification's title/body in the active language, falling back to the
/// server-stored (Bengali) strings when there is no template for its key.
export function renderNotification(n: AppNotification): Rendered {
  const render = n.data?.key ? catalog[n.data.key] : undefined
  if (render && n.data) return render(n.data)
  return { title: n.title, body: n.body }
}
