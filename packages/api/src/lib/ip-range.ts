import { isIP } from 'node:net'

// ─── CIDR matching для IPv4 и IPv6 ───
// Используется для whitelist IP-адресов ЮKassa.

function ipv4ToBigInt(ip: string): bigint | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let result = 0n
  for (const p of parts) {
    const n = Number(p)
    if (!Number.isInteger(n) || n < 0 || n > 255) return null
    result = (result << 8n) | BigInt(n)
  }
  return result
}

function ipv6ToBigInt(ip: string): bigint | null {
  // expand :: zeros
  let parts: string[]
  if (ip.includes('::')) {
    const [head, tail] = ip.split('::')
    const headParts = head ? head.split(':') : []
    const tailParts = tail ? tail.split(':') : []
    const zeros = Array.from({ length: 8 - headParts.length - tailParts.length }, () => '0')
    parts = [...headParts, ...zeros, ...tailParts]
  } else {
    parts = ip.split(':')
  }
  if (parts.length !== 8) return null
  let result = 0n
  for (const p of parts) {
    const n = parseInt(p || '0', 16)
    if (Number.isNaN(n) || n < 0 || n > 0xffff) return null
    result = (result << 16n) | BigInt(n)
  }
  return result
}

function ipToBigInt(ip: string): { value: bigint; family: 4 | 6 } | null {
  const family = isIP(ip)
  if (family === 4) {
    const v = ipv4ToBigInt(ip)
    return v === null ? null : { value: v, family: 4 }
  }
  if (family === 6) {
    // IPv4-mapped IPv6 (::ffff:1.2.3.4)
    const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
    if (mapped) {
      const v = ipv4ToBigInt(mapped[1]!)
      return v === null ? null : { value: v, family: 4 }
    }
    const v = ipv6ToBigInt(ip)
    return v === null ? null : { value: v, family: 6 }
  }
  return null
}

function cidrMatch(ip: { value: bigint; family: 4 | 6 }, cidr: string): boolean {
  const [addr, bitsStr] = cidr.split('/')
  if (!addr) return false
  const cidrIp = ipToBigInt(addr)
  if (!cidrIp || cidrIp.family !== ip.family) return false

  const totalBits = ip.family === 4 ? 32 : 128
  const bits = bitsStr === undefined ? totalBits : Number(bitsStr)
  if (!Number.isInteger(bits) || bits < 0 || bits > totalBits) return false

  if (bits === 0) return true
  const mask = ((1n << BigInt(bits)) - 1n) << BigInt(totalBits - bits)
  return (ip.value & mask) === (cidrIp.value & mask)
}

export function isIpInRanges(ip: string, ranges: readonly string[]): boolean {
  const parsed = ipToBigInt(ip)
  if (!parsed) return false
  return ranges.some((r) => cidrMatch(parsed, r))
}

// IP-диапазоны ЮKassa (продакшн): https://yookassa.ru/developers/using-api/webhooks
export const YUKASSA_IP_RANGES = [
  '185.71.76.0/27',
  '185.71.77.0/27',
  '77.75.153.0/25',
  '77.75.156.11',
  '77.75.156.35',
  '2a02:5180::/32',
] as const
