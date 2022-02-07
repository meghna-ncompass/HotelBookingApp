const bookHotelsRouter = require("express").Router()
const { auth } = require('../Utilities/authorization')
const {
    getHotels,
    Login,
    BookRoom,
    getBookDetails,
    CheckIn,
    CheckOut
} = require('./controller')

const{
    validateLogin,
    validateBooking
} = require('./validation')

bookHotelsRouter.get('/get-hotels',getHotels)
bookHotelsRouter.post('/login',validateLogin,Login)
bookHotelsRouter.post('/book-room',auth,validateBooking,BookRoom)
bookHotelsRouter.get('/get-booking',auth,getBookDetails)
bookHotelsRouter.get('/check-in',auth,CheckIn)
bookHotelsRouter.get('/check-out',auth,CheckOut)



module.exports = bookHotelsRouter