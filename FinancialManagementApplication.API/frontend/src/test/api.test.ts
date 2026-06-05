import { describe, it, expect, beforeEach } from 'vitest'
import { decodeJwt, checkConnection, getLoggedUser, getLoggedUserId, getIsDemoMode } from '../services/api'

beforeEach(() => {
  localStorage.clear()
})

describe('decodeJwt', () => {
  it('returns null for invalid token', () => {
    const result = decodeJwt('invalid-token')
    expect(result).toBeNull()
  })

  it('returns null for empty string', () => {
    const result = decodeJwt('')
    const result2 = decodeJwt('a.b')

    expect(result).toBeNull()
    expect(result2).toBeNull()
  })

  it('decodes a standard JWT with claims', () => {
    const payload = {
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': 'user-123',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'test@example.com',
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': 'Test User',
    }
    const token = createMockJwt(payload)

    const result = decodeJwt(token)

    expect(result).not.toBeNull()
    expect(result!.id).toBe('user-123')
    expect(result!.email).toBe('test@example.com')
    expect(result!.displayName).toBe('Test User')
  })

  it('falls back to sub/nameid for id', () => {
    const payload = { sub: 'sub-user', name: 'Fallback User' }
    const token = createMockJwt(payload)

    const result = decodeJwt(token)

    expect(result).not.toBeNull()
    expect(result!.id).toBe('sub-user')
  })

  it('falls back to unique_name for displayName', () => {
    const payload = { sub: 'user-1', unique_name: 'Unique Name' }
    const token = createMockJwt(payload)

    const result = decodeJwt(token)

    expect(result).not.toBeNull()
    expect(result!.displayName).toBe('Unique Name')
  })

  it('extracts displayName from email when no name claim', () => {
    const payload = { sub: 'user-1', email: 'john.doe@example.com' }
    const token = createMockJwt(payload)

    const result = decodeJwt(token)

    expect(result).not.toBeNull()
    expect(result!.displayName).toBe('john.doe')
  })

  it('uses Guest for displayName when nothing is available', () => {
    const payload = { sub: 'user-1' }
    const token = createMockJwt(payload)

    const result = decodeJwt(token)

    expect(result).not.toBeNull()
    expect(result!.displayName).toBe('Guest')
  })
})

describe('checkConnection', () => {
  it('sets demo mode when API is unreachable', async () => {
    const result = await checkConnection()

    expect(result).toBe(false)
    expect(getIsDemoMode()).toBe(true)
  })
})

describe('getLoggedUser', () => {
  it('returns null when no user in storage', () => {
    const user = getLoggedUser()
    expect(user).toBeNull()
  })

  it('returns user when token and user are stored', () => {
    const mockUser = { id: 'u1', email: 'test@test.com', displayName: 'Test' }
    localStorage.setItem('fm_token', 'mock-token')
    localStorage.setItem('fm_user', JSON.stringify(mockUser))

    const user = getLoggedUser()

    expect(user).toEqual(mockUser)
  })
})

describe('getLoggedUserId', () => {
  it('returns default id when no user', () => {
    const id = getLoggedUserId()
    expect(id).toBe('u1')
  })

  it('returns user id from stored user', () => {
    localStorage.setItem('fm_token', 'mock-token')
    localStorage.setItem('fm_user', JSON.stringify({ id: 'custom-id', email: 'a@b.com', displayName: 'A' }))

    const id = getLoggedUserId()

    expect(id).toBe('custom-id')
  })
})

describe('getIsDemoMode', () => {
  it('returns initial demo mode state', () => {
    expect(getIsDemoMode()).toBe(true)
  })
})

function base64UrlEncode(str: string): string {
  const base64 = btoa(str)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function createMockJwt(payload: Record<string, unknown>): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64UrlEncode(JSON.stringify(payload))
  const signature = base64UrlEncode('fake-signature')
  return `${header}.${body}.${signature}`
}
