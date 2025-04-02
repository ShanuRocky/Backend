import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
     subscriber: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
         required: true
     },
     chanel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
     }
},{timestamp: true});

export const Subscription =  mongoose.model("Subscription", subscriptionSchema);