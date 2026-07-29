const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    // Sign-in is Google-only now, so there is no local password to manage —
    // kept optional (rather than removed) so any pre-existing accounts from
    // before the Google-only switch still load without a migration.
    password: {
      type: String,
      minlength: 6,
      select: false,
    },
    // The Google account's stable user id ("sub" claim). Unique+sparse so
    // multiple documents without a googleId (e.g. legacy accounts) don't
    // collide on the unique index.
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    avatar: {
      type: String,
      default: 'https://via.placeholder.com/150',
    },
  },
  { timestamps: true }
);

// ✅ CORRECT: pre-save hook as async function without `next` parameter
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return; // early return, no next()
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password — only meaningful for legacy accounts that
// still have a local password set.
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);