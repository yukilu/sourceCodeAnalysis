let path = require('path');
let webpack = require('webpack');

const config = {
    entry: {
        app: './entry.js'
    },
    output: {
        filename: 'bundle.js'
    },
    resolve: {
        extensions: ['.js']
    },
    // module: { rules:[{ test: /\.jsx?$/, exclude: /node_modules/, use: 'babel-loader' }] }, 不要用babel，否则作用域提升可能失效
    externals: {
        react: 'React',
        flux: 'Flux',
        redux: 'Redux',
        'prop-types': 'PropTypes',
        'react-bootstrap': 'ReactBootstrap',
        'react-dom': 'ReactDOM',
        'react-redux': 'ReactRedux',
        'react-router-dom': 'ReactRouterDOM',
        Rx: 'Rx',
        'redux-observable': 'ReduxObservable'
    },
    plugins: [
        new webpack.optimize.ModuleConcatenationPlugin()
    ]
};

module.exports = config;