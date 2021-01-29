import { toStr } from '/lib/util';
import { newStream, readText } from '/lib/xp/io';


const INFO = true;
const DEBUG = true;
const TRACE = true;

const NAME = 'ftp';
const TYPE = 'lib';
const LOG_PREFIX = `${NAME} ${TYPE}`;

const ERROR_REFUSED = 'FTP server refused connection.';
const ERROR_LOGIN   = 'Could not login';

const ByteArrayOutputStream = Java.type('java.io.ByteArrayOutputStream');
const OutputStream          = Java.type('java.io.OutputStream');
const Charset               = Java.type('java.nio.charset.Charset');
const Arrays                = Java.type('java.util.Arrays');
const HashSet               = Java.type('java.util.HashSet');
const FTP                   = Java.type('org.apache.commons.net.ftp.FTP');
const FTPClient             = Java.type('org.apache.commons.net.ftp.FTPClient');
const FTPReply              = Java.type('org.apache.commons.net.ftp.FTPReply');

export default class Ftp {

    /** Create an instance of the Ftp class.
     * @class Ftp
     * @param {Object} params
     * @param {string} params.host - Which host to connect to.
     * @param {number} [params.port=__client.getDefaultPort()] - Typically 21
     * @param {string} [params.username=''] -
     * @param {string} [params.password=''] -
     * @param {boolean} [params.binaryTransfer=true] - Use binaryTransfer?
     * @param {boolean} [params.hidden=false] -
     * @param {boolean} [params.localActive=false] - False means to use passive mode.
     * @param {boolean} [params.useEpsvWithIPv4=false] -
     * @param {number} [params.keepAliveTimeout=-1] -
     * @param {number} [params.controlKeepAliveReplyTimeout=-1] -
     * @param {string} [params.encoding=null] -
     * @return {Ftp} - Instance of the ftp class
     */
    constructor({
        // Required
        host,
        // Optional
        __client = new FTPClient,
        port     = __client.getDefaultPort(),
        username = '',
        password = '',
        // Options
        binaryTransfer  = true,
        hidden          = false,
        localActive     = false, // aka passive = true
        useEpsvWithIPv4 = false,
        keepAliveTimeout = -1,
        controlKeepAliveReplyTimeout = -1,
        encoding = null // https://wiki.filezilla-project.org/Character_Encoding
    }) {
        this.host = host;
        this.port = port;
        this.username = username;
        this.password = password;
        this.binaryTransfer = binaryTransfer;
        this.localActive    = localActive;
        this.useEpsvWithIPv4 = useEpsvWithIPv4;
        DEBUG && log.debug(`${LOG_PREFIX} constructor() ${toStr({
            host,
            port,
            username,
            password
        })}`);
        if (keepAliveTimeout >= 0) { __client.setControlKeepAliveTimeout(keepAliveTimeout); }
        if (controlKeepAliveReplyTimeout >= 0) { __client.setControlKeepAliveReplyTimeout(controlKeepAliveReplyTimeout); }
        if (encoding != null) { __client.setControlEncoding(encoding); }
        __client.setListHiddenFiles(hidden);
        this.__client = __client;
    } // constructor

    /**
     * Disconnect from the ftp server you are connected too.
     * @method Ftp#disconnect
     * @return {Ftp} - Instance of the ftp class
     */
    disconnect() {
        DEBUG && log.debug(`${LOG_PREFIX} disconnect()`);
        this.__client.disconnect();
        return this; // Chainable
    } // disconnect

    /**
     * Logout from the ftp server you are connected too.
     * @method Ftp#logout
     * @return {Ftp} - Instance of the ftp class
     */
    logout() {
        DEBUG && log.debug(`${LOG_PREFIX} logout()`);
        this.__client.logout
        return this; // Chainable
    } // logout

    /**
     * Login on the ftp server you are connected too.
     * @method Ftp#login
     * @return {Ftp} - Instance of the ftp class
     */
    login() {
        DEBUG && log.debug(`${LOG_PREFIX} login(${toStr({
            username: this.username,
            password: this.password
        })})`);
        if(!this.__client.login(this.username, this.password)) {
            this.logout();
            throw new Error(ERROR_LOGIN);
        }
        DEBUG && log.debug(`${LOG_PREFIX} login() systemType:${toStr(this.__client.getSystemType())}`);
        if (this.binaryTransfer) {
            this.__client.setFileType(FTP.BINARY_FILE_TYPE);
        } else {
            // in theory this should not be necessary as servers should default to ASCII, but they don't all do so - see NET-500
            this.__client.setFileType(FTP.ASCII_FILE_TYPE);
        }
        if (this.localActive) {
            this.__client.enterLocalActiveMode();
        } else {
            this.__client.enterLocalPassiveMode();
        }
        this.__client.setUseEPSVwithIPv4(this.useEpsvWithIPv4);
        return this; // Chainable
    } // login

