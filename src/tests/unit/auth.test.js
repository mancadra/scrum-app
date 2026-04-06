import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validatePassword, signIn } from '../../services/auth'

const { mockFrom, mockSignInWithPassword } = vi.hoisted(() => ({
    mockFrom: vi.fn(),
    mockSignInWithPassword: vi.fn(),
}))

vi.mock('../../config/supabase', () => ({
    supabase: {
        from: mockFrom,
        auth: {
            signInWithPassword: mockSignInWithPassword,
            mfa: { getAuthenticatorAssuranceLevel: vi.fn() },
        },
    },
}))

beforeEach(() => {
    vi.clearAllMocks()
})

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

describe('signIn', () => {
    function mockUserQuery(userData, error = null) {
        const chain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: userData, error }),
        }
        mockFrom.mockReturnValueOnce(chain)
    }

    it('throws for a soft-deleted user', async () => {
        mockUserQuery({ email: 'deleted@example.com', deleted_at: '2026-01-01T00:00:00Z' })

        await expect(signIn('deleteduser', 'SomePass123!')).rejects.toThrow(
            'Napačno uporabniško ime ali geslo.'
        )
        expect(mockSignInWithPassword).not.toHaveBeenCalled()
    })

    it('throws when username does not exist', async () => {
        mockUserQuery(null, { code: 'PGRST116' })

        await expect(signIn('unknownuser', 'SomePass123!')).rejects.toThrow(
            'Napačno uporabniško ime ali geslo.'
        )
        expect(mockSignInWithPassword).not.toHaveBeenCalled()
    })

    it('proceeds to auth sign-in when user is not deleted', async () => {
        mockUserQuery({ email: 'active@example.com', deleted_at: null })
        mockSignInWithPassword.mockResolvedValueOnce({ error: new Error('wrong password') })

        await expect(signIn('activeuser', 'wrongpassword')).rejects.toThrow(
            'Napačno uporabniško ime ali geslo.'
        )
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
            email: 'active@example.com',
            password: 'wrongpassword',
        })
    })
})