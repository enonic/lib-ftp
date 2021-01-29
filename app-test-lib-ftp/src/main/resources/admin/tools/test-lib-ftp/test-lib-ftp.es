import { toStr } from '/lib/enonic/util';
import Ftp from '/lib/enonic/ftp';


const DEBUG = true;
const NAME = 'test-lib-ftp';
const TYPE = 'admin-tool';
const LOG_PREFIX = `${NAME} ${TYPE}`;


export function get(request) {
    const ftp = new Ftp({
        host: 'speedtest.tele2.net',
        username: 'anonymous',
        password: 'anonymous@example.com'
    }).connect().login();
    //ftp.getMListDir();
    const names = ftp.getNames(); DEBUG && log.debug(`${LOG_PREFIX} names:${toStr(names)}`);
    const fileContent = ftp.retrieveFile({ remote: '/1KB.zip' });
    ftp.logout().disconnect();

    return {
        body: {
            names,
            fileContent
        },
        contentType: 'application/json; charset=utf-8'
    }; // return
} // function get
