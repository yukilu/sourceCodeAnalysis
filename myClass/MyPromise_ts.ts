class MyPromise<T> {
    private value: T;
    private error: any;
    private resolved: boolean = false;  // 判断是否已决议，防止resolve,reject的重复调用
    // 判断是否在决议中，当resolve传入的值为promise时，到该promise决议前，认为是决议中，在此期间防止resolve,reject重复调用
    private resolving: boolean = false;
    private state: string = 'PENDING';
    private successCallback: (value: T) => void;
    private failCallback: (error: any) => void;
    constructor(executor: (resolve: (value: T | MyPromise<T>) => void, reject?: (error: any) => void) => void) {
        const self: MyPromise<T> = this;
        executor(resolve, reject);

        function resolve(value: T | MyPromise<T>): void {
            if (self.resolved || self.resolving)
                return;

            // 若向resolve传入的是个promise，则当该promise决议时才会触发当前promise决议
            if (value instanceof MyPromise){
                // 当传入值为promise时，将resolving置为true，认为当前promise处在决议中，此时重复调用resolve及reject均忽略
                self.resolving = true;
                // 当传入的promise决议时，将resolving置为false，同时调用对应的resolve，reject函数决议当前promise，会将resolved置为true
                value.then((v: T): void => {
                    self.resolving = false;
                    resolveLater(v);
                }, (e: any): void => {
                    self.resolving = false;
                    reject(e);
                });
            }
            else
                resolveLater(value);
            
            function resolveLater(value: T): void {
                self.resolved = true;
                self.state = 'FULFILLED';
                self.value = value;
                self.successCallback && self.successCallback(value);
            }
        }

        function reject(error: any): void {
            if (self.resolved || self.resolving)
                return;
            
            self.resolved = true;
            self.state = 'REJECTED';
            // 禁止向reject传入promise，否则抛出错误
            if (error instanceof MyPromise)
                throw new Error('MyPromise can\'t be passed to reject!');

            this.error = error;
            self.failCallback && self.failCallback(error);
        }
    }

    then<F, R>(this: MyPromise<T>, fulfilled: (value: T) => F|MyPromise<F>, rejected?: (error: any) => R|MyPromise<R>): MyPromise<F|R> {
        if (this.state === 'FULFILLED') {
            const rtn = fulfilled && fulfilled(this.value);
            return MyPromise.resolve<F>(rtn);
        }
        if (this.state === 'REJECTED') {
            const rtn = rejected && rejected(this.error);
            return MyPromise.reject(rtn);
        }

        const self: MyPromise<T> = this;
        return new MyPromise<F | R>(function (resolve: (value: F | R) => void, reject: (error: any) => void): void {
            self.successCallback = function (value: T): void {
                const rtn = fulfilled && fulfilled(value);
                if (rtn instanceof MyPromise)
                    rtn.then(resolve, reject);
                else
                    resolve(rtn);
            };
            self.failCallback = function (error: any): void {
                const rtn = rejected && rejected(error);
                if (rtn instanceof MyPromise)
                    rtn.then(resolve, reject);
                else
                    reject(rtn);
            };
        });
    }

    catch<R>(this: MyPromise<T>, rejected: (error: any) => R | MyPromise<R>): MyPromise<R> {
        return this.then<null, R>(null, rejected);
    }

    static resolve<U>(v: U | MyPromise<U>): MyPromise<U> {
        if (v instanceof MyPromise)
            return v;
        return new MyPromise<U>((resolve: (value: U) => void): void => {
            resolve(v);
        });
    }

    static reject(v: any): MyPromise<any> {
        if (v instanceof MyPromise)
            return v;
        return new MyPromise<any>((resolve: (v: any) => void, reject: (e: any) => void): void => {
            reject(v);
        });
    }

    static all<TALL>(values: Iterable<TALL | MyPromise<TALL>>): MyPromise<TALL[]> {
        const results: TALL[] = [];
        const promises: MyPromise<TALL>[] = [...values].map(p => MyPromise.resolve(p));
        return new MyPromise<TALL[]>(function (resolve: (value: TALL[]) => void, reject: (error: any) => void): void {
            let count: number = 0;
            promises.forEach((p, i) => {
                p.then((v: TALL): void => {
                    results[i] = v;
                    if (++count === promises.length)
                        resolve(results);
                }, reject);
            });
        });
    }

    static race<TALL>(values: Iterable<TALL | MyPromise<TALL>>): MyPromise<TALL> {
        const promises: MyPromise<TALL>[] = [...values].map(p => MyPromise.resolve(p));
        return new MyPromise<TALL>(function (resolve: (value: TALL) => void, reject: (error: any) => void): void {
            promises.forEach(p => {
                p.then(resolve, reject);
            });
        });
    }
}

function generatePromise<T>(value: T | MyPromise<T>, time: number): MyPromise<T> {
    return new MyPromise((resolve: (value: T | MyPromise<T>) => void): void => {
        setTimeout((): void => {
            resolve(value);
        }, time);
    });
}

let gp = generatePromise;
console.log('begin...');
gp(gp(0, 2000), 0).then(v => {
    console.log(v);
    return gp(1, 2000);
}).then(v => console.log(v));