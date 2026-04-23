export type EventError =
  | { name: "EventNotFoundError"; message: string }
  | { name: "UnauthorizedError"; message: string }
  | { name: "InvalidTransitionError"; message: string };

export const EventNotFoundError = (message: string): EventError => ({
  name: "EventNotFoundError",
  message,
});

export const UnauthorizedError = (message: string): EventError => ({
  name: "UnauthorizedError",
  message,
});

export const InvalidTransitionError = (message: string): EventError => ({
  name: "InvalidTransitionError",
  message,
});