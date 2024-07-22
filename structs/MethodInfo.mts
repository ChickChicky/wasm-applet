import { AttributeInfoStruct, AttributeInfo } from "./AttributeInfo.mts";
import { struct, u16, arr, deser } from "../struct.mts";
import { ClassFile } from "./ClassFile.mts";
import { getAttribute } from "./Generics.mts";

export class MethodInfoStruct implements deser {

    static struct = () => new struct({
        accessFlags: new u16(),
        nameIndex: new u16(),
        descriptorIndex: new u16(),
        attributesCount: new u16(),
        attributes: new arr( ()=>new AttributeInfoStruct() )
    });

    constructor() {}

    deserialize(buff: Buffer, env?: object, envArray?: object[]) {
        const {dat,len} = MethodInfoStruct.struct().deserialize(buff);
        return {
            dat: new MethodInfo(dat.accessFlags,dat.nameIndex,dat.descriptorIndex,dat.attributes),
            len
        };
    }

}

export class MethodInfo {
    accessFlags: number;
    nameIndex: number;
    descriptorIndex: number;
    attributes: AttributeInfo[];

    constructor(accessFlags: number, nameIndex: number, descriptorIndex: number, attributes: AttributeInfo[]) {
        this.accessFlags = accessFlags;
        this.nameIndex = nameIndex;
        this.descriptorIndex = descriptorIndex;
        this.attributes = attributes;
    }

    getAttribute(classFile: ClassFile, name: string) : AttributeInfo|undefined {
        return getAttribute(this,classFile.constantPool,name);
    }
}