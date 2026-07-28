import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import 'dotenv/config';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const existing = await prisma.tenant.findUnique({ where: { slug: 'system-admin' } });
    if (existing) {
      console.log('Seed: system-admin already exists, skipping.');
      return;
    }

    const password = process.env.SEED_ADMIN_PASSWORD;
    const email = process.env.SEED_ADMIN_EMAIL ?? 'julio@saas.com';

    if (!password) {
      throw new Error('SEED_ADMIN_PASSWORD env var is required for initial setup');
    }

    const systemTenant = await prisma.tenant.create({
      data: { name: 'System Admin Global', slug: 'system-admin' },
    });

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        tenantId: systemTenant.id,
        name: 'Super Admin',
        email,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
        mustChangePassword: false,
      },
    });

    console.log(`Seed completed: admin user '${email}' created.`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
