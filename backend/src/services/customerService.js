const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const VALID_STATUSES = new Set(['WAITING', 'PROCESSING', 'COMPLETED', 'SKIPPED']);
const VALID_PRIORITY_LEVELS = new Set([0, 1]);

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

async function createCustomer(input) {
  const counterId = Number(input?.counterId);
  const priorityLevel = input?.priorityLevel === undefined ? 0 : Number(input.priorityLevel);

  if (!counterId) {
    throw new Error('counterId is required');
  }

  if (!VALID_PRIORITY_LEVELS.has(priorityLevel)) {
    throw new Error('priorityLevel must be 0 or 1');
  }

  const counter = await prisma.counter.findUnique({ where: { id: counterId } });
  if (!counter) {
    throw new Error('Counter not found');
  }

  return prisma.$transaction(async (tx) => {
    const queueDate = getQueueDateValue();
    const lastCustomer = await tx.customer.findFirst({
      where: {
        counterId,
        queueDate
      },
      orderBy: { queueNumber: 'desc' },
      select: { queueNumber: true }
    });

    const queueNumber = (lastCustomer?.queueNumber ?? 0) + 1;

    return tx.customer.create({
      data: {
        name: input?.name ?? null,
        phoneNumber: input?.phoneNumber ?? null,
        priorityLevel,
        counterId,
        queueNumber,
        queueDate,
        status: 'WAITING',
        createdBy: 'api'
      }
    });
  });
}

async function updateCustomer(id, input) {
  const customerId = Number(id);
  if (!customerId) {
    throw new Error('customer id is required');
  }

  const updateData = {};

  if (input?.name !== undefined) {
    updateData.name = input.name;
  }

  if (input?.phoneNumber !== undefined) {
    updateData.phoneNumber = input.phoneNumber ?? null;
  }

  if (input?.priorityLevel !== undefined) {
    const priorityLevel = Number(input.priorityLevel);
    if (!VALID_PRIORITY_LEVELS.has(priorityLevel)) {
      throw new Error('priorityLevel must be 0 or 1');
    }
    updateData.priorityLevel = priorityLevel;
  }

  if (Object.keys(updateData).length === 0) {
    return getCustomerById(customerId);
  }

  return prisma.customer.update({
    where: { id: customerId },
    data: {
      ...updateData,
      updatedBy: 'api'
    }
  });
}

async function updateCustomerStatus(id, status, updatedBy = 'api') {
  const customerId = Number(id);
  const normalizedStatus = String(status || '').toUpperCase();

  if (!customerId) {
    throw new Error('customer id is required');
  }

  if (!VALID_STATUSES.has(normalizedStatus)) {
    throw new Error('status must be one of WAITING, PROCESSING, COMPLETED, SKIPPED');
  }

  const existingCustomer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!existingCustomer) {
    throw new Error('Customer not found');
  }

  const updateData = {
    status: normalizedStatus,
    updatedBy
  };

  if (normalizedStatus === 'PROCESSING' && existingCustomer.status !== 'PROCESSING') {
    updateData.calledAt = new Date();
  }

  if (normalizedStatus === 'COMPLETED' && existingCustomer.status !== 'COMPLETED') {
    updateData.completedAt = new Date();
  }

  return prisma.customer.update({
    where: { id: customerId },
    data: updateData
  });
}

async function getCustomerById(id) {
  const customerId = Number(id);
  if (!customerId) {
    throw new Error('customer id is required');
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    throw new Error('Customer not found');
  }

  return customer;
}

async function getCustomersByCounter(counterId) {
  const parsedCounterId = Number(counterId);
  if (!parsedCounterId) {
    throw new Error('counterId is required');
  }

  const queueDate = getQueueDateValue();

  return prisma.customer.findMany({
    where: {
      counterId: parsedCounterId,
      queueDate
      // status: {
      //   in: ['WAITING', 'PROCESSING']
      // }
    },
    orderBy: [
      { priorityLevel: 'desc' },
      { queueNumber: 'asc' }
    ]
  });
}

module.exports = {
  createCustomer,
  updateCustomer,
  updateCustomerStatus,
  getCustomerById,
  getCustomersByCounter
};
