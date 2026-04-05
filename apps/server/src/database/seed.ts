import 'dotenv/config';
import 'reflect-metadata';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { hash } from 'bcrypt';
import { admins } from './schema';
import { count } from 'drizzle-orm';

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const username = process.env.ADMIN_INIT_USERNAME || 'admin';
  const password = process.env.ADMIN_INIT_PASSWORD;
  if (!password) {
    console.error('ADMIN_INIT_PASSWORD is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  const [{ value: adminCount }] = await db.select({ value: count() }).from(admins);

  if (adminCount > 0) {
    console.log('Admin table is not empty, skipping seed.');
    await pool.end();
    return;
  }

  const passwordHash = await hash(password, 10);

  await db.insert(admins).values({
    username,
    passwordHash,
    role: 'superadmin',
  });

  console.log(`Initial admin "${username}" created successfully.`);
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
