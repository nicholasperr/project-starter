const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const events = await prisma.event.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      organizerId: true,
      startDatetime: true,
    },
    orderBy: { id: "desc" },
    take: 20,
  });

  console.table(events);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
