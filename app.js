const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const config = require('./Config/config.json')
const bookHotelsRouter = require('./BookHotels/routes')
const { ErrCatcher } = require('./Utilities/error-handling')
const { errorResponse } = require('./Utilities/custom-response')
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use('/book-hotels',bookHotelsRouter)
app.use(ErrCatcher)



app.use(function (req, res) {
    return errorResponse({ err_code: 404 , message: "Page not Found"},res)
})

app.listen( config.APP_PORT,config.HOST, () => {
    console.log(`App listening on port ${config.APP_PORT}`)
})