const dEnv = require('dotenv').config();
const express = require('express')
const app = express()

app.use(express.static('assets'))

app.get('/', function (req, res) {
    res.send('Hello World')
})

app.listen(3000)