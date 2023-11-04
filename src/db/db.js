const knex = require("knex");
const knexFile = require("../knexfile.js");

module.exports = knex(knexFile['development']);
