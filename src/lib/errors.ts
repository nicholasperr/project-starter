export type EventError = 
    | {name: 'EventNotFound'; message: string}
    | {name: 'Unauthorized'; message: string}
    | {name: 'Invalid Input'; message: string}
    | {name: 'Invalid State'; message: string}
    | {name: "InvalidFilterError"; message: string }
    | {name: "InvalidSearchError"; message: string }
    | {name: "EventFullError"; message: string }
    | {name: "EventClosedError"; message: string }
    | {name: "UnauthorizedRsvpError"; message: string }
    | {name: "DashboardAccessError"; message: string }
    | {name: "DashboardDataError"; message: string }

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
export const InvalidFilterError = (message: string): EventError => ({
  name: "InvalidFilterError",
  message,
});

export const InvalidSearchError = (message: string): EventError => ({
  name: "InvalidSearchError",
  message,
});

export const EventFullError = (message: string): EventError => ({
  name: "EventFullError",
  message,
});

export const EventClosedError = (message: string): EventError => ({
  name: "EventClosedError",
  message,
});

export const UnauthorizedRsvpError = (message: string): EventError => ({
  name: "UnauthorizedRsvpError",
  message,
});

export const DashboardAccessError = (message: string): EventError => ({
  name: "DashboardAccessError",
  message,
});

export const DashboardDataError = (message: string): EventError => ({
  name: "DashboardDataError",
  message,
});