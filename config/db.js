const mongoose = require("mongoose");
require("dotenv").config({ path: "variable.env" });

const conectarDb = async () => {
  try {
    await mongoose.connect(process.env.DB_MONGO, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true,
    });
    console.log("DB Conectada");
  } catch (error) {
    console.log(error);
    process.exit(1); //detiene la aplicación
  }
};

module.exports = conectarDb;
