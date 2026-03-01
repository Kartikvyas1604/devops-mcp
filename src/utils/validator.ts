/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function validateURL(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validate configuration against a schema
 */
export function validateConfig(config: Record<string, unknown>, schema: Record<string, unknown>): boolean {
    // Basic schema validation
    for (const key of Object.keys(schema)) {
        if (!(key in config)) {
            return false;
        }
    }
    return true;
}