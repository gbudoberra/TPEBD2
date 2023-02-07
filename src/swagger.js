const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router()


const notesSchema = require("./models/notes");
// const { updateOne } = require("./src/models/notes");
const { postgreSQL } = require("./dbConfig.js");


router.get("/users", (req, res) => {
    postgreSQL.query(
        `SELECT * FROM users`,
        (err, results) => {
          if (err) {
            console.log(err);
              return res.json({
                  message: "Internal server error :("
              });
          }else{
            console.log(results.rows);
          res.json(results.rows)
          }
        }
    );
  });


/**
 * @swagger
 * /api/user:
 *  post:
 *   tags: [User]
 *   summary: create a new user
 *   parameters:
 *     - in: query
 *       name: username
 *       required: true
 *       type: string
 *     - in: query
 *       name: password
 *       required: true
 *       type: string
 *     - in: query
 *       name: password2
 *       required: true
 *       type: string
 *       description: repeat your password
 *   responses:
 *     201:
 *       description: user created successfully
 *     403:
 *       description: incorrect information
 *     500:
 *       description: internal server error
 */
router.post("/user", async (req, res) => {
    let { username, password, password2 } = req.query;

    console.log({
      username,
      password,
      password2
    });
    if (!username || !password || !password2) {
        res.status(403).json({ message: "Please enter all fields"  });
        return
    }
    if (password !== password2) {
        res.status(403).json({ message: "Passwords do not match" });
        return
    }
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
              return res.status(500).json({
                  message: "Internal server error :("
              });
          }
          console.log(results.rows);
          if (results.rows.length > 0) {
            return res.status(403).json({
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
                    return res.status(500).json({
                        message: "Internal server error :("
                    });
                }else{
                   console.log(results.rows);
                    return res.status(201).json({
                        message: "User created successfully"
                    });
                }
              }
            );
          }
        }
      );
  });

/**
 * @swagger
 * /api/login:
 *  post:
 *   tags: [Login]
 *   summary: log in
 *   parameters:
 *     - in: query
 *       name: username
 *       required: true
 *       type: string
 *     - in: query
 *       name: password
 *       required: true
 *       type: string
 *   responses:
 *     201:
 *       description: logged in successfully
 *     403:
 *       description: incorrect credentials
 *     500:
 *       description: internal server error
 */
router.post("/login", async (req, res) => {
    let { username, password } = req.query;
    postgreSQL.query(
    `SELECT * FROM users WHERE username = $1`,
    [username],
    (err, results) => {
      if (err) {
        return res.status(500).json({
            message: "Internal server error :("
        });
      }else{
        if (results.rows.length > 0) {
            const user = results.rows[0];
            bcrypt.compare(password, user.password, (err, isMatch) => {
              if (err) {
                return res.status(500).json({
                    message: "Internal server error :("
                });
              }else{
                if (isMatch) {
                    return res.status(201).json(results.rows[0]);
                  } else {
                    //password is incorrect
                    return res.status(403).json({
                        message: "Password is incorrect"
                    });
                  }
              }
            });
          } else {
            // No user
            return res.status(403).json({
                message: "No user with that username"
            });
          }
      }
    }
  );
});

/**
 * @swagger
 * /api/files:
 *  get:
 *   tags: [Files]
 *   summary: Get files from a specific user
 *   parameters:
 *     - in: query
 *       name: userId
 *       required: true
 *       type: integer
 *       description: User id showed on log in response
 *   responses:
 *     200:
 *       description: Got files successfully
 *     404:
 *       description: User not found
 *     500:
 *       description: Internal server error
 */
router.get("/files", (req, res) => {
    postgreSQL.query('SELECT * FROM users WHERE id = $1',
    [req.query.userId],
    (err, results) => {
        if(err){
            return res.status(500).json({
                message: "Internal server error :("
            });

        }else{
            if(results.rowCount === 0){
                return res.status(404).json({
                    message: "User not found"
                });
            }else{
                postgreSQL.query('SELECT * FROM files WHERE owner = $1', [req.query.userId],(err, result) => {
                    if(err){
                        return res.status(500).json({
                                    message: "Internal server error :("
                                });
                    }else{
                        return res.status(200).json(result.rows)
                    }})
            }
        }
    })
})


