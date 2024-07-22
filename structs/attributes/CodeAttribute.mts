import { AttributeInfo, AttributeInfoStruct } from "../AttributeInfo.mts";
import { struct, arr, u8, u16, u32, deser } from "../../struct.mts";

export class CodeAttributeStruct implements deser {

    static struct = () => new struct({
        maxStack: new u16(),
        maxLocals: new u16(),
        codeLength: new u32(),
        code: new arr( ()=>new u8() ),
        exceptionTableLength: new u16(),
        exceptionTable: new arr( 
            () => new struct({ 
                startPc: new u16(), 
                endPc: new u16(), 
                handlerPc: new u16(), 
                catchType: new u16() 
            })
        ),
        attributesCount: new u16(),
        attributes: new arr( ()=>new AttributeInfoStruct() )
    });

    constructor () {}

    deserialize(buff: Buffer, env?: object, envArray?: object[]) {
        const {dat,len} = CodeAttributeStruct.struct().deserialize(buff);
        return {
            dat: new CodeAttribute(dat.maxStack,dat.maxLocals,Buffer.from(dat.code),dat.exceptionTable,dat.attributes),
            len
        };
    }

}

type ExceptionTable = {
    startPc: number;
    endPc: number;
    handlerPc: number;
    catchType: number;
}[];

export class CodeAttribute {
    maxStack: number;
    maxLocals: number;
    code: Buffer;
    exceptionTable: ExceptionTable;
    attributes: AttributeInfo[];
    // Implement sub-attributes:
    // lineNumberTable?: {startPc:number,lineNumber:number}[]

    constructor (maxStack: number, maxLocals: number, code: Buffer, exceptionTable: ExceptionTable, attributes: AttributeInfo[]) {
        this.maxStack = maxStack;
        this.maxLocals = maxLocals;
        this.code = code;
        this.exceptionTable = exceptionTable;
        this.attributes = attributes;
    }
}