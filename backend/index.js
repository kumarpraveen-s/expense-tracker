import express from "express";
import http from "http";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import dotenv from "dotenv";
// import { startStandaloneServer } from "@apollo/server/standalone";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import passport from "passport";
import { buildContext } from "graphql-passport";
import session from "express-session";
import ConnectMongoDBSession from "connect-mongodb-session";
import path from "path";

import mergedTypeDefs from "./typeDefs/index.js";
import mergedResolvers from "./resolvers/index.js";
import { connectDB } from "./lib/db.js";
import { configurePassport } from "./lib/passport.config.js";

dotenv.config();
configurePassport();

const __dirname = path.resolve();

const app = express();
app.use(
    cors({
        origin: "http://localhost:3000", // your frontend
        credentials: true,
    })
);
app.use(express.json());
const httpServer = http.createServer(app);

const mongoDbstore = ConnectMongoDBSession(session);

const store = new mongoDbstore({
    uri: process.env.MONGO_URI,
    collection: "sessions",
});

store.on("error", (err) => console.log(err));

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 7,
            httpOnly: true,
        },
        store: store,
    })
);

app.use(passport.initialize());
app.use(passport.session());

const server = new ApolloServer({
    typeDefs: mergedTypeDefs,
    resolvers: mergedResolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

await server.start();

// Set up our Express middleware to handle CORS, body parsing,
// and our expressMiddleware function.
app.use(
    "/graphql",
    // expressMiddleware accepts the same arguments:
    // an Apollo Server instance and optional configuration options
    expressMiddleware(server, {
        context: async ({ req, res }) => buildContext({ req, res }),
    })
);

// npm run build will build your frontend app, and it will the optimized version of your app
app.use(express.static(path.join(__dirname, "frontend/dist")));

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend/dist", "index.html"));
});

// Modified server startup
await new Promise((resolve) => httpServer.listen({ port: 4000 }, resolve));
await connectDB();
console.log(`🚀 Server ready at http://localhost:4000/`);
