!JSS{
	/* Could go before or after @fib@ definition */
	FIB_NUM: 10;

	/* Generates vendor-specific prefixes for the defined property using the given value */
	prefixify: function(property, value){
		//All the standard prefixes
		var prefixes = ["moz", "webkit", "o", "ms", "khtml"];
		
		var ret = "";
		for(var i = 0; i < prefixes.length; i++){
			ret += "-" + prefixes[i] + "-" + property + ": " + value + ";\n";
		}
		ret += "text-shadow: " + value + ";";
		return ret;
	};
	
	/* Uses prefixify to generate all vendor-specific versions of text-shadow */
	textShadow: function(value){
		return prefixify("text-shadow", value);
	};
	
	/* Generates the nth number in the fibonacci sequence. Don't bother passing in cur or prev */
	/* Call like @fib(5)@ */
	fib: function(n, cur, prev){
		if(cur == null){
			cur = 0;
		}
		if(prev == null){
			prev = 1;
		}
		
		if(n == 0){
			return cur;
		}else{
			return fib(n-1, cur + prev, cur);
		}
	};
	
}

.clearfix{
	clear: both;
}

#title{
	@textShadow("0 0 5px #000")@;
}
#title:after, #title::after{
	display: block;
	content: 'The @FIB_NUM@ number in the fibonacci sequence is @fib(@FIB_NUM@)@';
}