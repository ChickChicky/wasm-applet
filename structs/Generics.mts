import { AttributeInfo } from "./AttributeInfo.mts";
import { ClassFile } from "./ClassFile.mts";
import { ConstantTypes, ConstUtf8 } from "./Constants.mts";
import { CPInfo } from "./CPInfo.mts";
import { FieldInfo } from "./FieldInfo.mts";
import { MethodInfo } from "./MethodInfo.mts";

export type ConstantPool = ConstantTypes[];

// TODO: Make a better integration
/*export interface ClassBindable {
    boundClass?: ClassFile;
}*/

export interface HasAttributes {
    attributes: AttributeInfo[];
}

export interface HasMethods {
    methods: MethodInfo[];
}

export interface HasFields {
    fields: FieldInfo[];
}

/**
 * retrieves an attribute inside an object
 * @param value The object to search the attribute into
 * @param constantPool The constant pool to retrieve the names
 * @param name The name of the attribute
 * @returns The attribute, or undefined if it could not be found
 */
export function getAttribute(value: HasAttributes, constantPool: ConstantPool, name: string) : AttributeInfo|undefined {
    for (const attr of value.attributes) {
        const attributeName = constantPool[attr.nameIndex-1];
        if (!(attributeName instanceof ConstUtf8))
            continue; // TODO: Issue a warning - either here, or in the ClassFile constructor
        if (attributeName.value != name)
            continue;
        return attr;
    }
}

/**
 * retrieves a method inside an object
 * @param value The object to search the attribute into
 * @param constantPool The constant pool to retrieve the names
 * @param name The name of the attribute
 * @param descriptor An optional descriptor to match against
 * @returns The method, or undefined if it could not be found
 */
export function getMethod(value: HasMethods, constantPool: ConstantPool, name: string, descriptor?: string) : MethodInfo|undefined {
    for (const method of value.methods) {
        const methodName = constantPool[method.nameIndex-1];
        if (!(methodName instanceof ConstUtf8))
            continue; // TODO: ^
        if (methodName.value != name)
            continue;
        if (descriptor) {
            const methodDescriptor = constantPool[method.descriptorIndex-1];
            if (!(methodDescriptor instanceof ConstUtf8))
                continue; // TODO: ^
            if (methodDescriptor.value != descriptor)
                continue;
        }
        return method;
    }
}

/**
 * retrieves a field inside an object
 * @param value The object to search the attribute into
 * @param constantPool The constant pool to retrieve the names
 * @param name The name of the attribute
 * @param descriptor An optional descriptor to match against
 * @returns The field, or undefined if it could not be found
 */
export function getField(value: HasFields, constantPool: ConstantPool, name: string, descriptor?: string) : FieldInfo|undefined {
    for (const method of value.fields) {
        const methodName = constantPool[method.nameIndex-1];
        if (!(methodName instanceof ConstUtf8))
            continue; // TODO: ^
        if (methodName.value != name)
            continue;
        if (descriptor) {
            const methodDescriptor = constantPool[method.descriptorIndex-1];
            if (!(methodDescriptor instanceof ConstUtf8))
                continue; // TODO: ^
            if (methodDescriptor.value != descriptor)
                continue;
        }
        return method;
    }
}