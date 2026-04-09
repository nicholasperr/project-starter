export type Category = '';
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'past';
type UpdateEventParams = {
    title? : string,
    description? : string,
    location? : string,
    category? : Category,
    status? : EventStatus,
    capacity? : number,
    startDatetime? : Date,
    endDatetime? : Date
}
export interface IEvent {
    id: number;
    title: string;
    description: string;
    location: string;
    categrory: Category;
    status: EventStatus;
    capacity: number;
    startDatetime: Date;
    endDatetime: Date;
    organizerId: number;
    createdAt: Date;
    updatedAt: Date;
    updateEvent({}): void;
}

export class Event implements IEvent {
    static nextId = 1;
    id: number;
    title: string;
    description: string;
    location: string;
    categrory: Category;
    status: EventStatus;
    capacity: number;
    startDatetime: Date;
    endDatetime: Date;
    organizerId: number;
    createdAt: Date;
    updatedAt: Date;

    constructor(title: string, description: string, location: string, category: Category, status: EventStatus, capacity: number, startDatetime: Date, endDatetime: Date, organizerId: number) {
        this.id = Event.nextId++;
        this.title = title;
        this.description = description
        this.location = location;
        this.categrory = category;
        this.status = status;
        this.capacity = capacity;
        this.startDatetime = startDatetime;
        this.endDatetime = endDatetime;
        this.organizerId = organizerId;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    updateEvent(params : UpdateEventParams) {
        const { 
            title = this.title,
            description = this.description, 
            location = this.location, 
            category = this.categrory, 
            status = this.status, 
            capacity = this.capacity, 
            startDatetime = this.startDatetime, 
            endDatetime = this.endDatetime,
        } = params;
        
        this.title = title;
        this.description = description
        this.location = location;
        this.categrory = category;
        this.status = status;
        this.capacity = capacity;
        this.startDatetime = startDatetime;
        this.endDatetime = endDatetime;
        this.updatedAt = new Date();

    }

}