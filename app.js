const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const config = require('./Config/config.json')
const bookHotelsRouter = require('./BookHotels/routes')
const { ErrCatcher } = require('./Utilities/error-handling')

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use('/book-hotels',bookHotelsRouter)
app.use(ErrCatcher)

app.listen( config.APP_PORT , () => {
    console.log(`App listening on port ${config.APP_PORT}`)
})