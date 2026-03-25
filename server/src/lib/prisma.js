const { PrismaClient } = require('@prisma/client');

// We export a single shared instance of PrismaClient rather than creating
// a new one in every file that needs the database.
//
// Why? Each PrismaClient instance maintains its own connection pool to the
// database. If we created one per request (or per module), we'd quickly
// exhaust the database's connection limit. A singleton ensures all queries
// share one pool of connections.
const prisma = new PrismaClient();

module.exports = prisma;
