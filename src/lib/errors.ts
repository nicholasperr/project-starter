export type EventError = 
    | {name: 'EventNotFound'; message: string}
    | {name: 'Unauthorized'; message: string}
    | {name: 'Invalid Input'; message: string}
    | {name: 'Invalid State'; message: string}

export const EventNotFound = (message:string): EventError => ({
    name: 'EventNotFound', 
    message
});

export const Unauthorized = (message:string): EventError => ({
    name: 'Unauthorized', 
    message
});

export const InvalidInput = (message:string): EventError => ({
    name: 'Invalid Input', 
    message
});

export const InvalidState = (message:string): EventError => ({
    name: 'Invalid State', 
    message
});