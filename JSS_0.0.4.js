/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
 
 /*/
 * JSS Version 0.0.4
 * Author: Dustin Doloff
 * Email: me@dustindoloff.com
 * Website: https://github.com/quittle/JSS
 * Date: 10 / 5 / 2014
 *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *
 * Do not alter or remove the first 16 lines of this document.
 *
/*/

/*/
 * Some notes:
 * ref is Regular Expression Functional
 * res is Regular Expression Static
/*/

(function(){
	/* Global Variables */
	var w = window,
		d = document,
		
		SYNC_ATTRIBUTE				= "sync",
		DEFER_ATTRIBUTE				= "defer",
		REL_VALUE					= "jss",
		MAX_CYCLES					= 30,
		JSS_TAG 					= "!JSS",
		VARIABLE_INDICATOR			= "@",
		FUNCTION_STRING_INDICATOR	= "@",
		EXCEPTION_ON_ERROR			= false,
		
		LOADED_LINKS				= [],
		
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
		ArrayMap(getJSSLinks(), function(l){
			//Make sure they haven't been loaded before
			if(ArrayIndexOf(LOADED_LINKS, l) == -1){
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
		// Prepend default functions
		//text = getDefaultScript() + text;
		
		// Remove comments
		text = removeComments(text);
		
		var content = getJSSTagContents(text), // Get the contents from JSS blocks
			preStatements = splitStatements(content), // Array of all statements as strings
			statements = getDefaultFunctions(); // Array of final statements that will actually be shown (no duplicates)

		// Check all the preStatements and possibly turn them into statements
		for(var i = 0; i < preStatements.length; i++){
			// Get each one and clean it up
			var ps = StringTrim(preStatements[i]);
			
			// Make sure there's something
			if(ps != ""){
				// Split it to get key and value
				var index = StringIndexOf(ps, ":"),
					key = StringTrim(ps.substring(0, index)),
					value = StringTrim(ps.substring(index + 1));
				
				value = destringify(value);
			
				// Check if we have it already
				var item = ArrayFind(statements, function(s){
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
			var openLoc = StringIndexOf(text, "{", i) + 1,
				endLoc = getEnd(text, i, "{", "}");

			// Add the block
			ret.push(text.substring(openLoc, endLoc));
		
			// Move text so it starts after the block and look again
			text = text.substring(endLoc + 1);
		}
		
		// Combine all the blocks with ; to ensure they connect
		return ret.join(";");
	}

	//Removes JSS tags from the style for end style tag
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
		return StringTrim(cleanText);
	}
	
	// Defines a bunch of statement definitions to initialize with
	function getDefaultScript(){
		return "															\n\
			!JSS{															\n\
				add : function(){											\n\
					var ret = 0;											\n\
					for(var i = 0, a = arguments, l = a.length; i < l; i++){\n\
						ret += parseFloat(a[i]);							\n\
					}														\n\
					return ret;												\n\
				};															\n\
																			\n\
				mult : function(){											\n\
					var ret = 1;											\n\
					for(var i = 0, a = arguments, l = a.length; i < l; i++){\n\
						ret *= parseFloat(a[i]);							\n\
					}														\n\
					return ret;												\n\
				};															\n\
																			\n\
				pow : function(base, pow){									\n\
					return Math.pow(parseFloat(base), parseFloat(pow));	\n\
				};															\n\
			}																\n\
		";
	}
	
	function getDefaultFunctions(){
		var ret = [
			{
				"key" : "add",
				"value" : function(){
					var ret = 0;
					for(var i = 0, a = arguments, l = a.length; i < l; i++){
						ret += parseFloat(a[i]);
					}
					return ret;
				}
			},
			{
				"key" : "subtract",
				"value" : function(){
					var a = arguments, ret = a[0];
					for(var i = 1, a = arguments, l = a.length; i < l; i++){
						ret -= parseFloat(a[i]);
					}
					return ret;
				}
			},
			{
				"key" : "multiply",
				"value" : function(){
					var ret = 1;
					for(var i = 0, a = arguments, l = a.length; i < l; i++){
						ret *= parseFloat(a[i]);
					}
					return ret;
				}
			},
			{
				"key" : "divide",
				"value" : function(){
					var a = arguments, ret = a[0];
					for(var i = 1, a = arguments, l = a.length; i < l; i++){
						ret /= parseFloat(a[i]);
					}
					return ret;
				}
			},
			{
				"key" : "pow",
				"value" : function(base, pow){
					return Math.pow(parseFloat(base), parseFloat(pow));
				}
			}
		];
		var copy = [["divide", "div"], ["multiply", "mult"], ["subtract", "sub"]];
		ArrayMap(ret, function(r){
			var k = r.key,
				v = r.value;
			ArrayMap(copy, function(c){
				if(k === c[0]){
					ret.push({
						"key": c[1],
						"value" : v
					});
				}
			});
		});
		
		ArrayMap(ret, function(r){
			r.value = r.value.toString();
		});
		return ret;
	}
	
	// Takes the value of a JSS variable and destringifies functions (to protect from CSS minification)
	function destringify(value){
		// Make regex that finds string escaped JSS function definitions
		var re = new RegExp("^\\s*" + FUNCTION_STRING_INDICATOR + "\\s*['|\"]([\\s\\S]*)['|\"]\\s*$"),
			result = value.match(re);
		if(result !== null){
			var result = result[1]; // 0 is the whole thing, 1 is just the string contents
			result =  result.replace(/\\\\/g, "\\") // Replace \\ with \ to escape escaping
							.replace(/\\'/g, "'") // Replace \' with ' to escape single quote
							.replace(/\\"/g, '"'); // Replace \" with " to escape double quote
			return result;
		}else{
			return value;
		}
	}

	// Turns @VARIABLE@ into @VARIABLE()@ and VARIABLE : 2 into VARIABLE : funtion(){return '2';}
	// This allows the final pass through to treat everything as a function and ignore random cases
	function functionifyText(text, statements){
		ArrayMap(statements, function(s){
			var k = s.key,
				v = s.value;
			if(typeof v === "function"){
				;
			}else if(!isFunction(v)){
				s.value = "function(){return '" + v + "';}";
			}

			ArrayMap(statements, function(s2){
				s.value = s.value.replace(STATIC_MACRO_VARIABLE(s2.key), VARIABLE_INDICATOR + s2.key + "()" + VARIABLE_INDICATOR);
			});
			
			text = text.replace(STATIC_MACRO_VARIABLE(k), VARIABLE_INDICATOR + k + "()" + VARIABLE_INDICATOR);
		});

		return {
			"text" : text,
			"statements" : statements
		};
	}

	//Removes /* .. */ style comments
	function removeComments(text){
		var comment = new RegExp("\\/\\*[^*]*\\*+([^/*][^*]*\\*+)*\\/", "gm");
		return text.replace(comment, "");
	}

	// Helper function that finds the closing bracket index
	// str - String to work with
	// start - Index to start looking at (should be at first bracket)
	// open - The open bracket character
	// close - The close bracket character
	// Returns the starting index of the closing bracket string for the starting opening one or -1 if not closed
	function getEnd(str, start, open, close){
		var count = 0;
		while(start < str.length){
			var c = str.charAt(start);
			
			if(str.indexOf(close, start) == start){
				count--;
				
				if(count == 0){
					break;
				}

				start += close.length;
			}else if(str.indexOf(open, start) == start){
				count++;
				start += open.length;
			}else{
				start++;
			}
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
			var semicolon = StringIndexOf(text, ";", progress),
				curly = StringIndexOf(text, "{", progress);
			
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

			if(f.runnable){
				//Replace in JSS
				ArrayMap(statements, function(i){
					var v = i.value;
					
					//Simplify expression
					if(v !== undefined){
						i.value = macrofyWithStatement(v, s, statements);
					}
				});

				//Replace in text
				text = macrofyWithStatement(text, s, statements);
			};
			
			if(text != oldText){
				change = true;
			}
		}
		return {
			"text" : text,
			"change" : change
		};
	}

	// Takes a text, a statement, and an array of statements
	// Looks for the statement in the text, and replaces it with result of the function call
	function macrofyWithStatement(text, statement, statements){
		var jssff = new JSSFunctionFinder(statement.key, text);
		
		var r;
		while((r = jssff.next()) != null){
			var func = r.func,
				args= r.args;
			
			if(args != null){
				result = runFunction(statement.value, args, statements);
			
				var t = func.substring(1, func.length-1);
				
				if(result.runnable && !containsJSSVariable(t)){
					text = text.replace(func, result.result);
				}
			}
		}
		
		return text;
	}

	// Interprets a string as a function and returns an object with it's output
	//  if it was a valid function to begin with.
	function runFunction(str, args, statements){
		try{
			if(isFunction(str) && !containsJSSVariable(str)){
				// Sometimes args is undefined, so make it an empty string
				if(args === undefined){
					args = "";
				}
				
				// If we didn't pass statements, we really just want to know that it appears to be runnable
				if(statements === undefined){
					return {
						"runnable" : true,
						"result" : undefined
					}
				}
				
				//Define all the functions before executing to allow for recursion or dependencies
				var definitions = "";
				
				ArrayMap(statements, function(s){
					definitions += "var " + s.key + "=" + s.value + ";";
				});

				// Run the function and capture result in f
				var f;
				eval(definitions + "f = (" + str + ")(" + args + ")");

				// Return the results
				return {
					"runnable" : true,
					"result" : new String(f) // Needs to be a string
				};
			}
		}catch(e){ //This means we thought the function was executable, but failed. (It should be the user's fault)
			err(str, args, e);
		}
		return {
			"runnable" : false,
			"result": undefined
		};
	}
	
	function JSSFunctionFinder(funcName, string){
		var fn = funcName,
			str = string;
		var refObj = ref();
		
		function ref(){
			return new RegExp(VARIABLE_INDICATOR + fn + "\\s*\\(", "gm");
		};
		function ref2(){
			return new RegExp(VARIABLE_INDICATOR + fn + "\\s*\\(([^?!\\)]*)\\)\\s*" + VARIABLE_INDICATOR, "gm");
		}
		
		this.next = function(){
			var lastIndex = refObj.lastIndex;
			var r = refObj.exec(str);

			if(r !== null){
				refObj.lastIndex = r.index + 1;
			
				var endVar = ")" + VARIABLE_INDICATOR,
					end = getEnd(str, r.index, VARIABLE_INDICATOR, endVar),
					functionCall = str.substring(r.index, end + endVar.length),
					args,
					stripped = functionCall.substring(1, functionCall.length - 1);
				
				if(!containsJSSVariable(stripped)){
					args = ref2().exec(functionCall)[1];
				}
				
				return {
					"func" : functionCall,
					"args" : args
				}
			}
		};
	}

	// Determines if the string is potentially a function definition
	function isFunction(str){
		return StringStartsWith(str, "function") && str.charAt(str.length - 1) == "}";
	}

	// Determines if the string contains any JSS variables
	function containsJSSVariable(str){
		var re1 = new RegExp(VARIABLE_INDICATOR + "(\\d|\\w)+" + VARIABLE_INDICATOR, "g"),
			re2 =  new RegExp(VARIABLE_INDICATOR + "(\\d|\\w)+" + "\\s*\\(([^?!\\)]*)\\)\\s*" + VARIABLE_INDICATOR, "gm");
		return re1.test(str) || re2.test(str);
	}

	// Helper function
	function err(){
		if(EXCEPTION_ON_ERROR){
			throw arguments.toString();
		}else{
			if(window.console){
				//Most browsers require second argument of apply to be an array, not just array-like
				var args = [];
				for(var i = 0, l = arguments.length; i < l; i++){
					args.push(arguments[i]);
				}
				if(console.error.apply !== undefined){
					console.error.apply(console, args);
				}else{
					ArrayMap(args, function(a){
						console.error(a);
					});
				}
			}
		}
	}

	// Add support for addEventListener
	function WindowAddEventListener(type, listener, useCapture){
		if(window.addEventListener){
			return window.addEventListener(type, listener, useCapture);
		} else {
			if(window.attachEvent){
				type = 'on' + type; //Correct type
				useCapture = !!useCapture;

				return window.attachEvent(type, listener, useCapture);
			}
		}
	}

	// Trims whitespace from the beginning and end of a string
	function StringTrim(str){
		return str.replace(/^\s+|\s+$/g, "");	
	}
	function StringStartsWith(haystack, needle){
		return haystack.indexOf(needle) == 0;
	}
	// Adds support to find an object in an array if a testing function returns true
	
	function ArrayFind(arr, f){
		if(Array.prototype.find){
				return arr.find(f);
		} else {
			for(var i = 0, t; i < arr.length; i++){
				t = arr[i];
				if(f(t)){
					return t;
				}
			}
			return undefined;
		}
	}
	// Adds support to older browsers
	
	function ArrayMap(arr, fun, thisp){
		if(Array.prototype.map){
			return arr.map(fun, thisp);
		} else {
			var len = arr.length;
			if(typeof fun != "function"){
				throw new TypeError();
			}

			var res = new Array(len);
			for(var i = 0; i < len; i++){
				if(i in arr){
					res[i] = fun.call(thisp, arr[i], i, arr);
				}
			}

			return res;
		}
	}
	
	function ArrayIndexOf(arr, obj, start){
		if(Array.prototype.indexOf){
			return arr.indexOf(obj, start);
		} else {
			for(var i = (start || 0), l = arr.length; i < l; i++){
				if(arr[i] === obj){
					return i;
				}
			}
			return -1;
		}
	}
	
	function StringIndexOf(haystack, needle, start){
		if(String.prototype.indexOf){
			return haystack.indexOf(needle, start);
		} else {
			for(var i = (start || 0), nl = needle.length, l = haystack.length; i < l; i++){
				var end = i + nl;
				if(i < l && haystack.substring(i, end) === needle){
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
	WindowAddEventListener("load", checkForJSSLinks);
	
	// Try to load JSS links over time
	for(var i = 1; i < 4; i++){
		setTimeout(checkForJSSLinks, i * i * 100);
	}
	setInterval(checkForJSSLinks, 3000);
})();