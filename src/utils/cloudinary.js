import {v2 as cloudinary} from "cloudinary"
import fs from"fs"

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY,  
    api_secret: process.env.CLOUDINARY_API_SECRET
});

//lfp=local file path
const uploadOnCloudinary = async (lfp) => {
    try {
        if(!lfp)return null
        const response = await cloudinary.uploader.upload(lfp, {
            resource_type:"auto"
        })
        // console.log("File is uploaded on cloudinary",response);
        fs.unlinkSync(lfp)
        return response;
    } catch (error) {
        // removes the local saved temporary file as upload failed
        fs.unlinkSync(lfp)
        return null;
    }
}

export default uploadOnCloudinary

