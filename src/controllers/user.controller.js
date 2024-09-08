import { asyncHandler } from "../utils/asynchandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/APiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from"jsonwebtoken"
import mongoose from "mongoose";


const generateAccessAndRefreshToken = async(userId)=>{
      try {
         const user = await User.findById(userId);
         console.log(user);
         
        if (!user) {
            throw new ApiError(404, "User not found");
        }

         const accessToken = user.generateAccessToken()
         const refreshToken = user.generateRefreshToken()
         console.log(accessToken);
         console.log(refreshToken);
         
         
         user.refreshToken=refreshToken
        await user.save({validateBeforeSave: false})
         console.log(user);
         
        return {accessToken,refreshToken}

      } catch (error) {
         throw new ApiError(500,"Unable to generate access and refresh token")
      }
}

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

//    console.log(req.body);
   
// //    console.log("email: " ,email);
// // if(fullname === ""){
// //     throw new ApiError(400,"fullname is required")
// // }
   if(
    [fullname,email,username,password].some((field)=> field?.trim() === "")
){
        throw new ApiError(400,"All fields are required")
   }

   const existedUser = await  User.findOne({
    $or:[{ username },{ email }]
   })

//    console.log(req.files);

   if(existedUser){
    throw new ApiError(409,"User already existed")
   }
   
// // //    console.log(avatar);
   
   
   const avatarLocalPath=req.files?.avatar[0]?.path
   const coverImageLocalPath=req.files?.coverImage?.[0]?.path

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
    "-password -refreshToken"
   )

   if(!createdUserId){
    throw new ApiError(500, "Something went wrong while creating the user ")
   }

   return res.status(201).json(
    new ApiResponse(200,createdUserId,"User registerd succesfully")
   )

});

const loginUser = asyncHandler(async (req, res) => {
   // Extract user credentials from request body
   const { username, password } =await req.body;
   console.log(req.body);
   

   // Ensure either username or email is provided
   if (!username) {
       throw new ApiError(400, "Username  is required");
   }

   // Find the user by either username or email
   const user = await User.findOne({
       username
   });

   if (!user) {
       throw new ApiError(404, "User does not exist");
   }

   // Validate password
   const isPasswordValid = await user.isPasswordCorrect(password);
   if (!isPasswordValid) {
       throw new ApiError(401, "Incorrect password");
   }

   // Generate access and refresh tokens
   const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

   // Retrieve logged-in user's details excluding sensitive fields
   const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

   // Set cookies for access and refresh tokens
   const options = {
       httpOnly: true,
       secure: true, // Consider making this conditional based on environment (e.g., secure for production only)
   };

   return res
       .status(200)
       .cookie("accessToken", accessToken, options)
       .cookie("refreshToken", refreshToken, options)
       .json(
           new ApiResponse(200, {
               user: loggedInUser,
               accessToken,
               refreshToken,
           }, "User logged in successfully")
       );
});

// const endpoint =asyncHandler(async(req,res)=>{
   
//       console.log('Headers:', req.headers); // Check headers
//       console.log('Body:', req.body); // Check if body is coming through
//       res.send('Request received');
  
// })

const logOutUser = asyncHandler(async(req,res)=>{

      await User.findByIdAndUpdate(
         req.user._id,
         {
            $set:{
               refreshToken: undefined
            }
         },{
            new:true
         }
      )

      const options={
         httpOnly:true,
         secure: true
      }

      return res
      .status(200)
      .clearCookie("accessToken",options)
      .clearCookie("refreshToken",options)
      .json(new ApiResponse(200,{},"User logged Out"))
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

   if(!incomingRefreshToken){
      throw new ApiError(401,"unauthorized request")
   }

  try {
    const decodeToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
 
    const user = await User.findById(decodeToken?._id)
 
    if(!user){
       throw new ApiError(401,"invalid refresh token")
    }
 
    if(incomingRefreshToken !== user?.refreshToken){
       throw new ApiError(401,"refresh token is generated")
    }
    const options = {   
          httpOnly:true,
          secure:true
    }
 
    const {accessToken,newRefreshToken} = await generateAccessAndRefreshToken(user._id)
 
    return res
    .status(200)
    .cookie("accessToken",accessToken.options)
    .cookie("refreshToken",newRefreshToken,options)
    .json(
       new ApiResponse(
          200,
          {accessToken,refreshToken:newRefreshToken},
          "Access Token refreshed"
       )
    )
  } catch (error) {
      throw new ApiError(401,error?.message || "Invalid refresh Token")
  }
   
})

