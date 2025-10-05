const { app } = require('@azure/functions');
const db = require('../config/database');
const { uploadPhoto } = require('../utils/storage');

/**
 * Create new user
 * POST /api/users
 */
app.http('createUser', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'users',
    handler: async (request, context) => {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            };
        }

        context.log('HTTP trigger: Creating new user');

        try {
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

            let fotoUrl = null;

            // Upload photo if provided
            if (foto && foto.size > 0) {
                context.log(`Uploading photo: ${foto.name}`);
                
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

                const buffer = Buffer.from(await foto.arrayBuffer());
                fotoUrl = await uploadPhoto(foto.name, buffer, foto.type);
                context.log(`Photo uploaded: ${fotoUrl}`);
            }

            // Insert user into database
            const result = await db.query(
                'INSERT INTO users (nama, foto) VALUES (?, ?)',
                [nama.trim(), fotoUrl]
            );

            const newUser = {
                id: result.insertId,
                nama: nama.trim(),
                foto: fotoUrl,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            context.log(`User created successfully: ID ${newUser.id}`);

            return {
                status: 201,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: true,
                    message: 'User created successfully',
                    data: newUser
                })
            };
        } catch (error) {
            context.error('Error creating user:', error);
            
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    message: 'Failed to create user',
                    error: error.message
                })
            };
        }
    }
});