/**
 * @swagger
 * /api/files:
 *  post:
 *   tags: [Files]
 *   summary: Create a file for a specific user
 *   parameters:
 *     - in: query
 *       name: userId
 *       required: true
 *       type: integer
 *       description: User id showed on log in response
 *     - in: query
 *       name: title
 *       required: true
 *       type: string
 *     - in: query
 *       name: tag
 *       required: true
 *       type: string
 *   responses:
 *     201:
 *       description: Created file successfully!
 *     404:
 *       description: User not found
 *     500:
 *       description: Internal server error
 */
router.post("/files", (req, res) => {
    postgreSQL.query('SELECT * FROM users WHERE id = $1',
    [req.query.userId],
    (err, results) => {
        if(err){
            return res.status(500).json({
                message: "Internal server error :("
            });
        }else{
            if(results.rowCount === 0){
                return res.status(404).json({
                    message: "User not found"
                });
            }
            notesSchema({
                content: "Hello world",
                owner: req.query.userId
            }).save().then((result) => {
                    console.log(result)
                    postgreSQL.query(
                        'INSERT INTO files (mongoId, owner, title, tag) VALUES ($1, $2, $3, $4) RETURNING mongoId', [result._id.toString(), req.query.userId, req.query.title, req.query.tag],
                        (err) => {
                            if(err){
                                notesSchema.remove({ _id: result._id });
                                return res.status(500).json({
                                    message: "Internal server error :("
                                });
                            }
                            return res.status(201).json({
                                message: "File created successfully"
                            });
                        }
                    );
                }
            ).catch((err) => {
                return res.status(500).json({
                    message: "Internal server error :("
                });
            });
        }
    })

});

/**
 * @swagger
 * /api/files/{id}:
 *  get:
 *   tags: [Files]
 *   summary: Get an specific file from a specific user
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       type: string
 *       description: File id (mongoid)
 *     - in: query
 *       name: userId
 *       required: true
 *       type: integer
 *       description: User id showed on log in response
 *   responses:
 *     200:
 *       description: Got file successfully
 *     500:
 *       description: Internal server error
 *     403:
 *       description: Forbidden
 *     404:
 *       description: File not found
 */
router.get("/files/:id", (req, res) => {
    console.log(req.params)
    const { id } = req.params;
    console.log(id)

    postgreSQL.query('SELECT * FROM files WHERE mongoid = $1', [id],
        (err, result) => {
            if(err){
                return res.status(500).json({
                    message: "Internal server error :("
                });
            }else {
                if(result.rowCount === 0)
                return res.status(404).json({
                        message: "File not found"
                    });
                if(result.rows[0].owner == req.query.userId){
                    notesSchema
                        .findById(id)
                        .then((result) => {
                            return res.status(200).json(result);
                        })
                        .catch(() => {
                            return res.status(500).json({
                                message: "Internal server error :("
                            })});
                }else{

                    postgreSQL.query('select exists(select 1 from shared where docid=$1 and touser = $2)', [id, req.user.id], (err, result1) => {
                        if(err)
                            return res.status(500).json({
                                message: "Internal server error :("
                            });
                        else {
                            if(result1.rows[0].exists){
                                notesSchema
                                    .findById(id)
                                    .then((result) => {
                                        return res.status(200).json(result);
                                    })
                                    .catch(() => {
                                        return res.status(500).json({
                                            message: "Internal server error :("
                                        })});
                            }else {
                                return res.status(403).json({
                                    message: "This file belongs to another user"
                                });
                            }
                        }
                    })
                }
            }
        }
    )
});


/**
 * @swagger
 * /api/files/{id}:
 *  put:
 *   tags: [Files]
 *   summary: Edit an specific file from a specific user
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       type: string
 *       description: File id (mongoid)
 *     - in: query
 *       name: userId
 *       required: true
 *       type: integer
 *       description: User id showed on log in response
 *     - in: query
 *       name: content
 *       required: true
 *       type: string
 *   responses:
 *     201:
 *       description: Edit file successfully
 *     500:
 *       description: Internal server error
 *     401:
 *       description: Not acknowledged
 *     403:
 *       description: Forbidden
 *     404:
 *       description: File not found
 */
