/**
 * Utility for finding available network ports
 * Used primarily in tests to prevent EADDRINUSE errors
 */

import { createServer } from 'net';

/**
 * Check if a specific port is available
 * @param port The port to check
 * @returns Promise resolving to true if port is available, false otherwise
 */
export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = createServer()
      .once('error', (err: any) => {
        tester.close();
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          // For other errors, consider the port unusable as well
          console.warn(`Port ${port} check failed with error:`, err.message);
          resolve(false);
        }
      })
      .once('listening', () => {
        tester.close();
        resolve(true);
      })
      .listen(port);
  });
}

/**
 * Find an available port within a specified range
 * @param startPort Beginning of port range to search
 * @param endPort End of port range to search
 * @param maxAttempts Maximum number of attempts to find an available port
 * @returns Promise resolving to an available port number, or null if none found
 */
export async function findAvailablePort(
  startPort = 10000,
  endPort = 65535,
  maxAttempts = 10
): Promise<number | null> {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    // Generate a random port within the specified range
    const port = startPort + Math.floor(Math.random() * (endPort - startPort));
    
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  
  // If we couldn't find an available port after maxAttempts
  return null;
}

/**
 * Reserve a port for testing
 * Returns a function that releases the port when called
 * @param preferredPort Preferred port to use, will find random port if not available
 * @returns Promise resolving to an object with port number and release function
 */
export async function reservePortForTesting(
  preferredPort?: number
): Promise<{ port: number; release: () => Promise<void> }> {
  // Try preferred port first if specified
  const startPort = preferredPort || 10000;
  const endPort = 65535;
  
  // Find available port
  const port = await findAvailablePort(startPort, endPort) || startPort;
  
  // Reserve port by creating a server
  const server = createServer();
  
  await new Promise<void>((resolve) => {
    server.once('listening', () => resolve());
    server.listen(port);
  });
  
  // Return port number and release function
  return {
    port,
    release: async () => {
      return new Promise<void>((resolve) => {
        if (server.listening) {
          server.close(() => resolve());
        } else {
          resolve();
        }
      });
    },
  };
}
