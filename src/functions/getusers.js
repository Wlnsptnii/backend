const { app } = require('@azure/functions');
const db = require('../config/database');

/**
 * Get user by ID
 * GET /api/users/{id}
 */
app.http('getUserById', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'users/{id}',
    handler: async (request, context) => {
        const userId = request.params.id;
        context.log(`HTTP trigger: Getting user with ID: ${userId}`);

        // Validate ID
        if (!userId || isNaN(userId)) {
            return {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    message: 'Invalid user ID'
                })
            };
        }

        try {
            // Query user by ID
            const users = await db.query(
                'SELECT id, nama, foto, created_at, updated_at FROM users WHERE id = ?',
                [userId]
            );

            if (users.length === 0) {
                return {
                    status: 404,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        message: `User with ID ${userId} not found`
                    })
                };
            }

            context.log(`User found: ${users[0].nama}`);

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                body: JSON.stringify({
                    success: true,
                    data: users[0]
                })
            };
        } catch (error) {
            context.error('Error getting user:', error);
            
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    message: 'Failed to retrieve user',
                    error: error.message
                })
            };
        }
    }
});