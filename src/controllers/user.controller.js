import { asyncHandler } from "../utils/asynchandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/APiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req,res)=>{
    // get user details from frontend
    // validations - not empty in the least
    // check id user already exist : username, email
    // check for images, check for avatar
    // upload them to cloudinary 
    // create user object - create entry in db
    // remove password and refresh token field from response 
    // check for user creation
    // return response  

    
   const{fullname,username,email,password}= req.body
   console.log(req.body);
   
//    console.log("email: " ,email);
// if(fullname === ""){
//     throw new ApiError(400,"fullname is required")
// }
   if(
    [fullname,email,username,password].some((field)=> field?.trim() === "")
){
        throw new ApiError(400,"All fields are required")
   }

   const existedUser = User.findOne({
    $or:[{ useranme },{ email }]
   })
   if(existedUser){
    throw new ApiError(409,"User already existed")
   }
   console.log(files);
   console.log(avatar);
   
   
   const avatarLocalPath=req.files?.avatar[0]?.path
   const coverImageLocalPath=req.files?.coverImage[0]?.path

   if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file is required")
   }

   const avatar = await uploadOnCloudinary(avatarLocalPath)
   const coverImage = await uploadOnCloudinary(coverImageLocalPath)

   if(!avatar){
     throw new ApiError(400,"Avatar file is required")
   }

   const user = await User.create({
    fullname,
    avatar:avatar.url,
    coverImage:coverImage?.url || "",
    email,
    password,
    username:username.toLowerCase()
   })

   const createdUserId = await User.findById(user._id).select(
    "-password - refreshToken"
   )

   if(!createdUserId){
    throw new ApiError(500, "Something went wrong while creating the user ")
   }

   return res.status(201).json(
    new ApiResponse(200,createdUser,"User registerd succesfully")
   )
   
})

export {registerUser}