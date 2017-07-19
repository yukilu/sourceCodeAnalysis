let path = require('path');
let webpack = require('webpack');

const config = {
    entry: {
        app: './entry.js'
    },
    output: {
        path: __dirname,
        filename: 'bundle.js'
    },
    resolve: {
        extensions: ['.js', '.jsx']
    },
    module: {
        rules:[{
            test: /\.jsx?$/,
            exclude: /node_modules/,
            use: 'babel-loader'
        }]
    }
};

module.exports = config;