import * as fs from 'node:fs';
import { ClassFileStruct, CPFieldref, CPMethodref, CPString, ResolvedCPItem } from './structs/ClassFile.mts';
import { decode } from './disasm.mts';
import { repr } from './util.mts';
import { CodeAttribute } from './structs/attributes/CodeAttribute.mts';

const rawClassFile = fs.readFileSync('./Main.class');

const classFile = new ClassFileStruct().deserialize(rawClassFile).dat;
// console.log(classFile);

const thisClass = classFile.resolveUtf8(classFile.thisClass.fqnIndex);
// console.log(thisClass);

const mainCode = classFile.getMethod('main','([Ljava/lang/String;)V')?.getAttribute(classFile,'Code')?.resolve(classFile);
// console.log(mainCode);

if (!mainCode)
    throw new TypeError(`Failed to find main function`);

const dis = decode(mainCode.code);
// console.log(dis);

function humanReadableDescriptorUtil_( desc: string ) : [number,string] {
    if (desc.startsWith('(')) {
        let i = 1;
        let v = '( ';
        while (desc[i] != ')') {
            const [len,val] = humanReadableDescriptorUtil_(desc.slice(i,));
            i += len;
            v += val + ( desc[i] == ')' ? ' )' : ', ' );
        }
        const [len,rt] = humanReadableDescriptorUtil_(desc[++i]);
        v += ' -> ' + rt;
        return [i+len,v];
    } else if (desc.startsWith('L')) {
        const len = desc.indexOf(';');
        return [len+1,desc.slice(1,len).replace(/\//g,'.')];
    } else if (desc.startsWith('V')) {
        return [1,'void'];
    } else {
        throw new SyntaxError(`Unsupported decriptor character '${desc[0]}'`);
    }
}

/**
 * Formats a descriptor to be more human-readable
 * @param desc The descriptor to format
 * @returns The formatted descriptor
 */
function humanReadableDescriptor( desc: string ) : string {
    return humanReadableDescriptorUtil_(desc)[1];
}

/**
 * Holds all of the global data
 */
class GGlobal {
    members: {[k:string]:Globals};

    constructor (members: typeof this.members) {
        this.members = members;
    }

    resolve( ...path: string[] ) : Globals|undefined {
        let node : Globals = this;
        for (const part of path) {
            if ('members' in node)
                node = node.members[part];
            if (!node)
                return undefined;
        }
        return node;
    }
}

/**
 * Represents a global class
 */
class GClass {
    members: {[k:string]:Globals};

    constructor (members: typeof this.members) {
        this.members = members;
    }
}

/**
 * Represents an execution frame, with a stack, arguments and the associated function
 */
class Frame {
    stack: StackValue[];
    args: StackValue[];
    func: GFunction;

    constructor (func: GFunction, args: StackValue[], stack?: StackValue[]) {
        this.func = func;
        this.args = args;
        this.stack = stack ? stack : [];
    }
}

/*
 * Represents an execution environment
 */
class Env {
    frames: Frame[];
    globals: GGlobal;

    constructor (globals: GGlobal) {
        this.globals = globals;
        this.frames = [];
    }

    /**
     * Invokes a function, and resolves whenever it finishes executing
     * @param func The function to be called
     * @param args The arguments that will be passed to the function
     * @returns The value returned from the function
     */
    async invoke(func: GFunction, args: StackValue[]) : Promise<StackValue> {
        const stack = [];
        const frame = new Frame(func,args,stack);
        this.frames.push(frame);
        const result = func.invoke(this);
        this.frames.pop();
        return result;
    }

    /**
     * @returns The last frame on the stack
     */
    top() : Frame {
        return this.frames[this.frames.length-1];
    }
}

class GFunction {
    code: CodeAttribute | ((env: Env) => Promise<StackValue>);

    constructor (code: typeof this.code) {
        this.code = code;
    }

    /**
     * Invokes the function
     * @param env The execution environment, it is expected to contain a frame at the top of its stack, that will be used by the callee
     * @returns A promise resolving whenever the execution is finished, with the return value of a function
     */
    async invoke(env: Env) : Promise<StackValue> {
        if (this.code instanceof CodeAttribute) {
            const frame = env.top();
            const {stack} = frame;
            for (const i of dis) {
                if ( i.name == 'getstatic' ) {
                    stack.push(classFile.resolveFieldref(i.args.index));
                }
                else if ( i.name == 'ldc' ) {
                    stack.push(classFile.resolve(i.args.index));
                }
                else if ( i.name == 'invokevirtual' ) {
                    const method = classFile.resolveMethodref(i.args.index);
                    if (!(method instanceof CPMethodref))
                        throw TypeError(`Expected CPMethodref, got ${repr(method)}`);
                    const [field,...args] = stack.splice(0,stack.length);
                    if (!(field instanceof CPFieldref))
                        throw TypeError(`Expected CPFieldref, got ${repr(field)}`);
                    for (let i = 0; i < args.length; i++) {
                        if (args[i] == null)
                            throw TypeError(`Argument #${i+1} is void`);
                    }
                    // console.log(
                    //     `Calling ${field.class.name.replace(/\//g,'.')}.${field.desc.name}.${method.desc.name}\n` +
                    //     `   ${humanReadableDescriptor(method.desc.desc)}`
                    // );
                    const func = env.globals.resolve(...field.class.name.split(/\//g),field.desc.name,method.desc.name);
                    if (!(func instanceof GFunction))
                        throw TypeError(`Expected GFunction, got ${repr(func)}`);
                    stack.push(await env.invoke(func,args));
                }
                else if ( i.name == 'return' ) {
                    return null;
                }
            }
            throw new Error('End of function reached without a return statement');
        } else
            return await this.code(env);
    }
}

type Globals = GClass | GFunction;
type StackValue = ResolvedCPItem|null;
const globals = new GGlobal({
    java : new GClass({
        lang : new GClass({
            System : new GClass({
                out : new GClass({
                    println : new GFunction(async(env)=>{
                        const frame = env.top();
                        const [value] = frame.args;
                        if (value instanceof CPString)
                            console.log(value.value);
                        else
                            console.log(`\x1b[3mUnsupported print argument: ${repr(value)}\x1b[23m`);
                        return null;
                    }),
                })
            })
        })
    }),
    Main : new GClass(
        Object.fromEntries(
            classFile.methods.map(
                method => {
                    const code = method.getAttribute(classFile,'Code')?.resolve(classFile);
                    if (!(code instanceof CodeAttribute))
                        return;
                    return [classFile.resolveUtf8(method.nameIndex),new GFunction(code)];
                }
            ).filter(e=>e) as any // TODO: Fix this
        )
    )
});

const mainFunc = globals.resolve('Main','main');

if (!(mainFunc instanceof GFunction))
    throw TypeError(`Expected GFunction for Main.main, got ${repr(mainFunc)}`);

const env = new Env(globals);

env.invoke(mainFunc,[]).then(
    res => {
        console.log('\x1b[92mFinished\x1b[39m:',res);
    }
);