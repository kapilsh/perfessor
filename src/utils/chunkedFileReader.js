/**
 * Read a file in chunks to provide progress updates and avoid blocking
 * @param {File} file - The file to read
 * @param {Function} onProgress - Callback for progress updates (bytesRead, totalBytes)
 * @returns {Promise<string>} - The file contents as a string
 */
export const readFileInChunks = (file, onProgress) => {
  return new Promise((resolve, reject) => {
    const chunkSize = 10 * 1024 * 1024; // 10MB chunks for smooth progress
    const totalSize = file.size;
    let offset = 0;
    let chunks = [];

    const readNextChunk = () => {
      const chunk = file.slice(offset, Math.min(offset + chunkSize, totalSize));
      const reader = new FileReader();

      reader.onload = (e) => {
        chunks.push(e.target.result);
        offset += chunkSize;

        // Report progress
        if (onProgress) {
          const progress = Math.min(offset, totalSize);
          onProgress(progress, totalSize);
        }

        // Check if we're done
        if (offset < totalSize) {
          // Read next chunk (use setTimeout to avoid blocking)
          setTimeout(readNextChunk, 0);
        } else {
          // Concatenate all chunks
          try {
            const fullText = chunks.join('');
            resolve(fullText);
          } catch (error) {
            reject(new Error(`Failed to concatenate file chunks: ${error.message}`));
          }
        }
      };

      reader.onerror = () => {
        reject(new Error(`Failed to read file at offset ${offset}`));
      };

      reader.readAsText(chunk);
    };

    // Start reading
    readNextChunk();
  });
};
