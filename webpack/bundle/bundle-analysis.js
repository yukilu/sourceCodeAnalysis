webpack打包后的bundle.js中整体为一个自执行函数，如下

(function(modules) { /* ... */ })([f0, f1, f2, f3, ...]);


传入的为一个函数数组，f0,f1,f2,f3等为其中的模块，用函数包裹，一般entry.js中的主体代码为数组最后一个元素
该自执行函数中的核心代码为__webpack_require__函数

(function(modules) {
    //...
    function __webpack_require__(moduleId) { /* ... */ }
    //...
    
    return __webpack_require__(__webpack_require__.s = someNumber /*数组最后一个元素序号*/ );
})([f0, f1, f2, f3, ...]);


__webpack_require__中的核心代码入下

(function(modules) {
    var installedModules = {};

    function __webpack_require__(moduleId) {

        // Check if module is in cache
        if (installedModules[moduleId])
            return installedModules[moduleId].exports;

        // Create a new module (and put it into the cache)
       var module = installedModules[moduleId] = {
            i: moduleId,  //id
            l: false,     //loaded
            exports: {}
        };

        // Execute the module function
        modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

        // Flag the module as loaded
        module.l = true;
        // Return the exports of the module
        return module.exports;
    }
    //...
    
    return __webpack_require__(__webpack_require__.s = someNumber /*数组最后一个元素序号*/ );
})([f0, f1, f2, f3, ...]);


包裹代码的单个函数模块  function (module, exports, __webpack_require__) { /* ... */ }
调用时为 modules[2].call(module.exports, module, module.exports, __webpack_require__)
即在 __webpack_require__ 函数中将局部变量 module.exports 通过数组中对应函数模块将需要的值挂载上去
然后通过函数 __webpack_require__函数 return module.exports，将 module.exports 结果返回出来
当然最后一个函数模块的返回值是没有用的，主要是前面的模块能够获取到需要的内容，以此实现模块化

相对应的函数指针数组为
[
/* 0 */
    (function(module, exports, __webpack_require__) {
        Object.defineProperty(exports, "__esModule", { value: true });
        const a = 0;
        exports.default = a;
    }),
/* 1 */
    (function(module, exports, __webpack_require__) {
        Object.defineProperty(exports, "__esModule", { value: true });
        const b = 1;
        exports.default = b;
    }),
/* 2 */
    (function(module, exports, __webpack_require__) {
        var _a = __webpack_require__(0);
        var _a2 = _interopRequireDefault(_a);
        var _b = __webpack_require__(1);
        var _b2 = _interopRequireDefault(_b);
        function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
        console.log(_a2.default + _b2.default);
    })
]

整体编译完的代码大概如下，省略了__webpack_require__函数上挂载的静态变量

(function(modules) {
    var installedModules = {};
    function __webpack_require__(moduleId) {
        if (installedModules[moduleId])
            return installedModules[moduleId].exports;
       var module = installedModules[moduleId] = { i: moduleId, l: false, exports: {} };
        modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
        module.l = true;
        return module.exports;
    }

    return __webpack_require__(2);
})([
/* 0 */
    (function(module, exports, __webpack_require__) {
        Object.defineProperty(exports, "__esModule", { value: true });
        const a = 0;
        exports.default = a;
    }),
/* 1 */
    (function(module, exports, __webpack_require__) {
        Object.defineProperty(exports, "__esModule", { value: true });
        const b = 1;
        exports.default = b;
    }),
/* 2 */
    (function(module, exports, __webpack_require__) {
        var _a = __webpack_require__(0);
        var _a2 = _interopRequireDefault(_a);
        var _b = __webpack_require__(1);
        var _b2 = _interopRequireDefault(_b);
        function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
        console.log(_a2.default + _b2.default);
    })
]);