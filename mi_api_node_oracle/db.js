require('dotenv').config();
const oracledb = require('oracledb');

oracledb.autoCommit = true;

async function getConnection() {
  return await oracledb.getConnection({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECT_STRING,
  });
}

module.exports = { getConnection };
