import { asyncHandler } from "../utils/asynchandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/APiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from"jsonwebtoken"


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
      .clearCookie("accessToken,options")
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

export {registerUser,loginUser,logOutUser,refreshAccessToken}