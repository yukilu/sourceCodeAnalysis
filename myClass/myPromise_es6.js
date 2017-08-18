class MyPromise {
    constructor(fn) {
        const that = this;
        this.value = this.error = null;
        this.successCallback = this.failCallback = null;       
        this.state = 'PENDING';

        fn(resolve, reject);

        function resolve(v) {
            that.value = v;
            that.state = 'FULFILLED';
            that.successCallback && that.successCallback(v);
        }

        function reject(e) {
            that.error = e;
            that.state = 'REJECTED';
            that.failCallback && that.failCallback(e);
        }
    }
    then(fulfilled, rejected) {
        let rtn;
        let that = this;
        if (this.state === 'FULFILLED') {
            rtn = fulfilled && fulfilled(this.value);
            if (rtn == undefined || typeof rtn.then !== 'function')
                rtn = new MyPromise(resolve => { resolve(rtn); });

        }
        else if (this.state === 'REJECTED') {
            rejected && rejected(this.error);
            rtn = new MyPromise((resolve, reject) => { reject(that.error); });
                
        }
        else //this.state === 'PENDING'
            rtn = new MyPromise(function (resolve, reject) {
                that.successCallback = function (v) {
                    let r = fulfilled && fulfilled(v);
                    if (r && typeof r.then === 'function')
                        r.then(v => {
                            resolve(v);
                        }, e => {
                            reject(e);
                        });
                    else
                        resolve(r);
                };
                that.failCallback = function (e) {
                    rejected && rejected(e);
                    reject(e);
                };
            });

        return rtn;
    }
}

let p = new MyPromise(resolve => {
    setTimeout(() => {
        resolve(0);
    }, 2000);
});

let r = p.then(v => {
    console.log(v);
    return new MyPromise(resolve => {
        setTimeout(() => {
            resolve(1);
        }, 2000);
    });
}).then(v => {
    console.log(v);
    return new MyPromise(resolve => {
        setTimeout(() => {
            resolve(2);
        }, 2000);
    });
}).then(v => {
    console.log(v);
    return 3;
}).then(v => {
    console.log(v);
});

console.log(r.constructor);