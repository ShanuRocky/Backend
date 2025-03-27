import {v2 as cloudinary} from 'cloudinary';
import { Console } from 'console';
import fs from "fs";

          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
       if(!localFilePath) return null
       //upload the file on coudinary
       const response = await cloudinary.uploader.upload(localFilePath,{ 
            resource_type: 'auto' 
       });
       //file has been uploaded
        return response
    } catch (error) {
        return null
    }finally{
      if(localFilePath) await fs.unlinkSync(localFilePath)
    }
}

export {uploadOnCloudinary}