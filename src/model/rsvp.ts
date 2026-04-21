export type RSVPStatus = 'going' | 'waitlisted' | 'cancelled';

export interface IRSVP {
    id: number;
    eventId: number;
    userId: string;
    status: string;
    updateEvent(status: RSVPStatus):void;

}

export class RSVP implements IRSVP {
    id: number;
    eventId: number;
    userId: string;
    status: RSVPStatus;
    createdAt: Date;
    

    constructor(id: number,eventId: number, userId: string, status: RSVPStatus = 'waitlisted') {
        this.id = id;
        this.eventId = eventId;
        this.userId = userId;
        this.status = status;
        this.createdAt = new Date();
    }

    updateEvent(status: RSVPStatus) {
        this.status = status;
    }

}