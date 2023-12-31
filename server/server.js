require('dotenv').config(); //loads the environment variables from the .env file into process.env,
const express = require("express");
const cors = require("cors");
const app = express();
const db = require("./config/db.config.js");
const config = require("./config/config.js");
const PORT = process.env.NODE_DOCKER_PORT || 8080;
const dbFunctions = require("./models/fibonacci.db.model.js");
const fibonacci = require("./models/helper.js");


//Global variables
let preComputed=0;
let prev=0;
let curr=1;

// Enable CORS for all routes
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.CLIENT_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// create database and  tables for the system 
dbFunctions.createDBStructures();

// Handle the SIGINT signal (ctrl+c)
process.on('SIGINT', () => {
  dbFunctions.dropDatabase(() => {
    process.exit(); // Exit the process after dropping the database
  });
});

//test route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to my test application" });
});


// post request for getting a fibonacci 
app.post("/api/getFibonacci/:number", (req, res) => {
    const number = parseInt(req.params.number);
  
    // check if the fibonacci is already computed
    db.query(
      "SELECT * FROM fibonacci WHERE number = ?",
      number,
      (err, result) => {
        if (err) {
          console.log("error occurred :" + err);
        } else {
          const records = result.length;
  
          // if it hasn't been computed yet. Precompute
          if (records === 0) {
            console.log("There is no record hence I need to compute");
            for (let i = preComputed ; i <number; i++) {
              console.log("i:"+i);
              const value =  fibonacci(i,prev,curr);
              prev=curr;
              curr=value;
              db.query(
                "INSERT INTO fibonacci (number, value) VALUES (?, ?)",
                [i, value],
                (err, r) => {
                  if (err) {
                    console.log( err);
                  }
                }
              );
            }
            preComputed = number; // track the maximum computed limit 
          }
  
          // now return the fibonacci sequence
          db.query(
            "SELECT * FROM fibonacci WHERE number <= ? ORDER BY number",
            number,
            (err, result) => {
              if (err) {
                console.log("error occurred :" + err);
              } else {
                console.log("SENDING TO CLIENT");
                for (let i = 0; i < result.length; i++) {
                  console.log("result:"+result[i].value);
                }
                res.send(result);
              }
            }
          );
        }
      }
    );
  });

//set port, listen for requests
app.listen(PORT, () => {
  console.log(`Sever isrunning on port : ${PORT}`);
});
