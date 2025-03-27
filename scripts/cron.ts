
import { generateFutureSlotsForAllUsers } from '../src/lib/scheduler';

async function main() {
  console.log('Generating future slots for all users...');
  await generateFutureSlotsForAllUsers();
  console.log('Done.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Cron job failed:', err);
    process.exit(1);
  });