require("dotenv").config();

const pgp = require("pg-promise")(/*options*/);
const postgreSQL = pgp(process.env.POSTGRES_URI);


postgreSQL.connect().
then(() => {
    console.log("PostgreSQL: DB connected");
}).catch((err) => {
    console.log(err);
});

module.exports = { postgreSQL };

