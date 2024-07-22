import { inspect } from 'node:util';

/**
 * Simplified output of util.inspect
 */
export function repr( value: any ) : string {
    if (typeof value == 'object') {
        const constructor = value.constructor;
        if (constructor)
            return `\x1b[36m[Object ${constructor.name}]\x1b[39m`;
        else
            return `\x1b[36m[Object]\x1b[39m`;
    }
    return inspect(value,{colors:true});
}