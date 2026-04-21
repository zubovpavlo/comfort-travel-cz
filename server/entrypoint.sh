#!/bin/sh
set -e

echo ">>> Running migrations..."
npm run migrate

echo ">>> Running seeds..."
npm run seed

echo ">>> Starting server..."
exec node dist/app.js
