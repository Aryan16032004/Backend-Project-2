// require('dotenv').config({path:'./env'}) // will work

import dotenv from "dotenv"
import connnectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path:'./.env'
})

connnectDB()
.then(()=>{
    app.on("error",(error)=>{
        console.log("ERROR: ",error );
        throw error
    })
})
.then(()=>{
    const port=process.env.PORT || 8000
    app.listen(port,()=>{
        console.log(`Server is running at port: ${port}`);
        
    })
})
.catch((error)=>{
    console.log("Mongo db connection fail");
    
})

/*
//first approach is to make a iife
(async ()=>{
    try {
       await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
    } catch (error) {
        console.log("ERROR: ",error);
        throw err   
    }
})()
    */