router.put("/files/:id",  (req, res) => {
    const { id } = req.params;
    postgreSQL.query('SELECT * FROM files WHERE mongoid = $1', [id],
        (err, result) => {
            if(err){
                return res.status(500).json({
                    message: "Internal server error :("
                });
            }else {
                if(result.rowCount === 0)
                return res.status(404).json({
                    message: "File not found"
                });
                if(result.rows[0].owner == req.query.userId){
                    const content = req.query.content;
                    notesSchema
                        .updateOne({ _id: id }, { $set: { content } })
                        .then((result) => {
                            if(result.acknowledged){
                                return res.status(201).json({
                                    message: "Edited file successfully"
                                });
                            }else{
                                return res.status(401).json(result);
                            }
                        })
                        .catch(() => {
                            return res.status(500).json({
                                message: "Internal server error :("
                            });
                        });
                }else{
                    postgreSQL.query('select exists(select 1 from shared where docid=$1 and touser = $2)', [id, req.query.userId], (err, result1) => {
                        if(err)
                        return res.status(500).json({
                                message: "Internal server error :("
                            });
                        else {
                            if(result1.rows[0].exists){
                                const content = req.query.content;
                                notesSchema
                                    .updateOne({ _id: id }, { $set: { content } })
                                    .then((result) => {
                                        if(result.acknowledged){
                                            return res.status(201).json({
                                                message: "Edited file successfully"
                                            });
                                        }else{
                                            return res.status(401).json(result);
                                        }
                                    })
                                    .catch(() => {
                                        return res.status(500).json({
                                            message: "Internal server error :("
                                        });
                                    });
                            }else{
                                return res.status(403).json({
                                    message: "This file belongs to another user"
                                });
                            }
                        }
                    })
                }
            }
        }
    )
    }
);

/**
 * @swagger
 * /api/files/{id}:
 *  delete:
 *   tags: [Files]
 *   summary: Delete an specific file from a specific user
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       type: string
 *       description: File id (mongoid)
 *     - in: query
 *       name: userId
 *       required: true
 *       type: integer
 *       description: User id showed on log in response
 *   responses:
 *     200:
 *       description: Deleted file successfully
 *     500:
 *       description: Internal server error
 *     403:
 *       description: Forbidden
 *     404:
 *       description: File not found
 */
router.delete("/files/:id", (req, res) => {
    const { id } = req.params;
    postgreSQL.query('SELECT * FROM files WHERE mongoid = $1', [id],
        (err, result) => {
            if(err){
                return res.status(500).json({
                    message: "Internal server error :("
                });
            }else {
                if(result.rowCount === 0)
                return res.status(404).json({
                    message: "File not found"
                });
                if(result.rows[0].owner != req.query.userId){
                    return res.status(403).json({
                    message: "This file belongs to another user"
                });
                }
                notesSchema
                .deleteOne({ _id: id , owner: req.query.userId })
                .then(() => {
                    postgreSQL.query('DELETE FROM files WHERE mongoid = $1', [id],
                    (err) => {
                        if(err){
                            return res.status(500).json({
                                message: "Internal server error :("
                            });
                        }else {
                            postgreSQL.query('DELETE FROM shared WHERE docid = $1', [id],
                                (err, result) => {
                                    if (err) {
                                        return res.status(500).json({
                                            message: "Internal server error :("
                                        });
                                    } else {
                                        return res.status(200).json({
                                            message: "Deleted file successfully"
                                        })
                                    }
                                }
                            );
                        }
                    });
                })
                .catch((err) => {
                    return res.status(500).json({
                        message: "Internal server error :("
                    });
                });
            }
        })
  });

/**
 * @swagger
 * /api/files/{id}/editors:
 *  get:
 *   tags: [Files]
 *   summary: Get editors of an specific file
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       type: string
 *       description: File id (mongoid)
 *   responses:
 *     200:
 *       description: Got editors successfully
 *     500:
 *       description: Internal server error
 *     403:
 *       description: Forbidden
 *     404:
 *       description: File not found
 */
router.get("/files/:id/editors", (req, res) => {
    const { id } = req.params;
    postgreSQL.query('SELECT * FROM files WHERE mongoid = $1', [id],
        (err, result) => {
            if(err){
                return res.status(500).json({
                    message: "Internal server error :("
                });
            }else {
                if(result.rowCount === 0){
                    return res.status(404).json({
                    message: "File not found"
                });}
                else{
                    postgreSQL.query(
                        'SELECT username FROM (users JOIN (SELECT * FROM shared WHERE docid = $1) as foo on id = toUser)', [id],
                        (err, result) => {
                            if(err){
                                return res.status(500).json({
                                    message: "Internal server error :("
                                });
                            }else{
                                return res.status(200).json(result.rows)
                            }
                        })
                }
            }
});
});