const chnageCurrentUserPassword = asyncHandler(async(req,res)=>{
   const {oldPassword,newPassword} = req.body

   const user= await User.findById(req.user?._id)
   const isPasswordCorrect = user.isPasswordCorrect(oldPassword)
   if(!isPasswordCorrect){
      throw new ApiError(400,"Invalid user password")
   }

   user.password=newPassword
   await user.save({validateBeforeSave:false})

   return res.status(200)
   .json(new ApiResponse(200,{},"Password changed"))
})

const getCurrentUser = asyncHandler(async(req,res)=>{
   return res.status(200)
   .json(new ApiResponse(200,req.user,"current user fetched successfully"))
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
   const {fullname,email} = req.body

   if(!fullname || !email){
      throw new ApiError(400,"All fields required")
   }

   const user= await User.findByIdAndUpdate(
      reeq.user?._id,
      {
         $set:{
            fullname,
            email
         }
      },
      {new:true}
   ).select("-password")

   return res.status(200)
   .json(new ApiResponse(200,user ,"Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async (req,res)=>{
   const avatarLocalPath = req.file?.path

   if(!avatarLocalPath){
      throw new ApiError(400,"Avatar file is missing")
   }
   const avatar=await uploadOnCloudinary(avatarLocalPath)

   if(!avatar.url){
throw new ApiError(400,"Error while uploading on avatar")
   }

   const user = await User.findByIdAndUpdate(req.user?._id,
      {
         $set:{
         avatar:avatar.url
         }
      },
      {
         new:true
      }
   ).select("-password")

   return res.status(200)
   .json(new ApiResponse (200,user,"Avatar Image updated successfully"))
   
})

const updateUserCoverImage = asyncHandler(async (req,res)=>{
   const coverImageLocalPath = req.file?.path

   if(!coverImageLocalPath){
      throw new ApiError(400,"Cover Image file is missing")
   }
   const coverImage=await uploadOnCloudinary(coverImageLocalPath)

   if(!coverImage.url){
throw new ApiError(400,"Error while uploading on avatar")
   }

   const user = await User.findByIdAndUpdate(req.user?._id,
      {
         $set:{
            coverImage:coverImage.url
         }
      },
      {
         new:true
      }
   ).select("-password")

   return res.status(200)
   .json(new ApiResponse (200,user,"Cover Image updated successfully"))
   
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
   const {username} = req.params

   if(!username?.trim()){
      throw new ApiError(400,"username is missing")
   }

  const channel= await User.aggregate([
      {
         $match:{
            username : username?.toLowerCase()
         }
      },
      {
         $lookup:{
            from: "subscriptions",
            localField: "_id",
            foreignField: "channel",
            as: "subscribers"
         }
      },
      {
         $lookup:{
            from: "subscriptions",
            localField:"_id",
            foreignField:"subscribers",
            as:"subscribedTo"
         }
      },
      {
         $addFields:{
            subscribersCount:{
               $size:"$subscribers"
            },
            channelSubscribedToCount:{
                  $size:"$subscribedTo"
            },
            isSubscribed:{
               $cond:{
                  if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                  then:true,
                  else:false
               }
            }
            
         }
      },
      {
         $project:{
            fullname:1,
            username:1,
            subscribersCount:1,
            channelSubscribedToCount:1,
            isSubscribed:1,
            avatar:1,
            coverImage:1,
            email:1
         }
      }
   ])
   console.log(channel);

   if(!channel?.length){
      throw new ApiError(404,"channel doesnot exists")
   }

   return res.status(200)
   .json(new ApiResponse(200,channel[0],"User channel fetched successfully"))
   
})

const getWatchHistory = asyncHandler(async (req,res)=>{
   const user = await User.aggregate([
      {
         $match:{
            _id: new mongoose.Types.ObjectId(req.user._id)
         }
      },
      {
         $lookup:{
            from: "videos",
            localField: "watchHistory",
            foreignField:"_id",
            as:"watchHistory",
            pipeline:[
               {
                  $lookup:{
                     from:"users",
                     localField:"owner",
                     foreignField:"_id",
                     as:"owner",
                     pipeline:[
                        {
                           $project:{
                              fullname:1,
                              username:1,
                              avatar:1
                           }
                        }
                     ]
                  }
               },
               {
                  $addFields:{
                     owner:{
                        $first:"$owner"
                     }
                  }
               }
            ]
         }
      }
   ])

   return res.status(200)
   .json(new ApiResponse(
      200,
      user[0].watchHistory,
      "Watch hostory fetched succesfully"
   ))
}) 

export {registerUser,
   loginUser,
   logOutUser,
   refreshAccessToken,
   chnageCurrentUserPassword,
   getCurrentUser,
updateAccountDetails,
updateUserAvatar,
updateUserCoverImage,
getUserChannelProfile,
getWatchHistory}


//populate