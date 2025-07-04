import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiErrors.js";
import jwt from "jsonwebtoken";
import { User } from "../models/usermodels.js";




export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const token = req.cookies?.accessToken ||req.header("Authorization")?.replace("Bearer ", "")
    
        if(!token){
            throw new apiError("Not authorized", 401)
        }
    
    
        const decodedToken = jwt.verify(token , process.env.ACCESS_TOKEN_SECRET)
    
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if(!user){
            throw new apiError("Invalid access token", 401)
        }
    
        req.user = user;
        next()
    } catch (error) {
        throw new apiError(401 , error?.message || "Invalid access token"  )
    }






})