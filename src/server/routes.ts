import type { FastifyInstance } from 'fastify'
import { db } from './db.js'
import { getConfig, reloadConfig } from './config.js'

export function registerRoutes(app: FastifyInstance) {
    app.get('/api/status', async () => {
        const cfg = getConfig()
        const day = new Date(Date.now() - 86400000)

        const services = await Promise.all(cfg.services.map(async s => {
            const last = await db.check.findFirst({
                where: { serviceId: s.id },
                orderBy: { createdAt: 'desc' }
            })

            const checks = await db.check.findMany({
                where: { serviceId: s.id, createdAt: { gte: day } }
            })

            const up = checks.length ? (checks.filter((c: any) => c.online).length / checks.length) * 100 : 100

            return {
                id: s.id,
                name: s.name,
                description: s.description,
                online: last?.online ?? true,
                status: last?.status ?? null,
                latency: last?.latency ?? 0,
                uptime: Math.round(up * 100) / 100,
                lastCheck: last?.createdAt ?? null,
                error: last?.error ?? null
            }
        }))

        const all = services.every(s => s.online)
        const some = services.some(s => s.online)

        return {
            overall: all ? 'operational' : some ? 'degraded' : 'outage',
            services
        }
    })

    app.get('/api/history/:id', async req => {
        const { id } = req.params as { id: string }
        const checks = await db.check.findMany({
            where: { serviceId: id, createdAt: { gte: new Date(Date.now() - 86400000) } },
            orderBy: { createdAt: 'asc' },
            select: { online: true, latency: true, createdAt: true }
        })
        return { serviceId: id, checks }
    })

    app.get('/api/config', () => ({ checkInterval: getConfig().checkInterval }))

    app.post('/api/config/reload', () => {
        reloadConfig()
        return { ok: true, message: 'config reloaded' }
    })
}
