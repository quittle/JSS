JSS
===

A CSS postcompiler in a single JS file.

There are several CSS precompilers out there like [Google's Closure Stylesheets](https://code.google.com/p/closure-stylesheets/) or [SASS](http://sass-lang.com/), but they have server prerequisites.  [LESS](http://lesscss.org/) is also a Javascript based postcompiler, but is very complicated (and feature rich), but does not support native Javascript calls.

JSS allows you to load JSS at any time, even after the JSS script is loaded.  It's syntax has been tested to work with the YUI CSS minifier and produce working JSS code without error.  More complex function definitions or strange Javascript code might cause problems.  If you find a bug or have a suggestion, contact me via [me@dustindoloff.com](mailto:me@dustindoloff.com).

## Set Up
- Download the latest JSS.js file
- Add a script tag to your website loading the JSS.js file
- Add a link tag linking to your jss file the same as a css file.  Just change `rel="stylesheet"` to be `rel="jss"`.

```
	<html>
		<head>
			<link ref="jss" href="main.jss" />
			<link ref="jss" defer href="after-load.jss" />
			<link ref="jss" sync href="right-now.jss" />

			<script src="JSS.js"></script>
		</head>
		<body>
		    ...
		</body>
	</html>
```

## Samples
```css
!JSS{
	PRIMARY_COLOR: #ff0;
}
body{
	background: @PRIMARY_COLOR@;
}
```

```css
!JSS{
	add: function(a, b){
		return a + b;
	};
}

#el{
	width: @add(100, 200)@px;
}
```

```css
!JSS{
	URL: function(){
		return document.location;
	};
}
	
#title:before{
	content: 'Location: @URL@';
}
```


```css
!JSS{compressedCSS:@'function(){
		return document.location;
	};'@}#title:before{content:'Location: @URL@';}}
```

For working samples, look in the examples directory.

## How It Works

- The JSS script is loaded.
- The script checks the document for JSS links and loads them as necessary.
- Then it checks again during the window's load event.
- Then it checks a few times quickly after, then every few seconds to check if any new links are added dynamically.

- When loading JSS, the request can be made synchronously or asynchronously.
- If using the defer attribute, JS won't be loaded until `document.readyState` equals `"complete"`

- The script loads the whole page into memory, parses the !JSS tags and defines variables.
- It then rewrites all variable definitions so they are functions, turning `VAR: 2px` into `VAR: function(){return "2px"}`.
- It redefines all the variables as function calls so `@VAR@` becomes `@VAR()@`.
- Then it replaces all the variables C-macro style with the results of the function calls, both in the JSS variables and in the rest of the stylesheet.

- After replacing everything, it removes the !JSS tags, adds a style tag to the source right after the link to preserve order, and then fills it with the final source.

- Any errors are printed to the console with the function name, arguments, and the error.

## Tips
- When debugging JSS, the order of the errors does not necessarily matter or appear relevant to the actual problem.  The error messages from the parsing are the most relevant.
- Keep constants capitalized and use the shorthand @VAR_NAME@ to use them
- Use camel case for functions @calcWidth(100)@
- To use CSS compressors that don't break your javascript functions, use @'strings prefixed by an @ sign. E.G. !JSS{ myFunc : @'function(){...}'; }

## Limitations
- Each .jss file is independent so you can't access variables from one sheet on the next
- All JSS variables must be valid javascript variable names