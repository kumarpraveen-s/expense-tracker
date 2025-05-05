import passport from "passport";
import bcrypt from "bcryptjs";
import { GraphQLLocalStrategy } from "graphql-passport";
import User from "../models/user.model.js";

export const configurePassport = async () => {
    passport.serializeUser((user, done) => {
        // console.log("serializing user");
        done(null, user._id); // serialize only the user ID
    });

    passport.deserializeUser(async (id, done) => {
        // console.log("deserializing user");
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (error) {
            done(error);
        }
    });

    passport.use(
        new GraphQLLocalStrategy(async (username, password, done) => {
            try {
                const foundUser = await User.findOne({ username });

                if (!foundUser) {
                    throw new Error("Invalid user or password");
                }

                const validPassword = await bcrypt.compare(
                    password,
                    foundUser.password
                );

                if (!validPassword) {
                    throw new Error("Invalid user or password");
                }

                return done(null, foundUser);
            } catch (error) {
                return done(error);
            }
        })
    );
};
