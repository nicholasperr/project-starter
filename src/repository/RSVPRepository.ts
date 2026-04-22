import { Err, Ok, Result } from "../lib/result";
import { IRSVP, RSVP, RSVPStatus } from "../model/rsvp";
import { EventError, EventNotFoundError } from "../service/errors";

export interface IRSVPRepository {
    create(eventId: number, userId: string, status: RSVPStatus): Promise<Result<undefined, EventError>>;
    findByIds(userid: string, eventId: number): Promise<Result<IRSVP,EventError>>;
    findByEventId(eventId: number): Promise<Result<IRSVP[],EventError>>;
    update(id: number, status: RSVPStatus): Promise<Result<undefined,EventError>>;
    delete(id: number): Promise<Result<undefined,EventError>>;
    findAll(): Promise<Result<IRSVP[],EventError>>;
}

class RSVPRepository implements IRSVPRepository {
    private rsvps: IRSVP[] = []
    private nextId: number = 1;

    create(eventId: number, userId: string, status?: RSVPStatus) {
        const rsvp = new RSVP(this.nextId++, eventId, userId, status as RSVPStatus | undefined);
        this.rsvps.push(rsvp);
        return Promise.resolve(Ok(undefined));
    }
    findByIds(userId: string, eventId: number) {
        const rsvp = this.rsvps.find(r => r.userId === userId && eventId === r.eventId) || null;
        if (rsvp === null) {
            return Promise.resolve(Err(EventNotFoundError('RSVP not found')));
        }
        return Promise.resolve(Ok(rsvp));

    }
    findByEventId(eventId: number){
        const rsvps = this.rsvps.filter(r => r.eventId === eventId);
        if (rsvps.length === 0) {
            return Promise.resolve(Err(EventNotFoundError('No RSVPs found for this event')));
        }
        return Promise.resolve(Ok(rsvps));
    }
    update(id: number, status: RSVPStatus){
        const rsvp = this.rsvps.find(r => r.id === id);
        if (rsvp === undefined) {
            return Promise.resolve(Err(EventNotFoundError('RSVP not found')));
        }
        rsvp.updateEvent(status);
        return Promise.resolve(Ok(undefined));
    }
    delete(id: number){
        this.rsvps = this.rsvps.filter(r => r.id !== id);
        return Promise.resolve(Ok(undefined));
    }
    findAll(){
        return Promise.resolve(Ok(this.rsvps));
    }
}

export function CreateRSVPRepository(): IRSVPRepository {
    return new RSVPRepository();
}