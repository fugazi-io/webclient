const path = require('path');
const webpack = require('webpack');
const {getIfUtils, removeEmpty} = require('webpack-config-utils');

// variables
const outPath = path.join(__dirname, 'dist');
const assetsPath = path.join(__dirname, 'assets');

// plugins
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const htmlTemplate = path.join(assetsPath, 'index.html');

module.exports = env => {

	const {ifNotProd} = getIfUtils(env || {});
	// get boolean value to use directly in flag configuration;
	const isNotProd = ifNotProd(true, false);

	return {
		devtool: 'eval',
		entry: removeEmpty({
			main: path.join(__dirname, 'scripts', 'bin', 'app', 'kickstart.js'),
		}),
		output: {
			path: outPath,
			filename: '[name].bundle.js',
			pathinfo: isNotProd,
			publicPath: '/'
		},
		module: {
			noParse: [/\.min\.js$/, /\.bundle\.js$/],
			rules: [
				/*{
					test: /\.tsx?$/,
					use: {
						loader: 'ts-loader',
						options: {
							compilerOptions: {
								"noEmit": false,
								"sourceMap": true
							}
						}
					}
				}, */
				{
					test: /\.js$/,
					use: ["source-map-loader"],
					enforce: "pre"
				}
				/*
				 , {
				 test: /\.css$/,
				 exclude: modulesPath,
				 use: ExtractTextPlugin.extract({
				 fallback: 'style-loader',
				 use: [{
				 loader: 'css-loader',
				 query: {
				 modules: true,
				 sourceMap: isNotProd,
				 importLoaders: 1,
				 localIdentName: '[local]__[hash:base64:5]'
				 }
				 }, {
				 loader: 'postcss-loader'
				 }]
				 })
				 },
				 // static assets
				 {test: /\.html$/, use: 'html-loader'},
				 {test: /\.png$/, use: 'url-loader?limit=10000'},
				 {test: /\.jpg$/, use: 'file-loader'},
				 */
			]
		},
		resolve: {
			extensions: ['.ts', '.tsx', '.js'],
			// Fix webpack's default behavior to not load packages with jsnext:main module
			// (jsnext:main directs not usually distributable es6 format, but es6 sources)
			mainFields: ['module', 'browser', 'main']
		},
		target: 'web',
		plugins: removeEmpty([
			/*
			 new webpack.LoaderOptionsPlugin({
			 options: {
			 context: sourcePath,
			 postcss: removeEmpty([
			 require('postcss-import')({addDependencyTo: webpack}),
			 require('postcss-url')(),
			 require('autoprefixer'),
			 require('postcss-reporter')(),
			 ifNotProd(require('postcss-browser-reporter')()),
			 ])
			 }
			 }),
			 new ExtractTextPlugin({
			 filename: 'styles.css',
			 disable: isNotProd
			 }),
			 */
			new HtmlWebpackPlugin({
				template: htmlTemplate,
			})
		])
	};
};
