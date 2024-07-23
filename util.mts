import { inspect } from 'node:util';
import { CPFieldref, CPMethodref } from './structs/ClassFile.mts';

/**
 * Simplified output of util.inspect
 */
export function repr( value: any ) : string {
    if (typeof value == 'object' && value != null) {
        const constructor = value.constructor;
        if (constructor)
            return `\x1b[36m[Object ${constructor.name}]\x1b[39m`;
        else
            return `\x1b[36m[Object]\x1b[39m`;
    }
    return inspect(value,{colors:true});
}

export type CPRef = CPFieldref | CPMethodref;

export function refPath( value: CPRef ) : string {
    return value.class.name.replace(/\//g,'.')+'.'+value.desc.name;
}