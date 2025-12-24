import cron from 'node-cron'
import { db } from './db.js'
import { check } from './checker.js'
import { getConfig } from './config.js'

async function run() {
    const cfg = getConfig()

    for (const s of cfg.services) {
        const type = s.type || 'http'
        const r = await check(type, s.url, s.port)
        await db.check.create({
            data: {
                serviceId: s.id,
                online: r.online,
                status: r.status,
                latency: r.latency,
                error: r.error
            }
        })
    }
}

export function startCron() {
    const mins = Math.max(1, Math.floor((getConfig().checkInterval || 300) / 60))
    run()
    cron.schedule(`*/${mins} * * * *`, run)
}
