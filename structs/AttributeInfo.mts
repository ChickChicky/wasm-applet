import { struct, arr, u8, u16, u32, deser } from "../struct.mts";
import { repr } from "../util.mts";
import { ClassFile } from "./ClassFile.mts";
import { CodeAttributeStruct } from "./attributes/CodeAttribute.mts";
import { ConstUtf8 } from "./Constants.mts";

export class AttributeInfoStruct implements deser {

    static struct = () => new struct({
        nameIndex: new u16(),
        length: new u32(),
        info: new arr( ()=>new u8() )
    });

    constructor() {}
    
    deserialize(buff: Buffer, env?: object, envArray?: object[]) {
        const {dat,len} = AttributeInfoStruct.struct().deserialize(buff);
        return {
            dat: new AttributeInfo(dat.nameIndex,Buffer.from(dat.info)),
            len
        };
    }

}

const attributeTypes = {
    'Code' : CodeAttributeStruct
} as const;

export type AttributeTypes = ReturnType<InstanceType<typeof attributeTypes[keyof typeof attributeTypes]>['deserialize']>['dat'];

export class AttributeInfo {
    nameIndex: number;
    info: Buffer;
    
    constructor(attributeNameIndex: number, info: Buffer) {
        this.nameIndex = attributeNameIndex;
        this.info = info;
    }

    /**
     * Resolves an attribute to its corresponding type
     * @param classFile
     * @returns The resolved attribute, or undefined if it is not supported
     */
    resolve(classFile: ClassFile) : AttributeTypes|undefined {
        const name = classFile.constantPool[this.nameIndex-1];
        if (!(name instanceof ConstUtf8))
            throw TypeError(`Invalid name type, expected ConstUtf8, got ${repr(name)}`);
        const attr = attributeTypes[name.value];
        if (attr)
            return new attr().deserialize(this.info,{},[]).dat;
    }
}