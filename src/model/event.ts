export type Category = 'music' | 'sports' | 'academic' | 'social' | 'food' | 'arts' | 'networking' | 'other';
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'past';
export type UpdateEventParams = {
    title? : string,
    description? : string,
    location? : string,
    category? : Category,
    status? : EventStatus,
    capacity? : number | null,
    startDatetime? : Date,
    endDatetime? : Date
}
export interface IEvent {
    id: number;
    title: string;
    description: string;
    location: string;
    category: Category;
    status: EventStatus;
    capacity: number | null;
    startDatetime: Date;
    endDatetime: Date;
    organizerId: string;
    createdAt: Date;
    updatedAt: Date;
    updateEvent(params: UpdateEventParams): void;
}

export class Event implements IEvent {
    id: number;
    title: string;
    description: string;
    location: string;
    category: Category;
    status: EventStatus;
    capacity: number | null;
    startDatetime: Date;
    endDatetime: Date;
    organizerId: string;
    createdAt: Date;
    updatedAt: Date;

    constructor(id: number, title: string, description: string, location: string, category: Category, status: EventStatus, capacity: number | null = null, startDatetime: Date, endDatetime: Date, organizerId: string) {
        this.id = id;
        this.title = title;
        this.description = description
        this.location = location;
        this.category = category;
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
            category = this.category, 
            status = this.status, 
            capacity = this.capacity, 
            startDatetime = this.startDatetime, 
            endDatetime = this.endDatetime,
        } = params;

        this.title = title;
        this.description = description
        this.location = location;
        this.category = category;
        this.status = status;
        this.capacity = capacity;
        this.startDatetime = startDatetime;
        this.endDatetime = endDatetime;
        this.updatedAt = new Date();

    }

}