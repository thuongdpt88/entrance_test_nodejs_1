// Update with your config settings.

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {
  development: {
      client: 'mysql',
      connection: {
          host : 'streaming.nexlesoft.com',
          port : 3306,
          user: 'test01',
          password: 'PlsDoNotShareThePass123@',
          database: 'entrance_test'
      },
      migrations: {
          directory: "./db/migrations",
      }
  }
};
