import { struct, arr, u8, u16, i32, i64, f32, f64, deser } from "../struct.mts";

const constUtf8Struct = () => new struct({
    tag: new u8(),
    length: new u16(),
    bytes: new arr( ()=>new u8() )
});

const constIntegerStruct = () => new struct({
    tag: new u8(),
    value: new i32(),
});

const constFloatStruct = () => new struct({
    tag: new u8(),
    value: new f32(),
});

const constLongStruct = () => new struct({
    tag: new u8(),
    value: new i64(),
});

const constDoubleStruct = () => new struct({
    tag: new u8(),
    value: new f64(),
});

const constClassStruct = () => new struct({
    tag: new u8(),
    fqnIndex: new u16(),
});

const constStringStruct = () => new struct({
    tag: new u8(),
    dataIndex: new u16(),
});

const constFieldrefStruct = () => new struct({
    tag: new u8(),
    classIndex: new u16(),
    descIndex: new u16(),
});

const constMethodrefStruct = () => new struct({
    tag: new u8(),
    classIndex: new u16(),
    descIndex: new u16(),
});

const constInterfaceMethodrefStruct = () => new struct({
    tag: new u8(),
    classIndex: new u16(),
    descIndex: new u16(),
});

const constDescriptorStruct = () => new struct({
    tag: new u8(),
    nameIndex: new u16(),
    descIndex: new u16(),
});

const constMethodHandleStruct = () => new struct({
    tag: new u8(),
    refKind: new u8(),
    refIndex: new u16(),
});

const constMethodTypeStruct = () => new struct({
    tag: new u8(),
    descIndex: new u16(),
});

const constDynamicStruct = () => new struct({
    tag: new u8(),
    attrIndex: new u16(),
    descIndex: new u16(),
});

const constInvokeDynamicStruct = () => new struct({
    tag: new u8(),
    attrIndex: new u16(),
    descIndex: new u16(),
});

const constModuleStruct = () => new struct({
    tag: new u8(),
    nameIndex: new u16(),
});

const constPackageStruct = () => new struct({
    tag: new u8(),
    nameIndex: new u16(),
});

export class ConstUtf8Struct implements deser {

    constructor() {}

    deserialize(buff: Buffer, env?: object, envArray?: object[]) {
        const {dat,len} = constUtf8Struct().deserialize(buff);
        return {
            dat: new ConstUtf8(String.fromCodePoint(...dat.bytes)),
            len
        };
    }

}

export class ConstUtf8 {
    value: string;

    constructor (value: string) {
        this.value = value;
    }
}

export class ConstIntegerStruct implements deser {

    constructor() {}

    deserialize(buff: Buffer, env?: object, envArray?: object[]) {
        const {dat,len} = constIntegerStruct().deserialize(buff);
        return {
            dat: new ConstInteger(dat.value),
            len
        };
    }

}

export class ConstInteger {
    value: number;

    constructor (value: number) {
        this.value = value;
    }

}

export class ConstFloatStruct implements deser {

    constructor() {}

    deserialize(buff: Buffer, env?: object, envArray?: object[]) {
        const {dat,len} = constFloatStruct().deserialize(buff);
        return {
            dat: new ConstFloat(dat.value),
            len
        };
    }

}

export class ConstFloat {
    value: number;

    constructor (value: number) {
        this.value = value;
    }

}

export class ConstLongStruct implements deser {

    constructor() {}

    deserialize(buff: Buffer, env?: object, envArray?: object[]) {
        const {dat,len} = constLongStruct().deserialize(buff);
        return {
            dat: new ConstLong(dat.value),
            len
        };
    }

}

export class ConstLong {
    value: BigInt;

    constructor (value: BigInt) {
        this.value = value;
    }

}

export class ConstDoubleStruct implements deser {

    constructor() {}

    deserialize(buff: Buffer, env?: object, envArray?: object[]) {
        const {dat,len} = constDoubleStruct().deserialize(buff);
        return {
            dat: new ConstDouble(dat.value),
            len
        };
    }

}

export class ConstDouble {
    value: number;

    constructor (value: number) {
        this.value = value;
    }

}

export class ConstClassStruct implements deser {

    constructor() {}

    deserialize(buff: Buffer, env?: object, envArray?: object[]) {
        const {dat,len} = constClassStruct().deserialize(buff);
        return {
            dat: new ConstClass(dat.fqnIndex),
            len
        };
    }

}

export class ConstClass {
    fqnIndex: number;

    constructor (fqnIndex: number) {
        this.fqnIndex = fqnIndex;
    }
}

export class ConstStringStruct implements deser {
 
    constructor() {}

    deserialize(buff: Buffer, env?: object, envArray?: object[]) {
        const {dat,len} = constStringStruct().deserialize(buff);
        return {
            dat: new ConstString(dat.dataIndex),
            len
        };
    }

}

export class ConstString {
    dataIndex: number;

    constructor (dataIndex: number) {
        this.dataIndex = dataIndex;
    }
}

export class ConstFieldrefStruct implements deser {
 
    constructor() {}

    deserialize(buff: Buffer, env?: object, envArray?: object[]) {
        const {dat,len} = constFieldrefStruct().deserialize(buff);
        return {
            dat: new ConstFieldref(dat.classIndex,dat.descIndex),
            len
        };
    }

}

export class ConstFieldref {
    classIndex: number;
    descIndex: number;

    constructor (classIndex: number, descIndex: number) {
        this.classIndex = classIndex;
        this.descIndex = descIndex;
    }
}

export class ConstMethodrefStruct implements deser {

