!JSS{
	PRIMARY_COLOR: #172232;
	SECONDARY_COLOR: #39547C;
	TEXT_COLOR: #efefef;
	TEXT_SECONDARY_COLOR: #acacac;
	
	LOGO: [--];
	logo: [++];
	
	thickness: 2px;
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

#title:before{
	content: 'Logo Symbol @LOGO@ @logo@';
	
	padding-right: 10px;
	border-right: @thickness@ solid @SECONDARY_COLOR@;
	margin-right: 10px;
}

#navbar{
	border: @thickness@ solid @SECONDARY_COLOR@;
}
.navbar-item{
	display: inline-block;
	width: 200px;
}
.navbar-item:hover{
	text-decoration: underline;
	color: @TEXT_SECONDARY_COLOR@;
}