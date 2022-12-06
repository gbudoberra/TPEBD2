/**
 * - POST /user                         PostgreSQL
 * - POST /login                        PostgreSQL
 *
 * - POST /files                        MongoDB + PostgreSQL
 * - GET /file/{docId}                  MongoDB
 * - DELETE /file/{docId}               MongoDB + PostgreSQL
 * - PUT /file/{docId}                  MongoDB
 * - GET /files/{userId}                PostgreSQL
 *
 * - POST /file/{docId}/editors         PostgreSQL
 * - DELETE /file/{docId}/editors       PostgreSQL
 * - GET /file/{docId}/editors          PostgreSQL
 * - GET /files/shared/{userId}         PostgreSQL
 *
 */


const express = require("express");
const morgan = require("morgan"); //Logging
const mongoose = require("mongoose");
const app = express();
const notesSchema = require("./src/models/notes");
const { updateOne } = require("./src/models/notes");
require("dotenv").config();

const pgp = require("pg-promise")(/*options*/);
const postgreSQL = pgp("postgres://sfdimfjr:6lpzaG4vr29YeiGmntl516Rm48W1Dmze@babar.db.elephantsql.com/sfdimfjr");

app.use(express.json());
app.use(morgan("dev"));

app.get("/test", (req, res) => {
    postgreSQL.query("SELECT * from test").then(
        (queryResult) => {
            res.send(queryResult);
        }
    );
})

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

postgreSQL.connect()                                            // Connect to postgreSQL
    .then(() => {
        console.log("PostgreSQL: DB connected");
        mongoose.connect(process.env.MONGODB_URI)               // Then, connect to MongoDB
            .then(() => {
                console.log("MongoDB: DB connected");
                app.listen(3000);                          // Finally, run server
                                                                // TODO: Agregar parametros al server o dejar los default?
                console.log("Server on port 3000");
            })
            .catch((err) => {
                console.log(err);
            });
    })
    .catch((err) => {
        console.log(err);
    });


