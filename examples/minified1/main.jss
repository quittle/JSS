!JSS{FIB_NUM:10;prefixify:@'function(property, value){
		/*All the standard prefixes*/
		var prefixes = ["moz", "webkit", "o", "ms", "khtml"];

		var ret = "";
		for(var i = 0; i < prefixes.length; i++){
			ret += "-" + prefixes[i] + "-" + property + ": " + value + ";\n";
		}
		ret += \'text-shadow: \' + value + ";";
		return ret;
	}';textShadow:@'function(value){
		return prefixify("text-shadow", value);
	}';fib:@'function(n, cur, prev){
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
	}'}.clearfix{clear:both}#title{@textShadow("0 0 5px #000")@}#title:after,#title::after{display:block;content:'The @FIB_NUM@ number in the fibonacci sequence is @fib(@FIB_NUM@)@'}