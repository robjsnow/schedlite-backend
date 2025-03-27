import { PrismaClient } from '@prisma/client';
import { addDays, subDays, setHours } from 'date-fns';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with dummy data...');

  await prisma.booking.deleteMany();
  await prisma.calendarSlot.deleteMany();
  await prisma.sessionType.deleteMany();
  await prisma.user.deleteMany();

  // Hash passwords
  const aliceHashed = await bcrypt.hash('password123', 10);
  const bobHashed = await bcrypt.hash('password456', 10);

  // Create users
  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      password: aliceHashed,
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      password: bobHashed,
    },
  });

  // Create session types for Alice
  const quickCall = await prisma.sessionType.create({
    data: {
      userId: alice.id,
      name: '15 Minute Quick Call',
      duration: 15,
    },
  });

  const fullSession = await prisma.sessionType.create({
    data: {
      userId: alice.id,
      name: '60 Minute Consultation',
      duration: 60,
    },
  });

  const today = new Date();

  // Create past slot for Alice and book it
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

  // Create future slots for Alice
  const futureSlot1 = await prisma.calendarSlot.create({
    data: {
      userId: alice.id,
      startTime: addDays(setHours(today, 14), 1),
      endTime: addDays(setHours(today, 15), 1),
      isBooked: false,
    },
  });

  const futureSlot2 = await prisma.calendarSlot.create({
    data: {
      userId: alice.id,
      startTime: addDays(setHours(today, 16), 2),
      endTime: addDays(setHours(today, 17), 2),
      isBooked: true,
    },
  });

  await prisma.booking.create({
    data: {
      slotId: futureSlot2.id,
      userId: alice.id,
      sessionTypeId: quickCall.id,
      name: 'Future Client',
      email: 'client@example.com',
      note: 'Fake booking note.',
    },
  });

  // Create unbooked slots for Bob
  await prisma.calendarSlot.createMany({
    data: [
      {
        userId: bob.id,
        startTime: addDays(setHours(today, 10), 1),
        endTime: addDays(setHours(today, 11), 1),
        isBooked: false,
      },
      {
        userId: bob.id,
        startTime: addDays(setHours(today, 11), 1),
        endTime: addDays(setHours(today, 12), 1),
        isBooked: false,
      },
    ],
  });

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
