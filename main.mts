import * as fs from 'node:fs';
import { ClassFileStruct, CPFieldref, CPMethodref, CPString, ResolvedCPItem } from './structs/ClassFile.mts';
import { decode } from './disasm.mts';
import { refPath, repr } from './util.mts';
import { CodeAttribute } from './structs/attributes/CodeAttribute.mts';
import { ConstantTypes, ConstClass, ConstDescriptor, ConstFieldref, ConstInteger, ConstMethodref, ConstString, ConstUtf8 } from './structs/Constants.mts';

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

let body = '';
let alloc_vars: [string,boolean][] = [];

const DATA_NULL = 0;
const DATA_FIELDREF = 1;
const DATA_STRING = 2;
const DATA_INTEGER = 3;
const DATA_HEAP = 4;

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

const idx = {
    global: { _: 0,

    },
    memory: { _: 0,

    },
    function : { _: 0,

    },
};

function sidx(kind: keyof typeof idx, name: string) : number {
    return idx[kind][name]=idx[kind]._++;
}

function gidx(name: string) : number {
    for (const i of Object.values(idx)) if (name in i) {
        return i[name];
    }
    throw new ReferenceError(`Undefined WASM variable '${name}'`);
}

const body_top = `
  (import (;${sidx('function','invokevirtual')};) "env" "invokevirtual" (func (param i32) (param i32) (param i32)))
  (memory (;${sidx('memory','constant_pool')};) (export "constant_pool") 1 1)
  (memory (;${sidx('memory','stack')};) (export "stack") 1 1)

  (global (;${sidx('global','stack_pointer')};) (export "stack_pointer") (mut i32) (i32.const 0))
  (global (;${sidx('global','local_0')};) (export "local_0") (mut i32) (i32.const 0))
  (global (;${sidx('global','local_1')};) (export "local_1") (mut i32) (i32.const 0))
  (global (;${sidx('global','local_2')};) (export "local_2") (mut i32) (i32.const 0))
  (global (;${sidx('global','local_3')};) (export "local_3") (mut i32) (i32.const 0))
`;

function encodeData(kind: number, data: number) : number {
    return (data << 8) | kind
}

for (const i of dis) {
    if ( i.name == 'getstatic' ) {
        body += `i32.const ${encodeData(DATA_FIELDREF, i.args.index)}\n`;
    }
    
    else if ( i.name == 'ldc' ) {
        body += `i32.const ${encodeData(resolveDataTypeId(classFile.resolve(i.args.index)), i.args.index)}\n`;
    }

    else if ( i.name == 'bipush' ) {
        classFile.constantPool.push(new ConstInteger(i.args.value));
        body += `i32.const ${encodeData(DATA_INTEGER, classFile.constantPool.length)}\n`;
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
                `global.get ${gidx('stack_pointer')}\n` +
                `local.tee ${vari}\n` +
                `i32.const ${size}\n` + 
                `i32.add\n` + 
                `global.set ${gidx('stack_pointer')}\n`
            ;
            for (let i = 0; i < nargs; i++) {
                body +=
                    `local.set ${varj}\n` +
                    `local.get ${vari}\n` +
                    `local.get ${varj}\n` +
                    `i32.store (memory ${gidx('stack')})\n` +
                    `local.get ${vari}\n` +
                    `i32.const 4\n` +
                    `i32.add\n` +
                    `local.set ${vari}\n`
                ;
            }
            delvar(varj);
        } else {
            body += `i32.const 0\n`;
        }
        body += 
            `i32.const ${i.args.index}\n` +
            `i32.const ${nargs}\n` +
            `call ${gidx('invokevirtual')}\n`
        ;
        if (nargs > 0) {
            delvar(vari);
            body +=
                `global.get ${gidx('stack_pointer')}\n` +
                `i32.const ${size}\n` + 
                `i32.sub\n` + 
                `global.set ${gidx('stack_pointer')}\n`
            ;
        }
    }

    else if ( i.name == 'aload_0' ) {
        body += `global.get ${gidx('local_0')}\n`;
    }

    else if ( i.name == 'aload_1' ) {
        body += `global.get ${gidx('local_1')}\n`;
    }

    else if ( i.name == 'aload_2' ) {
        body += `global.get ${gidx('local_2')}\n`;
    }

    else if ( i.name == 'aload_3' ) {
        body += `global.get ${gidx('local_3')}\n`;
    }

    else if ( i.name == 'return' ) {
        body += 'return\n';
    }
}

function encodeUint32(v: number) : Buffer {
    const b = Buffer.alloc(4);
    b.writeUint32LE(v);
    return b;
}

function encodeUint16(v: number) : Buffer {
    const b = Buffer.alloc(2);
    b.writeUint16LE(v);
    return b;
}

const constantPoolDataAddress = new Uint16Array(classFile.constantPool.length);
let constantData = Buffer.alloc(0);

for (let i = 0; i < classFile.constantPool.length; i++) {
    const data = classFile.constantPool[i];
    constantPoolDataAddress[i] = constantPoolDataAddress.byteLength+constantData.length;
    if (data instanceof ConstUtf8) {
        const buff = Buffer.from(data.value,'utf-8');
        constantData = Buffer.concat([constantData,encodeUint16(buff.length),buff]);
    }
    else if (data instanceof ConstString) {
        // TODO: Assign its adress to the referenced utf-8 constant
        constantPoolDataAddress[i] = data.dataIndex;
    }
    // TODO: (maybe?) Take all of the indices and serialize them
    else if (data instanceof ConstMethodref || data instanceof ConstFieldref) {
        constantData = Buffer.concat([constantData,encodeUint16(data.classIndex),encodeUint16(data.descIndex)]);
    }
    else if (data instanceof ConstClass) {
        constantPoolDataAddress[i] = data.fqnIndex;
    }
    else if (data instanceof ConstDescriptor) {
        constantData = Buffer.concat([constantData,encodeUint16(data.nameIndex),encodeUint16(data.descIndex)]);
    }
    else if (data instanceof ConstInteger) {
        constantData = Buffer.concat([constantData,encodeUint32(data.value)]);
    }
    else {
        console.log(`\x1b[93mwarn\x1b[39m: Unsupported constant type ${repr(data)}`);
    }
    // console.log(i,repr(data),constantPoolDataAddress[i]);
}

fs.writeFileSync('applet.wat',`(module  
  ${body_top}

  (data (memory ${gidx('constant_pool')}) (i32.const 0) "${Array.from(Buffer.concat([...Array.from(constantPoolDataAddress).map(a=>encodeUint16(a)),constantData])).map(b=>`\\${b.toString(16).padStart(2,'0')}`).join('')}")

  (func (export "main")
    ${alloc_vars.map(([t])=>`(local ${t})`).join(' ')}
    ${body.replace(/\n/g,'\n    ')}
  )
)`);