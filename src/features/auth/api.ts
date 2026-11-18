import type { AuthMe, AuthUser, LoginRequest, SetupRequest, UserCreated, UserCreateRequest, UserPatch } from '@/features/projects/types'
import { apiCall, type CallOptions } from './http'

/**
 * Sign-in and colleagues (apps/api Data365.Auth; contract: types.ts "sign-in, colleagues, and the Claude connector").
 *   GET /auth/me (anonymous allowed) · POST /auth/login · POST /auth/logout · POST /auth/setup
 *   GET /users · POST /users · PATCH /users/{id}   (owner; a person may PATCH their own name / password)
 */
const enc = encodeURIComponent

export const getMe = (o?: CallOptions) => apiCall<AuthMe>('GET', '/auth/me', undefined, o)
export const login = (body: LoginRequest, o?: CallOptions) => apiCall<AuthMe>('POST', '/auth/login', body, o)
export const logout = (o?: CallOptions) => apiCall<void>('POST', '/auth/logout', undefined, o)
export const setupOwner = (body: SetupRequest, o?: CallOptions) => apiCall<AuthMe>('POST', '/auth/setup', body, o)

export const listUsers = (o?: CallOptions) => apiCall<AuthUser[]>('GET', '/users', undefined, o)
export const createUser = (body: UserCreateRequest, o?: CallOptions) => apiCall<UserCreated>('POST', '/users', body, o)
export const patchUser = (id: string, body: UserPatch, o?: CallOptions) => apiCall<AuthUser>('PATCH', `/users/${enc(id)}`, body, o)
