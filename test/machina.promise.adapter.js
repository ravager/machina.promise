var Promise = require( "../lib/machina.promise.js" );

module.exports.resolved = function ( value ) {
	var d = new Promise();
	d.fulfill( value );
	return d;
}

module.exports.rejected = function ( reason ) {
	var d = new Promise();
	d.reject( reason );
	return d;
}

module.exports.deferred = function () {
	var d = new Promise();

	return {
		promise: d,
		resolve: d.fulfill,
		reject: d.reject
	};
}
