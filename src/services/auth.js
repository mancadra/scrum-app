import { supabase } from "../config/supabase";
const TOP_100_PASSWORDS = new Set([
  "password1234", "123456789012", "qwertyuiop12", "iloveyou1234",
  "monkey123456", "dragon123456", "master123456", "letmein12345",
  "sunshine1234", "princess1234", "football1234", "superman1234",
  "batman123456", "trustno11234", "shadow123456", "michael12345",
  "jessica12345", "password1234", "qwerty123456", "welcome12345",
  "admin1234567", "login1234567", "access123456", "freedom12345",
  "starwars1234", "minecraft123", "matrix123456", "hunter123456",
  "ranger123456", "daniel123456", "thomas123456", "robert123456",
  "charlie12345", "andrew123456", "chelsea12345", "jessica12345",
  "amanda123456", "summer123456", "ashley123456", "nicole123456",
  "matthew12345", "joshua123456", "george123456", "computer1234",
  "michelle1234", "jennifer1234", "iloveyou1234", "passw0rd1234",
  "qwertyuiop12", "123456789abc", "abc1234567890", "password12345",
  "iloveyou12345", "letmein123456", "monkey1234567", "dragon1234567",
  "master1234567", "sunshine12345", "princess12345", "football12345",
  "superman12345", "mustang12345", "starwars12345", "freedom12345",
  "minecraft1234", "welcome12345", "computer12345", "michelle12345",
  "jennifer12345", "passw0rd12345", "trustno112345", "shadow123456",
  "michael123456", "jessica123456", "qwerty1234567", "admin12345678",
  "password123456", "123456789012a", "qwertyuiopasdf", "iloveyou123456",
  "letmein1234567", "monkey12345678", "dragon12345678", "master12345678",
  "sunshine123456", "princess123456", "football123456", "superman123456",
  "batman12345678", "trustno1123456", "shadow1234567", "michael1234567",
  "jessica1234567", "password12345", "qwerty12345678", "welcome123456",
  "admin123456789", "login123456789", "access1234567", "freedom123456",
])

export async function signIn(username, password) {
    const { data: userData, error: userError } = await supabase
      .from('Users')
      .select('email, deleted_at')
      .eq('username', username)
      .single()

    if (userError || !userData) throw new Error('Napačno uporabniško ime ali geslo.')
    if (userData.deleted_at) throw new Error('Napačno uporabniško ime ali geslo.')

    const { data, error } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password,
    })

    if (error) throw new Error('Napačno uporabniško ime ali geslo.')
    
    const { data: assuranceData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    const needsMFA = assuranceData.nextLevel === 'aal2' &&
    assuranceData.nextLevel !== assuranceData.currentLevel

    if (needsMFA) {
      const { data: factorsData } = await supabase.auth.mfa.listFactors()
      const factorId = factorsData?.totp?.[0]?.id
      return { mfaRequired: true, factorId }
    }
    
    await updateLastLogin(data.user.id)

    return data.user
}

export async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
}

export async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null

    const { data: profile } = await supabase
      .from('Users')
      .select('*, UserRoles(FK_roleId, Roles(name))')
      .eq('id', user.id)
      .single()

    return { ...user, profile }
}

export async function updateLastLogin(userId) {
    const { data: current, error: fetchError } = await supabase
      .from('Users')
      .select('currentLogin')
      .eq('id', userId)
      .single()

    if (fetchError) throw new Error(fetchError.message)

    const { error } = await supabase
      .from('Users')
      .update({
        lastLogin: current?.currentLogin ?? null,
        currentLogin: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) throw new Error(error.message)
}

export async function changePassword(oldPassword, newPassword) {
    validatePassword(newPassword)
    const { data: { user } } = await supabase.auth.getUser()

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    })

    if (signInError) throw new Error('Trenutno geslo je napačno.')

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw new Error(error.message)
}

export async function changePasswordAnon(username, oldPassword, newPassword) {
    validatePassword(newPassword)

    const { data: userData, error: userError } = await supabase
      .from('Users')
      .select('email')
      .eq('username', username)
      .single()

    if (userError || !userData) throw new Error('Napačno uporabniško ime ali geslo.')

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password: oldPassword,
    })

    if (signInError) throw new Error('Napačno uporabniško ime ali geslo.')

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw new Error(error.message)

    await supabase.auth.signOut()
}

export async function completeMFALogin(factorId, code) {
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeError) throw new Error(challengeError.message)

    const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
    })
    if (error) throw new Error('Napačna koda. Poskusite znova.')

    const { data: { user } } = await supabase.auth.getUser()
    await updateLastLogin(user.id)
    return user
}

export async function getMFAFactors() {
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) throw new Error(error.message)
    return data?.totp ?? []
}

export async function enrollMFA() {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    if (error) throw new Error(error.message)
    return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret }
}

export async function verifyMFAEnrollment(factorId, code) {
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeError) throw new Error(challengeError.message)

    const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
    })
    if (error) throw new Error('Napačna koda. Poskusite znova.')
}

export async function unenrollMFA(factorId) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    if (error) throw new Error(error.message)
}

export function validatePassword(password) {
    if (password.length < 12) throw new Error('Geslo mora imeti vsaj 12 znakov.')
    if (password.length > 128) throw new Error('Geslo ne sme presegati 128 znakov.')
    if (/  /.test(password)) throw new Error('Geslo ne sme vsebovati zaporednih presledkov.')
    if (TOP_100_PASSWORDS.has(password.toLowerCase())) throw new Error('Geslo je preveč pogosto.')
}