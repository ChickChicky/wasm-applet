import { struct, arr, u8, deser } from "../struct.mts";
import { constants } from "./Constants.mts";

export class CPInfo implements deser {

    constructor () {}

    deserialize(buff: Buffer, env: object, envArray: object[]) {
        const typeId = new u8().deserialize(buff).dat;
        const type = constants[typeId];
        if (!type)
            throw TypeError(`Unknown constant kind ${typeId}`);
        return new type().deserialize(buff,env,envArray);
    }

}