const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

// middlewere
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dbn21dt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const reviewsCollection = client.db("GymHero").collection("review");
    const trainersCollection = client.db("GymHero").collection("trainer");
    const newsLettersCollection = client.db("GymHero").collection("newsLetter");
    const appliedTrainersCollection = client
      .db("GymHero")
      .collection("appliedTrainer");
    const allClassesCollection = client.db("GymHero").collection("allClass");
    const communitysCollection = client.db("GymHero").collection("community");

    // reviews
    app.get("/review", async (req, res) => {
      const result = await reviewsCollection.find().toArray();
      res.send(result);
    });

    // newsletter /save data in database
    app.post("/newsLetter", async (req, res) => {
      const body = req.body;
      const result = await newsLettersCollection.insertOne(body);
      res.send(result);
    });

    // get all newsletter
    app.get("/allnewsLetter", async (req, res) => {
      const result = await newsLettersCollection.find().toArray();
      res.send(result);
    });

    // get all trainers
    app.get("/trainer", async (req, res) => {
      const result = await trainersCollection.find().toArray();
      res.send(result);
    });

    // Get single data
    app.get("/trainers/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await trainersCollection.findOne(query);
      res.send(result);
    });

    // save applied trainers data
    app.post("/appliedTrainer", async (req, res) => {
      const body = req.body;
      const result = await appliedTrainersCollection.insertOne(body);
      res.send(result);
    });

    // get all classes data
    app.get("/allClass", async (req, res) => {
      const page = parseInt(req.query.page) - 1;
      const size = parseInt(req.query.size);
      const filter = req.query.filter;
      let query = {};
      if (filter) query = { category: filter };
      const result = await allClassesCollection
        .find(query)
        .skip(size * page)
        .limit(size)
        .toArray();
      res.send(result);
    });

    // get All data by filter or query
    app.get("/class-count", async (req, res) => {
      const filter = req.query.filter;
      let query = {};
      if (filter) query = { category: filter };
      const count = await allClassesCollection.countDocuments(query);
      res.send({ count });
    });
    // Get single data
    app.get("/allClass/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await allClassesCollection.findOne(query);
      console.log(result);
      res.send(result);
    });

    // get all community data
    app.get("/community", async (req, res) => {
      const page = parseInt(req.query.page) - 1;
      const size = parseInt(req.query.size);
      const filter = req.query.filter;
      let query = {};
      if (filter) query = { category: filter };
      const result = await communitysCollection
        .find(query)
        .skip(size * page)
        .limit(size)
        .toArray();
      res.send(result);
    });

    // Get community single data
    app.get("/community-details/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await communitysCollection.findOne(query);
      res.send(result);
    });

    // get All data by filter or query
    app.get("/community-count", async (req, res) => {
      const filter = req.query.filter;
      let query = {};
      if (filter) query = { category: filter };
      const count = await communitysCollection.countDocuments(query);
      res.send({ count });
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Gym Hero Server is Running.....");
});
app.listen(port, () => {
  console.log(`Gym Hero Server is Running From ${port}`);
});
