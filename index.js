/** @type {HTMLDivElement} */
const outDiv = document.querySelector('#out');

const DATA_NULL = 0;
const DATA_FIELDREF = 1;
const DATA_STRING = 2;
const DATA_INTEGER = 3;
const DATA_HEAP = 4;

function cpUtf8(index) {
    const idx = constantPool.getUint16((index-1)*2,true);
    const dataLength = constantPool.getUint16(idx,true);
    const data = new TextDecoder().decode(constantPool.buffer.slice(idx+2,idx+2+dataLength));
    return data;
}

function cpInteger(index) {
    const addr = constantPool.getUint16((index-1)*2,true);
    const value = constantPool.getUint16(addr,true);
    return value;
}

function cpString(index) {
    const idx = constantPool.getUint16((index-1)*2,true);
    return cpUtf8(idx);
}

function cpClass(index) {
    const idx = constantPool.getUint16((index-1)*2,true);
    return cpString(idx);
}

function cpDescriptor(index) {
    const idx = constantPool.getUint16((index-1)*2,true);
    const nameIndex = constantPool.getUint16(idx,true);
    const descIndex = constantPool.getUint16(idx+2,true);   
    return {
        name: cpUtf8(nameIndex),
        desc: cpUtf8(descIndex),
    };
}

function cpRef(index) {
    const idx = constantPool.getUint16((index-1)*2,true);
    const classIndex = constantPool.getUint16(idx,true);
    const descIndex = constantPool.getUint16(idx+2,true);
    return {
        class: cpString(classIndex),
        desc: cpDescriptor(descIndex),
    };
}

function cpData(d) {
    const {type,data} = decodeData(d);
    if (type == DATA_NULL) {
        return null;
    }
    if (type == DATA_FIELDREF) {
        return cpRef(data);
    }
    if (type == DATA_STRING) {
        return cpString(data);
    }
    if (type == DATA_INTEGER) {
        return cpInteger(data);
    }
    if (type == DATA_HEAP) {
        return heap[data];
    }
    throw new TypeError(`Unsupported data type ${type}`);
}

function encodeData(kind, data) {
    return (data << 8) | kind
}

function decodeData(d) {
    return {
        type:  d & 0xFF,
        data: d >> 8,
    };
}

class JPackage {
    constructor ( name, props ) {
        this.name = name;
        this.props = props;
    }

    get( key ) {
        return this.props[key];
    }
}

class JClass {
    constructor ( name, props ) {
        this.name = name;
        this.props = props;
    }

    get( key ) {
        return this.props[key];
    }
}

class JInstance {
    constructor ( name, className, props ) {
        this.name = name;
        this.className = className;
        this.props = props;
    }

    get( key ) {
        return this.props[key];
    }
}

class JFunction {
    constructor ( name, func ) {
        this.name = name;
        this.func = func;
    }
}

const javaEnv = new JPackage(null,{
    java: new JPackage('java',{
        lang: new JPackage('java.lang',{
            System: new JClass('java.lang.System',{
                out: new JInstance('java.lang.System.out','java.io.PrintStream',{
                    
                }),
                err: new JInstance('java.lang.System.err','java.io.PrintStream',{
                    err: true,
                }),
            }),
        }),
        io: new JPackage('java.io',{
            PrintStream: new JClass('java.io.PrintStream',{
                println: new JFunction('java.io.PrintStream.println',(thisValue,args)=>{
                    const el = document.createElement('span');
                    if (thisValue.props.err)
                        el.classList.add('color-red');
                    el.innerText = args.map(arg=>`${arg}`).join(' ')+'\n';
                    outDiv.append(el);
                }),
                print: new JFunction('java.io.PrintStream.print',(thisValue,args)=>{
                    const el = document.createElement('span');
                    if (thisValue.props.err)
                        el.classList.add('color-red');
                    el.innerText = args.map(arg=>`${arg}`).join(' ');
                    outDiv.append(el);
                })
            }),
        }),
    }),
});

/**
 * @typedef JObject
 * @type {JPackage|JClass|JFunction}
 */

/**
 * @param {string} path
 * @returns {JObject|null}
 */
function resolvePath( path ) {
    const parts = path.split(/\./g);
    let node = javaEnv;
    for (const part of parts) {
        if (!node)
            return null;
        node = node.get?.(part);
    }
    return node || null;
}

/**
 * @param {string} path
 * @returns string
 */
function normP( path ) {
    return path.replace(/\//g,'.');
}

/**
 * @param {ReturnType<cpRef>} ref
 * @returns {string}
 */
function refP( ref ) {
    return normP(ref.class)+'.'+ref.desc.name;
}

/**
 * @param {ReturnType<cpRef>} ref
 * @returns {JObject|null}
 */
function resolveRef( ref ) {
    return resolvePath(refP(ref));
}

const imports = {
    env : {
        invokevirtual( rawThisValue, methodIndex, nargs ) {
            console.log({stack,constantPool});
            const base = stackPointer.value-nargs*4;
            const rawArgs = Array(nargs).fill().map((_,i)=>stack.getUint32(base+i*4,true));
            const args = rawArgs.map(cpData);
            const method = cpRef(methodIndex);
            const thisValue = cpData(rawThisValue);
            const resolvedMethod = resolveRef(method);
            if (!resolvedMethod)
                throw new ReferenceError(`Could not resolve method (${refP(method)})`);
            if (!(resolvedMethod instanceof JFunction))
                throw new TypeError(`Method is not of type JFunction (got ${resolvedMethod.constructor.name})`);
            const resolvedThis = resolveRef(thisValue);
            if (!resolvedThis)
                throw new ReferenceError(`Could not resolve this (${refP(thisValue)})`);
            resolvedMethod.func(resolvedThis,args);
        }
    }
};

/** @type {WebAssembly.Module} */
var module;
/** @type {WebAssembly.Instance} */
var instance;

/** @type {DataView} */
var constantPool;
/** @type {DataView} */
var stack;

/** @type {WebAssembly.Global} */
var stackPointer;

var heap = {
    0 : [ "hello", " world!" ]
};

fetch('applet.wasm')
    .then(result=>result.arrayBuffer())
    .then(
        async rawModule => {
            const wasm = await WebAssembly.instantiate(rawModule,imports);
            ({module,instance}=wasm);
            stackPointer = instance.exports.stack_pointer;
            stack = new DataView(instance.exports.stack.buffer);
            constantPool = new DataView(instance.exports.constant_pool.buffer);
            instance.exports.local_0.value = encodeData(DATA_HEAP, 0);
            instance.exports.main();
        }
    )
;