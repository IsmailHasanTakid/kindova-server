
import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import { createRemoteJWKSet, jwtVerify } from "jose";

const app = express();

app.use(cors());
app.use(express.json());
// JWT Security
// JWT Security
const JWKS = createRemoteJWKSet(
    new URL("http://localhost:3000/api/auth/jwks")
);

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized: Token missing",
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const { payload } = await jwtVerify(token, JWKS);
        req.user = payload;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized: Invalid or expired token",
        });
    }
};
const client = new MongoClient(process.env.MONGODB_URI);

let eventsCollection;

async function run() {
    await client.connect();

    const db = client.db("kindova");
    eventsCollection = db.collection("events");

    console.log("MongoDB Connected Successfully!");

    app.listen(process.env.PORT || 5000, () =>
        console.log(`Kindova server running on port ${process.env.PORT || 5000}`)
    );
}

run().catch(console.error);


// Bangladesh Today
const getToday = () =>
    new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Dhaka",
    }).format(new Date());


// Create Event
app.post("/api/events", verifyToken, async (req, res) => {
    try {
        console.log("Logged-in User:", req.user);
        const eventData = { ...req.body, creatorEmail: req.user.email, };

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
        const events = await eventsCollection.find({
            eventDate: { $gte: getToday() },
        })
            .project({ creatorEmail: 0 })
            .sort({ eventDate: 1, eventTime: 1 })
            .limit(6)
            .toArray();

        res.send({ success: true, events });
    } catch (error) {
        console.error(error);
        res.status(500).send({
            success: false,
            message: "Failed to get recent events",
        });
    }
});


// Get 6 Previous Events
app.get("/api/events/previous", async (req, res) => {
    try {
        const events = await eventsCollection.find({
            eventDate: { $lt: getToday() },
        })
            .project({ creatorEmail: 0 })
            .sort({ eventDate: -1, eventTime: -1 })
            .limit(6)
            .toArray();

        res.send({ success: true, events });
    } catch (error) {
        console.error(error);
        res.status(500).send({
            success: false,
            message: "Failed to get previous events",
        });
    }
});


// Get All Events (Search + Category + Status)
app.get("/api/events", async (req, res) => {
    try {
        const { category, search, status = "all" } = req.query;

        const query = {};

        if (category && category !== "All") {
            query.eventType = category;
        }

        if (search?.trim()) {
            query.title = {
                $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                $options: "i",
            };
        }

        const events = await eventsCollection.find(query)
            .project({ creatorEmail: 0 })
            .toArray();

        const upcoming = events
            .filter(event => event.eventDate >= getToday())
            .sort((a, b) =>
                a.eventDate.localeCompare(b.eventDate) ||
                a.eventTime.localeCompare(b.eventTime)
            );

        const previous = events
            .filter(event => event.eventDate < getToday())
            .sort((a, b) =>
                b.eventDate.localeCompare(a.eventDate) ||
                b.eventTime.localeCompare(a.eventTime)
            );

        res.send({
            success: true,
            events: status === "upcoming" ? upcoming :
                status === "previous" ? previous :
                    [...upcoming, ...previous],
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({
            success: false,
            message: "Failed to get events",
        });
    }
});


// Get My Events
app.get("/api/events/my-events", verifyToken, async (req, res) => {
    try {
        const email = req.user.email;

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
app.get("/api/events/joined", verifyToken, async (req, res) => {
    try {
        const email = req.user.email;

        const events = await eventsCollection.find({
            "joinedUsers.email": email,
        }).toArray();

        res.send({ success: true, events });
    } catch (error) {
        console.error(error);
        res.status(500).send({
            success: false,
            message: "Failed to get joined events",
        });
    }
});


// Get Single Event
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

        const event = await eventsCollection.findOne({
            _id: new ObjectId(id),
        });

        if (!event) {
            return res.status(404).send({
                success: false,
                message: "Event not found",
            });
        }

        const isOwner = !!email &&
            event.creatorEmail?.toLowerCase() === email.toLowerCase();

        const { creatorEmail, ...publicEvent } = event;

        res.send({ success: true, event: publicEvent, isOwner });
    } catch (error) {
        console.error(error);
        res.status(500).send({
            success: false,
            message: "Failed to get event",
        });
    }
});


// Join Event
app.post("/api/events/:id/join", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { email, name, image } = req.user;

        if (!ObjectId.isValid(id) || !email || !name) {
            return res.status(400).send({
                success: false,
                message: "Invalid request",
            });
        }

        const result = await eventsCollection.updateOne(
            {
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

        if (!result.matchedCount) {
            const event = await eventsCollection.findOne({
                _id: new ObjectId(id),
            });

            if (!event) {
                return res.status(404).send({
                    success: false,
                    message: "Event not found",
                });
            }

            return res.status(400).send({
                success: false,
                message: event.creatorEmail?.toLowerCase() === email.toLowerCase()
                    ? "You cannot join your own event"
                    : "You have already joined this event",
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
app.delete("/api/events/:id/leave", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const email = req.user.email;

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
                $pull: { joinedUsers: { email } },
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


// Update Event
const EDITABLE = [
    "title", "eventType", "description", "eventDate", "eventTime",
    "location", "fullAddress", "thumbnailUrl", "volunteerLimit",
    "requiredVolunteers", "contactNumber", "additionalRequirements",
];

app.patch("/api/events/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const email = req.user.email;

        if (!email || !ObjectId.isValid(id)) {
            return res.status(400).send({
                success: false,
                message: "Invalid request",
            });
        }

        const changes = Object.fromEntries(
            EDITABLE.filter(key => key in req.body)
                .map(key => [key, req.body[key]])
        );

        const result = await eventsCollection.updateOne(
            { _id: new ObjectId(id), creatorEmail: email },
            { $set: { ...changes, updatedAt: new Date().toISOString() } }
        );

        if (!result.matchedCount) {
            return res.status(404).send({
                success: false,
                message: "Event not found or not allowed",
            });
        }

        res.send({
            success: true,
            message: "Event updated successfully",
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({
            success: false,
            message: "Failed to update event",
        });
    }
});


// Delete Event
app.delete("/api/events/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const email = req.user.email;

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

        if (!result.deletedCount) {
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


// Home
app.get("/", (req, res) => {
    res.send("Kindova server is Running");
});
