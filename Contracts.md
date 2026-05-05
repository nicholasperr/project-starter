# CONTRACTS.md

## Shared Data Shapes

### Event
| Field | Type | Notes |
|---|---|---|
| id | number | Auto-incremented integer |
| title | string | Required |
| description | string | Required |
| location | string | Required |
| category | "music" \| "sports" \| "academic" \| "social" \| "food" \| "arts" \| "networking" \| "other" | |
| status | "draft" \| "published" \| "cancelled" \| "past" | |
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
| status | "going" \| "waitlisted" \| "cancelled" | |
| createdAt | Date | |
| updatedAt | Date | |

---

## Repository Interface Contracts

### EventRepository.create(...)
- **Returns**: `Result<undefined, EventError>`
- **Notes**:
  - Creates a new event in the database
  - `status` defaults to `"draft"`
  - Uses Prisma persistence

---

### EventRepository.findById(id: number)
- **Returns**: `Result<Event, EventError>`
- **Errors**:
  - `EventNotFound` if no event exists
  - `DatabaseError` on failure

---

### EventRepository.update(id: number, params)
- **Returns**: `Result<undefined, EventError>`
- **Errors**:
  - `EventNotFound` if record does not exist
  - `DatabaseError` otherwise

---

### EventRepository.delete(id: number)
- **Returns**: `Result<undefined, EventError>`
- **Errors**:
  - `EventNotFound` if record does not exist

---

### EventRepository.findAll()
- **Returns**: `Result<Event[], EventError>`
- **Notes**:
  - Returns all events from Prisma
  - No filtering applied

---

### EventRepository.findFiltered(query, category?, timeframe?)
- **Returns**: `Result<Event[], EventError>`
- **Notes**:
  - Only returns **published + future events**
  - Supports:
    - text search (title, description, location)
    - category filter
    - timeframe filter (`this_week`, `this_weekend`, `all_upcoming`)

---

## RSVP Repository Contracts

### RSVPRepository.create(eventId, userId, status)
- **Returns**: `Result<undefined, EventError>`
- **Notes**:
  - Creates RSVP
  - Unique constraint: `(eventId, userId)`

---

### RSVPRepository.findByIds(userId, eventId)
- **Returns**: `Result<RSVP, EventError>`
- **Errors**:
  - `EventNotFound` if RSVP does not exist

---

### RSVPRepository.findByEventId(eventId)
- **Returns**: `Result<RSVP[], EventError>`

---

### RSVPRepository.findByUserIdWithEvents(userId)
- **Returns**: `Result<{ rsvp, event }[], EventError>`
- **Notes**:
  - Used for dashboard
  - Includes joined event data

---

### RSVPRepository.update(id, status)
- **Returns**: `Result<undefined, EventError>`

---

### RSVPRepository.delete(id)
- **Returns**: `Result<undefined, EventError>`

---

### RSVPRepository.findAll()
- **Returns**: `Result<RSVP[], EventError>`

---

## Service Layer Contracts

### EventService.getVisibleEventById(eventId, userId, role)
- **Returns**: `Result<Event, EventError>`
- **Rules**:
  - Draft events visible only to:
    - organizer
    - admin
  - Otherwise returns `Unauthorized`

---

### EventService.publishEvent(eventId, userId, role)
- **Returns**: `Result<undefined, EventError>`
- **Rules**:
  - Only `"draft"` → `"published"`
  - Only organizer or admin allowed
  - Invalid transition → `InvalidState`

---

### EventService.cancelEvent(eventId, userId, role)
- **Returns**: `Result<undefined, EventError>`
- **Rules**:
  - Only `"published"` → `"cancelled"`
  - Only organizer or admin allowed

---

### EventService.toggleRSVP(eventId, userId)
- **Returns**: `Result<undefined, EventError>`
- **Behavior**:
  - If no RSVP → create:
    - `"going"` if capacity available
    - `"waitlisted"` if full
  - If existing:
    - active → cancelled
    - cancelled → reactivated
- **Errors**:
  - `EventClosedError` if:
    - event cancelled
    - event started/past

---

### EventService.getUserDashboard(userId, role)
- **Returns**:
```ts
{
  upcoming: { rsvp, event }[]
  past: { rsvp, event }[]
}