import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { signIn, changePassword, getCurrentUser } from '../../services/auth'
import { supabase } from '../../config/supabase'

const TEST_USERNAME = 'testuser01'
const TEST_PASSWORD = 'testpassword123!'

beforeAll(async () => {
    await signIn(TEST_USERNAME, TEST_PASSWORD)
})

describe('signIn', () => {
    it('succeeds with correct credentials', async () => {
        const user = await signIn(TEST_USERNAME, TEST_PASSWORD)
        expect(user).toBeDefined()
        expect(user.id).toBeDefined()
    })
    it('fails with wrong password', async () => {
        await expect(signIn(TEST_USERNAME, 'wrongpassword')).rejects.toThrow('Napačno uporabniško ime ali geslo.')
    })
    it('fails with wrong username', async () => {
        await expect(signIn('nonexistent', TEST_PASSWORD)).rejects.toThrow('Napačno uporabniško ime ali geslo.')
    })
})



describe('changePassword', () => {
    afterAll(async () => {
      // always reset back to original after this entire describe block
      await signIn(TEST_USERNAME, 'newpassword456!').catch(() => {})
      await changePassword('newpassword456!', TEST_PASSWORD).catch(() => {})
    })

    it('changes password and reverts back', async () => {
      const newPassword = 'newpassword456!'
      await signIn(TEST_USERNAME, TEST_PASSWORD)

      try {
        await changePassword(TEST_PASSWORD, newPassword)
        await expect(signIn(TEST_USERNAME, newPassword)).resolves.toBeDefined()
        await expect(signIn(TEST_USERNAME, TEST_PASSWORD)).rejects.toThrow()
      } finally {
        await changePassword(newPassword, TEST_PASSWORD)
      }
    })

    it('throws with incorrect old password', async () => {
      await signIn(TEST_USERNAME, TEST_PASSWORD)
      await expect(changePassword('wrongoldpassword', 'newpassword456!')).rejects.toThrow('Trenutno geslo je napačno.')
    })
})

describe('updateLastLogin', () => {
    it('sets currentLogin to now after sign in', async () => {
        const before = new Date()
        const user = await signIn(TEST_USERNAME, TEST_PASSWORD)

        const { data } = await supabase
            .from('Users')
            .select('currentLogin')
            .eq('id', user.id)
            .single()

        const currentLogin = new Date(data.currentLogin)
        expect(currentLogin.getTime()).toBeGreaterThanOrEqual(before.getTime())
    })

    it('shifts currentLogin into lastLogin on subsequent sign in', async () => {
        // First sign in to establish a currentLogin
        const user = await signIn(TEST_USERNAME, TEST_PASSWORD)

        const { data: before } = await supabase
            .from('Users')
            .select('currentLogin')
            .eq('id', user.id)
            .single()

        const previousCurrentLogin = before.currentLogin

        // Second sign in — currentLogin should shift to lastLogin
        await signIn(TEST_USERNAME, TEST_PASSWORD)

        const { data: after } = await supabase
            .from('Users')
            .select('lastLogin, currentLogin')
            .eq('id', user.id)
            .single()

        expect(after.lastLogin).toBe(previousCurrentLogin)
        expect(new Date(after.currentLogin).getTime()).toBeGreaterThan(new Date(previousCurrentLogin).getTime())
    })
})

describe('getCurrentUser', () => {
    it('returns user with profile and role after sign in', async () => {
        await signIn(TEST_USERNAME, TEST_PASSWORD)
        const user = await getCurrentUser()

        expect(user).toBeDefined()
        expect(user.id).toBeDefined()
        expect(user.profile).toBeDefined()
        expect(user.profile.username).toBe(TEST_USERNAME)
        expect(user.profile.UserRoles).toBeDefined()
    })
})
