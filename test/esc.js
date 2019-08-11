require("./common/bootstrap");

exports["ESC"] = {
  setUp: function(done) {
    this.sandbox = sinon.sandbox.create();
    this.clock = this.sandbox.useFakeTimers();
    this.servoWrite = this.sandbox.spy(MockFirmata.prototype, "servoWrite");
    this.board = newBoard();


    this.esc = new ESC({
      pin: 12,
      board: this.board
    });


    this.proto = [{
      name: "speed"
    }, {
      name: "forward"
    }, {
      name: "reverse"
    }, {
      name: "brake"
    }];

    this.instance = [{
      name: "id"
    }, {
      name: "pin"
    }, {
      name: "range"
    }, {
      name: "pwmRange"
    }, {
      name: "interval"
    }, {
      name: "neutral"
    }];

    process.noDeprecation = true;
    done();
  },

  tearDown: function(done) {
    Board.purge();
    this.sandbox.restore();
    process.noDeprecation = false;
    done();
  },

  shape: function(test) {
    test.expect(this.proto.length + this.instance.length);

    this.proto.forEach(function(method) {
      test.equal(typeof this.esc[method.name], "function");
    }, this);

    this.instance.forEach(function(property) {
      test.notEqual(typeof this.esc[property.name], "undefined");
    }, this);

    test.done();
  },

  emitter: function(test) {
    test.expect(1);

    test.ok(this.esc instanceof Emitter);

    test.done();
  },

};


exports["ESC - PCA9685"] = {
  setUp: function(done) {
    this.sandbox = sinon.sandbox.create();
    this.clock = this.sandbox.useFakeTimers();
    this.normalize = this.sandbox.spy(Board.Pins, "normalize");
    this.i2cWrite = this.sandbox.spy(MockFirmata.prototype, "i2cWrite");
    this.i2cConfig = this.sandbox.spy(MockFirmata.prototype, "i2cConfig");
    this.board = newBoard();

    this.esc = new ESC({
      pin: 0,
      board: this.board,
      controller: "PCA9685",
      address: 0x40
    });

    process.noDeprecation = true;
    done();
  },

  tearDown: function(done) {
    Board.purge();
    Expander.purge();
    this.sandbox.restore();

    process.noDeprecation = false;
    done();
  },

  fwdOptionsToi2cConfig: function(test) {
    test.expect(3);

    this.i2cConfig.reset();

    new ESC({
      controller: "PCA9685",
      address: 0xff,
      bus: "i2c-1",
      board: this.board
    });

    var forwarded = this.i2cConfig.lastCall.args[0];

    test.equal(this.i2cConfig.callCount, 1);
    test.equal(forwarded.address, 0xff);
    test.equal(forwarded.bus, "i2c-1");

    test.done();
  },

  withAddress: function(test) {
    test.expect(1);

    new ESC({
      pin: 1,
      board: this.board,
      controller: "PCA9685",
      address: 0x41
    });

    test.equal(Expander.byAddress(0x41).name, "PCA9685");
    test.done();
  },

  withoutAddress: function(test) {
    test.expect(2);

    Expander.purge();

    // Assert there is not another by the default address
    test.equal(Expander.byAddress(0x40), undefined);

    new ESC({
      pin: 1,
      board: this.board,
      controller: "PCA9685"
    });

    test.equal(Expander.byAddress(0x40).name, "PCA9685");

    test.done();
  },

  defaultFrequency: function(test) {
    test.expect(1);
    test.equal(this.esc.frequency, 50);
    test.done();
  },

  customFrequency: function(test) {
    test.expect(1);

    this.esc = new ESC({
      frequency: 60,
      pin: 0,
      controller: "PCA9685",
      board: this.board
    });

    test.equal(this.esc.frequency, 60);
    test.done();
  },

  noNormalization: function(test) {
    test.expect(1);
    test.equal(this.normalize.callCount, 0);
    test.done();
  },

  speed: function(test) {
    test.expect(6);
    this.i2cWrite.reset();

    this.esc.speed(10);
    this.clock.tick(1);

    test.equal(this.i2cWrite.args[0][0], 0x40);
    test.equal(this.i2cWrite.args[0][1][0], 6);
    test.equal(this.i2cWrite.args[0][1][1], 0);
    test.equal(this.i2cWrite.args[0][1][2], 0);
    test.equal(this.i2cWrite.args[0][1][3], 275);
    test.equal(this.i2cWrite.args[0][1][4], 1);

    test.done();
  }
};


