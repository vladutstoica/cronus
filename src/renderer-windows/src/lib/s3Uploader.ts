/**
 * Reads a file from the local filesystem and returns its buffer.
 */
export const readFileFromMain = async (
  filePath: string,
): Promise<ArrayBuffer> => {
  try {
    return await window.api.readFile(filePath); // Calls simplified API
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    throw new Error(`Failed to read file: ${filePath}`);
  }
};

/**
 * Uploads a file buffer to a pre-signed S3 URL.
 */
export const uploadToS3 = async (
  uploadUrl: string,
  fileBuffer: ArrayBuffer, // Expect ArrayBuffer directly from IPC
  contentType: string = "image/jpeg", // Re-add contentType parameter
): Promise<void> => {
  try {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType, // AWS SDK v2 expects this header
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("S3 upload failed:", response.status, errorText);
      throw new Error(`S3 upload failed: ${response.status}`);
    }
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw error; // Re-throw the error to be caught by the caller
  }
};

/**
 * Deletes a local file.
 */
export const deleteLocalFile = async (filePath: string): Promise<void> => {
  try {
    await window.api.deleteFile(filePath);
  } catch (error) {
    console.error(`Error deleting local file ${filePath}:`, error);
    // Log error but don't throw, as this is a cleanup step
  }
};
