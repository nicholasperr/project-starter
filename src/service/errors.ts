export type EventError =
  | { name: "InvalidFilterError"; message: string }
  | { name: "InvalidSearchError"; message: string }
  | { name: "EventFullError"; message: string }
  | { name: "EventClosedError"; message: string }
  | { name: "UnauthorizedRsvpError"; message: string }
  | { name: "EventNotFoundError"; message: string }
  | { name: "DashboardAccessError"; message: string }
  | { name: "DashboardDataError"; message: string };

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

export const EventNotFoundError = (message: string): EventError => ({
  name: "EventNotFoundError",
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