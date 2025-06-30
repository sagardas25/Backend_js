import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// common middlewares
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "16kb",
  })
);

app.use(express.static("public"));
app.use(cookieParser())

//import route
import healthcheckRouter from "./routes/healthchek.route.js";
import userRouter from "./routes/user.route.js"

//routes

app.use('/api/v1/healthcheck' , healthcheckRouter)
app.use('/api/v1/users' , userRouter)


export default app;
