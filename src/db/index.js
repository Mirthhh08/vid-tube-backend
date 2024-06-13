import mongoose from 'mongoose'
import { DB_NAME } from '../constants.js'


const connectDB = async () => {
    try {

        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n MongoDB connected !! DB HOST`);
    } catch (error) {
        console.error("MongoDB Connection Failed : ", error);
    }
}

export default connectDB;