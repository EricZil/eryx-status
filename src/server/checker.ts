import net from 'net'

export interface CheckResult {
    online: boolean
    status: number | null
    latency: number
    error: string | null
}

export async function checkHttp(url: string, timeout = 10000): Promise<CheckResult> {
    const start = Date.now()

    try {
        const ctrl = new AbortController()
        const t = setTimeout(() => ctrl.abort(), timeout)

        const res = await fetch(url, {
            method: 'GET',
            signal: ctrl.signal,
            headers: { 'User-Agent': 'eryx-status/1.0' }
        })

        clearTimeout(t)
        const ms = Date.now() - start
        const ok = res.status >= 200 && res.status < 400

        return { online: ok, status: res.status, latency: ms, error: ok ? null : `got ${res.status}` }
    } catch (e: any) {
        return { online: false, status: null, latency: Date.now() - start, error: e.message || 'boom' }
    }
}

export async function checkTcp(host: string, port: number, timeout = 10000): Promise<CheckResult> {
    const start = Date.now()

    return new Promise(resolve => {
        const sock = new net.Socket()

        const fail = (err: string) => {
            sock.destroy()
            resolve({ online: false, status: null, latency: Date.now() - start, error: err })
        }

        sock.setTimeout(timeout)
        sock.on('timeout', () => fail('timeout'))
        sock.on('error', (e: any) => fail(e.message || 'connection bye'))

        sock.connect(port, host, () => {
            const ms = Date.now() - start
            sock.destroy()
            resolve({ online: true, status: null, latency: ms, error: null })
        })
    })
}

export async function check(type: 'http' | 'tcp', target: string, port?: number): Promise<CheckResult> {
    if (type === 'tcp') {
        if (!port) return { online: false, status: null, latency: 0, error: 'no port specified' }
        return checkTcp(target, port)
    }
    return checkHttp(target)
}
