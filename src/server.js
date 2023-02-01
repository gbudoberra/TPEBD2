const express = require("express");
const bcrypt = require("bcrypt");
const passport = require("passport");
const flash = require("connect-flash");
const session = require("express-session");
const morgan = require("morgan"); //Logging
const mongoose = require("mongoose");
const app = express();
const path = require("path")
require("dotenv").config();

const apiRoute = require("./swagger");


const swaggerUI = require("swagger-ui-express")
const swaggerJsDoc = require("swagger-jsdoc")
const swaggerSpec = {
  definition:{
    openapi: "3.0.0",
    info: {
      title: "Final Bases II API",
      version: "1.0.0"
    },
    servers: [
      {
        url: "http://localhost:3000"
      }
    ]
  },
  apis: [`${path.join(__dirname, "./swagger.js")}`]
}
app.use("/api-doc", swaggerUI.serve, swaggerUI.setup(swaggerJsDoc(swaggerSpec)))


const initializePassport = require("./passportConfig");

initializePassport(passport);


const notesSchema = require("./models/notes");
// const { updateOne } = require("./src/models/notes");


const { postgreSQL } = require("./dbConfig.js");

// Parses details from a form
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, './views'));

app.use("/api", apiRoute);


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

app.use(flash());

app.use(express.json());
app.use(morgan("dev"));

///// HOME
app.get("/", checkAuthenticated, (req, res) => {
  res.render("index.ejs");
});

//// WELCOME
app.get("/welcome", checkAuthenticated, (req, res) => {
  res.render("welcome.ejs");
});

//// Register
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
            return res.render("register", {
                message: "Internal server error :("
            });
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
              req.flash("success", "You are now registered. Please log in");
              res.redirect("/login");
            }
          );
        }
      }
    );
  }
});

//// LOGIN
app.get("/login", checkAuthenticated, (req, res) => {
  const success = req.flash('success');
  res.render("login.ejs", { success });
});

app.post("/login",
  passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
    failureFlash: true
  })
);

app.get("/logout", checkNotAuthenticated, (req, res) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/welcome');
    });
});


//// DASHBOARD
app.get("/dashboard", checkNotAuthenticated, (req, res) => {
  res.render("dashboard");
});

function errorRender(err, status, res) {
    console.log(err);
    res.status(status)
    res.render("error", {msg : err});
}

//// FILES
app.get("/files", checkNotAuthenticated, (req, res) => {

    postgreSQL.query('SELECT * FROM files WHERE owner = $1', [req.user.id],
        (err, result) => {
        console.log(result.rows, result.rowCount);
        err? errorRender(err,500, res) : res.render("files", { files: result.rows, nFiles: result.rowCount});
    }
        )

});

app.post("/files", checkNotAuthenticated, (req, res) => {
    console.log(req.isAuthenticated());

    // Save in MongoDB
    notesSchema({
        content: "Hello world",
        owner: req.user.id
    }).save().then((result) => {
            console.log(result)
            postgreSQL.query(
                'INSERT INTO files (mongoId, owner, title, tag) VALUES ($1, $2, $3, $4) RETURNING mongoId', [result._id.toString(), req.user.id, req.body.title, req.body.tag],
                (err) => {
                    if(err){
                        notesSchema.remove({ _id: result._id });
                        errorRender(err,500, res);
                    }
                    res.redirect("/files/" + result._id);
                }
            );
        }
    ).catch((err) => {
        errorRender(err, 500,res)
    });

});

app.get("/files/:id", checkNotAuthenticated, (req, res) => {
    const { id } = req.params;

    //// Check permit and retrieve title
    postgreSQL.query('SELECT * FROM files WHERE mongoid = $1', [id],
        (err, result) => {
            if(err){
                return errorRender(err,500, res);
            }else {

                if(result.rowCount === 0)
                    return errorRender('Not Found', res);       // TODO Return Not Found

                console.log(result.rows[0].owner ,req.user.id)
                if(result.rows[0].owner == req.user.id){    // Owner access
                    console.log('A')
                    let title = result.rows[0].title;
                    notesSchema
                        .findById(id)
                        .then((result) => {
                            console.log(result)
                            console.log('B')
                            res.render('file', { title: title, content: result.content, id: result._id.toString()});
                        })
                        .catch((err) => {
                            errorRender(err, res);
                        });
                }else{

                    postgreSQL.query('select exists(select 1 from shared where docid=$1 and touser = $2)', [id, req.user.id], (err, result1) => {
                        if(err)
                            errorRender(err, res)
                        else {
                            if(result1.rows[0].exists){
                                let title = result.rows[0].title;
                                notesSchema
                                    .findById(id)
                                    .then((result) => {
                                        console.log(result)
                                        res.render('file', { title: title, content: result.content, id: result._id.toString()});
                                    })
                                    .catch((err) => {
                                        errorRender(err, res);
                                    });
                            }else errorRender("Forbidden", res); // TODO Return forbidden
                        }
                    })

                }
            }
        }
    )
});

