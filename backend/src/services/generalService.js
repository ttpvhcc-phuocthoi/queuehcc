const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function getQueueDateValue() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const parts = formatter.formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

async function getAllCounters() {
  return prisma.counter.findMany({
    orderBy: { id: 'asc' }
  });
}

async function displayFeed() {
  const queueDate = getQueueDateValue();

  const [counters, customers] = await Promise.all([
    prisma.counter.findMany({
      orderBy: { id: 'asc' }
    }),
    prisma.customer.findMany({
      where: {
        queueDate,
        status: {
          in: ['WAITING', 'PROCESSING']
        }
      },
      orderBy: [
        { counterId: 'asc' },
        { priorityLevel: 'desc' },
        { queueNumber: 'asc' }
      ],
      include: {
        counter: true
      }
    })
  ]);

  const groupedByCounter = new Map();

  for (const counter of counters) {
    groupedByCounter.set(counter.id, {
      counter: {
        id: counter.id,
        name: counter.name
      },
      processing: null,
      next: null
    });
  }

  for (const customer of customers) {
    const counterId = customer.counterId;
    const currentGroup = groupedByCounter.get(counterId);

    if (!currentGroup) {
      continue;
    }

    if (customer.status === 'PROCESSING' && !currentGroup.processing) {
      currentGroup.processing = customer;
    }

    if (customer.status === 'WAITING' && !currentGroup.next) {
      currentGroup.next = customer;
    }
  }

  return Array.from(groupedByCounter.values()).sort((a, b) => a.counter.id - b.counter.id);
}

module.exports = {
  getAllCounters,
  displayFeed
};
