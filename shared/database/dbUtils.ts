/**
 * Returns true if the id is a non-empty string or number.
 * @param id Any value
 * @returns boolean
 * @example
 * isValidId('abc') // true
 * isValidId(123) // true
 * isValidId('') // false
 */
export function isValidId(id: unknown): boolean {
    return (
        (typeof id === 'string' && id.trim().length > 0) ||
        (typeof id === 'number' && !Number.isNaN(id))
    );
}

/**
 * Returns a paginated slice of items and metadata.
 * @param items Array of items
 * @param opts Pagination options
 * @returns Paginated result
 * @example
 * paginate([1,2,3,4], { page: 1, pageSize: 2 }) // { items: [1,2], total: 4, page: 1, pageSize: 2 }
 */
export function paginate<T>(
    items: readonly T[],
    opts: { page: number; pageSize: number }
): { items: T[]; total: number; page: number; pageSize: number } {
    const { page, pageSize } = opts;
    const total = items.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
        items: items.slice(start, end),
        total,
        page,
        pageSize,
    };
}

/**
 * Interface for basic CRUD operations.
 */
export interface BaseRepository<T> {
    findById(id: string): Promise<T | null>;
    findAll(): Promise<T[]>;
    create(data: Partial<T>): Promise<T>;
    update(id: string, data: Partial<T>): Promise<T>;
    delete(id: string): Promise<void>;
}
