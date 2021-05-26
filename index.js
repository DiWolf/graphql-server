const { ApolloServer, gql } = require("apollo-server");
const typeDefs = require("./dev/schema");
const resolvers = require("./dev/resolvers");
const conectarDb = require("./config/db");
const jwt = require("jsonwebtoken");
//require("dotenv").config({ path: "variable.env" });
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({});
}
//conectar base de datos
conectarDb();

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    // console.log(req.headers["authorization"]);
    const token = req.headers["authorization"] || "";
    if (token) {
      try {
        const usuario = jwt.verify(token, process.env.SECRETA);
        return { usuario };
      } catch (error) {
        throw new Error("Error " + error);
      }
    }
    // return {
    //   ,
    // };
  },
});

//Arrancar el servidor
server.listen(process.env.PORT).then(({ url }) => {
  console.log(`Servidor listo en la URL ${url}`);
});
