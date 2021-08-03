//package dependencies
const
  express = require("express"),
  helmet = require("helmet"),
  cors = require("cors"),
  fetch = require("node-fetch"),
  morgan = require("morgan"),
  swaggerDocument = require('../swagger.json'),
  swaggerUi = require('swagger-ui-express'),
  router = require('express').Router(),
  compression = require('compression'),
  redis = require('redis');




//Declare APP - Express
const app = express();
app.use(helmet());
app.use(cors());
app.use(morgan("tiny"));
app.use(compression());
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument)
);


//SETUP Redis Environment
const redisPort = 6379;
const redisClient = redis.createClient(redisPort);




//NewsAPI URL with Country code set to BR and a valid apikey
let url = "https://newsapi.org/v2/top-headlines?country=br&apiKey=104d7ed3856941478081169f9a003758"



app.get("/latest-news", getRedisCacheNHeader, getNewsFetch);


//Cache distributor AND Header Validatioin (middleware)
function getRedisCacheNHeader(req, res, next) {


  //Validate the header “api-key”
  let key = req.header('api-key');
  if (key !== '123') {
    //Return Bad Request (400) if the api-key is invalid or not present
    res.status(400);
    res.send('Not permitted to access this data');
    return;
  }

  //Check if news cache exists
  redisClient.get("news", (err, data) => {
    if (err) {
      throw err;
    }
    if (data !== null) {
      console.log('cache hit');

      //Return cached json news
      let response = JSON.parse(data);
      res.send(response)

    } else {
      next();
    }
  });
}


//GET news from the provided URL
async function getNewsFetch(req, res, next) {



  try {
    console.log('cache miss');
    const response = await fetch(url);
    const newsjson = await response.json();

    //return new json with news
    res.send(newsjson);

    //Send the fetch to redis Cache and store it for 20 seconds
    const flatJSON = JSON.stringify(newsjson);
    redisClient.setex("news", 20, flatJSON);


  } catch (error) {
    console.log('There was an error: ', error);
    res.status(500);
  }

}

//Start Server at 8080
app.listen(8080, () => {
  console.log("Starting to listen at port 8080");
});

