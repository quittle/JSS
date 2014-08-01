!JSS{
	HEIGHT: 100;
	MAIN_COLOR: #fff;
	OTHER: function(){};
	TEXT_COLOR : #f00;
	LINCOLN : function(a){
		return parseInt("@3@") * a;
	};
	border-radius: function(amt){
		var prefix = ["ms", "o", "moz", "webkit"];
		var ret = "border-radius:"+amt+";";
		
		prefix.map(function(p){
			ret += "-" + p + "-border-radius : " + amt + ";";
		});
		return ret;
	};
	1: @2@;
	2: 4px;
	3: @1@;
}
!JSS{
	/*WIDTH: @LINCOLN@;
	HEIGHT: @WIDTH@;*/
}

#holder{
	background: #ff0;
	z-index: @1@;
	height: @LINCOLN(4, 3)@px;
	content: '@LINCOLN ( 4 ) @';
}

!JSS{
	/*WIDTH: @LINCOLN@;
	HEIGHT: @WIDTH@;*/
}
#holder{
	font-weight: bold;
	@border-radius("100%")@;
	color : @TEXT_COLOR@;
}