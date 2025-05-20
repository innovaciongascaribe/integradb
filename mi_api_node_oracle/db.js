require('dotenv').config();
const oracledb = require('oracledb');

// ⚠️ Activar modo "thick" con ruta al Oracle Instant Client
oracledb.initOracleClient({ libDir: 'C:\\oracle\\instantclient_19_22' });

oracledb.autoCommit = true;

async function getConnection() {
  return await oracledb.getConnection({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECT_STRING,
  });
}

module.exports = { getConnection };
