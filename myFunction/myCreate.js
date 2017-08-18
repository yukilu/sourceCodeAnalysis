const myCreate = function() {
    function Temp() {}

    return function(o) {
        if (typeof o !== 'object')
            throw TypeError('Object prototype may only be an Object or null.');
        Temp.prototype = o;
        let obj = new Temp();
        Temp.prototype = null;

        if (arguments.length > 1) {
            let properties = Object(arguments[1]);
            for (let prop in properties) {
                if (properties.hasOwnProperty(prop)) {
                    obj[prop] = properties[prop];
                }
            }
        }
    };
}();

function Father(x) {
    this.x = x;
}

Father.prototype.say = function() {
    console.log(this.x);
}

function Son(y) {
    this.y = y;
}

Son.prototype = new Father(0);
//also inherits x, to fix this, use empty function Temp

function Temp() {}
Temp.prototype = Father.prototype;

Son.prototype = new Temp();
Temp.prototype = null; //avoid memory leak