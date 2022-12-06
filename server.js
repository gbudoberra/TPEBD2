const express = require("express");
const bcrypt = require("bcrypt");
const passport = require("passport");
const flash = require("express-flash");
const session = require("express-session");
const morgan = require("morgan"); //Logging
const mongoose = require("mongoose");
const app = express();
require("dotenv").config();


const initializePassport = require("./passportConfig");

initializePassport(passport);


const notesSchema = require("./src/models/notes");
const { updateOne } = require("./src/models/notes");


const { postgreSQL } = require("./dbConfig.js");

// Parses details from a form
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'ejs')


app.use(
  session({
    // Key we want to keep secret which will encrypt all of our information
    secret: process.env.SESSION_KEY,
    // Should we resave our session variables if nothing has changes which we dont
    resave: false,
    // Save empty value if there is no vaue which we do not want to do
    saveUninitialized: false
  })
);
// Funtion inside passport which initializes passport
app.use(passport.initialize());
// Store our variables to be persisted across the whole session. Works with app.use(Session) above
app.use(passport.session());

app.use(express.json());
app.use(morgan("dev"));

app.get("/test", (req, res) => {
  postgreSQL.query("SELECT * from test").then(
      (queryResult) => {
          res.send(queryResult);
      }
  );
})


app.get("/", (req, res) => {
  res.render("index");
});

app.get("/register", checkAuthenticated, (req, res) => {
  res.render("register.ejs");
});

app.post("/register", async (req, res) => {
  let { username, password, password2 } = req.body;

  let errors = [];

  console.log({
    username,
    password,
    password2
  });

  if (!username || !password || !password2) {
    errors.push({ message: "Please enter all fields" });
  }

  if (password.length < 6) {
    errors.push({ message: "Password must be a least 6 characters long" });
  }

  if (password !== password2) {
    errors.push({ message: "Passwords do not match" });
  }

  if (errors.length > 0) {
    res.render("register", { errors, username, password, password2 });
  } else {
    hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword);
    // Validation passed
    postgreSQL.query(
      `SELECT * FROM users
        WHERE username = $1`,
      [username],
      (err, results) => {
        if (err) {
          console.log(err);
        }
        console.log(results.rows);

        if (results.rows.length > 0) {
          return res.render("register", {
            message: "Username already registered"
          });
        } else {
          postgreSQL.query(
            `INSERT INTO users (username, password)
                VALUES ($1, $2)
                RETURNING id, password`,
            [username, hashedPassword],
            (err, results) => {
              if (err) {
                throw err;
              }
              console.log(results.rows);
              req.flash("success_msg", "You are now registered. Please log in");
              res.redirect("/login");
            }
          );
        }
      }
    );
  }
});

app.get("/login", checkAuthenticated, (req, res) => {
  // flash sets a messages variable. passport sets the error message
  console.log(req.session.flash.error);
  res.render("login.ejs");
});

app.post("/login",
  passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
    failureFlash: true
  })
);

app.get("/dashboard", checkNotAuthenticated, (req, res) => {
  console.log(req.isAuthenticated());
  res.render("dashboard", { user: req.user.name });
});


app.get("/logout", (req, res) => {
  req.logout();
  res.render("index", { message: "You have logged out successfully" });
});









app.get("/files", (req, res) => {
  notesSchema
    .find()
    .then((result) => {
      res.render("files", {res : result});
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

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/dashboard");
  }
  next();
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

mongoose.connect(process.env.MONGODB_URI)               // Then, connect to MongoDB
            .then(() => {
                console.log("MongoDB: DB connected");
            })
            .catch((err) => {
                console.log(err);
});

app.listen(3000);                          // Finally, run server
                                                                // TODO: Agregar parametros al server o dejar los default?
console.log("Server on port 3000");
    
