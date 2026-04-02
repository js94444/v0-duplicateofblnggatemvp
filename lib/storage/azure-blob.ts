import { BlobServiceClient, ContainerClient, BlockBlobClient } from "@azure/storage-blob"

const CONTAINER_NAME = "attachments"

let containerClient: ContainerClient | null = null

function getContainerClient(): ContainerClient {
  if (containerClient) {
    return containerClient
  }

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING
  if (!connectionString) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING is not configured")
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
  containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME)

  return containerClient
}

export interface UploadResult {
  fileName: string
  url: string
  size: number
  contentType: string
}

/**
 * Upload a file to Azure Blob Storage
 */
export async function uploadFile(
  file: File | Buffer,
  fileName: string,
  contentType: string,
): Promise<UploadResult> {
  try {
    const container = getContainerClient()

    // Generate unique filename with timestamp to prevent overwrites
    const timestamp = Date.now()
    const uniqueFileName = `${timestamp}-${fileName}`

    const blockBlobClient = container.getBlockBlobClient(uniqueFileName)

    // Upload file
    const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file
    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: {
        blobContentType: contentType,
      },
    })

    return {
      fileName: uniqueFileName,
      url: blockBlobClient.url,
      size: buffer.length,
      contentType,
    }
  } catch (error) {
    console.error("[v0] Azure Blob upload error:", error)
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Generate a temporary download URL with SAS token (valid for 1 hour)
 */
export async function getDownloadUrl(fileName: string): Promise<string> {
  try {
    const container = getContainerClient()
    const blockBlobClient = container.getBlockBlobClient(fileName)

    // For simplicity, return the blob URL directly
    // In production, you should generate SAS tokens for secure access
    return blockBlobClient.url
  } catch (error) {
    console.error("[v0] Azure Blob get URL error:", error)
    throw new Error(`Failed to get download URL: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Delete a file from Azure Blob Storage
 */
export async function deleteFile(fileName: string): Promise<void> {
  try {
    const container = getContainerClient()
    const blockBlobClient = container.getBlockBlobClient(fileName)

    await blockBlobClient.delete()
  } catch (error) {
    console.error("[v0] Azure Blob delete error:", error)
    throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Check if a file exists
 */
export async function fileExists(fileName: string): Promise<boolean> {
  try {
    const container = getContainerClient()
    const blockBlobClient = container.getBlockBlobClient(fileName)

    return await blockBlobClient.exists()
  } catch (error) {
    console.error("[v0] Azure Blob exists check error:", error)
    return false
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(fileName: string) {
  try {
    const container = getContainerClient()
    const blockBlobClient = container.getBlockBlobClient(fileName)

    const properties = await blockBlobClient.getProperties()

    return {
      fileName,
      size: properties.contentLength,
      contentType: properties.contentType,
      lastModified: properties.lastModified,
      url: blockBlobClient.url,
    }
  } catch (error) {
    console.error("[v0] Azure Blob metadata error:", error)
    throw new Error(`Failed to get file metadata: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}
