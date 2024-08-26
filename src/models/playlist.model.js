import mongoose, {Schema} from "mongoose";

const playlistSchema =new Schema({
    name: {
        type:String,
        required:true
    },
    description: {
        type:String,
        required:true
    },
    duration: {
        type: Number, //cloudinary
        required:true
    },
    videos: [
        {
            type:Schema.Types.ObjectId,
            ref:"Video"
        }
    ],
    owner: {
        type:Schema.Types.ObjectId,
        ref: "User"
    },

},{timestamps:true})


// videoSchema.plugin(mongooseAggregatePaginate)

export const Playlist = mongoose.model("Playlist",playlistSchema)