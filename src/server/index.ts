import 'dotenv/config'
import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import fastifyCors from '@fastify/cors'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { registerRoutes } from './routes.js'
import { startCron } from './cron.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = Fastify({ logger: true })

await app.register(fastifyCors, { origin: true })
registerRoutes(app)

if (process.env.NODE_ENV === 'production') {
    await app.register(fastifyStatic, { root: join(__dirname, '../../dist'), prefix: '/' })
    app.setNotFoundHandler((req, reply) => {
        if (!req.url.startsWith('/api')) return reply.sendFile('index.html')
        reply.code(404).send({ error: 'nope' })
    })
}

startCron()

const port = parseInt(process.env.PORT || '6348')
const host = process.env.HOST || '0.0.0.0'

app.listen({ port, host })
    .then(() => console.log(`running at http://${host}:${port}`))
    .catch(e => { console.error(e); process.exit(1) })
