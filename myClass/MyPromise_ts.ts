class MyPromise<T> {
    private value: T;
    private error: any;
    private resolved: boolean = false;
    private state: string = 'PENDING';
    private successCallback: (value: T) => void;
    private failCallback: (error: any) => void;
    constructor(executor: (resolve: (value: T | MyPromise<T>) => void, reject?: (error: any) => void) => void) {
        const self: MyPromise<T> = this;
        executor(resolve, reject);

        function resolve(value: T | MyPromise<T>): void {
            if (self.resolved)
                return;

            self.resolved = true;
            if (value instanceof MyPromise)
                value.then((v: T): void => {
                    resolveLater(v);
                });
            else
                resolveLater(value);
            
            function resolveLater(value: T): void {
                self.state = 'FULFILLED';
                self.value = value;
                self.successCallback && self.successCallback(value);
            }
        }

        function reject(error: any): void {
            if (self.resolved)
                return;
            
            self.resolved = true;
            self.state = 'REJECTED';
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

function generatePromise<T>(value: T, time: number): MyPromise<T> {
    return new MyPromise((resolve: (value: T) => void): void => {
        setTimeout((): void => {
            resolve(value);
        }, time);
    });
}