class MyArray extends Array {
    constructor(n) {
        super(n);
    }
    fE(fn) {
        for (let i = 0; i < this.length; i++)
            fn(this[i], i, this);
    }
    m(fn) {
        let res = [];
        for (let i = 0; i < this.length; i++)
            res[i] = fn(this[i], i, this);
        return res;
    }
    r(fn, v) {
        let res = v;
        let i = 0;
        if (typeof res === 'undefined') {
            res = this[0];
            i = 1;
        }
        for (; i < this.length; i++) {
            res = fn(res, this[i], i, this);
        }
        return res;
    }
}