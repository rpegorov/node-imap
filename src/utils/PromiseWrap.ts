import { EventEmitter } from 'node:events';
import { IIndexed } from "../interfaces/IIndexed";

class PromiseWrap {
    static async eventEmitter<T extends EventEmitter>(ctx: T, method: string, event: string): Promise<any> {
        let _resolve: Function;
        const p: Promise<any> = new Promise<any>((resolve) => {
            _resolve = resolve;
        });
        (ctx as IIndexed)[method](event, (...args: any) => {
            _resolve(args)
        })
        return p;
    }
}

export { PromiseWrap }