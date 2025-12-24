import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface ServiceConfig {
    id: string
    name: string
    url: string
    type?: 'http' | 'tcp'
    port?: number
    description?: string
}

export interface Config {
    checkInterval: number
    services: ServiceConfig[]
}

let cache: Config | null = null

export function getConfig(): Config {
    if (cache) return cache

    const path = join(__dirname, '../../services.json')
    if (!existsSync(path)) throw new Error('where iz services.json?')

    cache = JSON.parse(readFileSync(path, 'utf-8'))
    return cache!
}

export function reloadConfig() {
    cache = null
    return getConfig()
}
