const db = require("../Utilities/db-operations");
const { customResponse, dateParser } = require("../Utilities/custom-response");
const md5 = require("md5");
const { createToken } = require("../Utilities/authorization");

const getHotels = async (req, res, next) => {
  try {
    let body = [];
    let query = `SELECT * FROM Hotels `;

    let filters = [];
    if (req.query.rating) {
      filters.push(`Star_Rating=${req.query.rating}`);
    }
    if (req.query.cost) {
      filters.push(`Cost_Per_Day=${req.query.cost}`);
    }
    if (req.query.hotel_name) {
      filters.push(`Hotel_Name=${req.query.hotel_name}`);
    }

    if (filters.length > 0) {
      query = query + "WHERE " + filters.join(" AND ");
    }

    if (req.query.sort) {
      add = `ORDER BY ${req.query.sort}`;
      query = query + add;
    }
    console.log(query);
    let result = await db.executeQuery(query, body).catch(function reject(err) {
      next(Error(err.sqlMessage));
      return null;
    });

    if (result !== null) {
      if (req.query.paginate) {
        let paginate = req.query.paginate;
        let page = req.query.page;

        let start =
          paginate * page < result.length
            ? paginate * (page - 1)
            : result.length - (result.length % paginate);
        let end = start + 3 < result.length ? start + 3 : result.length;
        return customResponse(result.slice(start, end), res);
      } else {
        return customResponse(result, res);
      }
    }
  } catch (err) {
    next(err);
  }
};

const Login = async (req, res, next) => {
  try {
    let email = req.body.email;
    let password = md5(req.body.password);

    let query = "SELECT * FROM Customers WHERE Email=?";
    let result = await db
      .executeQuery(query, [email])
      .catch(function reject(err) {
        next(Error(err.sqlMessage));
        return null;
      });

    if (result !== null) {
      if (result.length === 0) {
        next(Error("user does not exist"));
      } else {
        let user = { email: result[0].Email, id: result[0].Id };
        let token = createToken(user);
        if (result[0].Password === password) {
          return customResponse(
            { code: 200, message: "login successful !", token: token },
            res
          );
        } else {
          next(Error("login unsuccessfull"));
        }
      }
    }
  } catch (err) {
    next(err);
  }
};

const BookRoom = async (req, res, next) => {
  try {
    let hotelId = req.body.hotel_id;

    let query1 = `SELECT * FROM Hotels WHERE Hotel_Id=?`;
    let hotel = await db
      .executeQuery(query1, [hotelId])
      .catch(function reject(err) {
        next(Error(err.sqlMessage));
        return null;
      });

    if (hotel[0].Rooms_Available === 0) {
      next(Error("All rooms are occupied, Not available for booking"));
    } else {
      console.group(hotel);
      let checkin_date = dateParser(req.body.checkin_date);
      let checkout_date = dateParser(req.body.checkout_date);

      let days =
        (checkout_date.getTime() - checkin_date.getTime()) / (1000 * 3600 * 24);
      let cost = days * hotel[0].Cost_Per_Day;

      let body = [
        req.body.id,
        req.body.hotel_id,
        req.userData.id,
        dateParser(req.body.booking_date),
        "Not Yet",
        checkin_date,
        "Not Yet",
        checkout_date,
        cost,
      ];

      let query =
        "INSERT INTO Booking (Booking_Id,Hotel_Id,Customer_Id,Booking_Date,Check_In,Check_In_Date,Check_Out,Check_Out_Date,Cost) VALUES (?)";
      let result = await db
        .executeQuery(query, [body])
        .catch(function reject(err) {
          next(Error(err.sqlMessage));
          return null;
        });

      if (result !== null) {
        return customResponse({code: 200, message: "Your Booking is Done !"}, res);
      }
    }
  } catch (err) {
    next(err);
  }
};

