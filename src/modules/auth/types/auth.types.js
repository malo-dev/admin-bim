/**
 * @typedef {Object} LoginCredentials
 * @property {string} email
 * @property {string} password
 */

/**
 * @typedef {Object} LoginResponse
 * @property {string} message
 * @property {string} token
 * @property {string} refreshToken
 * @property {boolean} status
 * @property {string|null} role
 * @property {number} userId
 */

/**
 * @typedef {Object} AuthUser
 * @property {number} userId
 * @property {string} email
 * @property {string|null} role
 * @property {boolean} isBimAdmin - true si le rôle est BIM (accès global)
 */

/**
 * @typedef {Object} AuthState
 * @property {AuthUser|null} user
 * @property {string|null} token
 * @property {string|null} refreshToken
 * @property {boolean} isAuthenticated
 */

export const BIM_ADMIN_ROLE = 'BIM';
