import {asyncHandler} from "../utils/asyncHandler.js";
import {apiError} from "../utils/apiErrors.js";
import {User} from "../models/usermodels.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()


        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}


    } catch (error) {
        throw new apiError("Error generating access and refresh tokens", 500)
    }
}


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



    const {fullname, username, email, password} = req.body
    // console.log("email :" , email)
    // console.log("REQ.BODY:", req.body);
    // console.log("REQ.FILES:", req.files);

    if (
        [fullname , email , password, username].some((field) =>  field.trim()=== "")
    ){
        throw new apiError("All fields are required", 400)
    }
        
    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })

    if(existedUser){
        throw new apiError("Username or email already exists", 409)
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }



    if(!avatarLocalPath){
        throw new apiError("Avatar image is required", 400)
    }

    const avatar = await uploadToCloudinary(avatarLocalPath)
    const coverImage = await uploadToCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new apiError("Failed to upload avatar image", 400)
    }


    const user = await User.create({
        fullname,
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

const loginUser = asyncHandler(async (req, res) => {
    //req body -> data
    //username and password
    //find the user 
    //password check
    //generate  access & refresh token
    //send cookies 




    const {email , username , password} = req.body;

    if (!(username || email)){
        throw new apiError("Email or username are required", 400)
    }
// find user by email or username
    const user = await User.findOne({
        $or:[{username}, {email}]
    })

    if(!user){
        throw new apiError("User does not exist..", 404)
    }


    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new apiError("Invalid User Credentials..", 401)
    }


    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)


    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")


    const options = {
        httpOnly : true,
        secure: true,
    }


    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new apiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in successfully.."
        )
    )

})



const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
     const options = {
        httpOnly : true,
        secure: true,
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200) , {} , "User logged out successfully.."  )


})



const refreshAccessToken = asyncHandler(async (req , res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new apiError("Unauthorized request or token is incorrect", 401)
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
    
        )
    
        const user = await User.findById(decodedToken._id)
    
    
    
        if(!user){
            throw new apiError("Inalid Refresh token", 401)
        }
    
        if(incomingRefreshToken!== user.refreshToken){
            throw new apiError("Refresh token is Expired ....!", 401)
        }
    
        const options = {
            httpOnly : true,
            secure: true,
        }
    
    
        const {accessToken , newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
    
    
        return res
        .status(200)
        .cookie("accessToken" , accessToken , options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new apiResponse(
                200,
                {accessToken , refreshToken: newRefreshToken},
                "Access token refreshed successfully.."
            )
        )
    } catch (error) {
        throw new apiError(401, error?.message || "Invalid refresh token")
    }






})


const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new apiError("Old Password is incorrect", 400)
    }


    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res
    .status(200)
    .json(new apiResponse(200) , {} , "Password changed successfully.."  )
})


const getCurrentUser = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json(200 , req.user , "User details fetched successfully.."  )
})


const updateAccountDetails = asyncHandler(async (req, res) => {
    const {fullname , email } = req.body;


    if(!fullname || !email){
        throw new apiError("All fields are required", 400)
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname, 
                email: email 
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new apiResponse(200, user, "User details updated successfully.."  ))

})


const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new apiError("Avatar file is missing ..", 400)
    }

    const avatar = await uploadToCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new apiError("Error while uploading avatar", 400)
    }

    const user = await User.findByIdAndUpdate(
        re.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")
    

    return res
    .status(200)
    .json(new apiResponse(200, user, "User avatar image updated successfully.."  ))
 
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new apiError("Cover image file is missing ..", 400)
    }

    const coverImage = await uploadToCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new apiError("Error while uploading cover Image", 400)
    }

    const user = await User.findByIdAndUpdate(
        re.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new apiResponse(200, user, "User cover image updated successfully.."  ))
})


export 
{
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
}