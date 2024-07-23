import * as fs from 'node:fs';
import { ClassFileStruct, CPFieldref, CPMethodref, CPString, ResolvedCPItem } from './structs/ClassFile.mts';
import { decode } from './disasm.mts';
import { refPath, repr } from './util.mts';
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
}

/**
 * Represents a global class instance
 */
class GInstance {
    type: string;
    data: {[k:string]:StackValue};

    constructor (type: string, data: {[k:string]:StackValue}) {
        this.type = type;
        this.data = data;
    }
}

/**
 * Represents an execution frame, with a stack, arguments and the associated function
 */
class Frame {
    stack: StackValue[];
    args: StackValue[];
    func: GFunction;
    thisValue: GInstance|null;

    constructor (func: GFunction, args: StackValue[], thisValue: GInstance|null, stack?: StackValue[]) {
        this.func = func;
        this.args = args;
        this.thisValue = thisValue;
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
    async invoke(func: GFunction, args: StackValue[], thisValue: GInstance|null) : Promise<StackValue> {
        const stack: StackValue[] = [];
        const frame = new Frame(func,args,thisValue,stack);
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
                    
                    const methodValue = env.globals.members[refPath(method)];
                    if (!(methodValue instanceof GFunction))
                        throw TypeError(`Expected GFunction, got ${repr(methodValue)}`);
                    
                    const thisValue = env.globals.members[refPath(field)];
                    if (!(thisValue instanceof GInstance))
                        throw TypeError(`Expected GInstance, got ${repr(thisValue)}`);
                    
                    stack.push(await env.invoke(methodValue,args,thisValue));
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

type Globals = GInstance | GFunction;
type StackValue = ResolvedCPItem|null;
const globals = new GGlobal({
    'java.io.PrintStream.println' : new GFunction(async(env)=>{
        const frame = env.top();
        const [value] = frame.args;
        if (value instanceof CPString)
            console.log(value.value);
        else
            console.log(`\x1b[3mUnsupported print argument: ${repr(value)}\x1b[23m`);
        return null;
    }),
    'java.lang.System.out' : new GInstance('java.io.PrintStream',{}),
    ...Object.fromEntries(
        classFile.methods.map(
            method => {
                const code = method.getAttribute(classFile,'Code')?.resolve(classFile);
                if (!(code instanceof CodeAttribute))
                    return;
                return ['Main.'+classFile.resolveUtf8(method.nameIndex),new GFunction(code)];
            }
        ).filter(e=>e) as any // TODO: Fix this
    )
});

const mainFunc = globals.members['Main.main'];

if (!(mainFunc instanceof GFunction))
    throw TypeError(`Expected GFunction for Main.main, got ${repr(mainFunc)}`);

const env = new Env(globals);

env.invoke(mainFunc,[],null).then(
    res => {
        console.log('\x1b[92mFinished\x1b[39m:',res);
    }
);