exports["ESC - FORWARD_REVERSE"] = {
  setUp: function(done) {
    this.sandbox = sinon.sandbox.create();
    this.clock = this.sandbox.useFakeTimers();
    this.board = newBoard();
    this.throttle = this.sandbox.spy(ESC.prototype, "throttle");
    this.speed = this.sandbox.spy(ESC.prototype, "speed");
    done();
  },

  tearDown: function(done) {
    Board.purge();
    this.sandbox.restore();
    done();
  },

  missingNeutralThrows: function(test) {
    test.expect(1);

    test.throws(function() {
      new ESC({
        device: "FORWARD_REVERSE",
        pin: 11,
        board: this.board
      }.bind(this));
    }.bind(this));

    test.done();
  },
  neutralStartAtOldRangeToPWMRange: function(test) {
    test.expect(2);

    var esc = new ESC({
      device: "FORWARD_REVERSE",
      neutral: 50,
      pin: 11,
      board: this.board,
    });

    test.ok(this.throttle.calledOnce);
    test.equal(esc.neutral, 1500);
    test.done();
  },
  forward: function(test) {
    test.expect(4);

    var esc = new ESC({
      device: "FORWARD_REVERSE",
      neutral: 50,
      pin: 11,
      board: this.board,
    });

    this.speed.reset();
    esc.forward(100);

    test.ok(this.speed.calledOnce);
    test.equal(this.speed.getCall(0).args[0], 100);

    esc.forward(0);

    test.ok(this.speed.calledTwice);
    test.equal(this.speed.getCall(1).args[0], 1500);

    test.done();
  },
  reverse: function(test) {
    test.expect(4);

    var esc = new ESC({
      device: "FORWARD_REVERSE",
      neutral: 50,
      pin: 11,
      board: this.board,
    });

    this.speed.reset();
    esc.reverse(100);

    test.ok(this.speed.calledOnce);
    test.equal(this.speed.getCall(0).args[0], 0);

    esc.reverse(0);

    test.ok(this.speed.calledTwice);
    test.equal(this.speed.getCall(1).args[0], 1500);

    test.done();
  },

  brake: function(test) {
    test.expect(3);

    var esc = new ESC({
      device: "FORWARD_REVERSE",
      neutral: 50,
      pin: 11,
      board: this.board,
    });
    // write is internal and only exposed on instances
    var spy = this.sandbox.spy(esc, "write");

    esc.forward(1);
    spy.reset();
    esc.brake();

    test.ok(spy.calledOnce);
    test.equal(spy.getCall(0).args[0], 11);
    test.equal(spy.getCall(0).args[1], 1500);

    test.done();
  },
};

exports["ESC.Collection"] = {
  setUp: function(done) {
    this.board = newBoard();
    this.sandbox = sinon.sandbox.create();


    ESC.purge();

    this.a = new ESC({
      pin: 3,
      board: this.board
    });

    this.b = new ESC({
      pin: 6,
      board: this.board
    });

    this.c = new ESC({
      pin: 9,
      board: this.board
    });

    this.spies = [
      "speed",
      "brake",
    ];

    this.spies.forEach(function(method) {
      this[method] = this.sandbox.spy(ESC.prototype, method);
    }.bind(this));

    done();
  },

  tearDown: function(done) {
    Board.purge();
    this.sandbox.restore();
    done();
  },

  initFromESCNumbers: function(test) {
    test.expect(1);

    var escs = new ESC.Collection([3, 6, 9]);

    test.equal(escs.length, 3);
    test.done();
  },

  initFromESCs: function(test) {
    test.expect(1);

    var escs = new ESC.Collection([
      this.a, this.b, this.c
    ]);

    test.equal(escs.length, 3);
    test.done();
  },

  callForwarding: function(test) {
    test.expect(3);

    var escs = new ESC.Collection([3, 6, 9]);

    escs.speed(100);

    test.equal(this.speed.callCount, escs.length);
    test.equal(this.speed.getCall(0).args[0], 100);

    escs.brake();

    test.equal(this.brake.callCount, escs.length);

    test.done();
  },

};
