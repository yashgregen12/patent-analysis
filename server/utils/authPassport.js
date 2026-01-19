import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/user.model.js';
import config from './config.js';

// Main Google OAuth strategy for general authentication
const loginStrategy = new GoogleStrategy({
    clientID: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/api/auth/google/callback",
    proxy: true,
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('Google authentication attempt for user:', profile.id);

        let user = await User.findOne({ email: profile.emails[0].value });
        
        if (!user) {
            console.log("Creating new user for Google ID:", profile.id);
            user = await new User({
                googleId: profile.id,
                email: profile.emails[0].value,
                name: profile.displayName,
                avatar: profile.photos[0].value,
            }).save();
        }


        if (!user.googleId) {
            user.googleId = profile.id;
            user.name = profile.displayName;
            user.avatar = profile.photos[0].value;
        }

        user.googleAccessToken = accessToken;
        user.googleRefreshToken = refreshToken;
        await user.save();

        return done(null, user);
    } catch (error) {
        console.error('Error in Google authentication:', error);
        return done(error, null);
    }
});


passport.use('login', loginStrategy);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

export default passport;