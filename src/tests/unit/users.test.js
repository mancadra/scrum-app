import { describe, test, expect, beforeEach, vi } from 'vitest'

const { mockFrom, mockCreateUser, mockDeleteUser } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockCreateUser: vi.fn(),
  mockDeleteUser: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: mockFrom,
    auth: {
      admin: {
        createUser: mockCreateUser,
        deleteUser: mockDeleteUser,
      },
    },
  }),
}))

import { createUser } from '../../services/users.js'

function mockQuery(result) {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    ilike: vi.fn(),
    single: vi.fn().mockResolvedValue(result),
    insert: vi.fn(),
    delete: vi.fn(),
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.ilike.mockReturnValue(chain)
  chain.insert.mockReturnValue(chain)
  chain.delete.mockReturnValue(chain)
  return chain
}

const adminUserId = 'admin-uuid-123'
const newUserPayload = {
  username: 'jnovak',
  password: 'Str0ng!Passw0rd#99',
  email: 'j.novak@example.com',
  firstName: 'Jan',
  lastName: 'Novak',
  role: 'user',
}

describe('createUser()', () => {

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('successfully creates a new user with valid data', async () => {
    // Actual order in users.js:
    // 1. getRoleId('admin')    2. UserRoles isAdmin    3. validatePassword (no DB)
    // 4. getRoleId('user')     5. Users duplicate check
    // 6. auth.createUser       7. Users insert         8. UserRoles insert
    mockFrom
      .mockReturnValueOnce(mockQuery({ data: { id: 'role-admin-id' }, error: null }))
      .mockReturnValueOnce(mockQuery({ data: { FK_roleId: 'role-admin-id' }, error: null }))
      .mockReturnValueOnce(mockQuery({ data: { id: 'role-user-id' }, error: null }))
      .mockReturnValueOnce(mockQuery({ data: null, error: { code: 'PGRST116' } }))
      .mockReturnValueOnce(mockQuery({ data: { id: 'new-user-uuid', username: 'jnovak' }, error: null }))
      .mockReturnValueOnce(mockQuery({ data: {}, error: null }))

    mockCreateUser.mockResolvedValueOnce({
      data: { user: { id: 'new-user-uuid' } },
      error: null,
    })

    const result = await createUser(adminUserId, newUserPayload)
    expect(result).toMatchObject({ username: 'jnovak', role: 'user' })
    expect(mockCreateUser).toHaveBeenCalledTimes(1)
  })

  test('throws when username already exists', async () => {
    // 1. getRoleId('admin')  2. UserRoles isAdmin  3. getRoleId('user')  4. Users duplicate → EXISTS
    mockFrom
      .mockReturnValueOnce(mockQuery({ data: { id: 'role-admin-id' }, error: null }))
      .mockReturnValueOnce(mockQuery({ data: { FK_roleId: 'role-admin-id' }, error: null }))
      .mockReturnValueOnce(mockQuery({ data: { id: 'role-user-id' }, error: null }))
      .mockReturnValueOnce(mockQuery({ data: { id: 'existing-uuid' }, error: null }))

    await expect(createUser(adminUserId, newUserPayload))
      .rejects.toThrow('Uporabniško ime "jnovak" je že zasedeno.')

    expect(mockCreateUser).not.toHaveBeenCalled()
  })

  test('throws when requesting user is not an admin', async () => {
    // 1. getRoleId('admin')  2. UserRoles isAdmin → not found
    mockFrom
      .mockReturnValueOnce(mockQuery({ data: { id: 'role-admin-id' }, error: null }))
      .mockReturnValueOnce(mockQuery({ data: null, error: { code: 'PGRST116' } }))

    await expect(createUser('non-admin-uuid', newUserPayload))
      .rejects.toThrow('Dostop zavrnjen. To dejanje je dovoljeno samo administratorjem.')

    expect(mockCreateUser).not.toHaveBeenCalled()
  })

  test('throws when a required field is missing', async () => {
    // 1. getRoleId('admin')  2. UserRoles isAdmin → passes, then fields check fails
    mockFrom
      .mockReturnValueOnce(mockQuery({ data: { id: 'role-admin-id' }, error: null }))
      .mockReturnValueOnce(mockQuery({ data: { FK_roleId: 'role-admin-id' }, error: null }))

    const incomplete = { ...newUserPayload, firstName: '' }

    await expect(createUser(adminUserId, incomplete))
      .rejects.toThrow('Vsa polja so obvezna')
  })

    test('throws when password is too common', async () => {
    mockFrom
        .mockReturnValueOnce(mockQuery({ data: { id: 'role-admin-id' }, error: null }))    // getRoleId('admin')
        .mockReturnValueOnce(mockQuery({ data: { FK_roleId: 'role-admin-id' }, error: null })) // UserRoles isAdmin
        .mockReturnValueOnce(mockQuery({ data: { id: 'role-user-id' }, error: null }))     // ← try adding this

    const weakPassword = { ...newUserPayload, password: 'password1234' }

    await expect(createUser(adminUserId, weakPassword))
        .rejects.toThrow('Geslo je preveč pogosto.')
    })

})