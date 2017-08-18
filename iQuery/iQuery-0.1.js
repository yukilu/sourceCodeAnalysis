(function (window) {
    function IQuery(args) {
        this.elements = [];
        switch (typeof args) {
            case 'function':
                ready(args);
                break;
            case 'string':
                this.elements = getElements(args);
                break;
            case 'object':
                this.elements.push(args);
                break;
            default:
                alert('error!');
        }
    }

    function iQuery(args) {
        return new IQuery(args);
    }

    var $ = iQuery;

    function ready(fn) {
        if (document.addEventListener)
            document.addEventListener('DOMContentLoaded', fn, false);
        else
            document.attachEvent('onreadystatechange', function () {
                if (document.readyState === 'complete')
                    fn && fn();
            });
        return this;
    }

    IQuery.prototype.ready = ready;

    function getElements(str) {
        var aChild = [];
        var aParent = [document];
        var arr = str.match(/\S+/g);
        // console.log(arr);
        for (var i = 0; i < arr.length; i++) {
            aChild = getChild(aParent, arr[i]);
            aParent = aChild;
        }
        return aChild;
    }

    function getChild(aParent, str) {
        var i = 0;
        var childElements = null;
        var aChild = [];
        for (i = 0; i < aParent.length; i++)
            switch (str.charAt(0)) {
                case '#':
                    aChild[0] = document.getElementById(str.substring(1));
                    break;
                case '.':
                    childElements = getByClass(aParent[i], str.substring(1));
                    for (i = 0; i < childElements.length; i++)
                        aChild.push(childElements[i]);
                    break;
                default:
                    childElements = aParent[i].getElementsByTagName(str);
                    for (i = 0; i < childElements.length; i++)
                        aChild.push(childElements[i]);
            }
        return aChild;
    }

    function getByClass(oParent, sClass) {
        if (oParent.getElementsByClassName)
            getByClass = function (oParent, sClass) {
                return oParent.getElementsByClassName(sClass);
            };
        else
            getByClass = function (oParent, sClass) {
                var result = [];
                var elements = oParent.getElementsByTagName('*');
                var re = new RegExp('\\b' + sClass + '\\b');
                for (var i = 0; i < elements.length; i++)
                    if (re.test(elements[i].className))
                        result.push(elements[i]);
                return result;
            };
        return getByClass(oParent, sClass);
    }

    IQuery.prototype.css = function () {
        var i = 0;
        if (arguments.length === 2)
            for (i = 0; i < this.elements.length; i++)
                this.elements[i].style[arguments[0]] = arguments[1];
        else if (typeof arguments[0] === 'string')
            return getStyle(this.elements[0], arguments[0]);
        else if (typeof arguments[0] === 'object')
            for (i = 0; i < this.elements.length; i++)
                for (var key in arguments[0])
                    this.elements[i].style[key] = arguments[0][key];
        return this;
    };

    function getStyle(obj, property) {
        return (obj.currentStyle || getComputedStyle(obj, false))[property];
    }

    var events = 'click|mouseover|mouseout|mousedown|mousemove|mouseup';

    events.replace(/\w+/g, function (s) {
        IQuery.prototype[s] = function (fn) {
            for (var i = 0; i < this.elements.length; i++)
                addEvent(this.elements[i], s, fn);
            return this;
        };
    });

    IQuery.prototype.mouseenter = function (fn) {
        this.mouseover(function (e) {
            var oFrom = e.fromElement || e.relatedTarget;
            if (this.contains(oFrom))
                return;
            fn();
        });
        return this;
    };

    IQuery.prototype.mouseleave = function (fn) {
        this.mouseout(function (e) {
            var oTo = e.toElement || e.relatedTarget;
            if (this.contains(oTo))
                return;
            fn();
        });
        return this;
    };

    IQuery.prototype.hover = function (fn1, fn2) {
        this.mouseenter(fn1);
        this.mouseleave(fn2);
        return this;
    };

    IQuery.prototype.show = function () {
        for (var i = 0; i < this.elements.length; i++)
            this.elements[i].style.display = 'block';
        return this;
    };

    IQuery.prototype.hide = function () {
        for (var i = 0; i < this.elements.length; i++)
            this.elements[i].style.display = 'none';
        return this;
    };

    function addEvent(obj, sEv, fn) {
        if (obj.addEventListener)
            addEvent = function (obj, sEv, fn) {
                obj.addEventListener(sEv, function (ev) {
                    if (fn.call(this, ev) === false) {
                        ev.cancelBubble = true;
                        ev.preventDefault();
                    }
                }, false);
            };
        else
            addEvent = function (obj, sEv, fn) {
                obj.attachEvent('on' + sEv, function () {
                    if (fn.call(this, event) === false) {
                        event.cancelBubble = true;
                        return false;
                    }
                });
            };
        addEvent(obj, sEv, fn);
    }

    IQuery.prototype.eq = function (n) {
        if (this.elements[n] !== undefined)
            return $(this.elements[n]);
    };

    IQuery.prototype.tab = function ($aContent, hClass, conClass) {
        if (!this || !$aContent || !hClass ||
            this.elements.length !== $aContent.elements.length)
            return;
        var that = this;
        for (var i = 0; i < this.elements.length; i++)
            (function (index) {
                that.elements[i].onclick = function () {
                    that.removeClass(hClass);
                    $aContent.removeClass(conClass);
                    $aContent.css('display', 'none');
                    addClass(this, hClass);
                    addClass($aContent.elements[index], conClass);
                    $aContent.elements[index].style.display = 'block';
                };
            })(i);
        return this;
    };

    IQuery.prototype.indexOf = function () {
        var parent = this.elements[0].parentNode;
        var children = parent.children;
        for (var i = 0; i < children.length; i++)
            if (children[i] === this.elements[0])
                return i;
    };

    function addClass(element, sClass) {
        if (!sClass || !element)
            return;
        var classname = element.className;
        var re = new RegExp('\\b' + sClass + '\\b');
        if (!classname)
            classname = sClass;
        else if (!re.test(classname))
            classname += ' ' + sClass;
        element.className = classname.replace(/^\s+|\s+$/g, '').replace(/\s{2,}/g, ' ');
    }

    function removeClass(element, sClass) {
        var classname = element.className;
        if (!sClass || !element || !classname)
            return;
        var re = new RegExp('\\b' + sClass + '\\b');
        element.className = classname.replace(re, '')
                            .replace(/^\s+|\s+$/g, '').replace(/\s{2,}/g, ' ');
    }

    IQuery.prototype.addClass = function (sClass) {
        if (!this.elements || !sClass)
            return;
        for (var i = 0; i < this.elements.length; i++)
            addClass(this.elements[i], sClass);
        return this;
    };

    IQuery.prototype.removeClass = function (sClass) {
        if (!this.elements || !sClass)
            return;
        for (var i = 0; i < this.elements.length; i++)
            removeClass(this.elements[i], sClass);
        return this;
    };

    // drag function  fnJson {mousedown, mousemove, coll, leave, mouseup, upColl}
    function drag(obj1, obj2, fnJson) {
        if (!obj1)
            return;
        fnJson = fnJson || {};
        obj1.onmousedown = function (ev) {
            var e = ev || event;
            var bColl = false;
            var disX = e.clientX - obj1.offsetLeft;
            var disY = e.clientY - obj1.offsetTop;
            fnJson.mousedown && fnJson.mousedown.call(obj1, e);
            // pointer this points to the original DOM object
            document.onmousemove = function (ev) {
                var e = ev || event;
                obj1.style.left = e.clientX - disX + 'px';
                obj1.style.top = e.clientY - disY + 'px';
                fnJson.mousemove && fnJson.mousemove.call(obj1, e);
                if (obj2 !== null || obj2 !== undefined) {
                    if (collTest(obj1, obj2)) {
                        bColl = true;
                        fnJson.coll && fnJson.coll.call(obj1, e, obj2);
                    }
                    else {
                        fnJson.leave && fnJson.leave.call(obj1, e, obj2);
                        bColl = false;
                    }
                }
            };
            document.onmouseup = function (ev) {
                var e = ev || event;
                document.onmouseup = document.onmousemove = null;
                fnJson.mouseup && fnJson.mouseup.call(obj1, e);
                if (bColl)
                    fnJson.upColl && fnJson.upColl.call(obj1, e, obj2);
                obj1.releaseCapture && obj1.releaseCapture();
            };
            obj1.setCapture && obj1.setCapture();
            return false;
        };
    }

    IQuery.prototype.drag = function ($aObj2, fnJson) {
        var aObj1 = this.elements;
        var aObj2 = [undefined];
        if ($aObj2 && $aObj2.elements[0])
            aObj2 = $aObj2.elements;
        for (var i = 0; i < aObj1.length; i++)
            for (var j = 0; j < aObj2.length; j++)
                drag(aObj1[i], aObj2[j], fnJson);
    };

    function collTest(obj1, obj2) {
        if (!obj1 || !obj2)
            return;
        return !(obj1.offsetLeft + obj1.offsetWidth < obj2.offsetLeft ||
        obj1.offsetTop + obj1.offsetHeight < obj2.offsetTop ||
        obj1.offsetLeft > obj2.offsetLeft + obj2.offsetWidth ||
        obj1.offsetTop > obj2.offsetTop + obj2.offsetHeight);
    }

    IQuery.prototype.collTest = function ($obj2) {
        return collTest(this.elements[0], $obj2.elements[0]);
    };

    window.$ = window.iQuery = iQuery;
})(window);