const getBookDetails = async (req, res, next) => {
  try {
    let customer_id = req.userData.id;

    let query =
      "SELECT * FROM Booking as b LEFT JOIN Hotels as h  ON b.Hotel_Id = h.Hotel_Id WHERE b.Customer_Id = ?";

    if (req.query.columns) {
      let columns = req.query.columns.split(",");
      if (columns.includes("Hotel_Id")) {
        let ind = columns.indexOf("Hotel_Id");
        columns[ind] = "h.Hotel_Id";
      }
      query = `SELECT ${columns.toString()} FROM Booking as b LEFT JOIN Hotels as h  ON b.Hotel_Id = h.Hotel_Id WHERE b.Customer_Id = ?`;
    }
    console.log(query);
    let result = await db
      .executeQuery(query, [customer_id])
      .catch(function reject(err) {
        next(Error(err.sqlMessage));
        return null;
      });

    if (result !== null) {
      return customResponse(result, res);
    }
  } catch (err) {
    next(err);
  }
};

const CheckIn = async (req, res, next) => {
  try {
    let customer_id = req.userData.id;
    let booking_id = req.query.booking;

    let query2 =
      "SELECT Customer_Id,Hotel_Id , Check_In FROM Booking WHERE Booking_Id=?";
    let result2 = await db
      .executeQuery(query2, [booking_id])
      .catch(function reject(err) {
        next(Error(err.sqlMessage));
        return null;
      });

    if (result2[0].Customer_Id !== customer_id) {
      return customResponse(
        {
          code: 406,
          message:
            "Please Enter Booking Id of A Booking that the User has Made",
        },
        res
      );
    } else if (result2[0].Check_In === "Not Yet") {
      let query =
        "UPDATE Booking SET Check_In ='Yes' WHERE Booking_Id=? AND Customer_Id=?";

      let body = [booking_id, customer_id];
      let result = await db
        .executeQuery(query, body)
        .catch(function reject(err) {
          next(Error(err.sqlMessage));
          return null;
        });

      let hotel_id = result2[0].Hotel_Id;

      let query3 =
        "UPDATE Hotels SET Rooms_Available = Rooms_Available - 1 WHERE Rooms_Available > 0 AND Hotel_Id = ?;";
      let result3 = await db
        .executeQuery(query3, [hotel_id])
        .catch(function reject(err) {
          next(Error(err.sqlMessage));
          return null;
        });

      if (result3 !== null) {
        return customResponse(
          { code: 200, message: "Check In Successfull" },
          res
        );
      }
    } else {
      return customResponse({ code: 406, message: "Already Checked In" }, res);
    }
  } catch (err) {
    next(err);
  }
};

const CheckOut = async (req, res, next) => {
  try {
    let customer_id = req.userData.id;
    let booking_id = req.query.booking;

    let query2 =
      "SELECT Hotel_Id , Check_Out, Customer_Id FROM Booking WHERE Booking_Id=?";
    let result2 = await db
      .executeQuery(query2, [booking_id])
      .catch(function reject(err) {
        next(Error(err.sqlMessage));
        return null;
      });
    if (result2[0].Customer_Id !== customer_id) {
      return customResponse(
        {
          code: 406,
          message:
            "Please Enter Booking Id of A Booking that the User has Made",
        },
        res
      );
    } else if (result2[0].Check_Out === "Not Yet") {
      let query =
        "UPDATE Booking SET Check_Out ='Yes' WHERE Booking_Id=? AND Customer_Id=?";

      let body = [booking_id, customer_id];
      let result = await db
        .executeQuery(query, body)
        .catch(function reject(err) {
          next(Error(err.sqlMessage));
          return null;
        });

      let hotel_id = result2[0].Hotel_Id;

      let query3 =
        "UPDATE Hotels SET Rooms_Available = Rooms_Available + 1 WHERE Rooms_Available > 0 AND Hotel_Id = ?;";
      let result3 = await db
        .executeQuery(query3, [hotel_id])
        .catch(function reject(err) {
          next(Error(err.sqlMessage));
          return null;
        });

      if (result3 !== null) {
        return customResponse(
          { code: 200, message: "Check Out Successfull" },
          res
        );
      }
    } else {
      return customResponse({ code: 406, message: "Already Checked Out" }, res);
    }
  } catch (err) {
    next(err);
  }
};
module.exports = {
  getHotels,
  Login,
  BookRoom,
  getBookDetails,
  CheckIn,
  CheckOut,
};
