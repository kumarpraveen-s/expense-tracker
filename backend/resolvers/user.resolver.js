import bcrypt from "bcryptjs";
import { promisify } from "util";
import User from "../models/user.model.js";

const userResolver = {
    Mutation: {
        signUp: async (_, { input }, context) => {
            try {
                const { username, name, password, gender } = input;
                if (!username || !name || !password || !gender) {
                    throw new error("All fields are required");
                }
                const existingUser = await User.findOne({ username });
                if (existingUser) {
                    throw new error("User already exists");
                }

                const salt = await bcrypt.genSalt(10);
                const encrptedpassword = await bcrypt.hash(password, salt);

                const boyProfilePic = `https://avatar.iran.liara.run/public/boy?username=${username}`;
                const girlProfilePic = `https://avatar.iran.liara.run/public/girl?username=${username}`;

                const newUser = new User({
                    username,
                    name,
                    password: encrptedpassword,
                    gender,
                    profilePicture:
                        gender === "male" ? boyProfilePic : girlProfilePic,
                });
                await newUser.save();
                await context.login(newUser);
                return newUser;
            } catch (err) {
                throw new Error(err.message || "internal server error");
            }
        },
        login: async (_, { input }, context) => {
            try {
                const { username, password } = input;
                const { user } = await context.authenticate("graphql-local", {
                    username,
                    password,
                });
                await context.login(user);
                return user;
            } catch (error) {
                console.error("Error in login", error);
                throw new Error(error.message || "Internal server error");
            }
        },
        logout: async (_, __, context) => {
            const { req, res, logout } = context;

            try {
                // Promisify logout and session.destroy
                const logoutAsync = promisify(logout).bind(req);
                const destroySession = promisify(req.session.destroy).bind(
                    req.session
                );

                await logoutAsync(); // clean await
                await destroySession(); // clean await

                res.clearCookie("connect.sid");

                return { message: "Logged out successfully" };
            } catch (error) {
                console.error("Logout error:", error);
                throw new Error(error.message || "Logout failed");
            }
        },
    },
    Query: {
        authUser: async (_, __, context) => {
            try {
                const user = await context.getUser();
                return user;
            } catch (err) {
                console.error("Error in authUser: ", err);
                throw new Error("Internal server error");
            }
        },
        user: async (_, { userId }) => {
            try {
                const user = await User.findById(userId);
                return user;
            } catch (err) {
                console.error("Error in user query:", err);
                throw new Error(err.message || "Error getting user");
            }
        },
    },
};

export default userResolver;
