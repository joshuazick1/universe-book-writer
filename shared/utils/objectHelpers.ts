/**
 * Returns true if value is a plain object (not array, not null, not class instance).
 * @param value Any value
 * @returns boolean
 * @example
 * isPlainObject({ a: 1 }) // true
 * isPlainObject([1,2,3]) // false
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        Object.prototype.toString.call(value) === '[object Object]'
    );
}

/**
 * Returns a new object with only the specified keys.
 * @param obj Source object
 * @param keys Keys to pick
 * @returns New object with picked keys
 * @example
 * pick({ a: 1, b: 2 }, ['a']) // { a: 1 }
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>;
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            result[key] = obj[key];
        }
    }
    return result;
}

/**
 * Returns a new object without the specified keys.
 * @param obj Source object
 * @param keys Keys to omit
 * @returns New object without omitted keys
 * @example
 * omit({ a: 1, b: 2 }, ['a']) // { b: 2 }
 */
export function omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const result = { ...obj };
    for (const key of keys) {
        delete result[key];
    }
    return result;
}
