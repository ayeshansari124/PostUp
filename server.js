require("dotenv").config();

const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");

const { PORT, MONGO_URI } = require("./src/config");
const errorHandler = require("./src/middleware/errorHandler");

// route modules
const authRoutes = require("./src/routes/auth");
const postRoutes = require("./src/routes/posts");
const profileRoutes = require("./src/routes/profile");

const app = express();

// date formatting
const formatDate = require("./src/config/formatDate");
app.locals.formatDate = formatDate;

// express config
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// connect db
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// public pages
app.get("/", (req, res) => res.render("index"));
app.get("/register", (req, res) => res.render("register"));
app.get("/login", (req, res) => res.render("login"));

// routes
app.use("/", authRoutes);
app.use("/", postRoutes);
app.use("/", profileRoutes);

// error handler
app.use(errorHandler);

const port = PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
