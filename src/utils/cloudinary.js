import {v2 as cloudinary} from "cloudinary";
import fs from "fs";


 cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,  //dlqsh7fx3
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET   
    });


const uploadToCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;

        // Upload file to cloudinary
        const response =await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
        // console.log("File is Uploaded on Cloudinary.....!", response.url);
        fs.unlinkSync(localFilePath)            // this will remove temporary/ corrupted files from local as uploaded got successful.
        return response

        //uploaded successful..!
    } catch (error) {
        fs.unlinkSync(localFilePath)            // this will remove temporary/ corrupted files from local as uploaded got failed.

        return null;
    }
}



export {uploadToCloudinary}