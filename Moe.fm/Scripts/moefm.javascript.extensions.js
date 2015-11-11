function inhert(p) {
    if (p == null) {
        throw TypeError();
    }
    if (Object.create) {
        return Object.create(p);
    }
    if (typeof p !== "object" || typeof p !== "function") {
        throw TypeError();
    }

    function f() { };

    f.prototype = p;
    return new f();
}

if (!String.prototype.format) {
    String.prototype.format = function () {
        if (arguments.length < 1) {
            return this;
        }
        var format = this;
        for (var i = 0; i < arguments.length; i++) {
            var reg = new RegExp("\\{" + (i) + "\\}", "g");
            format = format.replace(reg, arguments[i]);
        }
        return format;
    }
}

Array.prototype.cRemoveAt = function (index) {
    this.splice(index, 1);
}

Array.prototype.cRemove = function (obj) {
    var index = this.indexOf(obj);
    if (index >= 0) {
        this.cRemoveAt(index);
    }
}

if (!Array.prototype.clear) {
    Array.prototype.clear = function() {
        this.length = 0;
    }
}


function DeepClone(o) {
    if (!o) {
        return null;
    }

    function t() {};

    t.prototype = o.constructor.prototype;

    var obj = new t();

    for (var name in o) {
        if (o.hasOwnProperty(name)) {
            obj[name] = o[name];
        }
    }
    return obj;
}

if (!Array.prototype.where) {
    Array.prototype.where = function(func) {
        if (this.length == 0) {
            return null;
        }
        var len = this.length >>> 0;
        for (var i = 0; i < len; i++) {
            if (func(this[i]) == true) {
                return this[i];
            }
        }
        return null;
    };
}

if (!Array.prototype.findAll) {
    Array.prototype.findAll = function (func) {
        if (this.length === 0) {
            return [];
        }
        var len = this.length >>> 0, vals = [];
        for (var i = 0; i < len; i++) {
            if (func(this[i]) === true) {
                vals.push(this[i]);
            }
        }
        return vals;
    };
}