import { describe, it, expect, vi } from 'vitest'
import { validatePassword } from '../../services/auth'

vi.mock('../../config/supabase', () => ({
    supabase: { from: vi.fn(), auth: {} },
}))

describe('validatePassword', () => {
    it('accepts a valid password', () => {
        expect(() => validatePassword('ValidPass123!')).not.toThrow()
    })
    it('throws if under 12 chars', () => {
        expect(() => validatePassword('short')).toThrow()
    })
    it('throws if over 128 chars', () => {
        expect(() => validatePassword('a'.repeat(129))).toThrow()
    })
    it('throws if consecutive spaces', () => {
        expect(() => validatePassword('valid  password123')).toThrow()
    })
})