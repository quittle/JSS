/*/
 * JSS Version 0.0.2
 * Author: Dustin Doloff
 * Email: me@dustindoloff.com
 * Website: https://github.com/quittle/JSS
 * Date: 8 / 4 / 2014
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Use this code (almost) as you will. Modify it if you want.
 * Just give me attribution as original author.
 * You can't sell this or a variation of it.  It may be packaged
 *  in a larger service for profit if this is a mere tool of the
 *  product and not a primary aspect.  I'd still appreciate if
 *  my name and contact information at the top were provided in
 *  some manner.
/*/

(function(){
	/* Global Variables */
	var w = window,
		d = document,
		
		SYNC_ATTRIBUTE		= "sync",
		DEFER_ATTRIBUTE		= "defer",
		REL_VALUE			= "jss",
		MAX_CYCLES			= 30,
		JSS_TAG 			= "!JSS",
		VARIABLE_INDICATOR	= "@",
		EXCEPTION_ON_ERROR	= false,
		
		LOADED_LINKS		= [],
		
		MACRO_OPEN_TAG_REGEX = new RegExp(JSS_TAG + "\\s*{", "g"),
		STATIC_MACRO_VARIABLE = function(key){
			return new RegExp(VARIABLE_INDICATOR + key + VARIABLE_INDICATOR, "g");
		},
		GENERIC_STATIC_MACRO_VARIABLE = function(){
			return STATIC_MACRO_VARIABLE("(\\d|\\w)+");
		};

	//Finds all the JSS link tags
	function getJSSLinks(){
		if(d.querySelectorAll){
			var nl = d.querySelectorAll("link[rel=" + REL_VALUE + "]"),
				links = [];
			for(var i = 0; i < nl.length; i++){
				links.push(nl[i]);
			}
			return links;
		}else{
			var allLinks = d.getElementsByTagName("link"),
				links = [];
			for(var i = 0; i < allLinks.length; i++){
				var l = allLinks[i];
				if(l.getAttribute("rel").toLowerCase() === REL_VALUE){
					links.push(l);
				}
			}
			return links;
		}
	}
	
	//Check for new JSS links and load them as appropriate
	function checkForJSSLinks(){
		//Loop through all JSS links
		getJSSLinks().map(function(l){
			//Make sure they haven't been loaded before
			if(LOADED_LINKS.indexOf(l) == -1){
				var async = isAsynchronous(l),
					deferred = isDeferred(l);
				
				//Load if not deferred or (deferred and loaded)
				if(!deferred || document.readyState == "complete"){
					createStyle(l, async)
					LOADED_LINKS.push(l);
				}
			}
		});
	}
	
	function isAsynchronous(link){
		return link.getAttribute(SYNC_ATTRIBUTE) === null;
	}
	function isDeferred(link){
		return link.getAttribute(DEFER_ATTRIBUTE) !== null;
	}
	
	// Takes link element and the url to load
	function createStyle(el, async){
		// Get the link from the element
		var url = el.getAttribute("href");
		
		//If there isn't an href, we can't load any jss
		if(url != null){
			// Create the style element
			var s = document.createElement("style");
			s.setAttribute("type", "text/css");
			
			// Create the XMLHttpRequest to get the stylesheet data
			var xmlhttp;
			if(window.XMLHttpRequest){
				xmlhttp = new XMLHttpRequest();
			}else{
				xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
			}
			xmlhttp.onreadystatechange=function(){
				if(xmlhttp.readyState==4){
					// This is where all the parsing and dynamic content is generated
					var text = parseScript(xmlhttp.responseText);

					// Now the finalized CSS is put in the style tag
					if(s.styleSheet){
						s.styleSheet.cssText = text;
					}else{
						try{
							s.appendChild(document.createTextNode(text));
						}catch(e){ // IE will only fill style elements using .text
							s.text = text;
						}
					}
					
					// Attach the style tag right after the link element to preserve order
					el.parentNode.insertBefore(s, el.nextSibling);
				}
			}
			// Overriding MIME type helps ensure some browsers (like Firefox) can read it without error
			if(xmlhttp.overrideMimeType){
				xmlhttp.overrideMimeType("plain/text");
			}
			xmlhttp.open("GET", url, async); // Make an asynchronous request (like all CSS requests)
			xmlhttp.send();
		}
	}

	function parseScript(text){
		// Remove comments
		text = removeComments(text);
		
		var content = getJSSTagContents(text), // Get the contents from JSS blocks
			preStatements = splitStatements(content), // Array of all statements as strings
			statements = []; // Array of final statements that will actually be shown (no duplicates)

		// Check all the preStatements and possibly turn them into statements
		for(var i = 0; i < preStatements.length; i++){
			// Get each one and clean it up
			var ps = preStatements[i].trim();
			
			// Make sure there's something
			if(ps != ""){
				// Split it to get key and value
				var index = ps.indexOf(":"),
					key = ps.substring(0, index).trim(),
					value = ps.substring(index + 1).trim();
			
				// Check if we have it already
				var item = statements.find(function(s){
					return s.key === key;
				});
				
				if(item){ // If we have this key already, just update the value
					item.value = value;
				}else{ // Otherwise create a new object with the key-value pair and add it to statements
					statements.push({
						"key" : key,
						"value" : value
					});
				}
			}
		}

		// Shift all the functions to the bottom
		//statements = rearrangeStatements(statements);
		var functionified = functionifyText(text, statements);
		text = functionified.text;
		statements = functionified.statements;
		
		// Statements is now full of property-value pairs,
		//  so we loop through the raw text and do C-style macro replacements.
		// We need to loop to propagate dependencies
		var done = false;
		for(var i = 0; !done && i < MAX_CYCLES ; i++){
			var ret =  macrofy(text, statements);
			text = ret.text;
			done = !ret.change;
		}
		
		// Not done means that we exited the loop because we cycled too many times
		if(!done){
			err("Recursive interpretation limit reached (" + MAX_CYCLES + ")");
		}
		
		text = removeJSSTagContents(text);
		
		return text;
	}

	// Grabs the contents all JSS content blocks as one chunk
	function getJSSTagContents(text){
		var i,
			ret = [];

		// Check if there is another JSS block
		while((i = text.search(MACRO_OPEN_TAG_REGEX)) != -1){
			// Get the start and end indices of the block
			var openLoc = text.indexOf("{", i) + 1,
				endLoc = getEnd(text, i, "{", "}");

			// Add the block
			ret.push(text.substring(openLoc, endLoc));
		
			// Move text so it starts after the block and look again
			text = text.substring(endLoc + 1);
		}
		
		// Combine all the blocks with ; to ensure they connect
		return ret.join(";");
	}

	function removeJSSTagContents(text){
		// Remove comments
		text = removeComments(text);
		
		var i, endLoc, cleanText = "";
		
		// Check if there is another JSS block
		while((i = text.search(MACRO_OPEN_TAG_REGEX)) != -1){
			// Get the start and end indices of the block
			endLoc = getEnd(text, i, "{", "}");
			
			//Append all the text that's before the next JSS tag
			cleanText += text.substring(0, i);

			// Move text so it starts after the block and look again
			text = text.substring(endLoc + 1);
		}
		
		//Add all the text that's after the last JSS tag
		cleanText += text;
		
		// Combine all the blocks with ; to ensure they connect
		return cleanText.trim();
	}

	// Reorders statements so functions go at the end of the list
	function rearrangeStatements(statements){
		var l = statements.length,
			ret = new Array(l),
		
			nonFuncStart = 0,
			funcStart = 0;

		
		// Count the number non-function statements
		for(var i = 0; i < l; i++){
			if(!isFunction(statements[i].value)){
				funcStart++;
			}
		}
		
		// Put functions in ret, starting at funcStart
		// Put non-function in ret, starting from 0
		for(var i = 0; i < l; i++){
			if(isFunction(statements[i].value)){
				ret[funcStart++] = statements[i];
			}else{
				ret[nonFuncStart++] = statements[i];
			}
		}

		return ret;
	}

	// Turns @VARIABLE@ into @VARIABLE()@ and VARIABLE : 2 into VARIABLE : funtion(){return '2';}
	// This allows the final pass through to treat everything as a function and ignore random cases
	function functionifyText(text, statements){
		statements.map(function(s){
			var k = s.key;
			if(!isFunction(s.value)){
				s.value = "function(){return '" + s.value + "';}";
			}
			
			var regex = GENERIC_STATIC_MACRO_VARIABLE(), key;
			while((key = regex.exec(s.value)) != null){
				s.value = s.value.replace(key[0], VARIABLE_INDICATOR + key[1] + "()" + VARIABLE_INDICATOR);
			}
			
			text = text.replace(STATIC_MACRO_VARIABLE(k), VARIABLE_INDICATOR + k + "()" + VARIABLE_INDICATOR);
		});

		return {
			"text" : text,
			"statements" : statements
		};
	}

	function removeComments(text){
		var comment = new RegExp("\\/\\*[^*]*\\*+([^/*][^*]*\\*+)*\\/", "gm");
		return text.replace(comment, "");
	}

	// Helper function that finds the closing bracket index
	// str - String to work with
	// start - Index to start looking at (should be at first bracket)
	// open - The open bracket character
	// close - The close bracket character
	// Returns the index of the closing bracket character for the opening one or -1 if not closed
	function getEnd(str, start, open, close){
		var count = 0;
		while(start < str.length){
			var c = str.charAt(start);
			if(c == open){
				count++;
			}else if(c == close){
				count--;
				if(count == 0){
					break;
				}
			}
			start++;
		}
		// Return -1 if it never closes
		if(start >= str.length){
			return -1;
		}else{
			return start;
		}
	}

	// Splits a block JSS into an array of statements
	// This is tricky because JSS can contain functions that may have ; in them
	function splitStatements(text){
		var ret = [],
			start = 0, progress = 0;
			
		// Ensure we're still looking in the text
		while(progress < text.length){
			// Get the locations of the first semicolon and first open curly brace
			var semicolon = text.indexOf(";", progress),
				curly = text.indexOf("{", progress);
			
			// If the semicolon is nearer, just push everything from the start to
			//  the semicolon and reset start and progress to right after the semicolon
			// If the curly brace is closer, move progress to just after the closing
			//  brace.
			// If neither are found, push everything that's left and we're done!
			if(semicolon > -1 && (semicolon < curly || curly == -1)){
				ret.push(text.substring(start, semicolon));
				start = semicolon + 1;
				progress = start;
			}else if(curly > -1 && (curly < semicolon || semicolon == -1)){
				progress = getEnd(text, curly, "{", "}") + 1;
			}else if(semicolon == -1 && curly == -1){
				ret.push(text.substring(start));
				break;
			}else{
				err("Malformed JSS");
			}
		}
		
		return ret;
	}

	// One round of applying statements to the text
	// Returns an object with the updated text and a flag stating if any rules were applied
	function macrofy(text, statements){
		var change = false;
		for(var i = 0; i < statements.length; i++){
			var s = statements[i],
				ref = function(){ // To prevent ref.test() from causing problems due to globalness 
					return new RegExp(VARIABLE_INDICATOR + s.key + "\\s*\\(([^?!\\)]*)\\)\\s*" + VARIABLE_INDICATOR, "gm");
				},
				oldText = text,
			
				f = runFunction(s.value);
			
			//Replace in JSS
			statements.map(function(i){
				var v = i.value;
				
				//Simplify expression
				if(v !== undefined && ref().test(v) && f.runnable){
					i.value = macrofyWithStatement(v, s);
				}
			});

			//Replace in text
			text = macrofyWithStatement(text, s);
			
			if(text != oldText){
				change = true;
			}
		}
		return {
			"text" : text,
			"change" : change
		};
	}

	function macrofyWithStatement(text, statement){
		function ref(){return new RegExp(VARIABLE_INDICATOR + statement.key + "\\s*\\(([^?!\\)]*)\\)\\s*" + VARIABLE_INDICATOR, "gm")};
		
		var r, refObj = ref();
		while((r = refObj.exec(text)) != null){
			var func = r[0],
				args = r[1],
				result = runFunction(statement.value, args);
			
			if(result.runnable){
				text = text.replace(ref(), result.result);
			}
		}
		
		return text;
	}

	// Interprets a string as a function and returns an object with it's output
	//  if it was a valid function to begin with.
	function runFunction(str, args){
		try{
			if(isFunction(str) && !containsJSSVariable(str)){
				if(args === undefined){
					args = "";
				}

				var f;
				eval("f = (" + str + ")(" + args + ")");

				return {
					"runnable" : true,
					"result" : new String(f) // Needs to be a string
				};
			}
		}catch(e){
			if(window.console){
				console.error(str, args, e);
			}
		}
		return {
			"runnable" : false,
			"result": undefined
		};
	}

	// Determines if the string is potentially a function definition
	function isFunction(str){
		return str.startsWith("function") && str.charAt(str.length - 1) == "}";
	}

	// Determines if the string contains any JSS variables
	function containsJSSVariable(str){
		var re1 = new RegExp(VARIABLE_INDICATOR + "(\\d|\\w)+" + VARIABLE_INDICATOR, "g"),
			re2 =  new RegExp(VARIABLE_INDICATOR + "(\\d|\\w)+" + "\\s*\\(([^?!\\)]*)\\)\\s*" + VARIABLE_INDICATOR, "gm");
		return re1.test(str) || re2.test(str);
	}

	// Removes JSS tags from the CSS
	function removeJSSTags(str){
		/* Maybe move to getJSSTagContent */
	}

	// Helper function
	function err(text){
		if(EXCEPTION_ON_ERROR){
			throw text;
		}else{
			if(window.console){
				console.error(text);
			}
		}
	}

	// Add support for addEventListener
	if(!window.addEventListener){
		window.addEventListener = function(type, listener, useCapture){
			if(this.attachEvent){
				type = 'on' + type; //Correct type
				useCapture = !!useCapture;

				return this.attachEvent(type, listener, useCapture);
			}
		};
	}

	// Trims whitespace from the beginning and end of a string
	String.prototype.trim = function(){
		return this.replace(/^\s+|\s+$/g, "");
	};
	String.prototype.startsWith = function(str){
		return this.indexOf(str) == 0;
	};

	// Adds support to find an object in an array if a testing function returns true
	if(!Array.prototype.find){
		Array.prototype.find = function(f){
			for(var i = 0, t; i < this.length; i++){
				t = this[i];
				if(f(t)){
					return t;
				}
			}
			return undefined;
		};
	}
	// Adds support to older browsers
	if(!Array.prototype.map){
		Array.prototype.map = function(fun /*, thisp*/){
			var len = this.length;
			if(typeof fun != "function"){
				throw new TypeError();
			}

			var res = new Array(len);
			var thisp = arguments[1];
			for(var i = 0; i < len; i++){
				if(i in this){
					res[i] = fun.call(thisp, this[i], i, this);
				}
			}

			return res;
		};
	}
	
	if(!Array.prototype.indexOf){
		Array.prototype.indexOf = function(obj, start){
			for(var i = (start || 0), l = this.length; i < l; i++){
				if(this[i] === obj){
					return i;
				}
			}
			return -1;
		}
	}

	/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
	/* Initializer code */
	/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
	
	var usedLinks = [],
		links = getJSSLinks();

	// Try to load JSS links now
	checkForJSSLinks();

	// Try to load JSS links on load
	w.addEventListener("load", checkForJSSLinks);
	
	// Try to load JSS links over time
	for(var i = 1; i < 4; i++){
		setTimeout(checkForJSSLinks, i * i * 100);
	}
	setInterval(checkForJSSLinks, 3000);
})();