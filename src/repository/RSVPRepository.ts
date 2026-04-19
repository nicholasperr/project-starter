import { Err, Ok, Result } from "../lib/result";
import { IRSVP, RSVP, RSVPStatus } from "../model/rsvp";

export interface IRSVPRepository {
    create(eventId: number, userId: string, status: string): Promise<Result<undefined, string>>;
    findById(id: number): Promise<Result<IRSVP,string>>;
    findByEventId(eventId: number): Promise<Result<IRSVP[],string>>;
    update(id: number, status: string): Promise<Result<undefined,string>>;
    delete(id: number): Promise<Result<undefined,string>>;
    findAll(): Promise<Result<IRSVP[],string>>;
}

class RSVPRepository implements IRSVPRepository {
    private rsvps: IRSVP[] = []
    private nextId: number = 1;

    create(eventId: number, userId: string, status?: string) {
        const rsvp = new RSVP(this.nextId++, eventId, userId, status as RSVPStatus | undefined);
        this.rsvps.push(rsvp);
        return Promise.resolve(Ok(undefined));
    }
    findById(id: number) {
        const rsvp = this.rsvps.find(r => r.id === id) || null;
        if (rsvp === null) {
            return Promise.resolve(Err('RSVP not found'));
        }
        return Promise.resolve(Ok(rsvp));

    }
    findByEventId(eventId: number){
        const rsvps = this.rsvps.filter(r => r.eventId === eventId);
        if (rsvps.length === 0) {
            return Promise.resolve(Err('No RSVPs found for this event'));
        }
        return Promise.resolve(Ok(rsvps));
    }
    update(id: number, status: RSVPStatus){
        const rsvp = this.rsvps.find(r => r.id === id);
        if (rsvp === undefined) {
            return Promise.resolve(Err('RSVP not found'));
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