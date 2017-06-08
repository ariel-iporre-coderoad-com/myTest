//var text =
//    "     0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f    0123456789abcdef\n" +
//    "00: 00 01 00 73 30 20 30 78 37 36 30 63 20 30 78 30    .?.s0 0x760c 0x0\n" +
//    "10: 20 30 78 66 39 36 63 20 30 78 37 66 64 35 20 73     0xf96c 0x7fd5 s\n" +
//    "20: 65 74 72 78 63 61 6c 69 62 72 61 74 69 6f 6e 0a    etrxcalibration?\n" +
//    "30: 31 20 30 78 37 37 31 38 20 30 78 30 20 30 78 65    1 0x7718 0x0 0xe\n" +
//    "40: 66 31 31 20 30 78 37 65 65 30 20 73 65 74 72 78    f11 0x7ee0 setrx\n" +
//    "50: 63 61 6c 69 62 72 61 74 69 6f 6e 0a 32 20 32 36    calibration?2 26\n" +
//    "60: 20 6d 61 63 73 65 74 70 61 72 61 6d 0a 5c 20 52     macsetparam?\ R\n" +
//    "70: 45 56 44 31 2e 32 0a ff ff ff ff ff ff ff 02 02    EVD1.2?.......??\n" +
//    "80: ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff    ................\n" +
//    "90: ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff    ................\n" +
//    "a0: ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff    ................\n" +
//    "b0: ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff    ................\n" +
//    "c0: ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff    ................\n" +
//    "d0: ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff    ................\n" +
//    "e0: ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff    ................\n" +
//    "f0: ff ff ff ff ff ff ff ff ff ff d8 80 39 67 a1 f0    ..........??9g??\n"
//console.log('text');
//console.log(text.replace(/\s+/g, ''));
//function decodeASCII(codeString) {
//    return codeString == ''? codeString : String.fromCharCode(parseInt('0x' + codeString));
//}
//
//var parsed = text.split('\n')
//    .reduce(function (acc, e) { return acc + e.substring(55, e.length);}, '')
//    .match(/REV(.*?)[0-9].[0-9]/)[0].substring(3);
//console.log(typeof parsed)
//console.log(parsed)

var generateUUID = function () {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

var asdfas =generateUUID();
console.log(asdfas)

var a = ["asdfasdfasdf","asdfasdf"];

console.log(a)

