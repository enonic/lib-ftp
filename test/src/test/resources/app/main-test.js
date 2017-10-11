var t = require('/lib/testing');
var Ftp = require('/lib/enonic/ftp');

t.test('test ftp.getNames()', function () {

    try {
        var ftp = new Ftp({
            host: 'speedtest.tele2.net',
            username: 'anonymous',
            password: 'anonymous@example.com'
        }); // Gives jdk.nashorn.internal.runtime.ECMAException
        ftp.connect().login();
        var names = ftp.getNames();
        ftp.retrieveFile({ remote: '/1KB.zip' });
        ftp.logout().disconnect();
        t.assertEquals(names, 'Not Equal!');
    } catch (e) {
        log.error(e.message); // This log message doesn't go anywhere yet.
        t.assertEquals('Equal', 'Not equal');
    }
});
