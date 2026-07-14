const express = require('express');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { port, swaggerServerUrl, corsOrigins } = require('./config');
const {
  createCustomer,
  updateCustomer,
  updateCustomerStatus,
  getCustomerById,
  getCustomersByCounter
} = require('./src/services/customerService');
const {
  loginWorker,
  getWorkerById,
  updateWorker
} = require('./src/services/workerService');
const {
  displayFeed,
  getAllCounters
} = require('./src/services/generalService');

const app = express();
const sseClients = new Set();

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'QueueHCC API',
      version: '1.0.0',
      description: 'OpenAPI documentation for the QueueHCC queue management backend.'
    },
    servers: [
      {
        url: swaggerServerUrl || `http://localhost:${port}`,
        description: 'Local development server'
      }
    ],
    tags: [
      { name: 'Health', description: 'Service health checks' },
      { name: 'Counters', description: 'Counter-related endpoints' },
      { name: 'Customers', description: 'Customer queue operations' },
      { name: 'General', description: 'General reporting and feed endpoints' }
    ]
  },
  apis: ['./index.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use(
  cors({
    origin: corsOrigins.length ? corsOrigins : undefined,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

function writeSseEvent(res, eventName, payload) {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

async function broadcastFeedUpdate() {
  try {
    const feed = await displayFeed();
    for (const client of Array.from(sseClients)) {
      if (client.writableEnded) {
        sseClients.delete(client);
        continue;
      }

      try {
        writeSseEvent(client, 'feed', feed);
      } catch (error) {
        sseClients.delete(client);
      }
    }
  } catch (error) {
    console.error('Unable to broadcast feed update', error);
  }
}

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

/**
 * @openapi
 * /customers:
 *   post:
 *     summary: Create a customer queue entry
 *     tags: [Customers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               counterId:
 *                 type: integer
 *               name:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               priorityLevel:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Customer created
 */
app.post('/customers', async (req, res) => {
  try {
    const customer = await createCustomer(req.body);
    res.status(201).json(customer);
    await broadcastFeedUpdate();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /customers/{id}:
 *   get:
 *     summary: Get customer by ID
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Customer found
 */
app.get('/customers/:id', async (req, res) => {
  try {
    const customer = await getCustomerById(req.params.id);
    res.json(customer);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * @openapi
 * /customers:
 *   get:
 *     summary: Get all active customers for a counter
 *     tags: [Customers]
 *     parameters:
 *       - in: query
 *         name: counterId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Customers for the given counter
 */
app.get('/customers', async (req, res) => {
  try {
    const customers = await getCustomersByCounter(req.query.counterId);
    res.json(customers);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /customers/{id}:
 *   put:
 *     summary: Update customer details
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               priorityLevel:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Customer updated
 */
app.put('/customers/:id', async (req, res) => {
  try {
    const customer = await updateCustomer(req.params.id, req.body);
    res.json(customer);
    await broadcastFeedUpdate();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /customers/{id}/status:
 *   patch:
 *     summary: Update customer status
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [WAITING, PROCESSING, COMPLETED, SKIPPED]
 *     responses:
 *       200:
 *         description: Customer status updated
 */
app.patch('/customers/:id/status', async (req, res) => {
  try {
    const customer = await updateCustomerStatus(req.params.id, req.body?.status);
    res.json(customer);
    await broadcastFeedUpdate();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /workers/login:
 *   post:
 *     summary: Worker login
 *     tags: [Workers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
app.post('/workers/login', async (req, res) => {
  try {
    const result = await loginWorker(req.body?.username, req.body?.password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

/**
 * @openapi
 * /workers/{id}:
 *   get:
 *     summary: Get worker by ID
 *     tags: [Workers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Worker found
 */
app.get('/workers/:id', async (req, res) => {
  try {
    const worker = await getWorkerById(req.params.id);
    res.json(worker);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

/**
 * @openapi
 * /workers/{id}:
 *   put:
 *     summary: Update worker profile
 *     tags: [Workers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *               password:
 *                 type: string
 *               avatar:
 *                 type: string
 *     responses:
 *       200:
 *         description: Worker updated
 */
app.put('/workers/:id', async (req, res) => {
  try {
    const worker = await updateWorker(req.params.id, req.body);
    res.json(worker);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /general/feed:
 *   get:
 *     summary: Display current queue feed
 *     tags: [General]
 *     responses:
 *       200:
 *         description: Feed of waiting and processing customers
 */
app.get('/general/feed/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  writeSseEvent(res, 'connected', { status: 'ok' });
  sseClients.add(res);

  const heartbeat = setInterval(() => {
    if (res.writableEnded) {
      clearInterval(heartbeat);
      sseClients.delete(res);
      return;
    }

    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

app.get('/general/feed', async (_req, res) => {
  try {
    const feed = await displayFeed();
    res.json(feed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /general/counters:
 *   get:
 *     summary: Get all counters
 *     tags: [General]
 *     responses:
 *       200:
 *         description: List of all counters
 */
app.get('/general/counters', async (_req, res) => {
  try {
    const counters = await getAllCounters();
    res.json(counters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`QueueHCC backend is running on http://localhost:${port}`);
  console.log(`Swagger UI available at http://localhost:${port}/api-docs`);
});
