///////////////////////////////////////////////////////////////////////////////
// Globals
///////////////////////////////////////////////////////////////////////////////
var data;
var file;
var reader;

var NUM_BYTES_TO_LOAD = 16*100;
var lastBytesRead = 0;

var isValueElementSet = false;

var addressString = "";
var hexString = "";
var asciiString = "";


///////////////////////////////////////////////////////////////////////////////
// Utility functions
///////////////////////////////////////////////////////////////////////////////
function convertToHex(dec)
{
    var hexArray = new Array( "0", "1", "2", "3",
                              "4", "5", "6", "7",
                              "8", "9", "A", "B",
                              "C", "D", "E", "F" );
    var decToHex = hexArray[(dec&0xf0)>>4]+hexArray[(dec&0x0f)];
    return (decToHex);
}

function addHexIdentifier(value) {
	return value+"h";
}

function intToHex(val) {
	// Convert value to hex
	var str = ''+val.toString(16);
	// Pad with 0's
	while(str.length < 8) str = '0'+str;
	return addHexIdentifier(str);
}

function dispAscii(val) {
	var displayableAscii = new Array(
			".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", 
			".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", 
			".", "!", "\"", "#", "$", "%", ".", "\'", "(", ")", "*", "+", ",", "-", ".", "\/", 
			"0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ":", ";", ".", "=", ".", "?", 
			"@", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", 
			"P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "[", "\\", "]", "^", "_", 
			".", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", 
			"p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "{", "|", "}", "~", ".");
	if (val > 127) return '.';
	return displayableAscii[val];
}


///////////////////////////////////////////////////////////////////////////////
// File reading
///////////////////////////////////////////////////////////////////////////////
function handleFinishedRead(evt) {
	if(evt.target.readyState == FileReader.DONE) {
		var length = evt.target.result.byteLength;
		var readBlock =  new Uint8Array(evt.target.result, 0, length);
		doRead(readBlock, length);
	}
}


function doRead(readBlock, length) {
	var output = [""];
	start = lastBytesRead; 
	for (var i = 0; i < readBlock.length; i++) {
		data[start+i] = readBlock[i];
	}
	
	var address = [""];
	var hex = [""];
	var ascii = [""];
	
	var column = 0;
	for (var i = lastBytesRead; i < lastBytesRead + readBlock.length; i++) {
		// Show address
		if (column == 0) {
			address.push(intToHex(i)+"<br>\n");
		}
		// Show value
		hex.push("<i id=\"h"+i+"\" class=\"hex\">");
		hex.push(convertToHex(data[i]));
		if (column % 16 != 0 && column % 8 == 0) {
		  hex.push("&nbsp;");
		}
		hex.push(" </i>");
		
		// Show ascii
		ascii.push("<i id=\"a"+i+"\" class=\"ascii\">");
		ascii.push(dispAscii(data[i]));
		ascii.push("</i>");
		
		// Add extra formatting
		column++;
		if (column % 16 == 0) {
			hex.push("<br>\n");
			ascii.push("<br>\n");
			column = 0;
		}
	}
	
	// TODO This is slow (the appending below), reason unknown
	
	
	log.info((new Date().getTime()) + " " + "Doing append");

	// Set html
	addressString += address.join("");
	hexString += hex.join("");
	asciiString += ascii.join("");
	
	
	$('#byte_content').html(getByteContentHTML(addressString, hexString, asciiString+"<footer>test</footer>"));
	
	log.info((new Date().getTime()) + " " + "Done with append");
	
	lastBytesRead = lastBytesRead + length;
	
	// Set waypoint for infinite scrolling through file (until end of file)
	$footer = $('footer'),
	opts = {
		offset: '100%',
		context: '#byte_content'
	};
	
	$footer.waypoint(function(event, direction) {
		$footer.waypoint('remove');
		$footer.detach();
		
		readFileSlice(lastBytesRead, lastBytesRead+NUM_BYTES_TO_LOAD);
	}, opts);
	
	$(".ascii").mouseover(mouseoverBytes).mouseout(mouseoutBytes);
	$(".hex").mouseover(mouseoverBytes).mouseout(mouseoutBytes);
	

	if (!isValueElementSet) {
		SetValueElement(0);
	}
	
	SetParseTree();
}

function getByteContentHTML(address, hex, ascii) {
	output = [];
	output.push("<table border=0 cellpadding=0 cellspacing=0><tr>");
	output.push("<td id=\"addressCell\" style=\"padding: 0 10px 0 0;\">");
	output.push(address);
	output.push("<td id=\"hexCell\" style=\"padding: 0 10px 0 0;\">");
	output.push(hex);
	output.push("<td id=\"asciiCell\">");
	output.push(ascii);
	output.push("</table>");
	return output.join("");
}


function handleFileSelect(evt) {
	evt.stopPropagation();
	evt.preventDefault();

	var files = evt.dataTransfer.files; // FileList

	file = files[0];  // File object
	log.info((new Date().getTime()) + " " + "Loading: "+escape(file.name));
	

	// Create array to hold all data in the file.  The file data will be read in as chunks as needed.
	data = new Uint8Array(file.size);
	
	createTemplate(file.name, file.size);

	reader = new FileReader();
	reader.onloadend = handleFinishedRead;
	
	readFileSlice(lastBytesRead, NUM_BYTES_TO_LOAD);
}

function createTemplate(fileName, fileSize) {
	var output = [];
	output.push('<strong>' + escape(fileName)+ '</strong> - ' + fileSize + ' bytes');
	document.getElementById('subheader').innerHTML = output.join(""); 
	
	// Set defaults for new file read
	lastBytesRead = 0;
	isValueElementSet = false;
	addressString = "";
	hexString = "";
	asciiString = "";
	
	// Set byte content
	output = [];
	output.push("<table border=0 cellpadding=0 cellspacing=0>\n");
	output.push(" <tr><td width=650px>\n");
	output.push(" <div id=\"byte_content\">");
	output.push(getByteContentHTML("", "", ""));
	output.push(" </div>\n");
	output.push(" <td id=\"value\">");
	output.push("</table>\n");
	output.push("<div id=\"parsetree\"></div>\n");
	$('#content').html(output.join(""));
	
	$('#byte_content').scrollTo(0);  // Start at top
	
	$addressCell = $('#addressCell');
	$hexCell = $('#hexCell');
	$asciiCell = $('#asciiCell')
}

function readFileSlice(start, end) {
	// Determine how much to read
	if(file.webkitSlice) {
		var blob = file.webkitSlice(start, end);
	} else if(file.mozSlice) {
		var blob = file.mozSlice(start, end);
	}

	reader.readAsArrayBuffer(blob);
}

function handleDragOver(evt) {
	evt.stopPropagation();
	evt.preventDefault();
	evt.dataTransfer.dropEffect = 'copy';
}


///////////////////////////////////////////////////////////////////////////////
// Mouse hovering
///////////////////////////////////////////////////////////////////////////////
function mouseoverBytes() {
	var currentId = this.id;
	var byte = currentId.substring(1, currentId.length); 
    $("#a"+byte).addClass( "hovered");
    $("#h"+byte).addClass( "hovered");
    
    SetValueElement(byte);
  }

function mouseoutBytes() {
	var currentId = this.id;
	var byte = currentId.substring(1, currentId.length); 
    $("#a"+byte).removeClass( "hovered");
    $("#h"+byte).removeClass( "hovered");
  };
  
function SetValueElement(offset) {
  var output = [""];
  var offsetInt = parseInt(offset);
  if (isNaN(offsetInt)) return;
  output.push("Offset "+intToHex(offsetInt)+"<br>");
  output.push("Data &nbsp;&nbsp;"+
		  addHexIdentifier(
		  convertToHex(data[offsetInt])+
		  convertToHex(data[offsetInt+1])+
		  convertToHex(data[offsetInt+2])+
		  convertToHex(data[offsetInt+3])
		  )+
		  "<br>");
  output.push("ubyte&nbsp;&nbsp;"+
		  data[offsetInt]+
		  "<br>");
  output.push("ushort "+(
		  ((data[offsetInt+1]<<8)>>>0) +
		  (data[offsetInt+0]) ) +
		  "<br>");
  output.push("uint &nbsp;&nbsp;"+(
		  ((data[offsetInt+3]<<24)>>>0) +
		  ((data[offsetInt+2]<<16)>>>0) +
		  ((data[offsetInt+1]<<8)>>>0) +
		  (data[offsetInt+0]) ) +
		  "<br>");
  $('#value').html(output.join(""));
  isValueElementSet = true;
}


///////////////////////////////////////////////////////////////////////////////
// Parse tree
///////////////////////////////////////////////////////////////////////////////
var expectedOffset = 0;
function node(label, size, offset) {
	offset = offset || expectedOffset;
	expectedOffset = offset + size;
	
	var dataValue = "";
	var maxDataDisplaySize = 4; 
	for(var i=0; i<size && i<maxDataDisplaySize; i++) {
		dataValue += convertToHex(data[offset+i]); 
	}
	if(size>maxDataDisplaySize) {
		dataValue +="...";
	}
	dataValue = addHexIdentifier(dataValue);
	
	return {label: label, offset: offset, size: size, data: dataValue};
}


function getStructSize(children) {
	var size = 0;
	for(i in children) {
	  	size += children[i].size;
	}
	return size;
}


function SetParseTree() {
	var parseGrammer = "";
	var parseInput = "";
	
	$.get("parseFile_pe.txt", function(response) {
		parseInput = response;
		$.get("parseGrammer.txt", function(response) {
			parseGrammer = response;
			var parser = PEG.buildParser(parseGrammer);
			
			try {
				var parseData = parser.parse(parseInput);
				
				var treedata = [];
				for (var s in parseData)
				{
					var struct = parseData[s];
					var treeDataStruct = { label: struct.label, offset: 0, size: getStructSize(struct.children), children:[]};
					for (i in struct.children) {
						var c = struct.children[i];
						treeDataStruct.children.push(node(c.text, c.size));
					}
					
					treedata.push(treeDataStruct);
				}
				
				$('#parsetree').tree({
					data: treedata,
					autoOpen: true
				});
				
				$('#parsetree').bind(
				    'tree.click',
				    clickParseTreeNode
				);
				
				
				//$('#parsetree').html(mytext);
			} catch (e) {
				$('#parsetree').html("Parsing failed; "+e);
			}
		});
	});
	
	return;
	
	

	var e_lfanew = data[60]+data[61]*256;
	expectedOffset = 0;
	
}

function clickParseTreeNode(event) {
    var node = event.node;
    
    // High-lite byte data
    // Unset old
    for(var i=selectStart; i<selectEnd; i++) {
      $("#a"+i).removeClass( "selected");
      $("#h"+i).removeClass( "selected");
    }
    
    // Set new
    selectStart = node.offset;
    selectEnd = node.offset + node.size;
    for(var i=selectStart; i<selectEnd; i++) {
      $("#a"+i).addClass( "selected");
      $("#h"+i).addClass( "selected");
    }
    
    SetValueElement(selectStart);
    
    // Scroll to element
    $('#byte_content').scrollTo($("#h"+selectStart), 800);
    
    // High-lite parse tree
    // Unset old
    if (selectedNode != null) {
      selectedNode.removeClass("selected");
    }
    // Set new
    selectedNode = event.target;
    if (selectedNode.hasClass("parseTreeData")) {
    	selectedNode = selectedNode.parent();
    }
    selectedNode.addClass("selected");
}

/////////////////////////////////////////////////////////////////////////////
function $_GET(q,s) {
    s = s ? s : window.location.search;
    var re = new RegExp('&'+q+'(?:=([^&]*))?(?=&|$)','i');
    return (s=s.replace(/^\?/,'&').match(re)) ? (typeof s[1] == 'undefined' ? '' : decodeURIComponent(s[1])) : undefined;
} 

///////////////////////////////////////////////////////////////////////////////
// Main
///////////////////////////////////////////////////////////////////////////////
var selectStart = 0;
var selectEnd = 0;
var selectedNode = null;

//Setup the dnd listeners.
var dropZone = document.getElementById('container');
dropZone.addEventListener('dragover', handleDragOver, false);
dropZone.addEventListener('drop', handleFileSelect, false);


var readBlock =  new Uint8Array([
0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00,
0xB8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00,
0x0E, 0x1F, 0xBA, 0x0E, 0x00, 0xB4, 0x09, 0xCD, 0x21, 0xB8, 0x01, 0x4C, 0xCD, 0x21, 0x54, 0x68,
0x69, 0x73, 0x20, 0x70, 0x72, 0x6F, 0x67, 0x72, 0x61, 0x6D, 0x20, 0x63, 0x61, 0x6E, 0x6E, 0x6F,
0x74, 0x20, 0x62, 0x65, 0x20, 0x72, 0x75, 0x6E, 0x20, 0x69, 0x6E, 0x20, 0x44, 0x4F, 0x53, 0x20,
0x6D, 0x6F, 0x64, 0x65, 0x2E, 0x0D, 0x0D, 0x0A, 0x24, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x6D, 0x1F, 0x98, 0x6B, 0x29, 0x7E, 0xF6, 0x38, 0x29, 0x7E, 0xF6, 0x38, 0x29, 0x7E, 0xF6, 0x38,
0x3A, 0x76, 0x9F, 0x38, 0x2B, 0x7E, 0xF6, 0x38, 0x2C, 0x72, 0x96, 0x38, 0x2B, 0x7E, 0xF6, 0x38,
0x2C, 0x72, 0xF9, 0x38, 0x32, 0x7E, 0xF6, 0x38, 0x3A, 0x76, 0xAB, 0x38, 0x2B, 0x7E, 0xF6, 0x38,
0xD3, 0x5D, 0xEF, 0x38, 0x2D, 0x7E, 0xF6, 0x38, 0xAA, 0x76, 0xAB, 0x38, 0x38, 0x7E, 0xF6, 0x38,
0x29, 0x7E, 0xF7, 0x38, 0x04, 0x7F, 0xF6, 0x38, 0x2C, 0x72, 0xA9, 0x38, 0x95, 0x7E, 0xF6, 0x38,
0xC5, 0x75, 0xA8, 0x38, 0x28, 0x7E, 0xF6, 0x38, 0x2C, 0x72, 0xAC, 0x38, 0x28, 0x7E, 0xF6, 0x38,
0x52, 0x69, 0x63, 0x68, 0x29, 0x7E, 0xF6, 0x38, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x50, 0x45, 0x00, 0x00, 0x4C, 0x01, 0x04, 0x00, 0x25, 0x52, 0xE3, 0x4E, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0xE0, 0x00, 0x0F, 0x01, 0x0B, 0x01, 0x07, 0x0A, 0x00, 0x40, 0x05, 0x00,
0x00, 0x80, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0xDF, 0xC4, 0x04, 0x00, 0x00, 0x10, 0x00, 0x00,
0x00, 0x50, 0x05, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00,
0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0xD0, 0x07, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00,
0x00, 0x00, 0x10, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x10, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x78, 0xE8, 0x06, 0x00, 0xF0, 0x00, 0x00, 0x00, 0x00, 0x90, 0x07, 0x00, 0x90, 0x3B, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0xE8, 0x06, 0x00, 0x48, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x50, 0x05, 0x00, 0xC8, 0x04, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x2E, 0x74, 0x65, 0x78, 0x74, 0x00, 0x00, 0x00,
0x71, 0x33, 0x05, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x40, 0x05, 0x00, 0x00, 0x10, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x60,
0x2E, 0x72, 0x64, 0x61, 0x74, 0x61, 0x00, 0x00, 0x3E, 0xB2, 0x01, 0x00, 0x00, 0x50, 0x05, 0x00,
0x00, 0xC0, 0x01, 0x00, 0x00, 0x50, 0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x40, 0x2E, 0x64, 0x61, 0x74, 0x61, 0x00, 0x00, 0x00,
0x04, 0x7E, 0x00, 0x00, 0x00, 0x10, 0x07, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10, 0x07, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0xC0,
0x2E, 0x72, 0x73, 0x72, 0x63, 0x00, 0x00, 0x00, 0x90, 0x3B, 0x00, 0x00, 0x00, 0x90, 0x07, 0x00,
0x00, 0x40, 0x00, 0x00, 0x00, 0x20, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00                                 
]);


if ($_GET('test')) {
data = new Uint8Array(readBlock.length);
createTemplate("test_data", readBlock.length);
doRead(readBlock, readBlock.length);
}