    /**
     * Connect to the ftp server using the params set during Ftp object construction.
     * @method Ftp#connect
     * @return {Ftp} - Instance of the ftp class
     */
    connect() {
        DEBUG && log.debug(`${LOG_PREFIX} connect() ${toStr({
            host: this.host,
            port: this.port
        })}`);
        try {
            this.__client.connect(this.host, this.port);
            INFO && log.info(`Connected to ${this.host} on ${this.port}`);
            if (!FTPReply.isPositiveCompletion(this.__client.getReplyCode())) {
                this.disconnect();
                throw new Error(ERROR_REFUSED);
            }
        } catch(e) {
            if(e.message === ERROR_REFUSED) { throw e; }
            log.error(`${LOG_PREFIX} connect() catch e.message:${toStr(e.message)} e.name:${toStr(e.name)} e:${toStr(e)}`);
            throw e;
            //isConnected()
        }
        return this; // Chainable
    } // connect

    /**
     * Retrieve a file from the ftp server.
     * @method Ftp#retrieveFile
     * @param {Object} params
     * @param {string} params.remote - Path on the ftp server.
     * @return {string} - Contents of the file as text
     */
    retrieveFile({
        remote
    }) {
        TRACE && log.debug(`${LOG_PREFIX} retrieveFile({ remote: ${toStr(remote)} })`);
        let stream = new ByteArrayOutputStream(); // The buffer capacity is initially 32 bytes, though its size increases if necessary.
        this.__client.retrieveFile(remote, stream); // Cannot cast com.google.common.io.ByteSource$ByteArrayByteSource to java.io.OutputStream (java.lang.RuntimeException)
        stream.close();
        DEBUG && log.info(`${LOG_PREFIX} retrieveFile({ remote: ${toStr(remote)} }) size:${toStr(stream.size())}`);
        const text = stream.toString(); // ISO-8859-1
        //const text = stream.toString(new Charset('UTF-8', [])); // ISO-8859-1
        TRACE && log.info(`${LOG_PREFIX} retrieveFile text:${toStr(text)}`);
        //const text = readText(stream);
        //log.info(`${LOG_PREFIX} retrieveFile() text:${toStr(text)}`);
        return text;
        //this.__client.noop(); // check that control connection is working OK
    } // retrieveFile


    // https://tools.ietf.org/html/rfc3659#page-23
    // Listings for Machine Processing
    // The MLST and MLSD commands are intended to standardize the file and
    //  directory information returned by the server-FTP process.
    // These commands differ from the LIST command in that the format of the
    //  replies is strictly defined although extensible.
    // MLSD lists the contents of a directory if a directory is named,
    //  otherwise a 501 reply is returned.
    getMListDir({
        remote = '/',
        displayTimeZoneId
    } = {}) {
        TRACE && log.info(`${LOG_PREFIX} mlistDir({ remote: ${toStr(remote)}, displayTimeZoneId: ${toStr(displayTimeZoneId)} })`);
        let dirList = __.toNativeObject(new HashSet(this.__client.mlistDir(remote)));
        DEBUG && log.info(`${LOG_PREFIX} mlistDir() dirList:${toStr(dirList)}`);
        /*while (true) {
            const f = this.__client.mlistDir(remote);
            if(!f) { break };
            const file = {
                rawListing: f.getRawListing(),
                formattedString: f.toFormattedString(displayTimeZoneId)
            };
            log.info(`${LOG_PREFIX} mlistDir({ remote: ${toStr(remote)} }) file: ${file}`);
            dirList.push(file);
        }*/
        return dirList;
    } // getMListDir


    // https://stackoverflow.com/questions/11986593/java-how-to-convert-string-to-list-or-set
    /**
     * Get a list of files on a path on the ftp server.
     * @method Ftp#getNames
     * @param {Object} params
     * @param {string} params.remote - Path on the ftp server.
     * @return {Array<string>} -
     */
    getNames({
        remote = '/'
    } = {}) {
        TRACE && log.info(`${LOG_PREFIX} getNames({ remote: ${toStr(remote)} })`);
        const names = __.toNativeObject(Arrays.asList(this.__client.listNames(remote)));
        DEBUG && log.info(`${LOG_PREFIX} getNames({ remote: ${toStr(remote)} }) names:${toStr(names)}`);
        return names;
    } // getNames


    // Do this last because it changes the client
    //listFiles() {
    //} // listFiles


} // export default class Ftp
