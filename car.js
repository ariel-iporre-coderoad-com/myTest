/**
 * Created by ariel on 6/1/17.
 */

var Car = function () {
    this.manufacturer = "TOYOTA"
    this.speedConstant = 10; // m/s
    function activateBrakes (){
        return "activated"
    }
    return{
        manufacturer :  this.manufacturer,
        brake: activateBrakes
    }
};

Car.prototype.run = function (time){
    return "Car moved " + time*this.speedConstant + " meters";
};

Car.prototype.speedConstant = this.speedConstant;


//console.log("=> car.manufacturer " + car.manufacturer);
//console.log(car.run(10));
//console.log("=> car.speedConstant " + car.speedConstant)


module.exports =  Car;