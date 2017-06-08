



// var regEx = new RegExp('([0-9]+ (cat|fish))','g'), sampleString="1 cat and 2 fish";
// var result = sampleString.match(regEx);
// console.log(JSON.stringify(result));
// // ["1 cat","2 fish"]

// var reg = new RegExp('[0-9]+ (cat|fish)','g'), sampleString="1 cat and 2 fish";
// while ((result = reg.exec(sampleString)) !== null) {
//     console.dir(JSON.stringify(result))
// };
// // '["1 cat","cat"]'
// // '["2 fish","fish"]'

// var reg = new RegExp('([0-9]+ (cat|fish))','g'), sampleString="1 cat and 2 fish";
// while ((result = reg.exec(sampleString)) !== null){
//     console.dir(JSON.stringify(result))
// };
// // '["1 cat","1 cat","cat"]'
// // '["2 fish","2 fish","fish"]'c


var sampleString = "U-Boot 2010.12-svn57819 (Mar 22 2017 - 17:42:50)";
//var sampleString = "A question begin about [managing code end( reposbeginitory ]stend(ructure";
var regEx =  new RegExp('svn.*?\\d+', 'g');
var result = sampleString.match(regEx);
var str = result[0];
var version = str.substring(3, str.length);
console.log("------> version " + version);

var regEx =  new RegExp('\\(.*?\\)', 'g');
var result = sampleString.match(regEx);
var str = result[0];
console.log("str " +  str);
console.log(str.substring(1, str.length-1).replace(/-/,''));
var date1 = Date.parse(str.substring(1, str.length-1).replace(/-/,''));
var date2 = new Date(str.substring(1, str.length-1).replace(/-/,''));
var date3 = new Date(result);

console.log("=====> date1: " + date1);
console.log("=====> date2: " + date2);
console.log("=====> date3: " + date3);


