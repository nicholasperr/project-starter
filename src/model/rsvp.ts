export type RSVPStatus = 'going' | 'waitlisted' | 'cancelled';

export interface IRSVP {
    id: number;
    eventId: number;
    userId: number;
    status: string;
    updateEvent(status: RSVPStatus):void;

}

export class RSVP implements IRSVP {
    static nextId = 1;
    id: number;
    eventId: number;
    userId: number;
    status: RSVPStatus;
    createdAt: Date;
    

    constructor(eventId: number, userId: number, status: RSVPStatus) {
        this.id = RSVP.nextId++;
        this.eventId = eventId;
        this.userId = userId;
        this.status = status;
        this.createdAt = new Date();
    }

    updateEvent(status: RSVPStatus) {
        this.status = status;
    }

}