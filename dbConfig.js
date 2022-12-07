require("dotenv").config();

const { Pool } = require("pg");

const postgreSQL = new Pool({
  connectionString: process.env.POSTGRES_URI,
});

postgreSQL.connect().then(() => {
    console.log("PostgreSQL: DB connected")
})
.catch((err) => {
    console.log(err);
});

module.exports = { postgreSQL };

