require("dotenv").config();
const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

// middleware
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://gym-hero-client.web.app",
    "https://gym-hero-client.firebaseapp.com",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// VerifyToken
const verifyToken = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "Unauthorized Access!" });
  }
  const token = req.headers.authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized Access!" });
    }
    req.decoded = decoded;
    next();
  });
};

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
    await client.connect();
    const reviewsCollection = client.db("GymHero").collection("review");
    const trainersCollection = client.db("GymHero").collection("trainer");
    const newsLettersCollection = client.db("GymHero").collection("newsLetter");
    const appliedTrainersCollection = client
      .db("GymHero")
      .collection("appliedTrainer");
    const allClassesCollection = client.db("GymHero").collection("allClass");
    const communitysCollection = client.db("GymHero").collection("community");
    const usersCollection = client.db("GymHero").collection("user");
    const paymentsCollection = client.db("GymHero").collection("payment");
    const slotsCollection = client.db("GymHero").collection("slots");

    // create JWT token
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ token });
    });

    //create-payment-intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseFloat(price) * 100;
      if (!price || amount < 1)
        return res.status(400).send({ error: "Invalid price" });
      try {
        const { client_secret } = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          automatic_payment_methods: {
            enabled: true,
          },
        });
        res.send({ clientSecret: client_secret });
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

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
    app.get("/allnewsLetter", verifyToken, async (req, res) => {
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
    // get all trainers
    app.get("/appliedTrainer", async (req, res) => {
      const result = await appliedTrainersCollection.find().toArray();
      res.send(result);
    });

    // Update AppliedTrainer status
    app.put("/applied/trainers/:id/update-role", async (req, res) => {
      const id = req.params.id;
      const { comment, status } = req.body;

      const updateResult = await appliedTrainersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { comment, status } }
      );

      if (updateResult.modifiedCount === 1) {
        const deleteResult = await appliedTrainersCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(deleteResult);
      } else {
        res
          .status(500)
          .send({ error: "Failed to delete the trainer after update" });
      }
    });

    // get All Class data
    app.get("/allClass", async (req, res) => {
      const page = parseInt(req.query.page) - 1;
      const size = parseInt(req.query.size);
      const filter = req.query.filter;
      const search = req.query.search || "";

      let query = {};
      if (filter) query.category = filter;
      if (search) query.name = { $regex: search, $options: "i" };

      try {
        const result = await allClassesCollection
          .find(query)
          .skip(size * page)
          .limit(size)
          .toArray();

        const count = await allClassesCollection.countDocuments(query);

        res.send({ classes: result, count });
      } catch (error) {
        res
          .status(500)
          .send({ error: "An error occurred while fetching classes." });
      }
    });

    // Get All data by filter or query
    app.get("/class-count", async (req, res) => {
      const filter = req.query.filter;
      const search = req.query.search || "";

      let query = {};
      if (filter) query.category = filter;
      if (search) query.name = { $regex: search, $options: "i" };

      try {
        const count = await allClassesCollection.countDocuments(query);
        res.send({ count });
      } catch (error) {
        res
          .status(500)
          .send({ error: "An error occurred while counting classes." });
      }
    });

    // save single data in allClassesCollection
    app.post("/add-class", async (req, res) => {
      const body = req.body;
      const result = await allClassesCollection.insertOne(body);
      res.send(result);
    });

    // Get single data
    app.get("/allClass/:id", async (req, res) => {
      const id = req.params.id;
      const result = await allClassesCollection
        .aggregate([
          { $unwind: "$trainers" },
          { $match: { "trainers._id": id } },
          { $replaceRoot: { newRoot: "$trainers" } },
        ])
        .next();
      res.send(result);
    });

    // get classes by popularity
    app.get("/recommended-class", async (req, res) => {
      const recommended = await allClassesCollection.find().toArray();
      res.json(recommended);
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

    // save single data in communityCollection
    app.post("/community", async (req, res) => {
      const body = req.body;
      const result = await communitysCollection.insertOne(body);
      res.send(result);
    });

    // get data by recent post from communitysCollection
    app.get("/posts", async (req, res) => {
      const result = await communitysCollection
        .find({})
        .sort({ date: -1 })
        .toArray();
      res.json(result);
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

    // save user data in db
    app.put("/user", async (req, res) => {
      const user = req.body;
      const query = { email: user?.email };
      const isExist = await usersCollection.findOne({ email: user?.email });
      if (isExist) {
        return res.send(isExist);
      }
      const options = { upsert: true };

      const updateDoc = {
        $set: {
          ...user,
          timestamp: Date.now(),
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });

    // get user data by email from usersCollection
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    //Get data by Role base
    app.get("/users/role/trainer", async (req, res) => {
      const result = await usersCollection.find({ role: "trainer" }).toArray();
      res.json(result);
    });

    // Update user data
    app.put("/api/trainers/:id/update-role", async (req, res) => {
      const { id } = req.params;
      const { role } = req.body;
      const updatedTrainer = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role } }
      );
      res.json(updatedTrainer);
    });

    // save payment data in paymentCollection
    app.post("/payment", async (req, res) => {
      const body = req.body;
      const result = await paymentsCollection.insertOne(body);
      res.send(result);
    });

    // add new slot
    app.post("/slots", async (req, res) => {
      const newSlot = req.body;
      const result = await slotsCollection.insertOne(newSlot);
      res.status(201).send(result);
    });

    // get total Price
    app.get("/transactions-summary", async (req, res) => {
      try {
        const transactions = await paymentsCollection.find().toArray();
        let totalPrice = 0;
        transactions.forEach((transaction) => {
          const priceString = transaction.price;
          const match = priceString.match(/\$([\d,.]+)/);
          if (match) {
            const price = parseFloat(match[1].replace(/,/g, ""));
            totalPrice += price;
          }
        });
        const recentTransactions = await paymentsCollection
          .find()
          .sort({ date: -1 })
          .limit(6)
          .project({ transactionId: 1, name: 1, email: 1, _id: 0 })
          .toArray();

        res.send({
          totalPrice,
          recentTransactions,
        });
      } catch (error) {
        res.status(500).send({
          error: "An error occurred while fetching transaction summary.",
        });
      }
    });

    app.get("/paidMember", async (req, res) => {
      const transactions = await paymentsCollection.find().toArray();
      res.send(transactions);
    });

    // Send a ping to confirm a successful connection
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Gym Hero Server is Running.....");
});
app.listen(port, () => {
  console.log(`Gym Hero Server is Running From ${port}`);
});