    constructor() {}

    deserialize(buff: Buffer, env?: object, envArray?: object[]) {
        const {dat,len} = constMethodrefStruct().deserialize(buff);
        return {
            dat: new ConstMethodref(dat.classIndex,dat.descIndex),
            len
        };
    }

}

export class ConstMethodref {
    classIndex: number;
    descIndex: number;

    constructor (classIndex: number, descIndex: number) {
        this.classIndex = classIndex;
        this.descIndex = descIndex;
    }
}


export class ConstInterfaceMethodrefStruct implements deser {

    constructor() {}

    deserialize(buff: Buffer, env?: object, envArray?: object[]) {
        const {dat,len} = constInterfaceMethodrefStruct().deserialize(buff);
        return {
            dat: new ConstInterfaceMethodref(dat.classIndex,dat.descIndex),
            len
        };
    }
    
}

export class ConstInterfaceMethodref {
    classIndex: number;
    descIndex: number;

    constructor (classIndex: number, descIndex: number) {
        this.classIndex = classIndex;
        this.descIndex = descIndex;
    }
}


export class ConstDescriptorStruct implements deser {

    constructor() {}

    deserialize(buff: Buffer, env?: object, envArray?: object[]) {
        const {dat,len} = constDescriptorStruct().deserialize(buff);
        return {
            dat: new ConstDescriptor(dat.nameIndex,dat.descIndex),
            len
        };
    }

}

export class ConstDescriptor {
    nameIndex: number;
    descIndex: number;

    constructor (nameIndex: number, descIndex: number) {
        this.nameIndex = nameIndex;
        this.descIndex = descIndex;
    }
}

export class ConstMethodHandleStruct implements deser {

    constructor() {}

    deserialize(buff: Buffer, env?: object, envArray?: object[]) {
        const {dat,len} = constMethodHandleStruct().deserialize(buff);
        return {
            dat: new ConstMethodHandle(dat.refIndex,dat.refKind),
            len
        };
    }

}

export class ConstMethodHandle {
    refIndex: number;
    refKind: number;

    constructor (refIndex: number, refKind: number) {
        this.refIndex = refIndex;
        this.refKind = refKind;
    }
}

export class ConstMethodTypeStruct implements deser {

    constructor() {}

    deserialize(buff: Buffer, env?: object, envArray?: object[]) {
        const {dat,len} = constMethodTypeStruct().deserialize(buff);
        return {
            dat: new ConstMethodType(dat.descIndex),
            len
        };
    }

}

export class ConstMethodType {
    descIndex: number;

    constructor (descIndex: number) {
        this.descIndex = descIndex;
    }
}

export class ConstDynamicStruct implements deser {

    constructor() {}

    deserialize(buff: Buffer, env?: object, envArray?: object[]) {
        const {dat,len} = constDynamicStruct().deserialize(buff);
        return {
            dat: new ConstDynamic(dat.attrIndex,dat.descIndex),
            len
        };
    }

}

export class ConstDynamic {
    attrIndex: number;
    descIndex: number;

    constructor (attrIndex: number, descIndex: number) {
        this.attrIndex = attrIndex;
        this.descIndex = descIndex;
    }
}

export class ConstInvokeDynamicStruct implements deser {

    constructor() {}
    
    deserialize(buff: Buffer, env?: object, envArray?: object[]) {
        const {dat,len} = constInvokeDynamicStruct().deserialize(buff);
        return {
            dat: new ConstInvokeDynamic(dat.attrIndex,dat.descIndex),
            len
        };
    }

}

export class ConstInvokeDynamic {
    attrIndex: number;
    descIndex: number;

    constructor (attrIndex: number, descIndex: number) {
        this.attrIndex = attrIndex;
        this.descIndex = descIndex;
    }
}

export class ConstModuleStruct implements deser {

    constructor() {}

    deserialize(buff: Buffer, env?: object, envArray?: object[]) {
        const {dat,len} = constModuleStruct().deserialize(buff);
        return {
            dat: new ConstModule(dat.nameIndex),
            len
        };
    }

}

export class ConstModule {
    nameIndex: number;

    constructor (nameIndex: number) {
        this.nameIndex = nameIndex;
    }
}

export class ConstPackageStruct implements deser {

    constructor() {}

    deserialize(buff: Buffer, env?: object, envArray?: object[]) {
        const {dat,len} = constPackageStruct().deserialize(buff);
        return {
            dat: new ConstPackage(dat.nameIndex),
            len
        };
    }

}

export class ConstPackage {
    nameIndex: number;

    constructor (nameIndex: number) {
        this.nameIndex = nameIndex;
    }
}

/**
 * All constant pool types, with their identifier
 */
export const constants = {
    1  : ConstUtf8Struct,
    3  : ConstIntegerStruct,
    4  : ConstFloatStruct,
    5  : ConstLongStruct,
    6  : ConstDoubleStruct,
    7  : ConstClassStruct,
    8  : ConstStringStruct,
    9  : ConstFieldrefStruct,
    10 : ConstMethodrefStruct,
    11 : ConstInterfaceMethodrefStruct,
    12 : ConstDescriptorStruct,
    15 : ConstMethodHandleStruct,
    16 : ConstMethodTypeStruct,
    17 : ConstDynamicStruct,
    18 : ConstInvokeDynamicStruct,
    19 : ConstModuleStruct, 
    20 : ConstPackageStruct, 
} as const;

/**
 * All of the constant types
 */
export type ConstantTypes = ReturnType<InstanceType<typeof constants[keyof typeof constants]>['deserialize']>['dat'];