body{
	background: @BACKGROUND@;
	color: #f0a;
}

#title:before{
	content: 'View the Console for errors!';
	display: block;
	margin-bottom: 30px;
	
	color: #000;
	text-decoration: underline;
}

#navbar{
	background: @BACKGROUND@;
	height: @INVALID_FUNCTION@;
	width: @bad-variable-name@;
}

!JSS{
	BACKGROUND : #555;
	
	INVALID_FUNCTION : function(a){
		return b;
	};
	
	bad-variable-name: 3;
}