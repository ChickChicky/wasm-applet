import { AttributeInfo, AttributeInfoStruct } from "./AttributeInfo.mts";
import { struct, arr, u16, deser } from "../struct.mts";
import { ClassFile } from "./ClassFile.mts";
import { ConstUtf8 } from "./Constants.mts";
import { repr } from "../util.mts";

export class FieldInfoStruct implements deser {
    
    static struct = () => new struct({
        accessFlags: new u16(),
        nameIndex: new u16(),
        descriptorIndex: new u16(),
        attributesCount: new u16(),
        attributes: new arr( ()=>new AttributeInfoStruct() )
    });

    constructor () {}

    deserialize(buff: Buffer, env?: object, envArray?: object[]) {
        const {dat,len} = FieldInfoStruct.struct().deserialize(buff);
        return {
            dat: new FieldInfo(dat.accessFlags, dat.nameIndex, dat.descriptorIndex, dat.attributes),
            len
        };
    }

}

export class FieldInfo {
    accessFlags: number;
    nameIndex: number;
    descriptorIndex: number;
    attributes: AttributeInfo[];

    constructor (accessFlags: number, nameIndex: number, descriptorIndex: number, attributes: AttributeInfo[]) {
        this.accessFlags = accessFlags;
        this.nameIndex = nameIndex;
        this.descriptorIndex = descriptorIndex;
        this.attributes = attributes;
    }

    resolve(classFile: ClassFile) {
        const name = classFile.constantPool[this.nameIndex-1];
        if (!(name instanceof ConstUtf8))
            throw TypeError(`Invalid name type, expected ConstUtf8, got ${repr(name)}`);
        const desc = classFile.constantPool[this.nameIndex-1];
        if (!(desc instanceof ConstUtf8))
            throw TypeError(`Invalid descriptor type, expected ConstUtf8, got ${repr(name)}`);
        return {
            name: name.value,
            desc: desc.value
        };
    }
}