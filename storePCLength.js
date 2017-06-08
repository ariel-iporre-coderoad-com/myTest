// Calculate Length of EPC.
var ui_len = 17;
var ui_len_in_words = ui_len/4 +1;
console.log("ui_len_in_words : " + ui_len_in_words);
var ui_string = "0x1900ABCD000000009A340000";
var tagReadDataPC = parseInt(ui_string.substring(2, 6), 16);
var mask = parseInt("07FF", 16);
console.log("mask "  +  mask.toString(16));
console.log("tagReadDataPC: " + tagReadDataPC.toString(16));
preserved_bits = mask & tagReadDataPC;
console.log("preserved_bits : " + preserved_bits.toString(16));
var EPC_length = ui_len_in_words<<11;
console.log("EPC_length : " + EPC_length.toString(16));
calculated_PC  = EPC_length | preserved_bits;
final_PC = calculated_PC.toString(16);
console.log("strored_Pc for json: " + final_PC );

