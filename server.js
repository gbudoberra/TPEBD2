const express = require("express");
const morgan = require("morgan"); //Logging
const mongoose = require("mongoose");
const app = express();
const notesSchema = require("./src/models/notes");
const { updateOne } = require("./src/models/notes");
require("dotenv").config();

app.use(express.json());
app.use(morgan("dev"));

app.get("/files", (req, res) => {
  notesSchema
    .find()
    .then((result) => {
      res.json(result);
    })
    .catch((err) => {
      console.log(err);
    });
});

app.post("/files", (req, res) => {
  const note = notesSchema(req.body);
  note.save().then((result) => {
    res.json(result).catch((err) => {
      console.log(err);
    });
  });
  res.send("Files created");
});

app.put("/files/:id", (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  notesSchema
    .updateOne({ _id: id }, { $set: { content } })
    .then((result) => {
      res.json(result);
    })
    .catch((err) => {
      console.log(err);
    });
});

app.delete("/files/:id", (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
    notesSchema
      .remove({ _id: id })
      .then((result) => {
        res.json(result);
      })
      .catch((err) => {
        console.log(err);
      });
  });

app.get("/files/:id", (req, res) => {
  const { id } = req.params;
  notesSchema
    .findById(id)
    .then((result) => {
      res.json(result);
    })
    .catch((err) => {
      console.log(err);
    });
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("DB connected");
  })
  .catch((err) => {
    console.log(err);
  });

app.listen(3000);
console.log("Server on port 3000");
