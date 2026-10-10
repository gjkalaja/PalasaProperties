// Demo data. Run with: npm run db:seed  (wipes existing data!)
import { PrismaClient } from "@prisma/client";
import { seedDemo } from "../src/lib/demo-seed";

const db = new PrismaClient();

seedDemo(db)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
