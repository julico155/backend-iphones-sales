import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const EMAIL    = process.argv[2];
const PASSWORD = process.argv[3];

if (!EMAIL || !PASSWORD) {
  console.error('Uso: node scripts/reset-password.mjs <email> <nueva-contraseña>');
  process.exit(1);
}

const pool    = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma  = new PrismaClient({ adapter });

try {
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });

  if (!user) {
    console.error(`No existe ningún usuario con el email: ${EMAIL}`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  await prisma.user.update({
    where: { email: EMAIL },
    data: { passwordHash, mustChangePassword: false },
  });

  console.log(`✅ Contraseña actualizada para ${EMAIL}`);
} finally {
  await prisma.$disconnect();
  await pool.end();
}
