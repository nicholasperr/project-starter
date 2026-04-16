export type EventError = { name: "InvalidFilterError"; message: string} | { name: "InvalidSearchError"; message: string};

export const InvalidFilterError = (message: string): EventError => ({
    name: "InvalidFilterError",
    message,
});

export const InvalidSearchError = (message: string): EventError => ({
    name: "InvalidSearchError",
    message,
});