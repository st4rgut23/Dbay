const HtmlWebPackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
  entry: path.resolve(__dirname, 'src', 'index.tsx'),
  module: {
    rules: [
      {
        test: /\.ts|\.tsx$/,
        loader: "ts-loader",
      },
    ]
  },
  resolve : {
    extensions : ["", ".webpack.js", ".web.js", ".js", ".ts", ".tsx", "jsx", ".tsx", ".jsx"]
  }
};
