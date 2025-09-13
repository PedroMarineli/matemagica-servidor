const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'matemagica-bd',
  password: 'root',
  port: 5432,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};