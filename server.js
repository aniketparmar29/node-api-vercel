const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const app = express();
const port = 4000;
const cors = require('cors');
const dotenv = require("dotenv");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const request = require('request');
const cookieParser = require('cookie-parser');

dotenv.config({path:"./config.env"})


app.use(cors({
  origin: ['https://hathibrand.in/'],
  credentials: true,
}));
  
app.use(cookieParser());
  
app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const pool = mysql.createPool({
connectionLimit: 100,
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
});

// app.use((req, res, next) => {
//   res.setHeader('Access-Control-Allow-Origin', 'https://hathibrand.in');
//   next();
// });

function isAdmin(req, res, next) {
  console.log(req.cookies);
  // Check if 'cookies' property exists in the request object
  if (!req.cookies || !req.cookies.token) {
    res.sendStatus(401); // Token is missing, send a 401 Unauthorized status
    return;
  }

  const token = req.cookies.token;

  try {
    // Verify the token with the secret key
    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    // Assuming you have a 'role' property on the decoded token
    if (decoded.role === 'admin') {
      req.user = decoded; // Attach the decoded user object to the request for future use
      next(); // User is an admin, proceed to the next middleware/route handler
    } else {
      res.sendStatus(403); // User is not an admin, send a 403 Forbidden status
    }
  } catch (error) {
    console.error('Error verifying token:', error);
    res.sendStatus(401); // Token verification failed, send a 401 Unauthorized status
  }
}


pool.getConnection(function(err, connection) {
    if (err) throw err;
  
    // Use the connection
    connection.query('SELECT * FROM products', function (error, results, fields) {
      // Release the connection back to the pool
      connection.release();
  
      if (error) throw error;
  
      // Do something with the results
      console.log("connection to mysql");
    });
  });



  app.post('/create_order', (req, res) => {
    if(req.body.method==="Online"){

    const data = {
      key: process.env.API_KEY,
      client_txn_id: req.body.client_txn_id,
      amount: req.body.amount,
      p_info: "products",
      redirect_url: "https://hathibrand.in/checkoutsuccess",
      customer_name: req.body.customer_name,
      customer_email: req.body.customer_email,
      customer_mobile: req.body.customer_mobile,
      udf1: "user defined field 1 (max 25 char)",
      udf2: "user defined field 2 (max 25 char)",
      udf3: "user defined field 3 (max 25 char)"
    };

    request.post({
      
      url: "https://merchant.upigateway.com/api/create_order",
      json: data
    }, (error, response, body) => {
      if (error) {
        console.error(error);
        return res.status(500).json({
          status: false,
          msg: "Internal Server Error"
        });
      }
  
      if (!body.status) {
        console.error(body.msg);
        return res.status(400).json({
          status: false,
          msg: body.msg
        });
      }
      
      const orderId = body.data.order_id;
      const paymentUrl = body.data.payment_url;
      let addressop = req.body.addressop;
      let amount = req.body.amount;
      let method = req.body.method;
      let product = req.body.products;
      let user_id = req.body.user_id;
      let trx_id = req.body.client_txn_id;
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0'); // January is 0!
      const year = today.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;
      let trx_date = formattedDate;
      let tracking_id = 0;
      let payment = false;
      let status = "pending";
  
      pool.query(
        'INSERT INTO `orders` (`addressop`, `amount`, `product`, `user_id`, `tracking_id`,`trx_id`,`trx_date`,`payment`,`status`,`method`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [addressop, amount, product, user_id, tracking_id, trx_id, trx_date, payment, status, method], (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({
            status: false,
            msg: "Internal Server Error"
          });
        }
  
        console.log("Order details saved to MySQL database");
  
        res.json({
          status: true,
          msg: "Payment Order Created",
          data: {
            order_id: orderId,
            payment_url: paymentUrl
          }
        });
      });
    });
  }else{
    let addressop = req.body.addressop;
    let amount = req.body.amount;
    let method = req.body.method;
    let product = req.body.products;
    let user_id = req.body.user_id;
    let trx_id = req.body.client_txn_id;
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0'); // January is 0!
    const year = today.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;
    let trx_date = formattedDate;
    let tracking_id = 0;
    let payment = false;
    let status = "pending";

    pool.query(
      'INSERT INTO `orders` (`addressop`, `amount`, `product`, `user_id`, `tracking_id`,`trx_id`,`trx_date`,`payment`,`status`,`method`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [addressop, amount, product, user_id, tracking_id, trx_id, trx_date, payment, status,method], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({
          status: false,
          msg: "Internal Server Error"
        });
      }

      console.log("Order details saved to MySQL database");

      res.json({
        status: true,
        msg: "Payment Order Created",
        data: {
          order_id: Math.random().toFixed(12).split('.')[1],
          payment_url: `https://hathibrand.in/checkoutsuccess?method="cod"`
        }
      });
    });
  }
});
  
app.get('/protected', isAdmin, (req, res) => {
  res.json({ message: 'This is a protected route for admins only.' });
});
  
  app.post('/check_order', (req, res) => {
    const data = {
      key: process.env.API_KEY,
      client_txn_id: req.body.client_txn_id,
      txn_date: req.body.txn_date
    };
    console.log(data);
    request.post({
      url: "https://merchant.upigateway.com/api/check_order_status",
      json: data
    }, (error, response, body) => {
      if (error) {
        console.error(error);
        return res.status(500).json({
          status: false,
          msg: "Internal Server Error"
        });
      }
  
      if (!body.status) {
        console.error(body.msg);
        return res.status(400).json({
          status: false,
          msg: body.msg
        });
      }
  
      console.log(body);
      // Success response
      return res.status(200).json(body);
    });
  });
  

  app.put('/orders/payment/:trx_id', (req, res) => {
    const trx_id = req.params.trx_id;
    const payment = req.body.payment;
  
    // execute the SQL query to update the payment status of the order
    pool.query('UPDATE `orders` SET `payment` = ? WHERE `trx_id` = ?', [payment, trx_id], (error, results, fields) => {
      if (error) {
        console.error(error);
        res.status(500).send('Error updating payment status');
      } else {
        res.status(200).send('Payment status updated successfully');
      }
    });
  });

  app.get('/orders/:id', function(req, res) {
    var user_id = req.params.id;
    pool.query('SELECT * FROM orders WHERE user_id = ? ORDER BY trx_date DESC', [user_id], function(error, results, fields) {
      if (error) throw error;
      res.send(results);
    });
  });
  
  app.get('/orders',isAdmin, function(req, res) {
    pool.query('SELECT * FROM orders ORDER BY trx_date DESC', function(error, results, fields) {
      if (error) throw error;
      res.send(results);
    });
  });

// Generate token function
function generateToken(userId) {
  const token = jwt.sign({ userId }, 'secret_key', { expiresIn: '1h' });
  return token;
}


const server = app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

process.on('uncaughtException', (err) => {
  console.error('Unhandled exception:', err);
  // gracefully shutdown the server
  server.close(() => {
    process.exit(1);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  // gracefully shutdown the server
  server.close(() => {
    process.exit(1);
  });
});