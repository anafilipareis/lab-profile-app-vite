const express = require("express");
const router = express.Router();

// ℹ️ Handles password encryption
const bcrypt = require("bcrypt");

// ℹ️ Handles password encryption
const jwt = require("jsonwebtoken");

// Require the User model in order to interact with the database
const User = require("../models/User.model");

// Require necessary (isAuthenticated) middleware in order to control access to specific routes
const { isAuthenticated } = require("../middleware/jwt.middleware.js");

// How many rounds should bcrypt run the salt (default - 10 rounds)
const saltRounds = 10;

// POST /auth/signup  - Creates a new user in the database
router.post("/signup", (req, res, next) => {
  const { username, password, campus, course } = req.body;

  // Check if username, password, campus and course are provided as empty strings
  if (username === "" || password === "" || campus === "" || course === "" ) {
    res.status(400).json({ message: "Provide username, password, campus and course" }); // 400 - Bad Request
    return;
  }


  // This regular expression checks password for special characters and minimum length
  const passwordRegex = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/;
  if (!passwordRegex.test(password)) {
    res.status(400).json({
      message:
        "Password must have at least 6 characters and contain at least one number, one lowercase and one uppercase letter.",
    });
    return;
  }

  // Check the users collection if a user with the same username already exists
  User.findOne({ username })
    .then((foundUser) => {
      // If the user with the same username already exists, send an error response
      if (foundUser) {
        res.status(400).json({ message: "Username already exists." }); // 400 - Bad Request
        return;
      }

      // If username is unique, proceed to hash the password
      const salt = bcrypt.genSaltSync(saltRounds);
      const hashedPassword = bcrypt.hashSync(password, salt);

      // Create the new user in the database
      // We return a pending promise, which allows us to chain another `then`
      return User.create({ username, password: hashedPassword, campus, course });
    })
    .then((createdUser) => {
      // Deconstruct the newly created user object to omit the password
      // We should never expose passwords publicly
      const { username, campus, course, _id } = createdUser;

      // Create a new object that doesn't expose the password
      const user = { username, campus, course, _id };

      // Send a json response containing the user object
      res.status(201).json({ user: user }); //201 - Created
    })
    .catch((err) => next(err)); // In this case, we send error handling to the error handling middleware.
});

// POST  /auth/login - Verifies email and password and returns a JWT
router.post("/login", (req, res, next) => {
  const { username, password } = req.body;

  // Check if email or password are provided as empty string
  if (username === "" || password === "") {
    res.status(400).json({ message: "Provide email and password." }); //400 - Bad Request
    return;
  }

  // Check the users collection if a user with the same email exists
  User.findOne({ username })
    .then((foundUser) => {
      if (!foundUser) {
        // If the user is not found, send an error response
        res.status(401).json({ message: "Username not found." }); // // 401 - Unauthorized
        return;
      }

      // Compare the provided password with the one saved in the database
      const passwordCorrect = bcrypt.compareSync(password, foundUser.password);

      if (passwordCorrect) {
        // Deconstruct the user object to omit the password
        const { _id, username, campus, course, image } = foundUser;

        // Create an object that will be set as the token payload
        const payload = { _id, username, campus, course,image };

        // Create a JSON Web Token and sign it
        const authToken = jwt.sign(payload, process.env.TOKEN_SECRET, {
          algorithm: "HS256",
          expiresIn: "6h",
        });

        // Send the token as the response
        res.status(200).json({ authToken: authToken }); // // 200 - OK
      } else {
        res.status(401).json({ message: "Unable to authenticate the user" }); // 401 - Unauthorized
      }
    })
    .catch((err) => next(err)); // In this case, we send error handling to the error handling middleware.
});

// GET  /auth/verify  -  Used to verify JWT stored on the client
router.get("/verify", isAuthenticated, (req, res, next) => {
  // If JWT token is valid the payload gets decoded by the
  // isAuthenticated middleware and is made available on `req.payload`
  console.log(`req.payload`, req.payload);

  // Send back the token payload object containing the user data
  res.status(200).json(req.payload); // 200 - OK
});

// PUT /api/users - Update user information (PUT - updates existing resources)
router.put("/users", isAuthenticated, async (req, res, next) => {
  try {
    const { image } = req.body;
    
    // Get the current user's ID from the token payload
    const userId = req.payload._id;

    // Update the user information in the database
    const updatedUser = await User.findByIdAndUpdate(userId, { image }, { new: true });

    // If the user is not found, send an error response
    if (!updatedUser) {
      res.status(404).json({ message: "User not found." }); // 400 - Bad Request
      return;
    }

    // Send the updated user object as the response
    res.status(200).json(updatedUser); // 200 - OK
  } catch (err) {
    next(err);
  }
});

// GET /api/users - Get current user information
router.get("/users", isAuthenticated, async (req, res, next) => {
  try {
    
    const userId = req.payload._id;
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      res.status(404).json({ message: "User not found." }); // 404 - Not Found
      return;
    }
    res.status(200).json(currentUser); //200 - OK
  } catch (err) {
    next(err);
  }
});



module.exports = router;
