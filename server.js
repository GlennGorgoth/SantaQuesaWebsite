const express = require('express');
const sqlite3 = require('sqlite3');
const fetchDataFromDatabase = require('./server/fetchData.js');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const path = require('path');

// Absolute path to the root folder
const rootPath = __dirname;
const publicFolderPath = path.join(__dirname, 'public');
const protectedFolderPath = path.join(__dirname, 'protected');




const app = express();
const port = 3000;
const saltRounds = 10;

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.authenticated) {
    return next();
  }
  res.redirect('/login.html'); // Redirect to login page if not authenticated
};


app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));

app.use(express.json());

app.use(express.static(publicFolderPath));

app.use('/protected', isAuthenticated, express.static(protectedFolderPath));

const validUsername = 'les';
const validPassword = 'claypool';


// // Hash a password
// const hashedPassword = await bcrypt.hash('user_password', saltRounds);

// // Compare hashed password with user input during login
// const match = await bcrypt.compare('user_input_password', hashedPassword);


// SQLite database setup
const db = new sqlite3.Database('./database/SQdata.db', (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
    } else {
      console.log('Connected to the database.');
    }
  });



// app.post('/login', async (req, res) => {
//   const { username, password } = req.body;

//   // Retrieve hashed password from the database based on the entered username
//   const query = 'SELECT Password FROM User_Passwords WHERE Username = ?';
//   db.get(query, [username], async (err, row) => {
//     if (err) {
//       return res.status(500).json({ error: 'Database error' });
//     }

//     if (!row) {
//       return res.status(401).json({ error: 'User does not exist' });
//     }

//     // Compare hashed password with the entered password
//     const match = (password == row.Password);
//     // console.log(`password = ${row.Password}`);

//     if (match) {
//       console.log(row.UserID, ' :: ', password)
//       // Step 2: Fetch the user's role using the obtained UserID
//       const roleQuery = 'SELECT Role FROM User_Roles WHERE UserID = ?';
//       db.get(roleQuery, [row.UserID], async (roleErr, roleRow) => {
//         if (roleErr) {
//           return res.status(500).json({ error: 'Database error' });
//         }

//         if (!roleRow) {
//           return res.status(401).json({ error: 'User role not found' });
//         }

//         // Step 3: Store the user's role in the session or response payload
//         req.session.authenticated = true;
//         req.session.role = roleRow.Role; // Assuming role is stored in the 'Role' column
//         console.log(row.UserID, ' :: ', roleRow.Role)
//         res.json({ message: 'Login successful', ok: true });
//       });
//     } else {
//       res.status(401).json({ error: 'Invalid username or password', ok:false});
//     }

//     // // Compare hashed password with the entered password
//     // const match = await bcrypt.compare(password, row.Password);

//     // if (match) {
//     //   res.json({ message: 'Login successful' });
//     // } else {
//     //   res.status(401).json({ error: 'Invalid username or password' });
//     // }
//   });
// });

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Step 1: Retrieve hashed password and UserID from the database based on the entered username
  const query = 'SELECT UserID, Password FROM User_Passwords WHERE Username = ?';
  db.get(query, [username], async (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!row) {
      return res.status(401).json({ error: 'User does not exist' });
    }

    // Compare hashed password with the entered password
    const match = (password == row.Password);

    if (match) {
      // Step 2: Fetch the user's role using the obtained UserID
      const roleQuery = 'SELECT Role FROM User_Roles WHERE UserID = ?';
      db.get(roleQuery, [row.UserID], async (roleErr, roleRow) => {
        if (roleErr) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!roleRow) {
          return res.status(401).json({ error: 'User role not found' });
        }

        // Step 3: Store the user's role in the session or response payload
        console.log(row.UserID, ' :: ', roleRow.Role)
        req.session.authenticated = true;
        req.session.role = roleRow.Role; // Assuming role is stored in the 'Role' column
        res.json({ message: 'Login successful', ok: true });
      });
    } else {
      res.status(401).json({ error: 'Invalid username or password', ok: false });
    }
  });
});

app.get('/protected/mysantaquesa.html', isAuthenticated, (req, res) => {
  res.sendFile(path.join(protectedFolderPath, 'mysantaquesa.html'));
});

// Check authentication for login to database page

app.get('/check-auth', (req, res) => {
  // Check if the user is authenticated
  if (req.session.authenticated) {
      res.json({ authenticated: true });
  } else {
      res.json({ authenticated: false });
  }
});


  // API endpoint to fetch column names for a specific table
app.get('/api/columns', (req, res) => {
    const tableName = req.query.table;
  
    // Retrieve column names for the specified table
    db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
      if (err) {
        console.error('Error fetching column names:', err.message);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        // Extract column names
        const columnNames = columns.map((column) => column.name);
        res.json(columnNames);
      }
    });
  });
  
  // Endpoint to handle data requests
app.get('/api/data', (req, res) => {
    const tableName = req.query.table;
  
    if (!tableName) {
      return res.status(400).json({ error: 'Table name not provided.' });
    }
  
    // Query the database based on the provided table name
    const query = `SELECT * FROM ${tableName}`;
  
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('Error executing query:', err.message);
        return res.status(500).json({ error: 'Internal server error.' });
      }
  
      res.json(rows);
    });
  });

  // Restricted route
// app.get('/mysantaquesa', (req, res) => {
//   // Check if the user is authenticated
//   if (req.session.authenticated) {
//     res.sendFile(__dirname + '/mysantaquesa.html');
//   } else {
//     res.redirect('/login');  // Redirect to login if not authenticated
//   }
// });

// app.get('/mysantaquesa', isAuthenticated, (req, res) => {
//   res.sendFile(path.join(__dirname, 'mysantaquesa.html'));
// });


app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/login.html');
  });
});




// Middleware to check authentication
// function isAuthenticated (req, res, next) {
//   if (req.session && req.session.authenticated) {
//     return next();
//   }
//   res.redirect('/login.html'); // Redirect to login page if not authenticated
// };


app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
