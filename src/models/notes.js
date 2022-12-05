const mongoose = require("mongoose");

const notesSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
    },
    owner: {
        type: String,
        required: true,
    }
})

module.exports = mongoose.model("Note", notesSchema);