const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '8h';

if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET not set, using auto-generated secret for this backend session');
}

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

async function loginWorker(username, password) {
  if (!username || !password) {
    throw new Error('username and password are required');
  }

  const worker = await prisma.worker.findUnique({
    where: { username }
  });

  if (!worker) {
    throw new Error('Invalid credentials');
  }

  const passwordMatches = bcrypt.compareSync(password, worker.passwordHash);
  if (!passwordMatches) {
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign(
    {
      workerId: worker.id,
      username: worker.username,
      displayName: worker.displayName,
      counterId: worker.counterId
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRATION
    }
  );

  return {
    worker: {
      id: worker.id,
      username: worker.username,
      displayName: worker.displayName,
      avatar: worker.avatar,
      counterId: worker.counterId
    },
    token
  };
}

async function getWorkerById(id) {
  const workerId = Number(id);
  if (!workerId) {
    throw new Error('worker id is required');
  }

  const worker = await prisma.worker.findUnique({
    where: { id: workerId },
    include: { counter: true }
  });

  if (!worker) {
    throw new Error('Worker not found');
  }

  return worker;
}

async function updateWorker(id, input) {
  const workerId = Number(id);
  if (!workerId) {
    throw new Error('worker id is required');
  }

  const updateData = {};

  if (input?.displayName !== undefined) {
    updateData.displayName = input.displayName;
  }

  if (input?.password !== undefined && input.password) {
    updateData.passwordHash = bcrypt.hashSync(input.password, 10);
  }

  if (input?.avatar !== undefined) {
    updateData.avatar = input.avatar ?? null;
  }

  if (Object.keys(updateData).length === 0) {
    return getWorkerById(workerId);
  }

  return prisma.worker.update({
    where: { id: workerId },
    data: {
      ...updateData,
      updatedBy: 'api'
    },
    include: { counter: true }
  });
}

module.exports = {
  loginWorker,
  getWorkerById,
  updateWorker
};
