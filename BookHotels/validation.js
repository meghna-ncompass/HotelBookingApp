const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

//parses list of errors
const parseErrors = (errors) => {
  let parsedErr = [];
  errors.forEach((error) => {
    parsedErr.push(error.instancePath.slice(1) + " " + error.message);
  });

  let err = new Error(parsedErr)
  err.name = 'ValidationError'
  return err
};

//verifies validation and parses and customizes response
const validate = (ajvValidate, body, res, next) => {
  const valid = ajvValidate(body);
  if (!valid) {
    const errors = ajvValidate.errors;
    next(parseErrors(errors))
  } else {
    return next();
  }
};

const date_regex = '^(\\d{1,2})/(\\d{1,2})/(\\d{4})$'

const validateLogin = (req, res, next) => {
    const loginSchema = {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 4 },
        },
        required: ["email", "password"],
    }
    return validate(ajv.compile(loginSchema), req.body, res, next);
  };

const validateBooking = (req,res,next) => {
    const bookingSchema = {
        type: "object",
        properties: {
            id : {type: "string" , minLength: 4 , maxLength: 4},
            hotel_id: { type: "string"},
            checkin_date: { type: "string" , pattern: date_regex },
            checkout_date: { type: "string", pattern: date_regex}
        },
        required: ["id","hotel_id","checkin_date","checkout_date"]
    }

    return validate(ajv.compile(bookingSchema),req.body,res,next)
}

module.exports = {
    validateLogin,
    validateBooking
}