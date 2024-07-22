import { arr, deser, struct, u16, u32 } from "../struct.mts";
import { repr } from "../util.mts";
import { AttributeInfo, AttributeInfoStruct } from "./AttributeInfo.mts";
import { ConstantTypes, ConstClass, ConstDescriptor, ConstFieldref, ConstMethodref, ConstString, ConstUtf8 } from "./Constants.mts";
import { CPInfo } from "./CPInfo.mts";
import { FieldInfo, FieldInfoStruct } from "./FieldInfo.mts";
import { getAttribute, getField, getMethod } from "./Generics.mts";
import { MethodInfo, MethodInfoStruct } from "./MethodInfo.mts";

export class ClassFileStruct implements deser {

    static struct = () => new struct({

        magic: new u32(),
        minorVersion: new u16(),
        majorVersion:  new u16(),
        constantPoolCount: new u16(),
        constantPool: new arr( ()=>new CPInfo(), env=>env.constantPoolCount-1 ),
    
        accessFlags: new u16(),
        thisClass: new u16(),
        superClass: new u16(),
    
        interfacesCount: new u16(),
        interfaces: new arr( ()=>new u16() ),
    
        fieldsCount: new u16(),
        fields: new arr( ()=>new FieldInfoStruct() ),
    
        methodsCount: new u16(),
        methods: new arr( ()=>new MethodInfoStruct() ),
    
        attributesCount: new u16(),
        attributes: new arr( ()=>new AttributeInfoStruct() )
    
    });

    constructor() {}

    deserialize(buff: Buffer, env?: object, envArray?: object[]) {
        const {dat,len} = ClassFileStruct.struct().deserialize(buff);
        return {
            dat: new ClassFile({minor:dat.minorVersion,major:dat.majorVersion},dat.constantPool,dat.accessFlags,dat.thisClass,dat.superClass,dat.interfaces,dat.fields,dat.methods,dat.attributes),
            len
        };
    }

}

export type JavaVersion = { minor: number; major: number; };

export class CPString {
    value: string;

    constructor (value: string) {
        this.value = value;
    }
}

export class CPDescriptor {
    name: string;
    desc: string;

    constructor (name: string, desc: string) {
        this.name = name;
        this.desc = desc;
    }
}

export class CPClass {
    name: string;

    constructor (name: string) {
        this.name = name;
    }
}

export class CPFieldref {
    class: CPClass;
    desc: CPDescriptor;

    constructor (class_: CPClass, desc: CPDescriptor) {
        this.class = class_;
        this.desc = desc;
    }
}

export class CPMethodref {
    class: CPClass;
    desc: CPDescriptor;

    constructor (class_: CPClass, desc: CPDescriptor) {
        this.class = class_;
        this.desc = desc;
    }
}

export type ResolvedCPItem = CPString | CPDescriptor | CPClass | CPFieldref;

export class ClassFile {
    version: JavaVersion;
    constantPool: ConstantTypes[];
    accessFlags: number;
    thisClass: ConstClass;
    superClass: ConstClass;
    interfaces: ConstUtf8[];
    fields: FieldInfo[];
    methods: MethodInfo[];
    attributes: AttributeInfo[];

    constructor (version: JavaVersion, constantPool: ConstantTypes[], accessFlags: number, thisClass: number, superClass: number, interfaces: number[], fields: FieldInfo[], methods: MethodInfo[], attributes: AttributeInfo[]) {
        this.version = version;
        this.constantPool = constantPool;
        this.accessFlags = accessFlags;
        this.fields = fields;
        this.methods = methods;
        this.attributes = attributes;
        
        const thisClassRef = constantPool[thisClass-1];
        if (!(thisClassRef instanceof ConstClass))
            throw TypeError(`Expected ConstClass type for thisClass, got ${repr(thisClassRef)}`);
        this.thisClass = thisClassRef;

        const superClassRef = constantPool[superClass-1];
        if (!(superClassRef instanceof ConstClass))
            throw TypeError(`Expected ConstClass type for superClass, got ${repr(superClassRef)}`);
        this.superClass = superClassRef;

        this.interfaces = [];
        for (const idx of interfaces) {
            const int = constantPool[idx];
            if (!(int instanceof ConstUtf8))
                throw TypeError(`Expected ConstUtf8 type for interface, got ${repr(int)}`);
            this.interfaces.push(int);
        }

        /*for (const method of this.methods)
            method.boundClass = this;

        for (const field of this.fields)
            field.boundClass = this;*/
    }

