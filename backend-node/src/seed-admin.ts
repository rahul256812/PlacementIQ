import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);
  
  await prisma.user.upsert({
    where: { email: 'admn@sample.com' },
    update: {},
    create: {
      email: 'admn@sample.com',
      passwordHash,
      role: 'ADMIN',
      fullName: 'Placement Administrator',
    },
  });

  console.log('✅ Admin user created: admn@sample.com / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
