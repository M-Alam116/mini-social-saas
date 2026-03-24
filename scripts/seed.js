require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- SEEDING POSTS ---');

  const user = await prisma.users.findUnique({ where: { id: 1 } });
  if (!user) {
    console.error('Error: User with ID 1 not found. Please register a user first!');
    return;
  }

  const posts = [];
  for (let i = 1; i <= 10; i++) {
    posts.push({
      user_id: 1,
      title: `Stress Test Post #${i}`,
      content: `Dummy post for stress testing likes and comments. Post number ${i}.`,
    });
  }

  await prisma.posts.createMany({ data: posts });

  const total = await prisma.posts.count();
  console.log(`SUCCESS: 10 posts created. Total posts in DB: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
