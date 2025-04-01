import mongoose from "mongoose";

export const connectDB = async(uri : string) =>{
    const res = await mongoose.connect(uri,{
        dbName : "Instagram"
    });

    if(res) console.log(`Database Connected to ${res.connection.host}`);
    else console.log('Something Went Wrong!');
}