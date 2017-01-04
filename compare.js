/**
 * Created by ariel on 12/16/16.
 */



exports.change_not_valid = function (header) {
    var port_lock =  header.allowOpenPortTx;
    port_lock = null;
    console.log(typeof port_lock);
    console.log(port_lock);
    if(typeof port_lock === 'undefined' || port_lock == null){
        console.log("Not defined in the json!!.")
    }
    if(typeof(port_lock) !== "boolean") {
        console.log("is not boolean");
        header.allowOpenPortTx = false;
    }else{
        console.log("Alles gut.");
    }
    console.log("RESULTADO: " +  header.allowOpenPortTx);

};
