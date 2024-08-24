import mongoose, {Schema} from "mongoose"

const subscriptionSchema =new Schema({
    subscriber:{
        //person who subscribes
        type: Schema.Types.ObjectId,
        ref:"User"
    },
    channel:{
        //channel owner
        type: Schema.Types.ObjectId,
        ref:"User"
    },
},{timestamps:true})



export const Subscription = mongoose.model("Subscription",subscriptionSchema)