const db = require("../Utilities/db-operations");
const { customResponse, dateParser } = require("../Utilities/custom-response");
const md5 = require("md5");
const { createToken } = require("../Utilities/authorization");

const hotelFilterQuery = (req, body, query) => {
  let filters = [];
  if (req.query.rating) {
    filters.push("Star_Rating = ? ");
    body.push(req.query.rating);
  }
  if (req.query.cost) {
    filters.push("Cost_Per_Day= ? ");
    body.push(req.query.cost);
  }
  if (req.query.hotel_name) {
    filters.push(" Hotel_Name= ? ");
    body.push(req.query.hotel_name);
  }

  if (filters.length > 0) {
    query = query + " WHERE " + filters.join(" AND ");
  }
};

const pagiNation = (page, body, query) => {
  let paginate = 3;
  let offset = paginate * (page - 1);
  query = query + " LIMIT ? OFFSET ? ";
  body.push(paginate);
  body.push(offset);
};

const getHotels = async (req, res, next) => {
  try {
    let body = [];
    let query = "SELECT * FROM Hotels ";

    hotelFilterQuery(req, body, query);

    if (req.query.sort) {
      add = "ORDER BY ?";
      body.push(req.query.sort);
      query = query + add;
    }

    if (req.query.page) {
      pagiNation(req.query.page, body, query);
    }

    let result = await db.executeQuery(query, body).catch(function reject(err) {
      next(Error(err.sqlMessage));
      return null;
    });

    if (result !== null) return customResponse(result, res);
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

    let query1 = "SELECT * FROM Hotels WHERE Hotel_Id=?";
    let hotel = await db
      .executeQuery(query1, [hotelId])
      .catch(function reject(err) {
        next(Error(err.sqlMessage));
        return null;
      });

    if (hotel[0].Rooms_Available === 0) {
      next(Error("All rooms are occupied, Not available for booking"));
    } else {
      let checkin_date = dateParser(req.body.checkin_date);
      let checkout_date = dateParser(req.body.checkout_date);

      let difference = checkout_date.getTime() - checkin_date.getTime();
      if (difference < 0) {
        next(Error("Date Range Entered Is Wrong"));
        return;
      }
      let days = difference / (1000 * 3600 * 24);
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
        return customResponse(
          { code: 200, message: "Your Booking is Done !" },
          res
        );
      }
    }
  } catch (err) {
    next(err);
  }
};

const getBookDetails = async (req, res, next) => {
  try {
    let customer_id = req.userData.id;
    let body = [customer_id];
    let query =
      "SELECT * FROM Booking as b LEFT JOIN Hotels as h  ON b.Hotel_Id = h.Hotel_Id WHERE b.Customer_Id = ?";

    if (req.query.columns) {
      let columns = req.query.columns.split(",");
      if (columns.includes("Hotel_Id")) {
        let ind = columns.indexOf("Hotel_Id");
        columns[ind] = "h.Hotel_Id";
      }
      body.unshift(columns);
      query =
        "SELECT ?? FROM Booking as b LEFT JOIN Hotels as h  ON b.Hotel_Id = h.Hotel_Id WHERE b.Customer_Id = ?";
    }
    let result = await db.executeQuery(query, body).catch(function reject(err) {
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

const getBookingData = async (booking_id, next) => {
  let query =
    "SELECT Customer_Id,Hotel_Id ,Check_Out ,Check_In FROM Booking WHERE Booking_Id = ? ";
  let result = await db
    .executeQuery(query, [booking_id])
    .catch(function reject(err) {
      next(Error(err.sqlMessage));
      return null;
    });

  if (result !== null) return result[0];
};

const updateCheck = async (type, booking_id, customer_id, next) => {
  let query = "";
  if (type === "checkin") {
    query =
      "UPDATE Booking SET Check_In ='Yes' WHERE Booking_Id=? AND Customer_Id=? ";
  } else {
    query =
      "UPDATE Booking SET Check_Out ='Yes' WHERE Booking_Id=? AND Customer_Id=? ";
  }

  let result = await db
    .executeQuery(query, [booking_id, customer_id])
    .catch(function reject(err) {
      next(Error(err.sqlMessage));
      return null;
    });
};

const updateRoomsAvailable = async (rooms_avail, hotel_id, next) => {
  let query = "";
  if (rooms_avail) {
    query =
      "UPDATE Hotels SET Rooms_Available = Rooms_Available + 1 WHERE Rooms_Available > 0 AND Hotel_Id =? ;";
  } else {
    query =
      "UPDATE Hotels SET Rooms_Available = Rooms_Available - 1 WHERE Rooms_Available > 0 AND Hotel_Id =? ;";
  }

  let result = await db
    .executeQuery(query, [hotel_id])
    .catch(function reject(err) {
      next(Error(err.sqlMessage));
      return null;
    });

  return result[0];
};

const CheckIn = async (req, res, next) => {
  try {
    let customer_id = req.userData.id;
    let booking_id = req.query.booking;

    let booking = await getBookingData(booking_id, next);

    if (booking.Customer_Id !== customer_id) {
      return customResponse(
        {
          code: 406,
          message: "You have not made a booking with this id",
        },
        res
      );
    } else if (booking.Check_In === "Not Yet") {
      await updateCheck("checkin", booking_id, customer_id, next);
      let hotel_id = booking.Hotel_Id;

      let result = updateRoomsAvailable(false, hotel_id, next);
      if (result !== null) {
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

    let booking = await getBookingData(booking_id);

    if (booking.Customer_Id !== customer_id) {
      return customResponse(
        {
          code: 406,
          message: "You have not made a booking with this id",
        },
        res
      );
    } else if (booking.Check_Out === "Not Yet" && booking.Check_In == "Yes") {
      await updateCheck("checkout", booking_id, customer_id);

      let hotel_id = booking.Hotel_Id;
      let result = await updateRoomsAvailable(true, hotel_id);

      if (result !== null) {
        return customResponse(
          { code: 200, message: "Check Out Successfull" },
          res
        );
      }
    } else {
      let message = "";
      if (booking.Check_Out == "Yes") {
        message = "Already Checked Out";
      } else if (booking.CheckIn == "Not Yet") {
        message = "Not Checked In Yet";
      }
      return customResponse({ code: 406, message: message }, res);
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
