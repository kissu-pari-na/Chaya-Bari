-- Notification type for an order reverted to pending after a refund/void left it
-- no longer fully paid.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ORDER_PENDING';
