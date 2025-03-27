import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function generateFutureSlotsForUser(userId: string): Promise<void> {
  const rules = await prisma.availabilityRule.findMany({ where: { userId } });
  const overrides = await prisma.availabilityOverride.findMany({ where: { userId } });

  const today = new Date();
  const daysAhead = 30;
  const newSlots: { userId: string; startTime: Date; endTime: Date }[] = [];

  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayNumber = date.getDay(); // 0 = Sunday, 6 = Saturday

    const override = overrides.find((o) =>
      new Date(o.date).toDateString() === date.toDateString()
    );

    if (override) {
      if (override.status === 'unavailable') continue;
      if (override.status === 'custom' && override.startTime && override.endTime) {
        const start = new Date(`${date.toDateString()} ${override.startTime}`);
        const end = new Date(`${date.toDateString()} ${override.endTime}`);
        newSlots.push({ userId, startTime: start, endTime: end });
        continue;
      }
    }

    const rule = rules.find((r) => r.dayOfWeek === dayNumber);
    if (rule) {
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
    },
  });

  if (newSlots.length > 0) {
    await prisma.calendarSlot.createMany({ data: newSlots });
  }
}