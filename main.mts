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

function invoke(env: any) {
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
            /*if (!(method instanceof CPMethodref))
                throw TypeError(`Expected CPMethodref, got ${repr(method)}`);
            
            const [field,...args] = stack.splice(0,stack.length);
            if (!(field instanceof CPFieldref))
                throw TypeError(`Expected CPFieldref, got ${repr(field)}`);

            const methodValue = env.globals.members[refPath(method)];
            if (!(methodValue instanceof GFunction))
                throw TypeError(`Expected GFunction, got ${repr(methodValue)}`);
            
            const thisValue = env.globals.members[refPath(field)];
            if (!(thisValue instanceof GInstance))
                throw TypeError(`Expected GInstance, got ${repr(thisValue)}`);
            
            stack.push(await env.invoke(methodValue,args,thisValue));*/
        }

        else if ( i.name == 'return' ) {
            return null;
        }
    }
    throw new Error('End of function reached without a return statement');
}

/*type Globals = GInstance | GFunction;
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
});*/

let body = '';
let alloc_vars: [string,boolean][] = [];

const DATA_FIELDREF = 0;
const DATA_STRING = 1;

function newvar(type: string) : number {
    for (let i = 0; i < alloc_vars.length; i++) {
        const v = alloc_vars[i];
        if (!v[1] && v[0] == type) {
            v[1] = true;
            return i;
        }
    }
    alloc_vars.push([type,true]);
    return alloc_vars.length-1;
}

function delvar(index: number) {
    alloc_vars[index][1] = false;
}

function resolveDataTypeId( data: ResolvedCPItem ) : number {
    if (data instanceof CPString)
        return DATA_STRING;
    throw new TypeError(`Unsupported constant type ${repr(data)}`);
}

function argumentCount( desc: string ) : number {
    let nargs = 0;
    while (desc.length) {
        if (desc.startsWith('[')) {
            desc = desc.slice(1);
        } else if (desc.startsWith('L')) {
            const len = desc.indexOf(';');
            desc = desc.slice(len+1);
            nargs++;
        } else if (desc.match(/^[ZBCSIJFD]/)) {
            desc = desc.slice(1);
            nargs++;
        } else {
            throw new SyntaxError(`Unsupported decriptor character '${desc[0]}'`);
        }
    }
    return nargs;
}

for (const i of dis) {
    if ( i.name == 'getstatic' ) {
        body += `i32.const ${(i.args.index<<16)|DATA_FIELDREF}\n`;
        // stack.push(classFile.resolveFieldref(i.args.index));
    }
    
    else if ( i.name == 'ldc' ) {
        body += `i32.const ${(i.args.index<<16)|resolveDataTypeId(classFile.resolve(i.args.index))}\n`;
        // stack.push(classFile.resolve(i.args.index));
    }
    
    else if ( i.name == 'invokevirtual' ) {
        const method = classFile.resolveMethodref(i.args.index);
        if (!(method instanceof CPMethodref))
            throw TypeError(`Expected CPMethodref, got ${repr(method)}`);
        
        const desc = method.desc.desc.match(/\(.+?\)/)?.[0];
        if (!desc)
            throw new TypeError(`Malformed descriptor`);
        const nargs = argumentCount(desc.slice(1,-1));
        const size = nargs*4;
        let vari = 0;
        if (nargs > 0) {
            vari = newvar('i32');
            const varj = newvar('i32');
            body += 
                `global.get 0\n` +
                `local.tee ${vari}\n` +
                `i32.const ${size}\n` + 
                `i32.add\n` + 
                `global.set 0\n`
            ;
            for (let i = 0; i < nargs; i++) {
                body += 
                    `local.set ${varj}\n` +
                    `local.get ${vari}\n` +
                    `local.get ${varj}\n` +
                    `i32.store\n` +
                    `local.get ${vari}\n` +
                    `i32.const 4\n` +
                    `i32.add\n` +
                    `local.set ${vari}\n`
                ;
            }
            body += `local.get ${vari}\n`;
            delvar(varj);
        } else {
            body += `i32.const 0\n`;
        }
        body += `i32.const ${i.args.index}\n`;
        body += `call 0\n`;
        if (nargs > 0) {
            delvar(vari);
            body += 
                `global.get 0\n` +
                `i32.const ${size}\n` + 
                `i32.sub\n` + 
                `global.set 0\n`
            ;
        }

        /*const [field,...args] = stack.splice(0,stack.length);
        if (!(field instanceof CPFieldref))
            throw TypeError(`Expected CPFieldref, got ${repr(field)}`);

        const methodValue = env.globals.members[refPath(method)];
        if (!(methodValue instanceof GFunction))
            throw TypeError(`Expected GFunction, got ${repr(methodValue)}`);
        
        const thisValue = env.globals.members[refPath(field)];
        if (!(thisValue instanceof GInstance))
            throw TypeError(`Expected GInstance, got ${repr(thisValue)}`);
        
        stack.push(await env.invoke(methodValue,args,thisValue));*/
    }

    else if ( i.name == 'return' ) {
        body += 'return\n';
    }
}

console.log(`(module  
  (import "env" "invokevirtual" (func (param i32) (param i32) (param i32)))
    
  (memory (export "stack") 1 1)
  (global (export "stack_pointer") (mut i32) (i32.const 0))

  (func (export "main")
    ${alloc_vars.map(([t])=>`(local ${t})`).join(' ')}
    ${body.replace(/\n/g,'\n    ')}
  )
)`);