    // TODO: Add a getConstant method with an optionnal type constraint

    /*resolve<T extends ConstantTypes>( index: number, t: T ) : T {
        const val = this.constantPool[index-1];
        if (!(val instanceof t))
    }*/

    /**
     * Resolves a value from the constant pool with an unknown type
     * @param index The index in the constant pool
     */
    resolve( index: number ) : ResolvedCPItem {
        const val = this.constantPool[index-1];
        // TODO: Extract all of the resolve-s into a centralized thing
        if (val instanceof ConstString)     return this.resolveString(index);
        if (val instanceof ConstDescriptor) return this.resolveDescriptor(index);
        if (val instanceof ConstClass)      return this.resolveClass(index);
        if (val instanceof ConstFieldref)   return this.resolveFieldref(index);
        if (val instanceof ConstMethodref)  return this.resolveMethodref(index);
        throw TypeError(`Unsupported resolve type ${repr(val)}`);
    }

    /**
     * Resolves an utf8 string in the constant pool
     * @param index The index in the constant pool
     */
    resolveUtf8( index: number ) : string {
        const val = this.constantPool[index-1];
        if (!(val instanceof ConstUtf8))                             // TODO:
            throw TypeError(`Expected ConstUtf8, got ${repr(val)}`); // Make this into a generic function
        return val.value;
    }

    /**
     * Resolves a string constant in the constant pool
     * @param index The index in the constant pool
     */
    resolveString( index: number ) : CPString {
        const val = this.constantPool[index-1];
        if (!(val instanceof ConstString))
            throw TypeError(`Expected ConstString, got ${repr(val)}`);
        return new CPString(this.resolveUtf8(val.dataIndex));
    }

    /**
     * Resolves a descriptor constant in the constant pool
     * @param index The index in the constant pool
     */
    resolveDescriptor( index: number ) : CPDescriptor {
        const val = this.constantPool[index-1];
        if (!(val instanceof ConstDescriptor))
            throw TypeError(`Expected ConstDescriptor, got ${repr(val)}`);
        return new CPDescriptor(
            this.resolveUtf8(val.nameIndex),
            this.resolveUtf8(val.descIndex)
        );
    }

    /**
     * Resolves a class constant in the constant pool
     * @param index The index in the constant pool
     */
    resolveClass( index: number ) : CPClass {
        const val = this.constantPool[index-1];
        if (!(val instanceof ConstClass))
            throw TypeError(`Expected ConstClass, got ${repr(val)}`);
        return new CPClass(
            this.resolveUtf8(val.fqnIndex),
        );
    }

    /**
     * Resolves a field reference constant in the constant pool
     * @param index The index in the constant pool
     */
    resolveFieldref( index: number ) : CPFieldref {
        const val = this.constantPool[index-1];
        if (!(val instanceof ConstFieldref))
            throw TypeError(`Expected ConstFieldref, got ${repr(val)}`);
        return new CPFieldref(
            this.resolveClass(val.classIndex),
            this.resolveDescriptor(val.descIndex)
        );
    }

    /**
     * Resolves a method reference constant in the constant pool
     * @param index The index in the constant pool
     */
    resolveMethodref( index: number ) : CPMethodref {
        const val = this.constantPool[index-1];
        if (!(val instanceof ConstMethodref))
            throw TypeError(`Expected ConstMethodref, got ${repr(val)}`);
        return new CPMethodref(
            this.resolveClass(val.classIndex),
            this.resolveDescriptor(val.descIndex)
        );
    }

    /**
     * retrieves an attribute that has the provided name
     * @param name The name of the attribute
     */
    getAttribute(name: string) : AttributeInfo|undefined {
        return getAttribute(this,this.constantPool,name);
    }

    /**
     * retrieves an field that has the provided name, and optionally, the same descriptor
     * @param name The name of the field
     * @param descriptor The descriptor to match against
     */
    getField(name: string, descriptor?: string) : FieldInfo|undefined {
        return getField(this,this.constantPool,name,descriptor);
    }

    /**
     * retrieves a method that has the provided name, and optionally, the same descriptor
     * @param name The name of the method
     * @param descriptor The descriptor to match against
     */
    getMethod(name: string, descriptor?: string) : MethodInfo|undefined {
        return getMethod(this,this.constantPool,name,descriptor);
    }
}