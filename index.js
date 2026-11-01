
import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
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

        // Start Server after Database Connection
        const PORT = process.env.PORT || 5000;

        app.listen(PORT, () => {
            console.log(`Kindova server running on port ${PORT}`);
        });

    } catch (error) {
        console.error("MongoDB Connection Failed:", error);
    }
}

run();

// Create Event API
app.post("/api/events", async (req, res) => {
    try {
        const eventData = req.body;

        const result = await eventsCollection.insertOne(eventData);

        res.status(201).send({
            success: true,
            message: "Event created successfully",
            insertedId: result.insertedId
        });

    } catch (error) {
        console.error(error);

        res.status(500).send({
            success: false,
            message: "Failed to create event"
        });
    }
});

// Get All Events API
app.get("/api/events", async (req, res) => {
    try {
        const events = await eventsCollection.find().toArray();

        res.status(200).send({
            success: true,
            events: events
        });

    } catch (error) {
        console.error(error);

        res.status(500).send({
            success: false,
            message: "Failed to get events api"
        });
    }
});


// Home API
app.get("/", (req, res) => {
    res.send("Kindova server is Running");
});