app.post("/files/:id", checkNotAuthenticated, (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

    postgreSQL.query('SELECT * FROM files WHERE mongoid = $1', [id],
        (err, result) => {
            if(err){
                return errorRender(err, res);
            }else {

                if(result.rowCount === 0)
                    return errorRender('Not Found', res);       // TODO Return Not Found

                if(result.rows[0].owner == req.user.id){    // Owner access
                    notesSchema
                        .updateOne({ _id: id }, { $set: { content } })
                        .then(() => {
                            res.redirect('back');
                        })
                        .catch((err) => {
                            console.log(err);
                        });
                }else{

                    postgreSQL.query('select exists(select 1 from shared where docid=$1 and touser = $2)', [id, req.user.id], (err, result1) => {
                        if(err)
                            errorRender(err, res)
                        else {
                            if(result1.rows[0].exists){
                                notesSchema
                                    .updateOne({ _id: id }, { $set: { content } })
                                    .then(() => {
                                        res.redirect('back');
                                    })
                                    .catch((err) => {
                                        console.log(err);
                                    });
                            }else errorRender("Forbidden", res); // TODO Return forbidden
                        }
                    })

                }
            }
        }
    )


});

app.delete("/files/:id", checkNotAuthenticated, (req, res) => {
    const { id } = req.params;
    notesSchema
      .remove({ _id: id , owner: req.user.id })
      .then(() => {
          postgreSQL.query('DELETE FROM files WHERE mongoid = $1', [id],
              () => {       // TODO error?
                  postgreSQL.query('DELETE FROM shared WHERE docid = $1', [id],
                      () => {       // TODO error?
                          res.redirect('/dashboard');
                      }
                  );
              }
          );
      })
      .catch((err) => {
        console.log(err);
        errorRender(err, res);
      });
  });

//// Sharing files
app.get( "/shared", checkNotAuthenticated, (req, res) => {
    postgreSQL.query('SELECT * FROM files JOIN (SELECT * FROM shared where toUser = $1) as foo on docId = mongoId', [req.user.id],
        (err, result) => {
            console.log(result.rows, result.rowCount);
            err? errorRender(err, res) : res.render("files", { files: result.rows, nFiles: result.rowCount});
        }
    )
    }
);

app.get("/files/:id/editors", checkNotAuthenticated, (req, res) => {
    const { id } = req.params;
    postgreSQL.query(
        'SELECT username FROM (users JOIN (SELECT * FROM shared WHERE docid = $1) as foo on id = toUser)', [id],
        (err, result) => {
            console.log(result.rows, result.rowCount);
            err? errorRender(err, res) : res.render("users", { users: result.rows, nUsers: result.rowCount});
        }
    )
});

app.post("/files/:id/editors", checkNotAuthenticated, (req, res) => {
    const { id } = req.params;
    const { username } = req.body;
    console.log(id, username);
    postgreSQL.query('select id from users where username = $1 AND id != $2', [username, req.user.id], (err, result) => {
        if(err){
            errorRender(err, res);
        }else {
            if(result.rowCount > 0)
            postgreSQL.query('insert into shared values ($1, $2) ON CONFLICT DO NOTHING', [result.rows[0].id, id], (err) => {if (err) errorRender(err, res); else res.redirect('back');})
            else res.redirect('back');
        }
    })


});

app.delete("/files/:id/editors", checkNotAuthenticated, (req, res) => {
    const { id } = req.params;
    const { username } = req.body;
    console.log(id, username);
    postgreSQL.query('select id from users where username = $1 AND id != $2', [username, req.user.id], (err, result) => {
        if(err){
            errorRender(err, res);
        }else {
            if(result.rowCount > 0)
                postgreSQL.query('delete from shared where touser = $1 and docid = $2', [result.rows[0].id, id], (err) => {if (err) errorRender(err, res); else res.redirect('back');})
            else res.redirect('back');      // TODO Avisar que no se encontro el username...
        }
    })
});






app.use((req, res) => {
    return errorRender('Not Found',404, res);       // TODO Return Not Found
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
mongoose.set('strictQuery', true);
mongoose.connect(process.env.MONGODB_URI)
            .then(() => {
                console.log("MongoDB: DB connected");
            })
            .catch((err) => {
                console.log(err);
});


app.listen(3000, () => {
  console.log("Server on port 3000");
});

