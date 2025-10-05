const { app } = require('@azure/functions');
const db = require('../config/database');
const { uploadPhoto, deletePhoto } = require('../utils/storage');

/**
 * Update user by ID
 * PUT /api/users/{id}
 */
app.http('updateUser', {
    methods: ['PUT', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'users/{id}',
    handler: async (request, context) => {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            };
        }

        const userId = request.params.id;
        context.log(`HTTP trigger: Updating user with ID: ${userId}`);

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
            // Check if user exists
            const existingUsers = await db.query(
                'SELECT id, nama, foto FROM users WHERE id = ?',
                [userId]
            );

            if (existingUsers.length === 0) {
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

            const existingUser = existingUsers[0];

            // Parse form data
            const formData = await request.formData();
            const nama = formData.get('nama');
            const foto = formData.get('foto');

            // Validate required fields
            if (!nama || nama.trim() === '') {
                return {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: JSON.stringify({
                        success: false,
                        message: 'Nama is required and cannot be empty'
                    })
                };
            }

            let fotoUrl = existingUser.foto;

            // Upload new photo if provided
            if (foto && foto.size > 0) {
                context.log(`Uploading new photo: ${foto.name}`);
                
                // Validate file type
                const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
                if (!allowedTypes.includes(foto.type)) {
                    return {
                        status: 400,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        body: JSON.stringify({
                            success: false,
                            message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed'
                        })
                    };
                }

                // Validate file size (max 5MB)
                const maxSize = 5 * 1024 * 1024; // 5MB
                if (foto.size > maxSize) {
                    return {
                        status: 400,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        body: JSON.stringify({
                            success: false,
                            message: 'File size must not exceed 5MB'
                        })
                    };
                }

                // Delete old photo if exists
                if (existingUser.foto) {
                    context.log(`Deleting old photo: ${existingUser.foto}`);
                    await deletePhoto(existingUser.foto);
                }

                const buffer = Buffer.from(await foto.arrayBuffer());
                fotoUrl = await uploadPhoto(foto.name, buffer, foto.type);
                context.log(`New photo uploaded: ${fotoUrl}`);
            }

            // Update user in database
            await db.query(
                'UPDATE users SET nama = ?, foto = ? WHERE id = ?',
                [nama.trim(), fotoUrl, userId]
            );

            const updatedUser = {
                id: parseInt(userId),
                nama: nama.trim(),
                foto: fotoUrl,
                updated_at: new Date().toISOString()
            };

            context.log(`User updated successfully: ID ${userId}`);

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: true,
                    message: 'User updated successfully',
                    data: updatedUser
                })
            };
        } catch (error) {
            context.error('Error updating user:', error);
            
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    message: 'Failed to update user',
                    error: error.message
                })
            };
        }
    }
});