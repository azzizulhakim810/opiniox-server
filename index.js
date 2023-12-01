const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());



const uri =  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@atlascluster.sztfigr.mongodb.net/?retryWrites=true&w=majority`;
// const uri = "mongodb+srv://<username>:<password>@atlascluster.sztfigr.mongodb.net/?retryWrites=true&w=majority";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const postCollection = client.db('opinioXDB').collection('posts');

 // Load all posts
app.get('/posts', async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const size = parseInt(req.query.size);

    const sortSystem = req.query.sortSystem || 'popular';

    let sortQuery;
    if (sortSystem === 'newest') {
      sortQuery = { time: -1 };
    } else if (sortSystem === 'popular') {
      sortQuery = { voteDifference: -1 };
    } else {
      sortQuery = { time: -1 };
    }

    const aggregationPipeline = [
      {
        $addFields: {
          voteDifference: { $subtract: ["$upVote", "$downVote"] }
        }
      },
      {
        $sort: sortQuery
      },
    ];

    // Find operation with aggregation pipeline
    const result = await postCollection.aggregate(aggregationPipeline)
    .skip(page*size)
    .limit(size)
    .toArray();

    res.send(result);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).send('Internal Server Error');
  }
});


    // Load Single Post 
    app.get('/posts/singlePost/:id', async(req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await postCollection.findOne(query);
      res.send(result);
    })

    // Count Posts 
    app.get('/postsCount', async(req, res) => {
      const count = await postCollection.estimatedDocumentCount();
      res.send({count})
    })










    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


// default checkup 
app.get('/', async(req, res) => {
  res.send('This is OpinioX Running');
})
app.listen(port, () => {
  console.log(`The server is running on ${port}`);
})