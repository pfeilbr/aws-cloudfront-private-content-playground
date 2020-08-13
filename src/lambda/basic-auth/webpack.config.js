const path = require("path");

module.exports = {
  entry: "./index.js",
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist"),
    libraryTarget: "commonjs2",
  },
  target: "node",
  // externals: process.env.NODE_ENV === "development" ? [] : ["aws-sdk"],
  mode: process.env.NODE_ENV || "production",
};
