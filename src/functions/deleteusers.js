const { app } = require('@azure/functions');
const db = require('../config/database');
const { deletePhoto } = require('../utils/storage');

/**
 * Delete user by ID
 * DELETE /api/users/{id}
 */
app.http('deleteUser', {
    methods: ['DELETE', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'users/{id}',
    handler: async (request, context) => {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            };
        }

        const userId = request.params.id;
        context.log(`HTTP trigger: Deleting user with ID: ${userId}`);

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
            // Get user data to retrieve photo URL
            const users = await db.query(
                'SELECT id, nama, foto FROM users WHERE id = ?',
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

            const user = users[0];

            // Delete photo from blob storage if exists
            if (user.foto) {
                context.log(`Deleting photo: ${user.foto}`);
                await deletePhoto(user.foto);
            }

            // Delete user from database
            await db.query('DELETE FROM users WHERE id = ?', [userId]);

            context.log(`User deleted successfully: ID ${userId}, Name: ${user.nama}`);

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: true,
                    message: `User '${user.nama}' deleted successfully`
                })
            };
        } catch (error) {
            context.error('Error deleting user:', error);
            
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    message: 'Failed to delete user',
                    error: error.message
                })
            };
        }
    }
});