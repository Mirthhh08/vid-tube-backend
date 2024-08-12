import dotenv from 'dotenv'
import { app } from './app.js'
import connectDB from './db/index.js'

dotenv.config({
    path: './.env'
})

connectDB()
    .then(() => {
        app.on("error", (err) => {
            console.log(err)
        })
        app.listen(process.env.PORTS || 8000, () => {
            console.log(`Server listening on port ${process.env.PORTS || 8000}`)
        })
    })
    .catch((err) => console.log("MONGO_DB ERROR : ", err))