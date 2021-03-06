!JSS{
	PRIMARY_COLOR: #172232;
	SECONDARY_COLOR: #39547C;
	TEXT_COLOR: #efefef;
	TEXT_SECONDARY_COLOR: #acacac;
	
	getElementsByClassName: function(cn){
		var items = document.getElementsByTagName("*"),
			ret = [];
		for(var i = 0; i < items.length; i++){
			if((" " + items[i].className + " ").indexOf(" " + cn + " ") > -1){
				ret.push(items[i]);
			}
		}
		return ret;
	};
	
	navbarItemWidth: function(){
		var items = getElementsByClassName("navbar-item");
		return (1 / items.length) * 100 + "%";
	};
	
	textShadow: function(value){
		//All the standard prefixes
		var prefixes = ["moz", "webkit", "o", "ms", "khtml"];
		
		var ret = "";
		for(var i = 0; i < prefixes.length; i++){
			ret += "-" + prefixes[i] + "-text-shadow" + ": " + value + ";\n";
		}
		ret += "text-shadow: " + value + ";";
		return ret;
	}
}

.clearfix{
	clear: both;
}

body{
	background: @PRIMARY_COLOR@;
	color: @TEXT_COLOR@;
}

a{
	color: @TEXT_COLOR@;
	font-weight: bolder;
}
a:hover{
	color: @TEXT_SECONDARY_COLOR@;
}

#title{
	@textShadow("0 0 10px #fff")@;
}

#navbar{
	border: 2px solid @SECONDARY_COLOR@;;
}
.navbar-item{
	display: inline-block;
	width: @navbarItemWidth()@;
	float: left;
}
.navbar-item:hover{
	text-decoration: underline;
	color: @TEXT_SECONDARY_COLOR@;
}