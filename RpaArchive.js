
class RpaArchive {
    /** @type {Blob} */
    handle; 
    /** @type {DataView} */
    headerHandle;
    /** @type {number} */
    version; 
    /** @type {number} */
    key; 
    files = {}; indexes = {}; initialOffset = 0; 
    indexOffset = 0;
    /**
     * An index is a 3-tuple of (`offset` from start of file,`size` in bytes, `prefix` currently unsupported.).
     * @typedef {Array<*> & { 0: BigInt, 1: number, 2: string, length: 3 }} Index
     */

    /**
     * @param {Blob} file The RPA archive file.
     * @param {(string) => void} status An optional callback to report status.
     * @param {number} [key] The RPA archive key. Only for version >= 3.
     */
    constructor(file,status,key) {
        this.key = key || 0xDEADBEEF
        if (!file) throw new Error("must give file!")
        this.ready = this.load(file,status)
        this.status = status
    }
    /**
     * Gets the version from the RPA archive.
     * @returns {number}
     */
    getVersion() {
        if (this.headerHandle.getUint32(0) != 1380991277) {
            throw new Error("given file is not a valid Ren'py archive")
        }
        var majorVersion = this.headerHandle.getUint8(4) - 0x30
        var minorVersion = this.headerHandle.getUint8(6) - 0x30
        var v = majorVersion + (minorVersion / 10)
        return v
    }
    /**
     * Extracts the indexes from a RPA archive.
     * @returns {Promise<Object.<string, Index>>>
     */
    async extractIndexes() {
        console.groupCollapsed("[rpa] Extracting indexes...")
        console.time("Extract indexes");
        this.indexes = undefined
        if (this.status) await this.status("Reading metadata")

        var metadata = this.headerHandle.getStringNT(0,"ASCII",10)
        var vals = metadata.split(" ")
        this.indexOffset = parseInt(vals[1],16)
        console.debug("Metadata is read as",metadata, ", indexOffset being",this.indexOffset)
        
        if (this.version >= 3) {
            if (this.status) await this.status("Reading key")
            this.key = 0
            for (var subkey of vals.slice(this.version >= 3.2 ? 3 : 2)) {
                this.key ^= parseInt(subkey,16)
            }
            console.debug("Read key as",this.key)
        }
        if (this.status) await this.status("Reading handles data")
        var handles = new Uint8Array(await this.handle.slice(this.indexOffset).arrayBuffer())
        console.debug("Handles data",handles)
        if (this.status) await this.status("Decompressing handles")
        var inflate = new Zlib.Inflate(handles)
        /** @type {Uint8Array} */
        var contents = inflate.decompress()
        console.debug("De-zlibbed!",contents)

        

        if (this.status) await this.status("Parsing handles")
        


        this.indexes = Pickle.loads(contents)
        console.debug("De-pickled!",this.indexes)
        if (this.version >= 3) {
            if (this.status) await this.status("Deobfuscating handles")
            var bigintKey = BigInt(this.key);
            for (var i in this.indexes) {
                for (var ii of this.indexes[i]) {
                    ii[0] = ii[0] ^ bigintKey
                    ii[1] = ii[1] ^ this.key
                }
            }
        }
        console.timeEnd("Extract indexes");
        if (this.status) await this.status("Done extracting indexes!")
        console.groupEnd("[rpa] Extracting indexes...")
        return this.indexes
    }
    /**
     * Loads an RPA Archive from a blob.
     * @param {Blob} file The RPA archive file.
     * @returns {void}
     */
    async load(file) {
        this.files = []
        this.handle = file
        if (this.status) await this.status("Reading header")
        this.headerHandle = await new DataView(
            await (this.handle.slice(0,42)).arrayBuffer()
        );
        if (this.status) await this.status("Reading version")
        this.version = this.getVersion()
        if (this.status) await this.status("Extracting indexes")
        this.indexes = await this.extractIndexes()
        if (this.status) await this.status("Done!")
    } 
    /**
     * Returns a list of the files in the RPA archive.
     * @returns {Promise<Array<{name: string, size: number, offset:BigInt}>>}
     */
    list() {
        return Object.keys(this.indexes).map((k) => ({name:k,size:this.indexes[k][0][1], offset: this.indexes[k][0][0]}))
    }
    /**
     * Reads a file in the archive
     * @param {string | {name: string}} filename The name of the file to read.
     * @returns {Promise<Blob>}
     */
    read(filename) {
        if (filename.name) filename = filename.name
        if (!this.indexes[filename]) throw new Error("file does not exist in archive");
        var index = this.indexes[filename][0]
        var offset = Number(index[0])
        var size = Number(index[1])
        var prefix = index[2] || ''

        if (prefix.length > 1 ) console.warn("Prefixes are not supported, expect some fuckiness!")
        console.debug(offset,size)
        var file = this.handle.slice(offset,offset+size)
        return file

    }
}