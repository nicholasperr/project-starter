import { IRSVP, RSVP, RSVPStatus } from "../model/rsvp";

export interface IRSVPRepository {
    create(eventId: number, userId: string, status: string): void;
    findById(id: number): IRSVP | null;
    findByEventId(eventId: number): IRSVP[];
    update(id: number, status: string): IRSVP;
    delete(id: number): void;
    findAll(): IRSVP[];
}

class RSVPRepository implements IRSVPRepository {
    private rsvps: IRSVP[] = []
    private nextId: number = 1;

    create(eventId: number, userId: string, status?: string): void {
        const rsvp = new RSVP(this.nextId++, eventId, userId, status as RSVPStatus | undefined);
        this.rsvps.push(rsvp);
    }
    findById(id: number): IRSVP | null {
        return this.rsvps.find(r => r.id === id) || null;
    }
    findByEventId(eventId: number): IRSVP[] {
        return this.rsvps.filter(r => r.eventId === eventId);
    }
    update(id: number, status: RSVPStatus): IRSVP {
        const rsvp = this.rsvps.find(r => r.id === id);
        if (rsvp === undefined) {
            throw new Error('RSVP not found');
        }
        rsvp.updateEvent(status);
        return rsvp;
    }
    delete(id: number): void {
        this.rsvps = this.rsvps.filter(r => r.id !== id);
    }
    findAll(): IRSVP[] {
        return this.rsvps;
    }
}

// factory function so composition can create repo
export function CreateRSVPRepository(): IRSVPRepository {
    return new RSVPRepository();
}