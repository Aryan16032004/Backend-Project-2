// require('dotenv').config({path:'./env'}) // will work

import dotenv from "dotenv"
import connnectDB from "./db/index.js";

dotenv.config({
    path:'./env'
})

connnectDB()

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