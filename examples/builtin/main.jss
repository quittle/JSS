!JSS{
	tackle: 2;
	w1: 5;
	w3: @add(2, 3)@;
	w4: @pow(@w3@, 3)@;
	test: function(a){
		return "hi " + a;
	};
	
	spiralBorder: function(){
		var a = 2;

		var ret = "border: 1px solid black;";
		ret += "border-left-width: " + a + "px;";
		a = pow(a,2);
		ret += "border-top-width: " + a + "px;";
		a = pow(a, 2);
		ret += "border-right-width: " + a + "px;";
		a = pow(a,2);
		ret += "border-bottom-width: " + a + "px;";
		return ret;
	};
}

#title{
	@spiralBorder@
}

*:before, *::before, *:after, *::after{
	display: block;
	color: #f00;
}
#title:before, #title::before{
	content: '5: @w1@';
}
#title:after, #title::after{
	content: '5+2: @add(@w1@, 2)@';
}

#navbar:before, #navbar::before{
	content: '2^5: @pow(2, @w1@)@';
}
#navbar:after, #navbar::after{
	content: '(2+3)^3: @w4@ = @pow(@add(2,3)@, 3)@';
}
