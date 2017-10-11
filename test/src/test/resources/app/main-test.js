var t = require('/lib/testing');
var Ftp = require('/lib/enonic/ftp');

t.test('test ftp.getNames()', function () {

    var ftp = new Ftp({
        host: 'speedtest.tele2.net',
        username: 'anonymous',
        password: 'anonymous@example.com'
    }).connect().login();
    var names = ftp.getNames();
    ftp.retrieveFile({ remote: '/1KB.zip' });
    ftp.logout().disconnect();
    t.assertEquals(names, 'Not Equal!');
    //t.assertEquals('Equal', 'Equal');
});
