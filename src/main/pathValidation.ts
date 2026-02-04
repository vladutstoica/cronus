import { app } from 'electron';
import fs from 'fs';
import path from 'path';

/**
 * Returns the list of directories that IPC file operations are allowed to access.
 * Currently only the screenshots directory within the app's userData folder.
 */
function getAllowedDirectories(): string[] {
  const userDataPath = app.getPath('userData');
  return [
    path.join(userDataPath, 'screenshots'),
  ];
}

/**
 * Validates that a file path is within one of the allowed directories.
 * Normalizes the path to prevent traversal attacks. Attempts to resolve
 * symlinks via realpathSync when the path exists on disk.
 */
export function isPathAllowed(filePath: string): boolean {
  try {
    // Normalize and resolve to absolute path to prevent traversal (../../)
    let resolvedPath = path.resolve(filePath);

    // Resolve symlinks if the path exists on disk
    try {
      resolvedPath = fs.realpathSync(resolvedPath);
    } catch {
      // Path doesn't exist yet (e.g., about to be written) - use the syntactic resolution
    }

    const allowedDirs = getAllowedDirectories();

    return allowedDirs.some(dir => {
      const resolvedDir = path.resolve(dir);
      // Ensure the path starts with the allowed directory.
      // Append path.sep to prevent prefix attacks (e.g., /screenshots-evil matching /screenshots)
      return resolvedPath === resolvedDir || resolvedPath.startsWith(resolvedDir + path.sep);
    });
  } catch {
    return false;
  }
}
