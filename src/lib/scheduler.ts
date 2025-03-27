/**
 * This module generates future availability slots based on each user's
 * recurring schedule and any date-specific overrides.
 * 
 * `generateFutureSlotsForUser` is called when a user updates their schedule.
 * 
 * `generateFutureSlotsForAllUsers` can be run daily as a cron job to ensure
 * everyone's availability extends into the future, even if they haven't made changes.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Generates 30 days of future slots for a single user based on availability rules and overrides.
 */
export async function generateFutureSlotsForUser(userId: string): Promise<void> {
  const rules = await prisma.availabilityRule.findMany({ where: { userId } });
  const overrides = await prisma.availabilityOverride.findMany({ where: { userId } });

  const today = new Date();
  const daysAhead = 30;
  const newSlots: { userId: string; startTime: Date; endTime: Date }[] = [];

  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayNumber = date.getDay(); // 0 = Sunday

    const override = overrides.find(
      (o) => new Date(o.date).toDateString() === date.toDateString()
    );

    if (override) {
      if (override.status === 'unavailable') continue;

      if (override.status === 'available' && override.startTime && override.endTime) {
        const start = new Date(`${date.toDateString()} ${override.startTime}`);
        const end = new Date(`${date.toDateString()} ${override.endTime}`);
        newSlots.push({ userId, startTime: start, endTime: end });
        continue;
      }
    }

    const dayRules = rules.filter((r) => r.dayOfWeek === dayNumber);
    for (const rule of dayRules) {
      const start = new Date(`${date.toDateString()} ${rule.startTime}`);
      const end = new Date(`${date.toDateString()} ${rule.endTime}`);
      newSlots.push({ userId, startTime: start, endTime: end });
    }
  }

  await prisma.calendarSlot.deleteMany({
    where: {
      userId,
      isBooked: false,
      startTime: { gte: today },
      booking: null,
    },
  });

  if (newSlots.length > 0) {
    await prisma.calendarSlot.createMany({ data: newSlots });
  }
}

/**
 * Loops through all users and updates their future slots.
 * Intended to be called from a cron job or scheduled task.
 */
export async function generateFutureSlotsForAllUsers(): Promise<void> {
  const users = await prisma.user.findMany({ select: { id: true } });

  for (const user of users) {
    try {
      await generateFutureSlotsForUser(user.id);
      console.log(`Generated future slots for user ${user.id}`);
    } catch (err) {
      console.error(`Failed to generate slots for user ${user.id}`, err);
    }
  }
}
