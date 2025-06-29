import {asyncHandler} from "../utils/asyncHandler.js";
import {apiError} from "../utils/apiErrors.js";
import {User} from "../models/User.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";



const registerUser = asyncHandler(async (req , res) =>{
    // get user details from frontend
    //validation
    //check if user already exists-- via username or email
    //check for images and avatar as it is required 
    //upload images and avatar to cloudinary
    // create user object - create entry in db
    // remove password and refresh token field from response 
    //check for user creation
    // return response



    const {fullName, username, email, password} = req.body
    console.log("email :" , email)

    if (
        [fullName , email , password, username].some((field) => field.trim()=== "")
    ){
        throw new apiError("All fields are required", 400)
    }
        
    const existedUser = User.findOne({
        $or: [{username}, {email}]
    })

    if(existedUser){
        throw new apiError("Username or email already exists", 409)
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path;


    if(!avatarLocalPath){
        throw new apiError("Avatar image is required", 400)
    }

    const avatar = await uploadToCloudinary(avatarLocalPath)
    const coverImage = await uploadToCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new apiError("Failed to upload avatar image", 400)
    }


    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        username: username.toLowerCase(),
        email,
        password,
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )


    if(!createdUser){
        throw new apiError("Failed to create user", 500)
    }

    res.status(201).json(
        new apiResponse(200, createdUser, "User registered successfully"  )
    )
})



export 
{
    registerUser,
}