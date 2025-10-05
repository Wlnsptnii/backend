const { BlobServiceClient } = require('@azure/storage-blob');

// Initialize Blob Service Client
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING is not defined');
}

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerName = process.env.BLOB_CONTAINER_NAME || 'user-photos';

/**
 * Upload a photo to Azure Blob Storage
 * @param {string} fileName - Name of the file
 * @param {Buffer} fileBuffer - File buffer data
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<string>} URL of uploaded photo
 */
async function uploadPhoto(fileName, fileBuffer, contentType) {
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        
        // Create container if it doesn't exist
        await containerClient.createIfNotExists({
            access: 'blob'
        });

        // Generate unique filename
        const timestamp = Date.now();
        const uniqueFileName = `${timestamp}-${fileName}`;
        
        const blockBlobClient = containerClient.getBlockBlobClient(uniqueFileName);
        
        // Upload file
        await blockBlobClient.uploadData(fileBuffer, {
            blobHTTPHeaders: {
                blobContentType: contentType
            }
        });

        return blockBlobClient.url;
    } catch (error) {
        console.error('Error uploading photo:', error);
        throw new Error(`Failed to upload photo: ${error.message}`);
    }
}

/**
 * Delete a photo from Azure Blob Storage
 * @param {string} photoUrl - URL of the photo to delete
 * @returns {Promise<void>}
 */
async function deletePhoto(photoUrl) {
    try {
        if (!photoUrl) return;

        // Extract filename from URL
        const urlParts = photoUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);
        
        await blockBlobClient.deleteIfExists();
        
        console.log(`Photo deleted: ${fileName}`);
    } catch (error) {
        console.error('Error deleting photo:', error);
        // Don't throw error, just log it
        // This prevents delete user operation from failing if photo deletion fails
    }
}

/**
 * Check if a photo exists in storage
 * @param {string} photoUrl - URL of the photo
 * @returns {Promise<boolean>}
 */
async function photoExists(photoUrl) {
    try {
        if (!photoUrl) return false;

        const urlParts = photoUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);
        
        return await blockBlobClient.exists();
    } catch (error) {
        console.error('Error checking photo existence:', error);
        return false;
    }
}

module.exports = {
    uploadPhoto,
    deletePhoto,
    photoExists
};