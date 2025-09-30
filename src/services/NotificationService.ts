import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

export interface NotificationRecipient {
  type: 'customer' | 'staff' | 'barber' | 'admin';
  userId?: Id<'users'>;
  branchId?: Id<'branches'>;
}

export interface NotificationMetadata {
  new_date?: string;
  new_time?: string;
  amount?: number;
  reason?: string;
  customer_name?: string;
  service_name?: string;
  branch_name?: string;
  date?: string;
  time?: string;
  [key: string]: any;
}

export class NotificationService {
  static async sendBookingNotification(
    convex: any,
    bookingId: Id<'bookings'>,
    notificationType: keyof typeof api.services.bookingNotifications.BOOKING_NOTIFICATION_TEMPLATES,
    recipients: NotificationRecipient[],
    metadata?: NotificationMetadata
  ) {
    try {
      await convex.mutation(api.services.bookingNotifications.sendBookingNotifications, {
        bookingId,
        notificationType,
        recipients,
        metadata,
      });
    } catch (error) {
      console.error('Failed to send booking notification:', error);
    }
  }

  static async sendBookingConfirmation(convex: any, bookingId: Id<'bookings'>) {
    const recipients: NotificationRecipient[] = [
      { type: 'customer' },
      { type: 'staff' },
    ];

    await this.sendBookingNotification(
      convex,
      bookingId,
      'CUSTOMER_BOOKING_CONFIRMED',
      recipients
    );
  }

  static async sendBookingReminder(convex: any, bookingId: Id<'bookings'>) {
    const recipients: NotificationRecipient[] = [
      { type: 'customer' },
    ];

    await this.sendBookingNotification(
      convex,
      bookingId,
      'CUSTOMER_BOOKING_REMINDER',
      recipients
    );
  }

  static async sendBookingCancellation(convex: any, bookingId: Id<'bookings'>, reason?: string) {
    const recipients: NotificationRecipient[] = [
      { type: 'customer' },
      { type: 'staff' },
      { type: 'barber' },
    ];

    await this.sendBookingNotification(
      convex,
      bookingId,
      'CUSTOMER_BOOKING_CANCELLED',
      recipients,
      { reason }
    );
  }

  static async sendBookingReschedule(
    convex: any, 
    bookingId: Id<'bookings'>, 
    newDate: string, 
    newTime: string
  ) {
    const recipients: NotificationRecipient[] = [
      { type: 'customer' },
      { type: 'staff' },
      { type: 'barber' },
    ];

    await this.sendBookingNotification(
      convex,
      bookingId,
      'CUSTOMER_BOOKING_RESCHEDULED',
      recipients,
      { new_date: newDate, new_time: newTime }
    );
  }

  static async sendPaymentReceived(convex: any, bookingId: Id<'bookings'>, amount: number) {
    const recipients: NotificationRecipient[] = [
      { type: 'customer' },
      { type: 'staff' },
    ];

    await this.sendBookingNotification(
      convex,
      bookingId,
      'CUSTOMER_PAYMENT_RECEIVED',
      recipients,
      { amount }
    );
  }

  static async sendNewBookingToStaff(convex: any, bookingId: Id<'bookings'>) {
    const recipients: NotificationRecipient[] = [
      { type: 'staff' },
    ];

    await this.sendBookingNotification(
      convex,
      bookingId,
      'STAFF_NEW_BOOKING',
      recipients
    );
  }

  static async sendWalkinBooking(convex: any, bookingId: Id<'bookings'>) {
    const recipients: NotificationRecipient[] = [
      { type: 'staff' },
    ];

    await this.sendBookingNotification(
      convex,
      bookingId,
      'STAFF_WALKIN_BOOKING',
      recipients
    );
  }

  static async sendBarberAssignment(convex: any, bookingId: Id<'bookings'>) {
    const recipients: NotificationRecipient[] = [
      { type: 'barber' },
    ];

    await this.sendBookingNotification(
      convex,
      bookingId,
      'BARBER_NEW_ASSIGNMENT',
      recipients
    );
  }

  static async sendBarberCancellation(convex: any, bookingId: Id<'bookings'>) {
    const recipients: NotificationRecipient[] = [
      { type: 'barber' },
    ];

    await this.sendBookingNotification(
      convex,
      bookingId,
      'BARBER_APPOINTMENT_CANCELLED',
      recipients
    );
  }

  static async sendBarberReschedule(
    convex: any, 
    bookingId: Id<'bookings'>, 
    newDate: string, 
    newTime: string
  ) {
    const recipients: NotificationRecipient[] = [
      { type: 'barber' },
    ];

    await this.sendBookingNotification(
      convex,
      bookingId,
      'BARBER_APPOINTMENT_RESCHEDULED',
      recipients,
      { new_date: newDate, new_time: newTime }
    );
  }

  static async sendDailyScheduleSummary(convex: any, barberId: Id<'users'>, date: string, count: number) {
    try {
      await convex.mutation(api.services.notifications.createNotification, {
        title: 'Daily Schedule Summary',
        message: `You have ${count} appointments scheduled for ${date}.`,
        type: 'reminder',
        priority: 'low',
        recipient_id: barberId,
        recipient_type: 'barber',
        metadata: {
          count,
          date,
        },
      });
    } catch (error) {
      console.error('Failed to send daily schedule summary:', error);
    }
  }
}
