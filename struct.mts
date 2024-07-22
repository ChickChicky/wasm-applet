// TODO: Make structs generic

import { repr } from "./util.mts";

/**
 * Deserializable / loadable data
 */
export interface deser {

    deserialize( buff: Buffer, env?: object, envArray?: object[] ) 
        : { dat: any, len: number };

}

/**
 * Serializable / savable data
 */
export interface ser {

    serialize( env: object, envArray: object )
        : Buffer;

}

/**
 * Description of structured data
 */
export type struct_description = {[k:string]:deser};

/**
 * Converts from a structure description to what {@link struct.deserialize} would output
 */
export type StructResult<T extends struct_description> = {[P in keyof T]:ReturnType<T[P]['deserialize']>['dat']};

/**
 * Represents structured data
 */
export class struct<T extends struct_description> {
    desc: T;
    
    constructor ( description: T ) {
        this.desc = description;
    }

    /**
     * Loads a structure from a buffer
     * @param raw_data The buffer to load the data from
     * @returns The loaded structure
     */
    deserialize( raw_data: Buffer ) : {dat:StructResult<T>,len:number} {

        let ptr = 0;
        let env = {} as StructResult<T>;
        let envArray: object[] = [];

        for (const k in this.desc) {
            const d = raw_data.subarray(ptr);
            const {dat,len} = this.desc[k].deserialize(d,env,envArray);
            env[k] = dat;
            envArray.push(dat);
            ptr += len;
        }

        return {dat:env,len:ptr};

    }

}

/**
 * An unsigned 8 bit integer
 */
export class u8 implements deser {
 
    constructor () {}

    deserialize( buff: Buffer, env?: object, envArray?: object[]  ) {
        return {
            dat: buff.readUint8(0),
            len: 1
        };
    }

}

/**
 * A signed 8 bit integer
 */
export class i8 implements deser {
 
    constructor () {}

    deserialize( buff: Buffer, env?: object, envArray?: object[]  ) {
        return {
            dat: buff.readInt8(0),
            len: 1
        };
    }

}

/**
 * An unsigned 16 bit integer
 */
export class u16 implements deser {
 
    constructor () {}

    deserialize( buff: Buffer, env?: object, envArray?: object[]  ) {
        return {
            dat: buff.readUint16BE(0),
            len: 2
        };
    }

}

/**
 * A signed 16 bit integer
 */
export class i16 implements deser {
 
    constructor () {}

    deserialize( buff: Buffer, env?: object, envArray?: object[]  ) {
        return {
            dat: buff.readInt16BE(0),
            len: 2
        };
    }

}

/**
 * An unsigned 32 bit integer
 */
export class u32 implements deser {
 
    constructor () {}

    deserialize( buff: Buffer, env?: object, envArray?: object[]  ) {
        return {
            dat: buff.readUint32BE(0),
            len: 4
        };
    }

}

/**
 * A signed 32 bit integer
 */
export class i32 implements deser {
 
    constructor () {}

    deserialize( buff: Buffer, env?: object, envArray?: object[]  ) {
        return {
            dat: buff.readInt32BE(0),
            len: 4
        };
    }

}

/**
 * A 32 bit floating point number
 */
export class f32 implements deser {

    constructor () {}

    deserialize( buff: Buffer, env?: object, envArray?: object[]  ) {
        return {
            dat: buff.readFloatBE(0),
            len: 4
        };
    }

}

/**
 * An unsigned 64 bit integer
 */
export class u64 implements deser {

    constructor () {}

    deserialize(buff: Buffer, env?: object, envArray?: object[]) {
        return {
            dat: buff.readBigUint64BE(0),
            len: 8
        }
    }

}

/**
 * An unsigned 64 bit integer
 */
export class i64 implements deser {

    constructor () {}

    deserialize(buff: Buffer, env?: object, envArray?: object[]) {
        return {
            dat: buff.readBigInt64BE(0),
            len: 8
        }
    }

}

/**
 * A 64 bit double-precision floating point number
 */
export class f64 implements deser {

    constructor () {}

    deserialize( buff: Buffer, env?: object, envArray?: object[]  ) {
        return {
            dat: buff.readDoubleBE(0),
            len: 8
        };
    }

}

export type ArrDynamicLengthFunction = (env:any) => number; // TODO: Proper type on env
type ArrLen = number|ArrDynamicLengthFunction|undefined;

export type ArrResult<T extends deser> = (ReturnType<T['deserialize']>['dat'])[];

/**
 * Represents a typed array
 */
export class arr<T extends deser> implements deser {
    t: (i:number)=>T;
    len: ArrLen;

    constructor ( t: (i:number)=>T, len: ArrLen = undefined ) {
        this.t = t;
        this.len = len;
    }

    /**
     * Loads a typed array from a buffer
     * @param buff The source data
     * @param env The environment
     * @param envArray The environment array
     * @returns A deserialized array
     */
    deserialize(buff: Buffer, env: object, envArray: object[]) : {dat:ArrResult<T>,len:number} {
        if (this.len == undefined) {
            const top = envArray[envArray.length-1];
            if (typeof top == 'number')
                this.len = top;
            else if (top instanceof Function) {
                const res = top(env);
                if (typeof res != 'number')
                    throw TypeError(`Epected dynamic array length function to return a number, got ${repr(top)}`);
                this.len = res;
            }
            else
                throw TypeError(`Expected number while using dynamic length, got ${repr(top)}`);
        }
        else if (this.len instanceof Function) {
            const res = this.len(env);
            if (typeof res != 'number')
                throw TypeError(`Epected dynamic array length function to return a number, got ${repr(res)}`);
            this.len = res;
        }

        let l = 0;
        let d: T[] = [];

        for (let i = 0; i < this.len; i++) {
            const {dat,len} = this.t(i).deserialize(buff.subarray(l),env,envArray);
            d.push(dat);
            l += len;
        }
 
        return {len:l,dat:d};
    }

}