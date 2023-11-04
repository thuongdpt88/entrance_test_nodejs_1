#!/bin/sh

cd /home/node

# Create new project
# if [ ! -d 'app' ]; then
#
# fi

# Install node_modules
if [ ! -d 'node_modules' ]; then
    echo 'Init...' && npm install && npm install knex -g --save && knex migrate:latest
fi

# start web server
echo 'Start web server ...' && npm install -g nodemon &&  nodemon index.js
