import { PrismaClient } from '@prisma/client';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

const prisma = new PrismaClient();

async function main() {
  const email = process.env.GVP_USER_EMAIL ?? 'demo@example.com';
  const displayName = process.env.GVP_USER_NAME ?? 'Demo User';
  const password = process.env.GVP_USER_PASSWORD ?? 'DemoPass123!';
  const role = process.env.GVP_USER_ROLE ?? 'VIEWER';

  console.log('Using DATABASE_URL:', process.env.DATABASE_URL ?? 'not set');

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Add it to .env before running this script.');
  }

  await prisma.$connect();

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    console.log('User already exists:', existingUser.email);
    await prisma.$disconnect();
    return;
  }

  const createdUser = await prisma.user.create({
    data: {
      email,
      displayName,
      passwordHash: await hashPassword(password),
      role
    }
  });

  console.log('Created user successfully');
  console.log({
    id: createdUser.id,
    email: createdUser.email,
    displayName: createdUser.displayName,
    role: createdUser.role
  });
}

main()
  .catch((error) => {
    console.error('Failed to create user.');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
