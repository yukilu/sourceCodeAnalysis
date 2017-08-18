Function.prototype.myBind = function (target) {
    let that = this;
    return function() {
        //let args = Array.prototype.slice.call(arguments);
        //return that.apply(target, args);
        return that.apply(target, arguments);
    };
};

function add(z) {
    return this.x + this.y + z;
}

o = { x: 1, y: 2 };

let myAdd = add.myBind(o);

console.log(myAdd(3));