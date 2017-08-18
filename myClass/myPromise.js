function MyPromise(fn) {
    let that = this;
    this.state = 'PENDING';
    this.fulfilledCb = null;
    this.rejectedCb = null;
    this.value = null;
    fn(resolve, reject);
    function resolve(val) {
        that.value = val;
        that.state = 'FULFILLED';
        that.fulfilledCb && that.fulfilledCb(val);
    }
    function reject(err) {
        that.value = err;
        that.state = 'REJECTED';
        that.rejectedCb && that.rejectedCb(err);
    }
};

MyPromise.prototype.thenable = function () {
    if (typeof this.then === 'function')
        return true;
    return false;
}

MyPromise.prototype.then = function (fulfilled, rejected) {
    let rtn;
    let that = this;
    if (this.state === 'FULFILLED')
        fulfilled && (rtn = fulfilled(this.value));
    else if (this.state === 'REJECTED')
        rejected && (rtn = rejected(this.value));
    else  //this.state === 'PENDING'
        rtn = new MyPromise(function (resolve, reject) {
            that.fulfilledCb = function (val) {
                let r = fulfilled(val);
                if (r && r.thenable)
                    r.then(v => {
                        resolve(v);
                    }, e => {
                        reject(e);
                    });
            };
            that.rejectedCb = function(err) {
                rejected(err);
                reject(err);
            };
        });

    return rtn;
};

let p = new MyPromise(function (resolve, reject) {
    setTimeout(() => {
        resolve(1);
    }, 2000);
});

p.then(v => {
    console.log(v);
    return new MyPromise(function (resolve, reject) {
        setTimeout(() => {
            resolve(2);
        }, 2000);
    });
}).then(v => {
    console.log(v);
    return new MyPromise(function (resolve, reject) {
        setTimeout(() => {
            resolve(3);
        }, 2000);
    });
}).then(v => {
    console.log(v);
});