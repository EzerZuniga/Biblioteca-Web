require('dotenv').config({ quiet: true });
const { Sequelize } = require('sequelize');

const database = process.env.DB_NAME;
const username = process.env.DB_USER;
const password = process.env.DB_PASS;

const options = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  dialect: 'mysql',
  logging: false,
};

const sequelize = new Sequelize(
  database,
  username,
  password,
  options
);

module.exports = sequelize;