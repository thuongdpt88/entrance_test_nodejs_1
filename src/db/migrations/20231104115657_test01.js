/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    return await knex.schema
        .createTableIfNotExists('Users', function (table) {
            table.increments('id').primary();
            table.string('firstName', 32).nullable();
            table.string('lastName', 32).nullable();
            table.string('email', 64).unique().notNullable();
            table.string('hash', 255).notNullable();
            table.dateTime('updatedAt').nullable();
            table.dateTime('createdAt').nullable();
        })
        .createTableIfNotExists('Tokens', function (table) {
            table.increments('id').primary();
            table.integer('userId').unsigned();
            table.string('refreshToken', 250).notNullable();
            table.string('expiresIn', 64).notNullable();
            table.dateTime('updatedAt').nullable();
            table.dateTime('createdAt').nullable();
            table.foreign('userId').references('Users.id');
        });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    return await knex.schema
    .dropTable("Tokens")
    .dropTable("Users");
};

exports.config = { transaction: false };