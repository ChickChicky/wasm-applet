import { struct, struct_description, StructResult, u16, u8 } from "./struct.mts";

/**
 * All of the instructions, with their code, name, and arguments
 */
const opcodes = [
    { code: 0xB2,
        name: 'getstatic',
        args: () => new struct({
            index: new u16(),
        }),
    },
    { code: 0x12,
        name: 'ldc',
        args: () => new struct({
            index: new u8(),
        }),
    },
    { code: 0xB6,
        name: 'invokevirtual',
        args: () => new struct({
            index: new u16(),
        }),
    },
    { code: 0xB1,
        name: 'return',
    },
    { code: 0x10,
        name: 'bipush',
        args: () => new struct({
            value: new u8(),
        }),
    },
    { code: 0x2A,
        name: 'aload_0',
    },
    { code: 0x2B,
        name: 'aload_1',
    },
    { code: 0x2C,
        name: 'aload_2',
    },
    { code: 0x2D,
        name: 'aload_3',
    },
] as const;

/**
 * Obtain the items of an objects
 */
type Items<T> = T[keyof T];

/**
 * An operation created by {@link decode}
 */
type Operation = Items<{
    [V in typeof opcodes[number] as number]: {
        name: V['name'],
        args: V extends {args:()=>struct<any>}
            ? ReturnType<ReturnType<V['args']>['deserialize']>['dat']
            : null,
    }
}>;

/**
 * Decodes Java bytecode
 * @param code The raw bytecode data, from a {@link CodeAttribute}
 * @returns The decoded bytecode
 */
export function decode(code: Buffer) : Operation[] {
    let ptr = 0;

    const instructions: Operation[] = [];

    while (ptr < code.length) {
        const opcode = code[ptr++];

        const instruction = opcodes.find(i=>i.code==opcode);
        
        if (!instruction)
            throw new TypeError(`Unknown instruction ${opcode} (0x${opcode.toString(16).padStart(2,'0')})`);

        let args: StructResult<any> | null = null;
        if ('args' in instruction) {
            const {dat,len} = instruction.args().deserialize(code.subarray(ptr,));
            ptr += len;
            args = dat;
        }

        instructions.push({
            name: instruction.name,
            args
        } as any); // TODO: Fix this
    }

    return instructions;
}