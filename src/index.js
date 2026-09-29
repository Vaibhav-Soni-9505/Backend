import dotenv from "dotenv"
import connectDB from "./db/index.js"
import { app } from "./app.js";
dotenv.config({path: "./.env"});



connectDB()
.then(()=>{
  app.on("error",(err)=>{
    console.log("Error: ",err);
    throw err;
  })
  app.listen(process.env.PORT,()=>{
    console.log(`Server is litening on port: ${process.env.PORT}`);
  })
})
.catch((err)=>{
  console.log(`MongoDB connection Failed!! ${err}`); 
})



/*
import express from "express"
const app = express();

(async()=>{
  try {
    await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`)
    app.on("error",(error)=>{
      console.log("Error: ",error);
      throw error;
    })
    app.listen(process.env.PORT,()=>{
        console.log(`app is listening on PORT: ${process.env.PORT}`);
        
    })
  } catch (error) {
    console.log("Error: ",error)
    throw error
  }
})
*/