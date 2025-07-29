import passport from 'passport';
import GitHubStrategy from 'passport-github2';
import User from '../models/User.js';

const passportConfig = () => {
  passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/github/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('Full GitHub profile:', JSON.stringify(profile, null, 2));
        console.log('Profile ID:', profile?.id);
        console.log('Profile username:', profile?.username);
        
        // Validate profile has required fields
        if (!profile || !profile.id) {
          console.error('Invalid profile - missing ID');
          return done(new Error('Invalid GitHub profile'), null);
        }
        
        if (!profile.username) {
          console.error('Invalid profile - missing username');
          return done(new Error('Invalid GitHub profile'), null);
        }
        
        console.log('GitHub login for:', profile.username);
        
        // Check if user already exists
        let user = await User.findOne({ githubId: profile.id });
        
        if (user) {
          console.log('Existing user logged in:', user.username);
          return done(null, user);
        }
        
        // Create new user with minimal data
        user = new User({
          githubId: profile.id,
          username: profile.username,
          displayName: profile.username,
          joinedRooms: []
        });
        
        await user.save();
        console.log('New user created:', user.username);
        return done(null, user);
      } catch (error) {
        console.error('GitHub auth error:', error);
        return done(error, null);
      }
    }
  ));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};

export default passportConfig; 