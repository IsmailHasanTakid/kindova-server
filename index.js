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

// ---------------------------------------------------------------------------
// Create Event
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Get all events (optional filters: ?category=&search=&upcoming=true)
// ---------------------------------------------------------------------------
app.get("/api/events", async (req, res) => {
    try {
        const { category, search, upcoming } = req.query;
        const query = {};

        // Category filter
        if (category && category !== "All") {
            query.eventType = category;
        }

        // Title search (case-insensitive, special character safe)
        if (search && search.trim()) {
            const safe = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            query.title = { $regex: safe, $options: "i" };
        }

        // Only today or future events
        if (upcoming === "true") {
            query.eventDate = { $gte: new Date().toISOString().split("T")[0] };
        }

        const events = await eventsCollection
            .find(query, { projection: { creatorEmail: 0 } })
            .sort({ eventDate: 1, eventTime: 1 })
            .toArray();

        res.send({ success: true, events });
    } catch (error) {
        console.error(error);
        res.status(500).send({
            success: false,
            message: "Failed to get events",
        });
    }
});

// ---------------------------------------------------------------------------
// Get events created by a specific user
// NOTE: must stay ABOVE "/api/events/:id"
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Get single event (public, owner email hidden)
// ---------------------------------------------------------------------------
app.get("/api/events/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).send({
                success: false,
                message: "Invalid event id",
            });
        }

        const event = await eventsCollection.findOne(
            { _id: new ObjectId(id) },
            { projection: { creatorEmail: 0 } }
        );

        if (!event) {
            return res.status(404).send({
                success: false,
                message: "Event not found",
            });
        }

        res.send({ success: true, event });
    } catch (error) {
        console.error(error);
        res.status(500).send({
            success: false,
            message: "Failed to get event",
        });
    }
});

// ---------------------------------------------------------------------------
// Update event (only by its creator)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Delete event (only by its creator)
// ---------------------------------------------------------------------------
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