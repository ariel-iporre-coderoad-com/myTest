var calculateNewEPCLength = function(epc,tagReadData){
    console.log(JSON.stringify('epc: '));
    console.log(JSON.stringify(epc,null,4));
    console.log(JSON.stringify('tagReadData: '));
    console.log(JSON.stringify(tagReadData,null,4));
    var ui_len = epc.length;
    var ui_len_in_words = ui_len%4!==0 ? Math.trunc(ui_len/4) + 1 : Math.trunc(ui_len/4);
    var ui_string = tagReadData;
    var tagReadDataPC = parseInt(ui_string.substring(2, 6), 16);
    var mask = parseInt("07FF", 16);
    var preserved_bits = mask & tagReadDataPC;
    var EPC_length = ui_len_in_words<<11;
    var calculated_PC  = EPC_length | preserved_bits;
    var final_PC = calculated_PC.toString(16);
    console.log(JSON.stringify('final_PC',null,4))
    console.log(JSON.stringify(final_PC,null,4))
    return final_PC;
};


calculateNewEPCLength(987,0x3000CBA0123123123123FEFEFEFE8102);