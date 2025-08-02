import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";


const app = express()

dotenv.config()
const port = process.env.PORT;
const MONGO_URL = process.env.MONGO_URL;
app.get('/', (req, res) => {
  res.send('Server running')
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})





//DBCODE
try {
    mongoose.connect(MONGO_URL)
    console.log("connected to MongoDB")
} catch (error) {
    console.log(error)
    
}