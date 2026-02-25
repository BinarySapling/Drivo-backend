const { doubleCsrf } = require('csrf-csrf');

const isProd = process.env.NODE_ENV === 'production';

/**
 * CSRF protection using the Double Submit Cookie pattern (csrf-csrf v4).
 *
 * v4 API change: generateToken() is gone. Use req.csrfToken() instead.
 *
 * How it works:
 * 1. Frontend calls GET /api/v1/auth/csrf-token
 * 2. doubleCsrfProtection middleware calls req.csrfToken() and returns it in JSON body
 * 3. Frontend stores token in memory and sends it as 'x-csrf-token' header
 * 4. All POST/PUT/DELETE requests are validated automatically
 */
const { doubleCsrfProtection } = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET || 'drivo-csrf-secret-change-in-production',
    cookieName: isProd ? '__Host-drivo.csrf' : 'drivo.csrf',
    cookieOptions: {
        httpOnly: true,
        sameSite: isProd ? 'strict' : 'lax',
        secure: isProd,
        path: '/'
    },
    size: 64,
    getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'],
    getSessionIdentifier: (req) => req.cookies?.['drivo.sid'] || 'anonymous' // Fallback for sessionless architecture
});

module.exports = { doubleCsrfProtection };
