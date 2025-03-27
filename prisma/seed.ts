import { PrismaClient } from '@prisma/client';
import { addDays, subDays, setHours } from 'date-fns';
import bcrypt from 'bcrypt';
import { generateFutureSlotsForUser } from '../src/lib/scheduler'; // adjust path as needed

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean up existing data
  await prisma.booking.deleteMany();
  await prisma.calendarSlot.deleteMany();
  await prisma.sessionType.deleteMany();
  await prisma.availabilityOverride.deleteMany();
  await prisma.availabilityRule.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      password: await bcrypt.hash('password123', 10),
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      password: await bcrypt.hash('password456', 10),
    },
  });

  // Create session types
  const [quickCall, fullSession] = await prisma.$transaction([
    prisma.sessionType.create({
      data: {
        userId: alice.id,
        name: '15 Minute Quick Call',
        duration: 15,
      },
    }),
    prisma.sessionType.create({
      data: {
        userId: alice.id,
        name: '60 Minute Consultation',
        duration: 60,
      },
    }),
  ]);

  // Add multiple time blocks to availability rules
  await prisma.availabilityRule.createMany({
    data: [
      // Monday (1)
      { userId: alice.id, dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
      { userId: alice.id, dayOfWeek: 1, startTime: '14:00', endTime: '17:00' },
      // Wednesday (3)
      { userId: alice.id, dayOfWeek: 3, startTime: '10:00', endTime: '16:00' },
      // Bob Tuesday (2)
      { userId: bob.id, dayOfWeek: 2, startTime: '08:00', endTime: '11:00' },
    ],
  });

  // Create overrides for Alice
  const today = new Date();
  await prisma.availabilityOverride.createMany({
    data: [
      {
        userId: alice.id,
        date: addDays(today, 2),
        status: 'unavailable',
        startTime: null,
        endTime: null,
      },
      {
        userId: alice.id,
        date: addDays(today, 3),
        status: 'custom',
        startTime: '13:00',
        endTime: '15:00',
      },
    ],
  });

  // Generate 30 days of future slots based on rules + overrides
  await generateFutureSlotsForUser(alice.id);
  await generateFutureSlotsForUser(bob.id);

  // Add 1 past booked slot and booking for Alice
  const pastSlot = await prisma.calendarSlot.create({
    data: {
      userId: alice.id,
      startTime: subDays(setHours(today, 9), 2),
      endTime: subDays(setHours(today, 10), 2),
      isBooked: true,
    },
  });

  await prisma.booking.create({
    data: {
      slotId: pastSlot.id,
      userId: alice.id,
      sessionTypeId: fullSession.id,
      name: 'Old Client',
      email: 'pastclient@example.com',
      note: 'This booking happened in the past.',
    },
  });

  // Add 1 future booked slot and booking
  const futureSlot = await prisma.calendarSlot.create({
    data: {
      userId: alice.id,
      startTime: addDays(setHours(today, 14), 1),
      endTime: addDays(setHours(today, 15), 1),
      isBooked: true,
    },
  });

  await prisma.booking.create({
    data: {
      slotId: futureSlot.id,
      userId: alice.id,
      sessionTypeId: quickCall.id,
      name: 'Future Client',
      email: 'client@example.com',
      note: 'Scheduled using generated slot.',
    },
  });

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
