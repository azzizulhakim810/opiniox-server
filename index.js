const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@atlascluster.sztfigr.mongodb.net/?retryWrites=true&w=majority`;
// const uri = "mongodb+srv://<username>:<password>@atlascluster.sztfigr.mongodb.net/?retryWrites=true&w=majority";

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

    const postCollection = client.db("opinioXDB").collection("allposts");
    const commentCollection = client.db("opinioXDB").collection("allComments");
    const userCollection = client.db("opinioXDB").collection("allUsers");
    const tagCollection = client.db("opinioXDB").collection("allTags");
    const announcementCollection = client.db("opinioXDB").collection("allAnnouncements");
    const reportCollection = client.db("opinioXDB").collection("allReports");

    //Count Comments
    app.get("/commentsCount", async (req, res) => {
      const result = await commentCollection.estimatedDocumentCount();
      res.send({ result });
    });

    // All tags 
    app.get("/allTags", async (req, res) => {
      const result = await tagCollection.find().toArray();
      res.send(result);
    });

    // is admin 
    app.get('/checkAdmin', async(req, res) => {
      const email = req.query?.email;
      console.log(email);
      let query = {};
      if(req.query?.email){
        query = {email: req.query.email};
        
      }
      const result = await userCollection.findOne(query);
       res.send(result);
    })

    // Load all posts with pagination
    app.get("/posts", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const sortSystem = req.query.sortSystem || "popular";
      // const searchText = req.query?.searchText || 'undefined';
      // console.log(searchText);
      // Validate that page and size are valid integers, defaulting to 0 and 10 if not provided
      const validPage = isNaN(page) ? 0 : Math.max(0, page);
      const validSize = isNaN(size) ? 10 : Math.max(1, size); // Adjust the minimum size as needed

      let sortQuery;
      if (sortSystem === "newest") {
        sortQuery = { time: -1 };
      } else if (sortSystem === "popular") {
        sortQuery = { voteDifference: -1 };
      } else {
        sortQuery = { time: -1 };
      }

      const aggregationPipeline = [
        {
          $addFields: {
            voteDifference: { $subtract: ["$upVote", "$downVote"] },
          },
        },
        /* {
          $match: {
            tags: { $regex: searchText, $options: 'i'},
          }
        }, */
        {
          $sort: sortQuery,
        },
      ];

      const result = await postCollection
        .aggregate(aggregationPipeline)
        .skip(validPage * validSize)
        .limit(validSize)
        .toArray();

      res.send(result);
    });

    // Load all specific user's post 
    app.get("/allPosts", async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { authorEmail: req.query.email };
        // console.log("recent Post Email", req.query.email);
      }
      const result = await postCollection.find(query).toArray();
      res.send(result);
    });


    // get single post 
    app.get("/posts/single/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await postCollection.findOne(query);
      res.send(result);
    });

    // Count Posts
    app.get("/postsCount", async (req, res) => {
      const count = await postCollection.estimatedDocumentCount();
      res.send({ count });
    });

    // Get all User
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // Get a User
    app.get("/user", async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
        // console.log("user Email", req.query?.email);
      }
      const result = await userCollection.findOne(query);
      res.send(result);
    });

     // Get all Announcements
     app.get("/allAnnouncements", async (req, res) => {
      const result = await announcementCollection.find().toArray();
      res.send(result);
    });

       // Count announcements
       app.get("/announcementCount", async (req, res) => {
        const count = await announcementCollection.estimatedDocumentCount();
        res.send({ count });
      });

    // filter post by query parameter
    app.get("/recentPost", async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { authorEmail: req.query.email };
        // console.log("recent Post Email", req.query.email);
      }
      const result = await postCollection.find(query).toArray();
      res.send(result);
    });

    // Count total post by user
    app.get("/totalPost", async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { authorEmail: req.query.email };
        // console.log("recent Post Email", req.query.email);
      }
      const result = await postCollection.find(query).toArray();
      res.send(result);
    });

    // comment page 
    app.get('/allComments', async(req, res) => {
      /* console.log(req.query?.id);
      let query = {};
      if (req.query?.id) {
        query = { postId: req.query?.id };
        // console.log("recent Post id", req.query.id);
      } */
      // const query = { postId: req.query?.id };
      const result = await commentCollection.find().toArray();
      res.send(result);
    })

    // specific comment page 
    app.get('/allComments/:id', async(req, res) => {
     const id = req.params.id;
     const query = {postId: id}
      const result = await commentCollection.find(query).toArray();
      res.send(result);
    })

        // get all reports 
        app.get('/reports', async(req, res) => {
           const result = await reportCollection.find().toArray();
           res.send(result);
         })

    // Post new post
    app.post("/posts", async (req, res) => {
      const newPost = req.body;
      // console.log(newAssignment);
      const result = await postCollection.insertOne(newPost);
      res.send(result);
    });

    // Post a comment
    app.post("/submitComment", async (req, res) => {
      const comment = req.body;
      // console.log(comment);
      const result = await commentCollection.insertOne(comment);
      res.send(result);
    });

    // Add a user
    app.post("/addUser", async (req, res) => {
      const user = req.body;
      // console.log(comment);
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // Add an announcement
    app.post("/announcement", async (req, res) => {
      const announcement = req.body;
      // console.log(comment);
      const result = await announcementCollection.insertOne(announcement);
      res.send(result);
    });
    
    // Add an announcement
    app.post("/report", async (req, res) => {
      const report = req.body;
      // console.log(comment);
      const result = await reportCollection.insertOne(report);
      res.send(result);
    });

    // Comment update
    app.patch("/updateComment/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const filter = { _id: new ObjectId(id) };
      const getPreviousComment = req.body;
      // console.log(getPreviousComment);
      const updateComment = {
        $set: {
          commentsCount: getPreviousComment.commentsCount + 1,
        },
      };
      const result = await postCollection.updateOne(filter, updateComment);
      res.send(result);
    });

    // Admin update
    app.patch("/makeAdmin/:name", async (req, res) => {
      const name = req.params.name;
      console.log(name);
      const filter = { name: name };
      const getRole = req.body?.role;
      // console.log(getRole);
      if(getRole === 'user') {
        const updateRole = {
          $set: {
            role: 'admin'
          }
        };
        const result = await userCollection.updateOne(filter, updateRole);
        res.send(result);
      }
      
    });


    // Upvote update
    app.patch("/updateUpVote/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const filter = { _id: new ObjectId(id) };
      const getPreviousVote = req.body;
      console.log(getPreviousVote);
      const updatePost = {
        $set: {
          votesCount: getPreviousVote.votesCount + 1,
          upVote: getPreviousVote.upVote + 1,
        },
      };
      const result = await postCollection.updateOne(filter, updatePost);
      res.send(result);
    });

    // Downvote update
    app.patch("/updateDownVote/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const filter = { _id: new ObjectId(id) };
      const getPreviousVote = req.body;
      console.log(getPreviousVote);
      const updatePost = {
        $set: { downVote: getPreviousVote.downVote + 1 },
      };
      const result = await postCollection.updateOne(filter, updatePost);
      res.send(result);
    });

    // Delete post 
    app.delete('/posts/delete/:id', async(req, res) => {
      // const id = req.query.id;
      const id = req.params.id;
      // console.log(id);
      const query = {_id: new ObjectId(id)};
      const result = await postCollection.deleteOne(query);
      res.send(result);
    })

    // Delete Report 
    app.delete('/report/delete/:id', async(req, res) => {
      // const id = req.query.id;
      const id = req.params.id;
      // console.log(id);
      const query = {_id: new ObjectId(id)};
      const result = await reportCollection.deleteOne(query);
      res.send(result);
    })

    // Payment Intent 
    app.post('/create-payment-intent', async(req, res) => {
      const {price} = req.body;
      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: calculateOrderAmount(items),
        currency: "usd",
      })
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// default checkup
app.get("/", async (req, res) => {
  res.send("This is OpinioX Running");
});
app.listen(port, () => {
  console.log(`The server is running on ${port}`);
});
