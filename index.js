import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";

const app = express();

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI);

let eventsCollection;

// MongoDB Connection
async function run() {
    try {
        await client.connect();

        const db = client.db("kindova");
        eventsCollection = db.collection("events");

        console.log("MongoDB Connected Successfully!");

        const PORT = process.env.PORT || 5000;

        app.listen(PORT, () => {
            console.log(`Kindova server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("MongoDB Connection Failed:", error);
    }
}

run();


// Create Event

app.post("/api/events", async (req, res) => {
    try {
        const eventData = req.body;

        const result = await eventsCollection.insertOne(eventData);
        res.status(201).send({
            success: true,
            message: "Event created successfully",
            insertedId: result.insertedId,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({
            success: false,
            message: "Failed to create event",
        });
    }
});

// Get 6 Recent Events

app.get("/api/events/recent", async (req, res) => {
    try {
        const events = await eventsCollection
            .find({
                eventDate: { $gte: new Date().toISOString().split("T")[0], },
            }).project({ creatorEmail: 0 }).sort({ createdAt: -1 })
            .sort({ eventDate: 1, eventTime: 1 })
            .limit(6)
            .toArray();

        res.send({ success: true, events, });

    } catch (error) {
        console.error(error);
        res.status(500).send({
            success: false,
            message: "Failed to get recent events",
        });
    }
});


// Get previous 6 events
app.get("/api/events/previous", async (req, res) => {
    try {
        const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", }).format(new Date());
        const events = await eventsCollection
            .find({ eventDate: { $lt: today, }, })
            .project({ creatorEmail: 0 })
            .sort({ eventDate: -1, eventTime: -1 })
            .limit(6)
            .toArray();

        res.send({ success: true, events, });
    } catch (error) {
        console.error(error);
        res.status(500).send({
            success: false,
            message: "Failed to get previous events",
        });
    }
});
// Get all events (optional filters: ?category=&search=&upcoming=true)

// Get all events with filters and search
app.get("/api/events", async (req, res) => {
    try {
        const { category, search, status = "all" } = req.query;

        const query = {};

        // Category filter
        if (category && category !== "All") {
            query.eventType = category;
        }

        // Search by event title
        if (search && search.trim()) {
            const safe = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            query.title = { $regex: safe, $options: "i" };
        }

        // Bangladesh current date
        const today = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Dhaka",
        }).format(new Date());

        // Get all matching events
        const events = await eventsCollection
            .find(query, { projection: { creatorEmail: 0 } })
            .toArray();

        // Separate upcoming and previous events
        const upcomingEvents = events
            .filter((event) => event.eventDate >= today)
            .sort((a, b) =>
                a.eventDate.localeCompare(b.eventDate) ||
                a.eventTime.localeCompare(b.eventTime)
            );

        const previousEvents = events
            .filter((event) => event.eventDate < today)
            .sort((a, b) =>
                b.eventDate.localeCompare(a.eventDate) ||
                b.eventTime.localeCompare(a.eventTime)
            );

        // Apply status filter
        let filteredEvents = [];

        if (status === "upcoming") {
            filteredEvents = upcomingEvents;
        } else if (status === "previous") {
            filteredEvents = previousEvents;
        } else {
            filteredEvents = [...upcomingEvents, ...previousEvents];
        }

        res.send({
            success: true,
            events: filteredEvents,
        });

    } catch (error) {
        console.error(error);

        res.status(500).send({
            success: false,
            message: "Failed to get events",
        });
    }
});


// Get events created by a specific user

app.get("/api/events/my-events", async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).send({
                success: false,
                message: "Email is required",
            });
        }

        const events = await eventsCollection
            .find({ creatorEmail: email })
            .sort({ createdAt: -1 })
            .toArray();

        res.send({ success: true, events });
    } catch (error) {
        console.error(error);
        res.status(500).send({
            success: false,
            message: "Failed to get your events",
        });
    }
});

// Get Joined Events
app.get("/api/events/joined", async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).send({
                success: false,
                message: "Email is required",
            });
        }

        const joinedEvents = await eventsCollection.find({
            "joinedUsers.email": email,
        }).toArray();

        res.send({
            success: true,
            events: joinedEvents,
        });

    } catch (error) {
        console.error(error);

        res.status(500).send({
            success: false,
            message: "Failed to get joined events",
        });
    }
});
// Get single event (public, owner email )
app.get("/api/events/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { email } = req.query;

        if (!ObjectId.isValid(id)) {
            return res.status(400).send({
                success: false,
                message: "Invalid event id",
            });
        }

        const event = await eventsCollection.findOne({ _id: new ObjectId(id), });

        if (!event) {
            return res.status(404).send({
                success: false,
                message: "Event not found",
            });
        }

        const isOwner = !!email && event.creatorEmail?.toLowerCase() === email.toLowerCase();
        const { creatorEmail, ...publicEvent } = event;
        res.send({
            success: true,
            event: publicEvent,
            isOwner,
        });

    } catch (error) {
        console.error(error);

        res.status(500).send({
            success: false,
            message: "Failed to get event",
        });
    }
});


// Join Event
app.post("/api/events/:id/join", async (req, res) => {
    try {
        const { id } = req.params;
        const { email, name, image } = req.body;

        if (!ObjectId.isValid(id) || !email || !name) {
            return res.status(400).send({
                success: false,
                message: "Invalid request",
            });
        }
        const event = await eventsCollection.findOne({ _id: new ObjectId(id), });
        if (!event) {
            return res.status(404).send({
                success: false,
                message: "Event not found",
            });
        }
        if (event.creatorEmail?.toLowerCase() === email.toLowerCase()) {
            return res.status(400).send({
                success: false,
                message: "You cannot join your own event",
            });
        }
        const alreadyJoined = event.joinedUsers?.some(
            (user) => user.email === email
        );

        if (alreadyJoined) {
            return res.status(400).send({
                success: false,
                message: "You have already joined this event",
            });
        }
        const result = await eventsCollection.updateOne({
            _id: new ObjectId(id),
            creatorEmail: { $ne: email },
            "joinedUsers.email": { $ne: email },
        },
            {
                $push: {
                    joinedUsers: {
                        email,
                        name,
                        image: image || "",
                        joinedAt: new Date().toISOString(),
                    },
                },
            }
        );

        if (!result.modifiedCount) {
            return res.status(400).send({
                success: false,
                message: "You have already joined this event",
            });
        }

        res.send({
            success: true,
            message: "Successfully joined the event",
        });

    } catch (error) {
        console.error(error);

        res.status(500).send({
            success: false,
            message: "Failed to join event",
        });
    }
});



// Leave Event
app.delete("/api/events/:id/leave", async (req, res) => {
    try {
        const { id } = req.params;
        const { email } = req.body;

        if (!ObjectId.isValid(id) || !email) {
            return res.status(400).send({
                success: false,
                message: "Invalid request",
            });
        }

        const result = await eventsCollection.updateOne(
            {
                _id: new ObjectId(id),
                "joinedUsers.email": email,
            },
            {
                $pull: {
                    joinedUsers: { email },
                },
            }
        );

        if (!result.modifiedCount) {
            return res.status(404).send({
                success: false,
                message: "You have not joined this event",
            });
        }

        res.send({
            success: true,
            message: "Successfully left the event",
        });

    } catch (error) {
        console.error(error);

        res.status(500).send({
            success: false,
            message: "Failed to leave event",
        });
    }
});

// Update event (only by its creator)

const EDITABLE = [
    "title", "eventType", "description", "eventDate", "eventTime",
    "location", "fullAddress", "thumbnailUrl", "volunteerLimit",
    "requiredVolunteers", "contactNumber", "additionalRequirements",
];

app.patch("/api/events/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { email } = req.query;

        if (!email || !ObjectId.isValid(id)) {
            return res.status(400).send({ success: false, message: "Invalid request" });
        }

        const changes = Object.fromEntries(
            EDITABLE.filter((k) => k in req.body).map((k) => [k, req.body[k]])
        );

        const { matchedCount } = await eventsCollection.updateOne(
            { _id: new ObjectId(id), creatorEmail: email },
            { $set: { ...changes, updatedAt: new Date().toISOString() } }
        );

        if (!matchedCount) {
            return res.status(404).send({ success: false, message: "Event not found or not allowed" });
        }

        res.send({ success: true, message: "Event updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: "Failed to update event" });
    }
});

// Delete event (only by its creator)
app.delete("/api/events/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { email } = req.query;

        if (!email) {
            return res.status(401).send({
                success: false,
                message: "Login required",
            });
        }

        if (!ObjectId.isValid(id)) {
            return res.status(400).send({
                success: false,
                message: "Invalid event id",
            });
        }

        const result = await eventsCollection.deleteOne({
            _id: new ObjectId(id),
            creatorEmail: email,
        });

        if (result.deletedCount === 0) {
            return res.status(404).send({
                success: false,
                message: "Event not found or not allowed",
            });
        }

        res.send({
            success: true,
            message: "Event deleted successfully",
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({
            success: false,
            message: "Failed to delete event",
        });
    }
});

// Home API
app.get("/", (req, res) => {
    res.send("Kindova server is Running");
});