import app from "./app.js";
import dotenv from "dotenv";
import logger from "../logger.js";
import morgan from "morgan";
import connectDB from "./db/index.js";

const morganFormat = ":method :url :status :response-time ms";

dotenv.config({
  path: "./.env",
});

const port = process.env.PORT || 3000;

app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        const logObject = {
          method: message.split(" ")[0],
          url: message.split(" ")[1],
          status: message.split(" ")[2],
          responseTime: message.split(" ")[3],
        };
        logger.info(JSON.stringify(logObject));
      },
    },
  })
);

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(` app listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.log("DB connection errorr", err);
  });


  