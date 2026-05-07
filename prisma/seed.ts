import "dotenv/config";
import prisma from "../src/prisma";

async function main() {
    await prisma.event.deleteMany();

    await prisma.event.createMany({
        data: [
            {
                title: "Spring Concert on the Quad",
                description: "Live music performance featuring student bands and local artists. Come enjoy an evening of great music outdoors.",
                location: "Student Union Plaza",
                category: "music",
                status: "published",
                capacity: 200,
                startDatetime: new Date("2027-06-10T18:00:00"),
                endDatetime: new Date("2027-06-10T21:00:00"),
                organizerId: "seed-admin",
            },
            {
                title: "Jazz Night at the Campus Center",
                description: "An intimate jazz concert featuring the university jazz ensemble. Light refreshments provided.",
                location: "Campus Center Ballroom",
                category: "music",
                status: "published",
                capacity: 100,
                startDatetime: new Date("2027-06-17T19:00:00"),
                endDatetime: new Date("2027-06-17T22:00:00"),
                organizerId: "seed-admin",
            },
            {
                title: "Intramural Basketball Tournament",
                description: "3-on-3 basketball tournament open to all students. Register your team and compete for the championship.",
                location: "Recreation Center",
                category: "sports",
                status: "published",
                capacity: 60,
                startDatetime: new Date("2027-06-12T10:00:00"),
                endDatetime: new Date("2027-06-12T16:00:00"),
                organizerId: "seed-admin",
            },
            {
                title: "CS Research Symposium",
                description: "Undergraduate and graduate students present their research projects. Q&A sessions with faculty advisors.",
                location: "Computer Science Building Room 101",
                category: "academic",
                status: "published",
                capacity: null,
                startDatetime: new Date("2027-06-20T13:00:00"),
                endDatetime: new Date("2027-06-20T17:00:00"),
                organizerId: "seed-admin",
            },
            {
                title: "End of Year Club Fair",
                description: "Meet student organizations and sign up for clubs across campus. Free food and giveaways for attendees.",
                location: "Main Quad",
                category: "social",
                status: "published",
                capacity: null,
                startDatetime: new Date("2027-06-15T11:00:00"),
                endDatetime: new Date("2027-06-15T14:00:00"),
                organizerId: "seed-admin",
            },
            {
                title: "Food Truck Festival",
                description: "Over a dozen local food trucks on campus for a one-day outdoor festival. Live music and lawn games included.",
                location: "North Parking Lot",
                category: "food",
                status: "published",
                capacity: null,
                startDatetime: new Date("2027-06-22T12:00:00"),
                endDatetime: new Date("2027-06-22T20:00:00"),
                organizerId: "seed-admin",
            },
            {
                title: "Student Art Gallery Opening",
                description: "Opening night for the annual student art exhibition. Artwork from students across all departments on display.",
                location: "Fine Arts Building Gallery",
                category: "arts",
                status: "published",
                capacity: 80,
                startDatetime: new Date("2027-06-18T17:00:00"),
                endDatetime: new Date("2027-06-18T20:00:00"),
                organizerId: "seed-admin",
            },
            {
                title: "Tech Industry Networking Night",
                description: "Meet recruiters and professionals from top tech companies. Bring your resume and dress professionally.",
                location: "Engineering Building Atrium",
                category: "networking",
                status: "published",
                capacity: 150,
                startDatetime: new Date("2027-06-25T18:00:00"),
                endDatetime: new Date("2027-06-25T21:00:00"),
                organizerId: "seed-admin",
            },
        ],
    });

    console.log("Seed data created successfully.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
