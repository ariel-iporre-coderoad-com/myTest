/**
 * Created by ariel on 5/29/17.
 */
const Q = require('q');

var PromiseArray = function (endAction, validation, invalidAction, atomicAction) {
    var promiseVector = [];
    var endAction = endAction;
    var validation = validation;
    var invalidAction = invalidAction;
    var atomicAction = atomicAction;
    var counter = 0;

    function createEvent(input) {
        var deferred = Q.defer();
        var p = deferred.promise;
        promiseVector.push(p);
        counter = counter + 1;
        var timer = setTimeout(function () {
            counter = counter - 1
            return validation(input).then(function () {
                return atomicAction(input);
            }).then(function (atomic) {
                console.log("counter " +  counter)
                counter <= 0 ?  end(): null;
                deferred.resolve({name:"input name " + input, atomic: atomic})
            }).catch(function (error) {
                counter <= 0 ?  end(): null;
                deferred.resolve({name:"input name " + input, atomic: invalidAction(error)})
            })
        }, Math.floor(Math.random() * 200));
        return timer;
    }



    return {
        createEvent: function (input) {
            return createEvent(input)
        },
        end: function () {
            return end()
        }
    }
};

console.log("start");
var result = [];

var endA = function (array) {
    var computation = array.reduce(function (accumulator, value) {
        return accumulator + value.atomic;
    }, 0);
    console.log('computation ' + computation + ' - ' + result);
};
var invA = function (error) {
    if (error) {
        return 1;
    } else {
        return 0;
    }
};

var atoA = function (input) {
    return Q.promise(function (resolve, reject) {
        resolve(input + 10);
    });
};


var vali = function (a) {
    return Q.promise(function (resolve, reject) {
        console.log("validation of " + a);
        if (typeof a == 'number') {
            resolve(a);
        } else {
            reject('this is not the value expected, integer.')
        }
    })
};

a = new PromiseArray(endA, vali, invA, atoA);
a.createEvent(10, result);
a.createEvent(11, result);
a.createEvent(12, result);
a.createEvent(13, result);
a.createEvent("wrong", result);
console.log("end " + result);


