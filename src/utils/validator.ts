import { isEmail, isURL } from 'validator';

export function validateEmail(email: string): boolean {
    return isEmail(email);
}

export function validateURL(url: string): boolean {
    return isURL(url);
}

export function validateConfig(config: Record<string, any>, schema: Record<string, any>): boolean {
    // Implement schema validation logic here
    return true; // Placeholder return value
}