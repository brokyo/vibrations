const HtmlWebpackPlugin = require('html-webpack-plugin')
const NodeExternals = require('webpack-node-externals')
const Package = require('./package.json')

module.exports = {
    mode: 'none',
    entry: {
        navigation: './app/client/js/navigation.js',
        configuration: './app/client/js/configuration.js',
        listen: './app/client/js/listen.js',
        vendor: Object.keys(Package.dependencies)
    },
    output: {
        path: __dirname + '/build',
        filename: 'js/[name].js'
    },
    externals: [NodeExternals()],
    plugins: [
        new HtmlWebpackPlugin({
            template: './app/client/views/navigation.html',
            filename: 'html/navigation.html',
            chunks: ['vendor', 'navigation']
        }),
        new HtmlWebpackPlugin({
            template: './app/client/views/configuration.html',
            filename: 'html/configuration.html',
            chunks: ['vendor', 'configuration']
        }),
        new HtmlWebpackPlugin({
            template: './app/client/views/listen.html',
            filename: 'html/listen.html',
            chunks: ['vendor', 'listen']
        }),
    ]
    
}