/**
 * @swagger
 * /api/files/{id}/editors:
 *  post:
 *   tags: [Files]
 *   summary: Add editor to an specific file
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       type: string
 *       description: File id (mongoid)
 *     - in: query
 *       name: userId
 *       required: true
 *       type: integer
 *     - in: query
 *       name: username
 *       required: true
 *       type: string
 *       description: Username of the person you want to share this file
 *   responses:
 *     201:
 *       description: Add editor successfully
 *     500:
 *       description: Internal server error
 *     403:
 *       description: Forbidden
 *     404:
 *       description: Username/File not found
 */
router.post("/files/:id/editors", (req, res) => {
    const { id } = req.params;

    postgreSQL.query('SELECT * FROM files WHERE mongoid = $1', [id],
        (err, result) => {
            if(err){
                return res.status(500).json({
                    message: "Internal server error :("
                });
            }else {
                if(result.rowCount === 0){
                    return res.status(404).json({
                    message: "File not found"
                });}
                else{
                    postgreSQL.query('select id from users where username = $1 AND id != $2', [req.query.username, req.query.userId],
                        (err, result) => {
                            if(err){
                                return res.status(500).json({
                                    message: "Internal server error :("
                                });
                            }else {
                                console.log(result.rows)
                                if(result.rowCount > 0){
                                postgreSQL.query('insert into shared values ($1, $2) ON CONFLICT DO NOTHING', [result.rows[0].id, id],
                                    (err, result) => {
                                        if (err){
                                            return res.status(500).json({
                                                message: "Internal server error :("
                                            });
                                        }else{
                                            return res.status(201).json({
                                                message: "Added editor successfully"
                                            })
                                        }
                                })}
                                else{
                                    return res.status(404).json({
                                        message: "Username not found"
                                    });
                                }
                            }
                        })
                }
            }
        })
    })


/**
 * @swagger
 * /api/files/{id}/editors:
 *  delete:
 *   tags: [Files]
 *   summary: Delete editor from an specific file
 *   parameters:
 *     - in: path
 *       name: id
 *       required: true
 *       type: string
 *       description: File id (mongoid)
 *     - in: query
 *       name: userId
 *       required: true
 *       type: integer
 *     - in: query
 *       name: username
 *       required: true
 *       type: string
 *       description: Username of the person you want to delete from editors of this file
 *   responses:
 *     200:
 *       description: Deleted editor successfully
 *     500:
 *       description: Internal server error
 *     403:
 *       description: Forbidden
 *     404:
 *       description: Username/File not found
 */
router.delete("/files/:id/editors", (req, res) => {
    const { id } = req.params;

    postgreSQL.query('SELECT * FROM files WHERE mongoid = $1', [id],
        (err, result) => {
            if(err){
                return res.status(500).json({
                    message: "Internal server error :("
                });
            }else {
                if(result.rowCount === 0){
                    return res.status(404).json({
                    message: "File not found"
                });}
                else{
                    postgreSQL.query('select id from users where username = $1 AND id != $2', [req.query.username, req.query.userId], (err, result) => {
                        if(err){
                            return res.status(500).json({
                                message: "Internal server error :("
                            });
                        }else {
                            if(result.rowCount > 0) {
                                postgreSQL.query('delete from shared where touser = $1 and docid = $2', [result.rows[0].id, id],
                                    (err, result) => {
                                        if (err) {
                                            return res.status(500).json({
                                                message: "Internal server error :("
                                            });
                                        } else {
                                            if(result.rowCount === 0){
                                                return res.status(403).json({
                                                    message: "This user is not an editor from this file"
                                                })
                                            }else{
                                                return res.status(200).json({
                                                    message: "Deleted editor successfully"
                                                })
                                            }
                                        }
                                    });
                            }else{
                                return res.status(404).json({
                                    message: "Username not found"
                                });
                            }
                        }
                    })
                }
            }
       })
})

/**
 * @swagger
 * /api/shared:
 *  get:
 *   tags: [Files]
 *   summary: Get files that where shared to a specific user
 *   parameters:
 *     - in: query
 *       name: userId
 *       required: true
 *       type: integer
 *       description: User id showed on log in response
 *   responses:
 *     200:
 *       description: Got files successfully
 *     500:
 *       description: Internal server error
 */
router.get( "/shared", (req, res) => {
    postgreSQL.query('SELECT * FROM files JOIN (SELECT * FROM shared where toUser = $1) as foo on docId = mongoId', [req.query.userId],
            (err, result) => {
                if (err) {
                    return res.status(500).json({
                        message: "Internal server error :("
                    });
                } else {
                    return res.status(200).json(result.rows)
                }
            });
    }
);

module.exports = router;