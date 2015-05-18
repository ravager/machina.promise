/* global _ */

var Promise = machina.Fsm.extend({
	initialState: "pending",
	initialize: function () {
		_.bindAll( this, "reject", "fulfill", "handleThen", "then", "catch" );
	},
	reject: function ( data ) {
		this.handle( "process", { action: "rejected", data: data } );
	},
	fulfill: function ( data ) {
		this.handle( "process", { action: "fulfilled", data: data } );
	},
	handleThen: function () {
		var fn = _.bind( this.handle, this, "then" );
		if ( Promise.useExtensions ) {
			_.defer( fn );
		} else {
			fn();
		}
	},
	then: function ( onFulfilled, onRejected ) {
		var self = this;
		var promise = new Promise();

		var callback = function () {
			self.off( "fulfilled", callback );
			self.off( "rejected", callback );

			var fulfilled = self.state === "fulfilled";
			var handler = fulfilled ? onFulfilled : onRejected;
			var ret;

			if ( _.isFunction( handler ) ) {
				try {
					ret = handler.apply( null, arguments );
					if ( ret === promise ) {
						throw new TypeError( "2.3.1: Throw TypeError in case of inception" );
					}
				} catch ( handlerThrowsException ) {
					_.defer( promise.reject, handlerThrowsException );
					return;
				}

				if ( Promise.useExtensions && Promise.isThenable( ret ) ) {
					try {
						var nestedThen = ret.then;
						if ( _.isFunction( nestedThen ) ) {
							nestedThen.call( ret, promise.fulfill, promise.reject );
						} else {
							_.defer( promise.fulfill, ret );
						}
					} catch ( badThenException ) {
						_.defer( promise.reject, badThenException );
					}
				} else {
					_.defer( promise.fulfill, ret );
				}
			} else {
				promise[ fulfilled ? "fulfill" : "reject" ].apply( null, arguments );
			}
		};

		this.on( "fulfilled", callback );
		this.on( "rejected", callback );

		this.handleThen();

		return promise;
	},
	"catch": function ( onRejected ) {
		return this.then( undefined, onRejected );
	},
	states: {
		pending: {
			process: function ( params ) {
				var res = params.data;

				var resolver = _.bind( function (_params) {
					this._data = _params.data;
					this.transition( _params.action );
				}, this, params );

				if ( Promise.useExtensions && Promise.isThenable( res ) ) {
					try {
						var nestedThen = res.then;
						if ( _.isFunction( nestedThen ) ) {
							nestedThen.call( res, this.fulfill, this.reject );
						} else {
							_.defer( resolver );
						}
					} catch ( badThenException ) {
						_.defer( this.reject, badThenException );
					}
				} else {
					resolver();
				}
			}
		},
		fulfilled: {
			_onEnter: function () {
				this.handleThen();
			},
			then: function () {
				this.emit( "fulfilled", this._data );
			}
		},
		rejected: {
			_onEnter: function () {
				this.handleThen();
			},
			then: function () {
				this.emit( "rejected", this._data );
			}
		}
	}
});

Promise.useExtensions = true;

Promise.isThenable = function ( object ) {
	return _.isObject( object ) && 'then' in object;
};
