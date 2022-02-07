const jwt = require("jsonwebtoken");
const config = require("../Config/config.json");



//authorization middle ware
const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, config.JWTKEY);
    req.userData = decoded;
    next();
  } catch (err) {
   next(err)
  }
};

//create token function
const createToken = (user) => {
  const token = jwt.sign(
    {
      email: user.email,
      id: user.id
    },
    config.JWTKEY,
    { expiresIn: "50m" }
  );

  return token;
};

module.exports = {
  auth,
  createToken,
};