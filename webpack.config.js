const path = require("path");
module.exports = {
    context: __dirname,
    entry: "./src/main.ts",
    output: {
        filename: "main.js",
        path: path.resolve(__dirname, "dist"),
        publicPath: "/dist/"
    },
    cache: false,

    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: {
                    loader: "ts-loader"
                }
            },
            {
                test: /\.wgsl$/,
                use: {
                    loader: "ts-shader-loader"
                }
            }
        ]
    },
    
    resolve: {
        extensions: [".ts"]
    },

    devServer: {
        hot: true, // optional, but you must not set both hot and liveReload to true
        liveReload: false,
        watchContentBase: true
    },
    mode: 'development'
}