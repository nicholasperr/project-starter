# CONTRACTS.md

## Shared Data Shapes

### Event
| Field | Type | Notes |
|---|---|---|
| id | number | Auto-incremented integer |
| title | string | Required |
| description | string | Required |
| location | string | Required |
| category | `music` \| `sports` \| `academic` \| `social` \| `food` \| `arts` \| `networking` \| `other` | |
| status | `draft` \| `published` \| `cancelled` \| `past` | |
| capacity | number \| null | null means no limit |
| startDatetime | Date | |
| endDatetime | Date | |
| organizerId | string | References authenticated user |
| createdAt | Date | |
| updatedAt | Date | |

---

### RSVP
| Field | Type | Notes |
|---|---|---|
| id | number | |
| eventId | number | |
| userId | string | |
| status | `going` \| `waitlisted` \| `cancelled` | |
| createdAt | Date | |

---

## Repository Interface Contracts

### `IEventRepository`

#### `create(title, description, location, category, status, capacity, startDatetime, endDatetime, organizerId)`
- **Returns**: `Promise<Result<undefined, EventError>>`
- **Notes**:
  - Creates a new event in Prisma
  - `status` defaults to `draft` in implementation
  - `capacity` can be `null`

#### `findById(id)`
- **Returns**: `Promise<Result<IEvent, EventError>>`
- **Errors**:
  - `EventNotFound` if no event exists
  - `DatabaseError` on failure

#### `update(id, params)`
- **Returns**: `Promise<Result<undefined, EventError>>`
- **Params**: `UpdateEventParams` may include partial updates for title, description, location, category, status, capacity, startDatetime, endDatetime
- **Errors**:
  - `EventNotFound` if record does not exist
  - `DatabaseError` otherwise

#### `delete(id)`
- **Returns**: `Promise<Result<undefined, EventError>>`
- **Errors**:
  - `EventNotFound` if record does not exist

#### `findAll()`
- **Returns**: `Promise<Result<IEvent[], EventError>>`
- **Notes**:
  - Returns all events from Prisma without filters

#### `findFiltered(query, category?, timeframe?)`
- **Returns**: `Promise<Result<IEvent[], EventError>>`
- **Notes**:
  - Only returns **published + future events**
  - Query search covers title, description, and location
  - Supported timeframes:
    - `this_week`
    - `this_weekend`
    - `all_upcoming`
  - Supported categories: same as `Category` type

---

### `IRSVPRepository`

#### `create(eventId, userId, status)`
- **Returns**: `Promise<Result<undefined, EventError>>`
- **Notes**:
  - Creates a new RSVP via Prisma
  - Unique constraint is effectively `(eventId, userId)` in the app logic

#### `findByIds(userId, eventId)`
- **Returns**: `Promise<Result<IRSVP, EventError>>`
- **Errors**:
  - `EventNotFound` if RSVP does not exist

#### `findByEventId(eventId)`
- **Returns**: `Promise<Result<IRSVP[], EventError>>`

#### `findByUserIdWithEvents(userId)`
- **Returns**: `Promise<Result<DashboardRSVPItem[], EventError>>`
- **Notes**:
  - Returns RSVP records joined with event objects for dashboard rendering

#### `update(id, status)`
- **Returns**: `Promise<Result<undefined, EventError>>`

#### `delete(id)`
- **Returns**: `Promise<Result<undefined, EventError>>`

#### `findAll()`
- **Returns**: `Promise<Result<IRSVP[], EventError>>`

---

## Service Layer Contracts

### `IEventService`

#### `createEvent(title, description, location, category, status, capacity, startDatetime, endDatetime, organizerId)`
- **Returns**: `Promise<Result<undefined, EventError>>`
- **Notes**:
  - `status` defaults to `draft`

#### `getEventById(eventId)`
- **Returns**: `Promise<Result<IEvent, EventError>>`

#### `getAllEvents()`
- **Returns**: `Promise<Result<IEvent[], EventError>>`

#### `updateEvent(eventId, title?, description?, location?, category?, status?, capacity?, startDatetime?, endDatetime?)`
- **Returns**: `Promise<Result<undefined, EventError>>`

#### `deleteEvent(eventId)`
- **Returns**: `Promise<Result<undefined, EventError>>`

#### `createRSVP(eventId, userId, status)`
- **Returns**: `Promise<Result<undefined, EventError>>`

#### `toggleRSVP(eventId, userId)`
- **Returns**: `Promise<Result<undefined, EventError>>`
- **Behavior**:
  - If no existing RSVP:
    - `going` if capacity is available
    - `waitlisted` if capacity is full
  - If existing RSVP:
    - active status -> `cancelled`
    - `cancelled` -> reactivate as `going` or `waitlisted` depending on capacity
- **Errors**:
  - `EventClosedError` if the event is cancelled, past, or already started

#### `getRSVPsForEvent(eventId)`
- **Returns**: `Promise<Result<IRSVP[], EventError>>`

#### `updateRSVP(eventId, userId, status)`
- **Returns**: `Promise<Result<undefined, EventError>>`

#### `deleteRSVP(eventId, userId)`
- **Returns**: `Promise<Result<undefined, EventError>>`

#### `getUserDashboard(userId, role)`
- **Returns**:
```ts
{
  upcoming: { rsvp: IRSVP; event: IEvent }[];
  past: { rsvp: IRSVP; event: IEvent }[];
}
```
- **Rules**:
  - Only role `user` can access the dashboard
  - Categorizes RSVPs into upcoming and past based on event status and start time

#### `getVisibleEventById(eventId, userId, role)`
- **Returns**: `Promise<Result<IEvent, EventError>>`
- **Rules**:
  - Draft events visible only to the organizer or admin
  - Otherwise returns `Unauthorized`

#### `getOrganizerDisplayName(organizerId)`
- **Returns**: `Promise<Result<string, EventError>>`
- **Notes**:
  - Resolves an organizer display name from the user repository
  - Falls back to `organizerId` when the user is not found

#### `publishEvent(eventId, userId, role)`
- **Returns**: `Promise<Result<undefined, EventError>>`
- **Rules**:
  - Only transitions `draft` -> `published`
  - Only organizer or admin may publish
  - Invalid state returns `InvalidState`

#### `cancelEvent(eventId, userId, role)`
- **Returns**: `Promise<Result<undefined, EventError>>`
- **Rules**:
  - Only transitions `published` -> `cancelled`
  - Only organizer or admin may cancel

#### `getHomePageData(userId, role)`
- **Returns**: `Promise<Result<{ upcomingEvents: IEvent[]; adminEvents: IEvent[]; userRsvps: { rsvp: IRSVP; event: IEvent }[] }, EventError>>`
- **Notes**:
  - Returns top home page cards for upcoming events and role-specific dashboard items
  - For admins/staff returns events organized by the current user
  - For regular users returns the first 4 upcoming RSVPs

#### `searchEvents(query)`
- **Returns**: `Promise<Result<IEvent[], EventError>>`
- **Notes**:
  - Rejects whitespace-only queries
  - Uses repository filtering for published future events

#### `getFilteredEvents(category?, timeframe?)`
- **Returns**: `Promise<Result<IEvent[], EventError>>`
- **Notes**:
  - Filters only `published` events
  - Supports category validation, timeframe validation, and upcoming event matching

#### `getMyEvents(userId, role)`
- **Returns**: `Promise<Result<IEvent[], EventError>>`
- **Rules**:
  - Only admins and staff can retrieve their own events
  - Returns events where `organizerId === userId`
